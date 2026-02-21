'use client';

import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { createPortal } from 'react-dom';
import {
    Send,
    Sparkles,
    Loader2,
    X,
    Minimize2,
    Plus,
    Puzzle,
    Pencil,
    ChartPie,
    Microscope,
    Lightbulb,
    UsersRound,
    MessageCircleQuestion,
    MessageCircle,
    ChevronRight,
    Search,
    Menu
} from 'lucide-react';

import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import { ChatHistory } from './ChatHistory';
import { ContextInput } from './ContextInput';
import { AIMessage } from '@/types/ai';
import { useStoryStore } from '@/store/useStoryStore';

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { CreateEntityPrimitive } from './CreateEntityPrimitive';
import { frontendSchemas } from '@/lib/ai/frontend-schemas';
import { toast } from 'sonner';

export function AIPopover() {

    const [isOpen, setIsOpen] = useState(false);
    const [isSidebarExpanded, setIsSidebarExpanded] = useState(false);
    const [mode, setMode] = useState('BRAINSTORM_MODE');

    // width only, height fixed
    const [size, setSize] = useState({ width: 600 }); // Slightly wider default to accommodate sidebar

    const popoverRef = useRef<HTMLDivElement>(null);

    const storyId = useStoryStore(state => state.selectedStoryId);

    const [currentChatId, setCurrentChatId] = useState<string | null>(null);
    const skipFetchRef = useRef(false);

    const [messages, setMessages] = useState<AIMessage[]>([]);

    const [inputValue, setInputValue] = useState('');

    const [isModeMenuOpen, setIsModeMenuOpen] = useState(false);

    const [isLoading, setIsLoading] = useState(false);


    /////////////////////////////////////////////////////////////////
    // Persist width
    /////////////////////////////////////////////////////////////////

    useEffect(() => {
        const saved = localStorage.getItem("ai-popover-width");
        if (saved) {
            setSize({ width: Number(saved) });
        }
    }, []);

    useEffect(() => {
        localStorage.setItem("ai-popover-width", String(size.width));
    }, [size.width]);

    /////////////////////////////////////////////////////////////////
    // Load chat
    /////////////////////////////////////////////////////////////////

    useEffect(() => {

        if (!currentChatId) {
            setMessages([]); // No initial messages
            return;
        }

        if (skipFetchRef.current) {
            skipFetchRef.current = false;
            return;
        }

        fetchMessages(currentChatId);

    }, [currentChatId]);


    /////////////////////////////////////////////////////////////////
    // Fetch
    /////////////////////////////////////////////////////////////////

    const fetchMessages = async (chatId: string) => {

        setIsLoading(true);

        try {

            const res = await fetch(`/api/ai/chats/${chatId}`);

            if (!res.ok) return;

            const data = await res.json();

            setMessages(data.messages || []);

        }
        finally {
            setIsLoading(false);
        }

    };


    /////////////////////////////////////////////////////////////////
    // Resize logic (horizontal only)
    /////////////////////////////////////////////////////////////////

    const handleResize = (e: React.MouseEvent) => {

        e.preventDefault();

        if (!popoverRef.current) return;

        const startX = e.clientX;

        const startWidth = popoverRef.current.offsetWidth;

        const handleMove = (e: MouseEvent) => {

            const delta = startX - e.clientX;

            const newWidth = startWidth + delta;

            setSize({
                width:
                    Math.max(
                        450, // Min width increased for sidebar
                        Math.min(newWidth, window.innerWidth * 0.95)
                    )
            });

        };

        const handleUp = () => {

            window.removeEventListener("mousemove", handleMove);

            window.removeEventListener("mouseup", handleUp);

        };

        window.addEventListener("mousemove", handleMove);

        window.addEventListener("mouseup", handleUp);

    };

    /////////////////////////////////////////////////////////////////
    // Click Outside
    /////////////////////////////////////////////////////////////////

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {

            const target = event.target as HTMLElement;

            const clickedInsidePanel =
                target.closest('[data-ai-panel]');

            const clickedDropdown =
                target.closest('[data-radix-popper-content-wrapper]');

            if (!clickedInsidePanel && !clickedDropdown) {
                setIsOpen(false);
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [isOpen]);


    /////////////////////////////////////////////////////////////////
    // Send message
    /////////////////////////////////////////////////////////////////

    const handleSendMessage = async () => {

        if (!inputValue.trim() || isLoading) return;

        const content = inputValue;

        setInputValue('');

        const tempMsg: AIMessage = {
            id: Date.now().toString(),
            chatId: currentChatId || 'temp',
            role: 'user',
            content,
            createdAt: new Date().toISOString()
        };

        setMessages(prev => [...prev, tempMsg]);

        setIsLoading(true);

        try {

            const res = await fetch('/api/ai/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    messages: [...messages, tempMsg],
                    chatId: currentChatId,
                    context: { mode, storyId }
                })
            });

            const data = await res.json();

            if (!currentChatId && data.chatId) {
                skipFetchRef.current = true;
                setCurrentChatId(data.chatId);
            }

            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    chatId: data.chatId || currentChatId || '',
                    role: 'assistant',
                    content: data.content,
                    createdAt: new Date().toISOString()
                }
            ]);

        }
        finally {
            setIsLoading(false);
        }

    };


    /////////////////////////////////////////////////////////////////
    // Create Entity Handler
    /////////////////////////////////////////////////////////////////

    const handleCreateEntity = async (data: any, type: string) => {
        try {
            let endpoint = '';
            switch (type) {
                case 'Card': endpoint = '/api/cards'; break;
                case 'Event': endpoint = '/api/events'; break;
                case 'Note': endpoint = '/api/notes'; break;
                // Add other mappings as needed
                default:
                    throw new Error(`Unknown entity type: ${type}`);
            }

            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...data, storyId })
            });

            if (!res.ok) throw new Error('Failed to create entity');

            toast.success(`${type} created successfully!`);

            // Add system message confirming creation
            setMessages(prev => [
                ...prev,
                {
                    id: Date.now().toString(),
                    chatId: currentChatId || '',
                    role: 'assistant',
                    content: `Successfully created ${type}: ${data.name || data.title}`,
                    createdAt: new Date().toISOString()
                }
            ]);

        } catch (error) {
            console.error(error);
            toast.error(`Failed to create ${type}`);
        }
    };

    // Helper to render message content or creation UI
    const renderMessageContent = (msg: AIMessage) => {
        if (msg.role === 'assistant' && mode === 'CREATE_MODE' && msg.content.trim().startsWith('{')) {
            try {
                const parsed = JSON.parse(msg.content);
                // Check if it looks like a proposal
                if (parsed.create_proposal) {
                    const proposal = parsed.create_proposal;
                    const type = proposal.type || 'Card'; // Default or detect
                    const schema = frontendSchemas[type as keyof typeof frontendSchemas];

                    if (schema) {
                        return (
                            <div className="w-full max-w-md">
                                <CreateEntityPrimitive
                                    type={type as any}
                                    initialData={proposal}
                                    schema={schema}
                                    onAccept={(data) => handleCreateEntity(data, type)}
                                    onReject={() => {
                                        toast.info("Creation cancelled");
                                    }}
                                />
                            </div>
                        );
                    }
                }
            } catch (e) {
                // Fallback to text if not valid JSON
            }
        }

        return <ReactMarkdown
            components={{
                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2" {...props} />,
                ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2" {...props} />,
                li: ({ node, ...props }) => <li className="mb-1" {...props} />,
                code: ({ node, inline, className, children, ...props }: any) => {
                    if (inline) {
                        return <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono" {...props}>{children}</code>
                    }
                    return <code className="block bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto my-2" {...props}>{children}</code>
                }
            }}
        >
            {msg.content}
        </ReactMarkdown>;
    };

    /////////////////////////////////////////////////////////////////
    // Mode Config
    /////////////////////////////////////////////////////////////////

    const MODES = [
        {
            id: 'BRAINSTORM_MODE',
            label: 'Brainstorm',
            icon: Lightbulb,
            color: 'text-amber-500',
            title: 'Ready to Brainstorm',
            description: 'Generate ideas, explore possibilities, and break creative blocks.'
        },
        {
            id: 'CREATE_MODE',
            label: 'Create',
            icon: Puzzle,
            color: 'text-blue-500',
            title: 'Creation Mode Active',
            description: 'Build structured cards, events, or fully-formed concepts.'
        },
        {
            id: 'WRITE_MODE',
            label: 'Write',
            icon: Pencil,
            color: 'text-orange-500',
            title: 'Writing Assistant Ready',
            description: 'Draft, refine, and elevate your writing with clarity and flow.'
        },
        {
            id: 'ANALYSIS_MODE',
            label: 'Analysis',
            icon: ChartPie,
            color: 'text-purple-500',
            title: 'Ready To Analyze',
            description: 'Break down complexity, extract insights, and understand deeply.'
        },
        {
            id: 'RESEARCH_MODE',
            label: 'Research',
            icon: Microscope,
            color: 'text-cyan-500',
            title: 'Research Mode Ready',
            description: 'Investigate topics, gather facts, and build reliable knowledge.'
        },
        {
            id: 'CHARACTER_MODE',
            label: 'Character',
            icon: UsersRound,
            color: 'text-emerald-500',
            title: 'Character Embodiment Active',
            description: 'Step into a character and interact as them with authentic personality, and perspective.'
        },
        {
            id: 'QA_MODE',
            label: 'Q & A',
            icon: MessageCircleQuestion,
            color: 'text-green-500',
            title: 'Question & Answer Mode',
            description: 'Ask anything and get clear, direct, and accurate answers.'
        }
    ];


    const currentModeConfig =
        MODES.find(m => m.id === mode) ?? {
            label: 'Chat',
            title: 'AI Assistant Ready',
            description: 'Your intelligent creative partner.',
            icon: MessageCircle,
            color: 'text-primary'
        };

    let hoverTimeout: NodeJS.Timeout;

    /////////////////////////////////////////////////////////////////
    // UI
    /////////////////////////////////////////////////////////////////

    return (

        <>
            {/* Trigger Button */}
            <Button
                onClick={() => setIsOpen(true)}
                variant="outline"
                size="icon"
                className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg border-2 border-primary/20 hover:border-primary/50 bg-background/80 backdrop-blur-sm z-[100] transition-all duration-300 hover:scale-110"
            >
                <Sparkles className="h-6 w-6 text-primary animate-pulse" />
            </Button>

            {/* Panel */}
            {isOpen && typeof window !== "undefined" &&
                createPortal(
                    <div
                        ref={popoverRef}
                        data-ai-panel
                        className="
                    fixed
                    right-6
                    top-1/2
                    -translate-y-1/2
                    h-[90vh]
                    flex
                    shadow-2xl
                    border
                    bg-background
                    z-[300]
                    rounded-lg
                    overflow-hidden
                "
                        style={{ width: size.width }}
                    >

                        {/* Resize Handle */}
                        <div
                            onMouseDown={handleResize}
                            className="
                        absolute
                        left-0
                        top-0
                        h-full
                        w-1.5
                        cursor-ew-resize
                        hover:bg-primary/20
                        z-50
                    "
                        />


                        {/* Sidebar */}

                        <div
                            onMouseEnter={() => {
                                clearTimeout(hoverTimeout);
                                setIsSidebarExpanded(true);
                            }}

                            onMouseLeave={() => {
                                hoverTimeout = setTimeout(() => {
                                    if (!isModeMenuOpen)
                                        setIsSidebarExpanded(false);
                                }, 150);
                            }}


                            className={cn(
                                "flex flex-col border-r bg-muted/20 transition-all duration-300 ease-in-out relative z-40 group/sidebar",
                                isSidebarExpanded ? "w-64" : "w-16"
                            )}
                        >
                            {/* Top: Mode Selector */}
                            <div className="p-3 border-b flex items-center justify-center">
                                <DropdownMenu
                                    open={isModeMenuOpen}
                                    onOpenChange={(open) => {
                                        setIsModeMenuOpen(open);
                                        if (open) setIsSidebarExpanded(true);
                                    }}
                                >

                                    <DropdownMenuTrigger asChild>
                                        <Button
                                            variant="ghost"
                                            className={cn(
                                                "w-full flex items-center gap-3 transition-all p-2 h-auto",
                                                isSidebarExpanded ? "justify-start px-3" : "justify-center px-0"
                                            )}
                                        >
                                            <div className={cn("p-1.5 rounded-md bg-background shadow-sm border", currentModeConfig.color)}>
                                                <currentModeConfig.icon className="h-5 w-5" />
                                            </div>

                                            {isSidebarExpanded && (
                                                <div className="flex flex-col items-start animate-in fade-in duration-300">
                                                    <span className="text-sm font-medium">{currentModeConfig.label}</span>
                                                    <span className="text-[10px] text-muted-foreground">Click to change</span>
                                                </div>
                                            )}
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent
                                        align="start"
                                        side="right"
                                        sideOffset={8}
                                        collisionPadding={8}
                                        className="w-56 z-[1000] bg-background"
                                    >
                                        {MODES.map((m) => (
                                            <DropdownMenuItem
                                                key={m.id}
                                                onClick={() => setMode(m.id)}
                                                className="gap-2 p-2 cursor-pointer"
                                            >
                                                <m.icon className={cn("h-4 w-4", m.color)} />
                                                <span>{m.label}</span>
                                                {mode === m.id && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-primary" />}
                                            </DropdownMenuItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>

                            {/* Middle: Chat History */}
                            <div className="flex-1 overflow-hidden min-h-0">
                                <ChatHistory
                                    currentChatId={currentChatId}
                                    onSelectChat={setCurrentChatId}
                                    onNewChat={() => setCurrentChatId(null)}
                                    isExpanded={isSidebarExpanded}
                                />
                            </div>

                            {/* Bottom: Controls */}
                            <div className="p-3 border-t flex flex-col gap-2">
                                {/* New Chat - Handled in ChatHistory list usually, but duplicated here for quick access if needed, or removed if redundant. 
                                    User asked for specific icons: X and Plus. */}

                                {isSidebarExpanded && (
                                    <div className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-1">Actions</div>
                                )}

                                <Button
                                    variant="ghost"
                                    onClick={() => setCurrentChatId(null)}
                                    className={cn(
                                        "w-full flex items-center gap-3 transition-all",
                                        isSidebarExpanded ? "justify-start" : "justify-center p-0"
                                    )}
                                    title="New Chat"
                                >
                                    <Plus className="h-4 w-4" />
                                    {isSidebarExpanded && <span>New Chat</span>}
                                </Button>

                                <Button
                                    variant="ghost"
                                    onClick={() => setIsOpen(false)}
                                    className={cn(
                                        "w-full flex items-center gap-3 transition-all hover:bg-destructive/10 hover:text-destructive",
                                        isSidebarExpanded ? "justify-start" : "justify-center p-0"
                                    )}
                                    title="Close"
                                >
                                    <X className="h-4 w-4" />
                                    {isSidebarExpanded && <span>Close AI</span>}
                                </Button>
                            </div>

                        </div>


                        {/* Main Content */}

                        < div className="flex-1 flex flex-col min-w-0 bg-background/50 backdrop-blur-sm" >
                            < div className="overflow-y-auto">
                                {/* Feature Screen / Messages */}
                                {
                                    messages.length === 0 ? (
                                        <div className="flex flex-col items-center justify-center h-full text-center space-y-6 p-6 select-none opacity-80">

                                            <div className="relative">
                                                <div className="absolute -inset-1 bg-gradient-to-r from-primary to-purple-600 rounded-full blur opacity-25 animate-pulse"></div>
                                                <div className="relative bg-background p-4 rounded-full border shadow-sm">
                                                    <currentModeConfig.icon className={cn("h-8 w-8", currentModeConfig.color)} />
                                                </div>
                                            </div>

                                            <div className="space-y-2 max-w-xs">
                                                <h3 className="font-semibold text-lg tracking-tight">
                                                    {currentModeConfig.title}
                                                </h3>

                                                <p className="text-sm text-muted-foreground">
                                                    {currentModeConfig.description}
                                                </p>
                                            </div>


                                            <div className="grid grid-cols-2 gap-3 w-full max-w-sm">
                                                {MODES.slice(0, 4).map(m => (
                                                    <div
                                                        key={m.id}
                                                        className={cn(
                                                            "flex flex-col items-center gap-2 p-3 rounded-xl border bg-card/50 hover:bg-card transition-all cursor-pointer group",
                                                            mode === m.id ? "border-primary/50 bg-primary/5" : "hover:border-primary/50"
                                                        )}
                                                        onClick={() => setMode(m.id)}
                                                    >
                                                        <div className={cn("p-2 rounded-lg bg-muted text-muted-foreground group-hover:scale-110 transition-transform", mode === m.id && "bg-primary/10 text-primary")}>
                                                            <m.icon className="h-4 w-4" />
                                                        </div>
                                                        <span className="text-xs font-medium">{m.label}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col gap-4 m-4">
                                            {messages.map(msg => (
                                                <div
                                                    key={msg.id}
                                                    className={cn(
                                                        "flex gap-2",
                                                        msg.role === 'user' ? "justify-end" : "justify-start"
                                                    )}
                                                >
                                                    <div
                                                        className={cn(
                                                            "p-3 rounded-xl border max-w-[85%] text-sm shadow-sm",
                                                            msg.role === 'user'
                                                                ? "bg-primary text-primary-foreground border-primary/50"
                                                                : "bg-muted/50 border-border"
                                                        )}
                                                    >
                                                        {renderMessageContent(msg)}
                                                    </div>
                                                </div>
                                            ))}

                                            {isLoading && (
                                                <div className="flex justify-start">
                                                    <div className="p-3 rounded-xl border bg-muted/50 border-border flex items-center gap-2">
                                                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                                                        <span className="text-xs text-muted-foreground">Thinking...</span>
                                                    </div>
                                                </div>
                                            )}

                                            {/* Spacer */}
                                            <div className="h-4" />
                                        </div>
                                    )
                                }
                            </div>
                            {/* Input */}

                            < div className="p-3 fixed bottom-4 left-1/2 -translate-x-1/2 z-[500] w-[90%] bg-surface-2 flex gap-2 rounded-2xl shadow-lg backdrop-blur-sm" >

                                <ContextInput
                                    value={inputValue}
                                    onChange={setInputValue}
                                    onSubmit={handleSendMessage}
                                    disabled={isLoading}
                                />


                                <Button
                                    size="icon"
                                    onClick={handleSendMessage}
                                    className="hover:bg-accent"
                                >
                                    <Send size={16} />
                                </Button>

                            </div >


                        </div >


                    </div >,
                    document.body
                )
            }
        </>
    )
}