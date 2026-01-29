import React, { useState, useMemo, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { listTLNodes, getTimelineConfig, TLNode } from '@/lib/timeline-api';
import { TimelineConfig } from '@/lib/timeline-api';
import { ChevronRight, X } from 'lucide-react';
import { buildIndex, getLevelName } from '../timeline/timeline-explorer-helpers';
import { cn } from '@/lib/utils';

interface TimelineFieldProps {
    storyId: string;
    value: string | null;
    onChange: (nodeId: string | null) => void;
}

export default function TimelineField({ storyId, value, onChange }: TimelineFieldProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const containerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Fetch data
    const { data: nodes = [] } = useQuery({
        queryKey: ['tl', 'nodes', storyId],
        queryFn: () => listTLNodes(storyId),
        enabled: !!storyId,
    });

    const { data: cfg } = useQuery<TimelineConfig | null>({
        queryKey: ['tl', 'config', storyId],
        queryFn: async () => {
            const config = await getTimelineConfig(storyId);
            return config;
        },
        enabled: !!storyId,
    });

    // Build indices
    const { nodeMap, byParent } = useMemo(() => {
        const map = new Map<string, TLNode>();
        nodes.forEach(n => map.set(n.id, n));
        return { nodeMap: map, byParent: buildIndex(nodes) };
    }, [nodes]);

    // Derive current path
    const currentPath = useMemo(() => {
        const path: TLNode[] = [];
        let curr = value ? nodeMap.get(value) : null;

        // If no value, try to find root
        if (!curr && !value) {
            // Can't assume root if value is null
        }

        while (curr) {
            path.unshift(curr);
            if (curr.parentId) {
                curr = nodeMap.get(curr.parentId);
            } else {
                // If no parentId, it's a root node. Stop traversing.
                curr = undefined;
            }
        }
        return path;
    }, [value, nodeMap]);

    // Determine what to show in dropdown
    // If searching, show search results
    // If not searching, show children of the *last* node in the path (or root if empty)
    const currentNode = currentPath.length > 0 ? currentPath[currentPath.length - 1] : null;

    const options = useMemo(() => {
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            return nodes.filter(n => {
                const title = n.title?.toLowerCase() || '';
                const name = n.name?.toLowerCase() || '';
                const lvlName = cfg ? getLevelName(n.level, cfg).toLowerCase() : '';
                // Check for integer match if query is a number
                const isIntMatch = !isNaN(parseInt(q)) && (n.position?.[n.position.length - 1] === parseInt(q));

                return title.includes(q) || name.includes(q) || lvlName.includes(q) || isIntMatch;
            }).slice(0, 10); // Limit results
        } else {
            // Show children of current node
            if (currentNode) {
                return byParent.get(currentNode.id) || [];
            } else {
                // Show root(s)
                return byParent.get(null) || [];
            }
        }
    }, [searchQuery, nodes, currentNode, byParent, cfg]);

    // Handle click outside
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
                setSearchQuery('');
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (node: TLNode) => {
        onChange(node.id);
        setSearchQuery('');
        // Keep open to allow further drilling down
        inputRef.current?.focus();
    };

    const handlePathClick = (nodeId: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onChange(nodeId);
        setIsOpen(true);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            if (options.length > 0) {
                const first = options[0];
                if (first) {
                    handleSelect(first);
                }
            }
        }
    };

    // Helper to get display name
    const getDisplayName = (n: TLNode) => n.name || n.title || (cfg ? getLevelName(n.level, cfg) : `Level ${n.level}`);

    return (
        <div className="relative" ref={containerRef}>
            <div
                className="flex items-center flex-wrap gap-1 w-full px-3 py-2 bg-background border border-border rounded-xl focus-within:ring-2 focus-within:ring-accent focus-within:border-accent transition-all cursor-text min-h-[42px]"
                onClick={() => {
                    setIsOpen(true);
                    inputRef.current?.focus();
                }}
            >
                {/* Path Display */}
                {!searchQuery && currentPath.length > 0 && currentPath.map((node, index) => (
                    <React.Fragment key={node.id}>
                        {index > 0 && <span className="text-muted-foreground text-sm"><ChevronRight className="w-3 h-3" /></span>}
                        <button
                            type="button"
                            onClick={(e) => handlePathClick(node.id, e)}
                            className="text-sm font-medium text-foreground hover:text-accent transition-colors px-1 rounded hover:bg-accent/10 whitespace-nowrap"
                        >
                            {getDisplayName(node)}
                        </button>
                    </React.Fragment>
                ))}

                {/* Input */}
                <input
                    ref={inputRef}
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setIsOpen(true);
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder={currentPath.length === 0 ? "Search or select level..." : ""}
                    className="flex-1 bg-background border-none outline-none text-sm min-w-[60px] focus-within:ring-accent"
                />

                {/* Clear Button (if value exists) */}
                {value && (
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            onChange(null);
                            setSearchQuery('');
                        }}
                        className="text-muted-foreground hover:text-foreground p-0.5"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Dropdown */}
            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-background border border-border rounded-xl shadow-lg max-h-60 overflow-y-auto custom-scrollbar animate-in fade-in zoom-in-95 duration-100">
                    {options.length === 0 ? (
                        <div className="p-3 text-sm text-muted-foreground text-center">
                            {searchQuery ? "No results found" : "No sub-levels available"}
                        </div>
                    ) : (
                        <div className="p-1">
                            {options.map(node => (
                                <button
                                    key={node.id}
                                    onClick={() => handleSelect(node)}
                                    className="w-full text-left px-3 py-2 text-sm rounded-lg hover:bg-accent/10 transition-colors flex items-center justify-between group"
                                >
                                    <span className="text-foreground font-medium">
                                        {getDisplayName(node)}
                                    </span>
                                    {node.title && (
                                        <span className="text-xs text-muted-foreground group-hover:text-foreground/80">
                                            {node.title}
                                        </span>
                                    )}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
