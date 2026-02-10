"use client"

import { useEffect, useRef, useState } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import { ArrowDownToLine, ArrowUpToLine } from "lucide-react"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"

// --- UI Primitives ---
import { Button } from "@/components/tiptap-ui-primitive/button"
import { Spacer } from "@/components/tiptap-ui-primitive/spacer"
import {
    Toolbar,
    ToolbarGroup,
    ToolbarSeparator,
} from "@/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "@/components/tiptap-node/image-upload-node/image-upload-node-extension"
import { HorizontalRule } from "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node-extension"
import "@/components/tiptap-node/blockquote-node/blockquote-node.scss"
import "@/components/tiptap-node/code-block-node/code-block-node.scss"
import "@/components/tiptap-node/horizontal-rule-node/horizontal-rule-node.scss"
import "@/components/tiptap-node/list-node/list-node.scss"
import "@/components/tiptap-node/image-node/image-node.scss"
import "@/components/tiptap-node/heading-node/heading-node.scss"
import "@/components/tiptap-node/paragraph-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "@/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "@/components/tiptap-ui/image-upload-button"
import { ListDropdownMenu } from "@/components/tiptap-ui/list-dropdown-menu"
import { BlockquoteButton } from "@/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "@/components/tiptap-ui/code-block-button"
import {
    ColorHighlightPopover,
    ColorHighlightPopoverContent,
    ColorHighlightPopoverButton,
} from "@/components/tiptap-ui/color-highlight-popover"
import {
    LinkPopover,
    LinkContent,
    LinkButton,
} from "@/components/tiptap-ui/link-popover"
import { MarkButton } from "@/components/tiptap-ui/mark-button"
import { TextAlignButton } from "@/components/tiptap-ui/text-align-button"

// --- Icons ---
import { ArrowLeftIcon } from "@/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "@/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "@/components/tiptap-icons/link-icon"

// --- Hooks ---
import { useIsBreakpoint } from "@/hooks/use-is-breakpoint"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "@/lib/tiptap-utils"

// --- Styles ---
import "@/components/tiptap-templates/simple/simple-editor.scss"

function MainToolbarContent(props: {
    onHighlighterClick: () => void
    onLinkClick: () => void
    isMobile: boolean
    toolbarPosition: "top" | "bottom"
    onTogglePosition: () => void
}) {
    const {
        onHighlighterClick,
        onLinkClick,
        isMobile,
        toolbarPosition,
        onTogglePosition,
    } = props

    return (
        <>
            <Spacer />

            <ToolbarGroup>
                <HeadingDropdownMenu levels={[1, 2, 3, 4]} portal={isMobile} />
                <ListDropdownMenu
                    types={["bulletList", "orderedList", "taskList"]}
                    portal={isMobile}
                />
                <BlockquoteButton />
                <CodeBlockButton />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="bold" />
                <MarkButton type="italic" />
                <MarkButton type="strike" />
                <MarkButton type="code" />
                <MarkButton type="underline" />
                {!isMobile ? (
                    <ColorHighlightPopover />
                ) : (
                    <ColorHighlightPopoverButton onClick={onHighlighterClick} />
                )}
                {!isMobile ? <LinkPopover /> : <LinkButton onClick={onLinkClick} />}
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <MarkButton type="superscript" />
                <MarkButton type="subscript" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <TextAlignButton align="left" />
                <TextAlignButton align="center" />
                <TextAlignButton align="right" />
                <TextAlignButton align="justify" />
            </ToolbarGroup>

            <ToolbarSeparator />

            <ToolbarGroup>
                <ImageUploadButton text="Add" />
            </ToolbarGroup>

            <Spacer />

            <ToolbarGroup>
                <Button
                    onClick={onTogglePosition}
                    className="h-8 w-8 p-0"
                    title={`Move toolbar to ${toolbarPosition === "top" ? "bottom" : "top"
                        }`}
                >
                    {toolbarPosition === "top" ? (
                        <ArrowDownToLine className="h-4 w-4" />
                    ) : (
                        <ArrowUpToLine className="h-4 w-4" />
                    )}
                </Button>
            </ToolbarGroup>

            {isMobile && <ToolbarSeparator />}
        </>
    )
}

