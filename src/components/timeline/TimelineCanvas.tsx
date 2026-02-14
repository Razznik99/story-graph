import React, { useEffect, useMemo, useState } from 'react';
import { useTimelineStore } from '@/store/useTimelineStore';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useCamera } from '@/hooks/useCamera';
import { TimelineConfig, Timeline, Event, getTimelineConfig } from '@/lib/timeline-api';
import { calculateSingleLevelLayout, LayoutItem, LANES } from '@/lib/timeline-layout';
import { getDerivedNumber } from './timeline-explorer-helpers';
import { TimelineCanvasControls } from './TimelineCanvasControls';
import { Option } from '@/components/ui/searchable-select';
import { INTENSITY_COLORS } from '@/domain/constants/index';

interface TimelineCanvasProps {
    storyId: string;
    events: Event[];
    timelineNodes: Timeline[];
    onSelectEvent: (eventId: string) => void;
}

export default function TimelineCanvas({
    storyId,
    events,
    timelineNodes,
    onSelectEvent,
}: TimelineCanvasProps) {
    const { camera, ref, bind, controls } = useCamera({
        minScale: 0.1,
        maxScale: 3
    });

    const { currentLevelId, setCurrentLevelId } = useTimelineStore();
    const [currentLevelName, setCurrentLevelName] = useState("Story Start");
    const [isSearchOpen, setIsSearchOpen] = useState(false);
    const [activeEventIds, setActiveEventIds] = useState<Set<string>>(new Set());
    const [viewHeight, setViewHeight] = useState(0);
    const [hoveredLink, setHoveredLink] = useState<{
        x: number;
        y: number;
        title: string;
        type: string;
    } | null>(null);
    const [pendingCenterEventId, setPendingCenterEventId] = useState<string | null>(null);

    // Fetch event relations for the story
    const { data: relationsData } = useQuery({
        queryKey: ['event-relations', storyId],
        queryFn: async () => {
            const res = await fetch(`/api/events/relations?storyId=${storyId}&type=event`);
            if (!res.ok) throw new Error('Failed to fetch relations');
            return res.json();
        },
        enabled: !!storyId
    });

    const { data: config } = useQuery({
        queryKey: ['tl', 'config', storyId],
        queryFn: () => getTimelineConfig(storyId),
        enabled: !!storyId,
        staleTime: Infinity,
    });

    const linkMap = useMemo(() => {
        const map = new Map<string, any[]>();
        if (relationsData?.links) {
            relationsData.links.forEach((link: any) => {
                if (!map.has(link.eventId)) map.set(link.eventId, []);
                map.get(link.eventId)?.push(link);
            });
        }
        return map;
    }, [relationsData]);


    // Initialize currentLevelId & Safety Check
    useEffect(() => {
        if (timelineNodes.length > 0) {
            // If currentLevelId is set but not found, or not set at all, default to root
            const exists = currentLevelId && timelineNodes.find(n => n.id === currentLevelId);
            if (!currentLevelId || !exists) {
                const root = timelineNodes.find(n => !n.parentId);
                if (root) setCurrentLevelId(root.id);
            }
        }
    }, [timelineNodes, currentLevelId]);

    // Update level name display
    useEffect(() => {
        if (currentLevelId && config) {
            const node = timelineNodes.find(n => n.id === currentLevelId);
            if (node) {
                const num = getDerivedNumber(node, timelineNodes, config);
                const base = node.title || node.name || "Level";

                // Condition: Single Timeline Level 1 -> No Number
                const isSingleRoot = config.timelineType === 'single' && node.level === 1;

                setCurrentLevelName(isSingleRoot ? base : `${base} ${num}`);
            }
        } else {
            setCurrentLevelName("Story");
        }
    }, [currentLevelId, timelineNodes, config]);

    const layoutItems = useMemo(() => {
        if (!config) return [];
        return calculateSingleLevelLayout(currentLevelId, timelineNodes, events, config);
    }, [currentLevelId, timelineNodes, events, config]);

    // Handle Centering of Event after Navigation
    useEffect(() => {
        if (!pendingCenterEventId) return;

        centerOnEvent(pendingCenterEventId);
        setActiveEventIds(prev => {
            const next = new Set(prev);
            next.add(pendingCenterEventId);
            return next;
        });
        onSelectEvent(pendingCenterEventId);
        setPendingCenterEventId(null);
    }, [pendingCenterEventId, layoutItems]);


    const handleArcNavigate = (
        e: React.PointerEvent,
        targetEvent: Event
    ) => {
        e.stopPropagation();
        setHoveredLink(null);
        // Navigate level if needed
        if (targetEvent.timelineId && targetEvent.timelineId !== currentLevelId) {
            setCurrentLevelId(targetEvent.timelineId);
            setActiveEventIds(new Set());
            setPendingCenterEventId(targetEvent.id);
        }

        // Defer centering until layout updates
        setPendingCenterEventId(targetEvent.id);
    };

    // Calculate Arcs
    const arcs = useMemo(() => {
        if (activeEventIds.size === 0) return [];

        const itemMap = new Map<string, LayoutItem>();
        layoutItems.forEach(item => itemMap.set(item.id, item));

        const arcItems: React.ReactNode[] = [];

        // Helper to find ancestor at specific level
        const getAncestorAtLevel = (startNode: Timeline, targetLevel: number): Timeline | null => {
            let curr: Timeline | undefined = startNode;
            while (curr && curr.level > targetLevel) {
                if (!curr.parentId) return null;
                curr = timelineNodes.find(n => n.id === curr!.parentId);
            }
            return curr && curr.level === targetLevel ? curr : null;
        };

        const analyzeRelation = (
            sourceNode: Timeline,
            targetNode: Timeline
        ): {
            type: 'same' | 'child' | 'sibling' | 'parent' | 'ancestor-sibling';
            diff?: number;
            dir?: 'before' | 'after';
        } => {
            if (sourceNode.id === targetNode.id) return { type: 'same' };

            // Case 1: Target is SubLevel (Deeper)
            if (targetNode.level > sourceNode.level) {
                // Check direct child (ancestor at level+1 has parent == source)
                const childAncestor = getAncestorAtLevel(targetNode, sourceNode.level + 1);
                if (childAncestor && childAncestor.parentId === sourceNode.id) {
                    return { type: 'child' };
                }

                // If not direct child, check ancestor at same level (sibling/peer)
                const peer = getAncestorAtLevel(targetNode, sourceNode.level);
                if (peer && peer.id !== sourceNode.id) {
                    const peerOrder = Number(peer.orderKey ?? 0);
                    const sourceOrder = Number(sourceNode.orderKey ?? 0);
                    const diff = peerOrder > sourceOrder ? 1 : -1;
                    return { type: 'sibling', diff };
                }
                return { type: 'same' };
            }

            // Case 2: Target is Higher Level (Ancestor)
            if (targetNode.level < sourceNode.level) {
                const sourceAncestor = getAncestorAtLevel(sourceNode, targetNode.level);
                if (sourceAncestor) {
                    if (sourceAncestor.id === targetNode.id) {
                        return { type: 'parent' };
                    } else {
                        // Ancestor Sibling
                        const targetOrder = Number(targetNode.orderKey ?? 0);
                        const ancestorOrder = Number(sourceAncestor.orderKey ?? 0);
                        return {
                            type: 'ancestor-sibling',
                            dir: targetOrder > ancestorOrder ? 'after' : 'before'
                        };
                    }
                }
            }

            // Case 3: Same Level Sibling
            if (targetNode.level === sourceNode.level) {
                const targetOrder = Number(targetNode.orderKey ?? 0);
                const sourceOrder = Number(sourceNode.orderKey ?? 0);
                return { type: 'sibling', diff: targetOrder > sourceOrder ? 1 : -1 };
            }

            return { type: 'same' };
        };

        const currentLevelNode = timelineNodes.find(n => n.id === currentLevelId);
        if (!currentLevelNode) return [];

        activeEventIds.forEach(eventId => {
            const event = events.find(e => e.id === eventId);
            const sourceItem = itemMap.get(eventId);
            const links = linkMap.get(eventId);

            if (!event || !sourceItem || !links) return;

            links.forEach(link => {
                const targetEvent = events.find(e => e.id === link.linkId);
                if (!targetEvent) return;

                const isHovered = hoveredLink?.title === link.link?.title && hoveredLink?.type === link.relationshipType;
                const baseOpacity = isHovered ? 1 : 0.85;
                const strokeColor = "var(--color-accent)";

                const handlers = {
                    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
                    onMouseEnter: (e: React.MouseEvent) => {
                        if (link.link) {
                            setHoveredLink({
                                x: e.clientX,
                                y: e.clientY,
                                title: link.link.title,
                                type: link.relationshipType
                            });
                        }
                    },
                    onMouseLeave: () => setHoveredLink(null),
                    onClick: (e: React.MouseEvent) => {
                        if (targetEvent) handleArcNavigate(e as any, targetEvent);
                    }
                };

                let targetX = sourceItem.x;
                let pathD = "";

                if (targetEvent.timelineId === currentLevelId) {
                    const targetItem = itemMap.get(targetEvent.id);
                    if (targetItem) {
                        targetX = targetItem.x;
                        const midX = (sourceItem.x + targetX) / 2;
                        const dist = Math.abs(targetX - sourceItem.x);
                        const height = Math.max(50, dist / 2);
                        pathD = `M ${sourceItem.x} 0 Q ${midX} ${-height} ${targetX} 0`;
                    }
                } else {
                    const targetNode = timelineNodes.find(n => n.id === targetEvent.timelineId);
                    if (targetNode) {
                        const rel = analyzeRelation(currentLevelNode, targetNode);

                        if (rel.type === 'child') {
                            const childNode = getAncestorAtLevel(targetNode, currentLevelNode.level + 1);
                            if (childNode) {
                                const targetSubItem = layoutItems.find(i => i.type === 'subLevel' && i.data?.id === childNode.id);
                                if (targetSubItem) {
                                    targetX = targetSubItem.x;
                                    const midX = (sourceItem.x + targetX) / 2;
                                    const dist = Math.abs(targetX - sourceItem.x);
                                    const height = Math.max(50, dist / 2);
                                    pathD = `M ${sourceItem.x} 0 Q ${midX} ${-height} ${targetX} -20`;
                                }
                            }
                        }
                        else if (rel.type === 'sibling') {
                            const diff = rel.diff!;
                            let navItem: LayoutItem | undefined;
                            let offsetX = 0;
                            if (diff > 0) {
                                navItem = layoutItems.find(i => i.type === 'navigation' && i.navDirection === 'next');
                                if (diff > 1) offsetX = 150; // Distant
                            } else {
                                navItem = layoutItems.find(i => i.type === 'navigation' && i.navDirection === 'prev');
                                if (diff < -1) offsetX = -150; // Distant
                            }

                            if (navItem) {
                                targetX = navItem.x + offsetX;
                                const midX = (sourceItem.x + targetX) / 2;
                                const dist = Math.abs(targetX - sourceItem.x);
                                const height = Math.max(60, dist / 3);
                                pathD = `M ${sourceItem.x} 0 Q ${midX} ${-height} ${targetX} 0`;
                            }
                        }
                        else if (rel.type === 'parent') {
                            pathD = `M ${sourceItem.x} 0 L ${sourceItem.x} -300`;
                        }
                        else if (rel.type === 'ancestor-sibling') {
                            const isRight = rel.dir === 'after';
                            const endX = isRight ? sourceItem.x + 400 : sourceItem.x - 400;
                            pathD = `M ${sourceItem.x} 0 Q ${sourceItem.x} -200 ${endX} -400`;
                        }
                    }
                }

                if (pathD) {
                    arcItems.push(
                        <path
                            key={`${event.id}-${link.linkId}`}
                            d={pathD}
                            fill="none"
                            stroke={strokeColor}
                            strokeWidth={3}
                            vectorEffect="non-scaling-stroke"
                            opacity={baseOpacity}
                            className="cursor-pointer transition-opacity"
                            {...handlers}
                        />
                    );
                }
            });
        });

        return arcItems;
    }, [activeEventIds, layoutItems, events, hoveredLink, linkMap, currentLevelId, timelineNodes, config]);


    // Search Options
    const searchOptions = useMemo<Option[]>(() => {
        const opts: Option[] = [];
        timelineNodes.forEach(node => {
            opts.push({
                label: node.title || node.name,
                value: node.id,
                typeLabel: 'Level',
                type: 'divider',
                x: 0
            });
        });
        events.forEach(ev => {
            opts.push({
                label: ev.title,
                value: ev.id,
                typeLabel: 'Event',
                type: 'event',
                x: 0
            });
        });
        return opts;
    }, [timelineNodes, events]);

    const resetCamera = () => {
        controls.setCamera({
            x: 0,
            y: 0,
            scale: 1
        });
    };

    const centerOnEvent = (eventId: string) => {
        const item = layoutItems.find(i => i.id === eventId);
        if (!item) return;

        controls.setCamera({
            x: -item.x,
            y: 0,
            scale: 1,
        });
    };


    const handleSearchSelect = (val: string | null) => {
        if (!val) return;

        const targetEvent = events.find(e => e.id === val);
        const targetNode = timelineNodes.find(n => n.id === val);

        if (targetNode) {
            setCurrentLevelId(targetNode.id);
            resetCamera();

        } else if (targetEvent) {
            if (targetEvent.timelineId) {
                // Use combined logic via shared handler or duplication:
                if (targetEvent.timelineId !== currentLevelId) {
                    setCurrentLevelId(targetEvent.timelineId);
                    setActiveEventIds(new Set());
                }
                setPendingCenterEventId(targetEvent.id);
            }
        }

        setIsSearchOpen(false);
    };
    const prevNav = useMemo(
        () =>
            layoutItems.find(
                i => i.type === 'navigation' && i.navDirection === 'prev' && !i.isPlaceholder
            ),
        [layoutItems]
    );

    const nextNav = useMemo(
        () =>
            layoutItems.find(
                i => i.type === 'navigation' && i.navDirection === 'next' && !i.isPlaceholder
            ),
        [layoutItems]
    );


    // Navigation Handlers
    const handleNavigate = (id: string | null) => {
        if (!id) return;
        if (id === currentLevelId) return;

        setCurrentLevelId(id);
        setActiveEventIds(new Set());
        resetCamera();
    };


    const handleNavigateUp = () => {
        const curr = timelineNodes.find(n => n.id === currentLevelId);
        if (curr && curr.parentId) setCurrentLevelId(curr.parentId);
    };

    const handleEventClick = (id: string) => {
        setActiveEventIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
                onSelectEvent(id);
            }
            return next;
        });
    };


    const getIntensityClass = (intensity?: string) => {
        const key = intensity || 'LOW';
        const classes = INTENSITY_COLORS[key] || INTENSITY_COLORS['LOW'];
        if (!classes) return 'text-gray-500';
        const match = classes.match(/text-[\w-]+/);
        return match ? match[0] : 'text-gray-500';
    };


    return (
        <div className="w-full h-full relative bg-background overflow-hidden select-none">
            <TimelineCanvasControls
                isSearchOpen={isSearchOpen}
                setIsSearchOpen={setIsSearchOpen}
                currentLevelId={currentLevelId}
                currentLevelName={currentLevelName}
                timelineNodes={timelineNodes}
                layoutItems={layoutItems}
                searchOptions={searchOptions}
                onSearchSelect={handleSearchSelect}
                onResetCamera={resetCamera}
                onZoomIn={controls.zoomIn}
                onZoomOut={controls.zoomOut}
                onNavigate={handleNavigate}
                canNavigatePrev={!!prevNav}
                canNavigateNext={!!nextNav}
                onNavigatePrev={() => handleNavigate(prevNav?.data?.id ?? null)}
                onNavigateNext={() => handleNavigate(nextNav?.data?.id ?? null)}
                onNavigateUp={handleNavigateUp}
            />
            {/* Tooltip */}
            {hoveredLink && (
                <div
                    className="fixed z-50 pointer-events-none px-3 py-1.5 bg-popover text-popover-foreground text-sm rounded-md border shadow-md flex flex-col gap-0.5 text-center"
                    style={{
                        left: hoveredLink.x,
                        top: hoveredLink.y - 12,
                        transform: 'translate(-50%, -100%)',
                    }}
                >

                    <span className="font-semibold">{hoveredLink.title}</span>
                    <span className="text-xs text-muted-foreground opacity-90 uppercase tracking-wider">{hoveredLink.type}</span>
                </div>
            )}

            <div
                ref={ref}

                className="absolute inset-0 overflow-hidden bg-background cursor-grab active:cursor-grabbing"
                style={{
                    touchAction: "none",
                    overscrollBehavior: "contain"
                }}
                {...bind}
            >
                <svg
                    className="w-full h-full block"
                    viewBox="-500 -250 1000 500"
                    preserveAspectRatio="xMidYMid meet"
                >
                    <motion.g
                        pointerEvents="all"
                        animate={{ x: camera.x, y: camera.y, scale: camera.scale }}
                        transition={{ duration: 0 }}
                    >

                        {/* Arcs */}
                        {arcs}

                        {/* Mainline */}
                        <line
                            x1={-5000} y1={0}
                            x2={5000} y2={0}
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={10}
                            stroke='var(--color-primary)'
                            className="stroke-primary"
                        />


                        {/* Items */}
                        {layoutItems.map(item => {
                            // EVENT
                            if (item.type === 'event') {
                                const intensityClass = getIntensityClass(item.data?.intensity);
                                const isActive = activeEventIds.has(item.id);
                                return (
                                    <g key={item.id} transform={`translate(${item.x}, 0)`}>

                                        <circle
                                            r={18}
                                            strokeWidth={2}
                                            stroke="var(--color-text-primary)"
                                            className={`
                                                    cursor-pointer
                                                    transition-colors
                                                    ${isActive
                                                    ? 'fill-[var(--color-accent)]'
                                                    : 'fill-[var(--color-surface)] hover:fill-[var(--color-accent-hover)]'}
                                                  `}
                                            data-no-camera
                                            onPointerDown={e => e.stopPropagation()}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleEventClick(item.id);
                                            }}
                                        />


                                        {/* Label */}
                                        <g transform={`translate(0, ${LANES.LABEL})`}>
                                            <text
                                                y={0}
                                                fontSize={14}
                                                textAnchor="middle"
                                                className="fill-secondary select-none font-medium pointer-events-none"
                                            >
                                                {item.label}
                                            </text>
                                            {/* Intensity Line */}
                                            <line
                                                x1={-15} y1={15}
                                                x2={15} y2={15}
                                                strokeWidth={3}
                                                stroke="currentColor"
                                                className={intensityClass}
                                            />
                                        </g>
                                    </g>
                                );
                            }

                            // SUBLEVEL
                            if (item.type === 'subLevel') {
                                return (
                                    <g key={item.id} transform={`translate(${item.x}, ${LANES.LEVEL})`}
                                        data-no-camera
                                        onPointerDown={e => e.stopPropagation()}
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleNavigate(item.id);
                                        }}
                                        className="cursor-pointer group"
                                    >
                                        {/* Hitbox */}
                                        <rect
                                            x={-60} y={-30}
                                            width={120} height={60}
                                            fill="transparent"
                                            pointerEvents="all"

                                        />
                                        <text
                                            y={5}
                                            fontSize={34}
                                            textAnchor="middle"
                                            className="font-bold fill-[var(--color-text-primary)] group-hover:stroke-[var(--color-accent)] select-none pointer-events-none transition-colors"
                                        >
                                            {item.label}
                                        </text>

                                        <g transform={`translate(0, ${LANES.LABEL - LANES.LEVEL})`}>
                                            <text
                                                y={0}
                                                fontSize={14}
                                                textAnchor="middle"
                                                className="fill-secondary select-none font-medium pointer-events-none"
                                            >
                                                {item.subLabel}
                                            </text>
                                        </g>
                                    </g>
                                );
                            }

                            // DIVIDER
                            if (item.type === 'divider') {
                                const isPrimary = item.dividerType === 'primary';
                                const h = isPrimary ? 50 : 30;
                                const w = isPrimary ? 8 : 6;
                                return (
                                    <line
                                        key={item.id}
                                        x1={item.x} y1={-h}
                                        x2={item.x} y2={h}
                                        strokeWidth={w}
                                        strokeLinecap="round"
                                        className="stroke-primary"
                                        stroke="var(--color-text-primary)"
                                    />
                                );
                            }

                            // NAVIGATION
                            if (item.type === 'navigation') {
                                return (
                                    <g key={item.id} transform={`translate(${item.x}, ${LANES.LEVEL})`}
                                        data-no-camera
                                        onPointerDown={e => e.stopPropagation()}
                                        onClick={(e) => {
                                            if (item.isPlaceholder || !item.data) return;
                                            e.stopPropagation();
                                            handleNavigate(item.data.id);
                                        }}
                                        className={`${item.isPlaceholder ? 'opacity-50 cursor-default' : 'cursor-pointer group'}`}
                                    >
                                        {/* Hitbox */}
                                        <rect
                                            x={-120} y={-40}
                                            width={240} height={80}
                                            fill="transparent"
                                            pointerEvents="all"

                                        />
                                        <text
                                            y={5}
                                            fontSize={34}
                                            textAnchor="middle"
                                            className="font-bold fill-[var(--color-text-primary)] group-hover:stroke-[var(--color-accent)] select-none pointer-events-none transition-colors"
                                        >
                                            {item.label}
                                        </text>
                                    </g>
                                );
                            }
                            return null;
                        })}
                    </motion.g>
                </svg>
            </div>
        </div>
    );
}
