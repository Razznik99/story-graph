
import { GoogleGenAI } from "@google/genai";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { getSystemInstruction } from "@/lib/ai/system-instructions";
import { tools, runTool } from "@/lib/ai/tools";
import getCreateSchema from "@/lib/ai/response-schema";
import { generateChatTitle } from "@/app/api/ai/chats/route";


const client = new GoogleGenAI({ apiKey: process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || "" });


export async function POST(req: Request) {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    try {
        const { messages, chatId, context, mode } = await req.json();

        // Verify chat ownership if chatId is provided
        let derivedStoryId = context?.storyId;
        let chatRecord = null;

        if (chatId) {
            chatRecord = await prisma.aIChat.findUnique({
                where: { id: chatId },
                include: { messages: { select: { id: true }, take: 1 } }
            });
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            if (!chatRecord || chatRecord.userId !== user?.id) {
                return NextResponse.json({ error: "Chat not found or unauthorized" }, { status: 404 });
            }
            if (chatRecord.storyId) {
                derivedStoryId = chatRecord.storyId;
            }
        }
        if (!derivedStoryId) {
            return NextResponse.json(
                { error: "Missing storyId in context or chat" },
                { status: 400 }
            );
        }

        // Construct current history for the new SDK
        // The messages array from the client likely contains the full history including the new user message at the end.
        // We map them to the Content format expected by @google/genai
        let contents = messages.map((m: any) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content || " " }], // Ensure text is never undefined/null
        }));

        // Inject context into the last user message if provided
        if (context && contents.length > 0) {
            const lastMessage = contents[contents.length - 1];
            if (lastMessage.role === 'user') {
                // Prepend context to the last message
                lastMessage.parts[0].text = `Context:\n${JSON.stringify(context)}\n\nUser Message:\n${lastMessage.parts[0].text}`;
            }
        }

        // Get system instructions based on mode
        const systemInstruction = getSystemInstruction(mode || "BRAINSTORM_MODE");

        // Config for the model
        let schema;

        if (mode === "CREATE_MODE") {
            schema = getCreateSchema(context);
        }

        const config: any = {
            systemInstruction: {
                parts: [{ text: systemInstruction }]
            },
            tools: [
                {
                    functionDeclarations: tools
                }
            ],
            ...(mode === "CREATE_MODE" && {
                responseMimeType: "application/json",
                responseSchema: schema
            })
        };



        // Tool execution loop
        let finalResponseText = "";

        let iteration = 0;
        const MAX_ITERATIONS = 10;

        while (iteration < MAX_ITERATIONS) {
            iteration++;

            console.log("Calling Gemini with contents length:", contents.length);
            const result = await client.models.generateContent({
                model: "gemini-2.5-flash", // Upgraded model as per previous context if available, or keep 1.5-pro/flash
                contents: contents,
                config: config,
            });

            // Check for functional calls
            const functionCalls = result.functionCalls;

            if (functionCalls && functionCalls.length > 0) {
                // Add the model's request (with function calls) to history
                // We need to pull the content from the candidate
                // The SDK might have a helper or we use the raw candidate content
                if (result.candidates && result.candidates[0] && result.candidates[0].content) {
                    const candidateContent = result.candidates?.[0]?.content;
                    if (candidateContent) {
                        contents.push({
                            role: "model",
                            parts: candidateContent.parts
                        });
                    }

                }

                console.log("Received function calls:", functionCalls.length);
                const functionResponses: any[] = [];

                for (const call of functionCalls) {
                    const toolName = call.name || "unknown_tool";
                    try {
                        const toolResult = await runTool(toolName, call.args, { storyId: derivedStoryId });

                        // Gemini requires the function response to be a valid JSON Object (Struct)
                        const safeResponse = (typeof toolResult === 'object' && toolResult !== null && !Array.isArray(toolResult))
                            ? toolResult
                            : { result: toolResult };

                        functionResponses.push({
                            functionResponse: {
                                name: toolName,
                                response: safeResponse
                            }
                        });
                    } catch (err: any) {
                        console.error(`Error running tool ${toolName}:`, err);
                        functionResponses.push({
                            functionResponse: {
                                name: toolName,
                                response: { error: err.message }
                            }
                        });
                    }
                }

                // Add function responses to history
                contents.push({
                    role: "tool",
                    parts: functionResponses
                });


                // Loop continues to send the function responses back to model
                continue;
            } else {
                // No function calls, so this is the final text response
                finalResponseText = result.text || "";

                // If it's pure CREATE_MODE, we can try to parse it here to fail fast if needed, 
                // but the client will also parse it. 
                // Since we enforced responseMimeType: "application/json", it SHOULD be JSON.
                if (mode === "CREATE_MODE") {

                    try {
                        JSON.parse(finalResponseText);
                    } catch (e) {
                        console.error("Model returned invalid JSON in CREATE_MODE:", finalResponseText);
                    }
                }

                break;
            }

        }
        if (iteration >= MAX_ITERATIONS) {
            throw new Error("Tool loop exceeded max iterations");
        }
        let finalChatId = chatId;

        if (!finalChatId) {
            const user = await prisma.user.findUnique({ where: { email: session.user.email } });
            if (user) {
                chatRecord = await prisma.aIChat.create({
                    data: {
                        userId: user.id,
                        title: "New Chat",
                        storyId: derivedStoryId || null,
                    },
                    include: { messages: { select: { id: true }, take: 1 } }
                });
                finalChatId = chatRecord.id;
            }
        }

        if (finalChatId) {

            // Generate title asynchronously if it's a new conversation or still has default title
            if (chatRecord && (chatRecord.title === 'New Chat' || chatRecord.messages.length === 0)) {
                const firstUserMessage = messages.find((m: any) => m.role === 'user')?.content || '';
                if (firstUserMessage) {
                    // Fire and forget
                    generateChatTitle(firstUserMessage).then(async (newTitle) => {
                        try {
                            await prisma.aIChat.update({
                                where: { id: finalChatId },
                                data: { title: newTitle }
                            });
                        } catch (e) {
                            console.error("Failed to update chat title", e);
                        }
                    });
                }
            }


            // Save User Message
            await prisma.aIMessage.create({
                data: {
                    chatId: finalChatId,
                    role: 'user',
                    content: messages[messages.length - 1].content, // Save original content
                    ...(context ? { metadata: { context } } : {})
                }
            });

            // Save Assistant Message
            await prisma.aIMessage.create({
                data: {
                    chatId: finalChatId,
                    role: 'assistant', // Schema seems to use 'assistant' based on previous diff
                    content: finalResponseText
                }
            });

            // Update chat timestamp
            await prisma.aIChat.update({
                where: { id: finalChatId },
                data: { updatedAt: new Date() }
            });
        }

        return NextResponse.json({
            role: "model",
            content: finalResponseText,
            chatId: finalChatId,
        });

    } catch (error) {
        console.error("Error generating content:", error);
        return NextResponse.json(
            { error: "Failed to generate content" },
            { status: 500 }
        );
    }
}