function MobileToolbarContent(props: {
    type: "highlighter" | "link"
    onBack: () => void
}) {
    const { type, onBack } = props

    return (
        <>
            <ToolbarGroup>
                <Button data-style="ghost" onClick={onBack}>
                    <ArrowLeftIcon className="tiptap-button-icon" />
                    {type === "highlighter" ? (
                        <HighlighterIcon className="tiptap-button-icon" />
                    ) : (
                        <LinkIcon className="tiptap-button-icon" />
                    )}
                </Button>
            </ToolbarGroup>

            <ToolbarSeparator />

            {type === "highlighter" ? (
                <ColorHighlightPopoverContent />
            ) : (
                <LinkContent />
            )}
        </>
    )
}

export interface SimpleEditorProps {
    content?: any
    onChange?: (content: any) => void
}

export function SimpleEditor({ content, onChange }: SimpleEditorProps) {
    const isMobile = useIsBreakpoint()
    const [mobileView, setMobileView] = useState<
        "main" | "highlighter" | "link"
    >("main")
    const [toolbarPosition, setToolbarPosition] = useState<"top" | "bottom">(
        "bottom"
    )
    const toolbarRef = useRef<HTMLDivElement>(null)

    const editor = useEditor({
        immediatelyRender: false,
        editorProps: {
            attributes: {
                class: "simple-editor",
            },
        },
        extensions: [
            StarterKit.configure({
                horizontalRule: false,
                link: {
                    openOnClick: false,
                },
            }),
            HorizontalRule,
            TextAlign.configure({ types: ["heading", "paragraph"] }),
            TaskList,
            TaskItem.configure({ nested: true }),
            Highlight.configure({ multicolor: true }),
            Image,
            Typography,
            Superscript,
            Subscript,
            Selection,
            ImageUploadNode.configure({
                accept: "image/*",
                maxSize: MAX_FILE_SIZE,
                limit: 3,
                upload: handleImageUpload,
            }),
        ],
        content: content || "",
        onUpdate: ({ editor }) => {
            onChange?.(editor.getJSON())
        },
    })

    useEffect(() => {
        if (!isMobile && mobileView !== "main") {
            setMobileView("main")
        }
    }, [isMobile, mobileView])

    function ToolbarContent() {
        return mobileView === "main" ? (
            <MainToolbarContent
                onHighlighterClick={() => setMobileView("highlighter")}
                onLinkClick={() => setMobileView("link")}
                isMobile={isMobile}
                toolbarPosition={toolbarPosition}
                onTogglePosition={() =>
                    setToolbarPosition(p => (p === "top" ? "bottom" : "top"))
                }
            />
        ) : (
            <MobileToolbarContent
                type={mobileView === "highlighter" ? "highlighter" : "link"}
                onBack={() => setMobileView("main")}
            />
        )
    }

    return (
        <div className="simple-editor-wrapper h-full flex flex-col">
            <EditorContext.Provider value={{ editor }}>
                {toolbarPosition === "top" && (
                    <Toolbar
                        ref={toolbarRef}
                        className="sticky top-0 z-10 bg-background border-b"
                    >
                        <ToolbarContent />
                    </Toolbar>
                )}

                <div className="flex-1 overflow-y-auto">
                    <EditorContent editor={editor} />
                </div>

                {toolbarPosition === "bottom" && (
                    <Toolbar
                        ref={toolbarRef}
                        className="sticky bottom-0 z-10 bg-background border-t"
                    >
                        <ToolbarContent />
                    </Toolbar>
                )}
            </EditorContext.Provider>
        </div>
    )
}
