'use client';

import { useState, useRef, useEffect } from 'react';
import { useStoryStore } from '@/store/useStoryStore';
import { ContextReference } from '@/types/ai';
import { cn } from '@/lib/utils';
import { Loader2, Box, Calendar, FileText, Activity } from 'lucide-react';
import throttle from 'lodash.throttle';

interface ContextInputProps {
    value: string;
    onChange: (value: string) => void;
    onSubmit: () => void;
    disabled?: boolean;
    placeholder?: string;
}

export function ContextInput({ value, onChange, onSubmit, disabled, placeholder }: ContextInputProps) {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [recommendations, setRecommendations] = useState<ContextReference[]>([]);
    const [loading, setLoading] = useState(false);
    const [menuIndex, setMenuIndex] = useState(0);
    const [cursorCoords, setCursorCoords] = useState<{ top: number; left: number } | null>(null);

    const contentRef = useRef<HTMLDivElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const storyId = useStoryStore(state => state.selectedStoryId);

    // Sync value prop to contentEditable only when cleared (empty)
    useEffect(() => {
        if (value === '' && contentRef.current && contentRef.current.innerText.trim() !== '') {
            contentRef.current.innerText = '';
        }
    }, [value]);

    const searchRefs = async (searchQuery: string) => {
        if (!storyId || searchQuery.length < 2) {
            setRecommendations([]);
            return;
        }

        setLoading(true);
        try {
            const res = await fetch('/api/ai/context', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query: searchQuery, storyId })
            });
            if (res.ok) {
                const data = await res.json();
                setRecommendations(data);
                setMenuIndex(0);
            }
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const throttledSearch = useRef(throttle(searchRefs, 500)).current;

    useEffect(() => {
        if (open) {
            throttledSearch(query);
        }
    }, [query, open]);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const serializeContent = () => {
        if (!contentRef.current) return '';

        let text = '';
        contentRef.current.childNodes.forEach(node => {
            if (node.nodeType === Node.TEXT_NODE) {
                text += node.textContent;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                const el = node as HTMLElement;
                if (el.hasAttribute('data-raw')) {
                    text += el.getAttribute('data-raw');
                } else {
                    text += el.innerText;
                }
            }
        });
        return text;
    };

    const updateValue = () => {
        const val = serializeContent();
        onChange(val);
        checkTrigger();
    };

    const checkTrigger = () => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;

        // We need to find the text before the cursor in the current text node
        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const text = textNode.textContent || '';
        const offset = range.startOffset;
        const textBeforeBox = text.slice(0, offset);

        const lastAt = textBeforeBox.lastIndexOf('@');

        if (lastAt !== -1) {
            const charBefore = textBeforeBox[lastAt - 1];
            const isStart = lastAt === 0 || (charBefore ? /\s/.test(charBefore) : false);
            const queryText = textBeforeBox.slice(lastAt + 1);
            const hasSpaceInQuery = /\s/.test(queryText);

            if (isStart && !hasSpaceInQuery) {
                setQuery(queryText);
                setOpen(true);

                // Get cursor position for menu
                const rect = range.getBoundingClientRect();
                const containerRect = containerRef.current?.getBoundingClientRect();
                if (rect && containerRect) {
                    setCursorCoords({
                        top: rect.bottom - containerRect.top,
                        left: rect.left - containerRect.left
                    });
                }
                return;
            }
        }
        setOpen(false);
    };

    const insertReference = (item: ContextReference) => {
        const selection = window.getSelection();
        if (!selection || !selection.rangeCount) return;

        const range = selection.getRangeAt(0);
        const textNode = range.startContainer;

        if (textNode.nodeType !== Node.TEXT_NODE) return;

        const text = textNode.textContent || '';
        const offset = range.startOffset;
        const lastAt = text.slice(0, offset).lastIndexOf('@');

        // Create the atomic pill
        const span = document.createElement('span');
        span.contentEditable = 'false';
        span.className = 'inline-flex items-center mx-1 px-1.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 text-xs font-semibold select-none pointer-events-none align-middle shadow-sm';
        span.innerText = `@${item.name}`;
        span.setAttribute('data-raw', `@[${item.type}:${item.id}]`);

        // Replace the query text with the span
        range.setStart(textNode, lastAt);
        range.setEnd(textNode, offset);
        range.deleteContents();
        range.insertNode(span);

        // Insert a space after
        const space = document.createTextNode('\u00A0');
        range.setStartAfter(span);
        range.setEndAfter(span);
        range.insertNode(space);

        // Move cursor after space
        range.setStartAfter(space);
        range.setEndAfter(space);
        selection.removeAllRanges();
        selection.addRange(range);

        setOpen(false);
        updateValue();

        // Restore focus
        if (contentRef.current) {
            contentRef.current.focus();
        }
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
        if (open && recommendations.length > 0) {
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setMenuIndex(prev => (prev + 1) % recommendations.length);
                return;
            }
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setMenuIndex(prev => (prev - 1 + recommendations.length) % recommendations.length);
                return;
            }
            if (e.key === 'Enter' || e.key === 'Tab') {
                e.preventDefault();
                const selected = recommendations[menuIndex];
                if (selected) insertReference(selected);
                return;
            }
            if (e.key === 'Escape') {
                e.preventDefault();
                setOpen(false);
                return;
            }
        }

        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            onSubmit();
        }
    };

    const getIcon = (type: string) => {
        switch (type) {
            case 'card': return <Box className="h-4 w-4 flex-shrink-0 text-blue-500" />;
            case 'event': return <Calendar className="h-4 w-4 flex-shrink-0 text-orange-500" />;
            case 'note': return <FileText className="h-4 w-4 flex-shrink-0 text-yellow-500" />;
            case 'timeline': return <Activity className="h-4 w-4 flex-shrink-0 text-green-500" />;
            default: return <Box className="h-4 w-4 flex-shrink-0" />;
        }
    };

    return (
        <div className="relative w-full" ref={containerRef}>
            {/* Context Menu */}
            {open && (
                <div
                    className="absolute bg-popover/90 backdrop-blur-md border border-primary/10 rounded-lg shadow-xl z-50 overflow-hidden flex flex-col max-h-[220px] w-[300px] animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        bottom: '100%',
                        left: cursorCoords ? Math.min(cursorCoords.left, 200) : 0, // Prevent overflow to right
                        marginBottom: '8px'
                    }}
                >
                    <div className="p-2 border-b border-primary/5 text-xs text-muted-foreground bg-primary/5 font-medium truncate flex items-center gap-2">
                        <Loader2 className={cn("h-3 w-3", loading ? "animate-spin" : "opacity-0")} />
                        Searching for "{query}"...
                    </div>

                    {!loading && recommendations.length === 0 && (
                        <div className="p-4 text-center text-sm text-muted-foreground italic">
                            No results found.
                        </div>
                    )}

                    <div className="overflow-y-auto flex-1 p-1">
                        {recommendations.map((item, index) => (
                            <button
                                key={`${item.type}-${item.id}`}
                                className={cn(
                                    "w-full text-left px-3 py-2 text-sm rounded-md flex items-center gap-2 transition-all duration-150",
                                    index === menuIndex
                                        ? "bg-primary/10 text-primary shadow-sm"
                                        : "hover:bg-muted text-muted-foreground hover:text-foreground"
                                )}
                                onClick={() => insertReference(item)}
                                onMouseEnter={() => setMenuIndex(index)}
                            >
                                {getIcon(item.type)}
                                <div className="flex flex-col overflow-hidden min-w-0">
                                    <span className="truncate font-medium leading-none mb-0.5">{item.name}</span>
                                    <span className="text-[10px] opacity-70 capitalize flex items-center gap-1">
                                        {item.type}
                                        {item.subtitle && ` • ${item.subtitle}`}
                                    </span>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div
                ref={contentRef}
                contentEditable={!disabled}
                onInput={updateValue}
                onKeyDown={handleKeyDown}
                className={cn(
                    "flex min-h-[40px] w-full rounded-md bg-transparent px-2 py-1.5 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50",
                    "max-h-[120px] overflow-y-auto whitespace-pre-wrap break-words"
                )}
                style={{ outline: 'none' }}
                data-placeholder={placeholder || "Type a message..."}
            />
            {(!value || value === '') && (
                <div className="absolute top-1.5 left-2 text-sm text-muted-foreground pointer-events-none opacity-50">
                    {placeholder || "Type a message... Use @ to mention"}
                </div>
            )}
        </div>
    );
}
