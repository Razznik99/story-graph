import React, { useEffect, useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { useCamera } from '@/hooks/useCamera';
import { TimelineConfig, Timeline, Event } from '@/lib/timeline-api';
import { calculateSingleLevelLayout, LayoutItem, LANES } from '@/lib/timeline-layout';
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
    const [currentLevelId, setCurrentLevelId] = useState<string | null>(null);
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


    // Initialize currentLevelId
    useEffect(() => {
        if (!currentLevelId && timelineNodes.length > 0) {
            const root = timelineNodes.find(n => !n.parentId);
            if (root) setCurrentLevelId(root.id);
        }
    }, [timelineNodes, currentLevelId]);

    // Update level name display
    useEffect(() => {
        if (currentLevelId) {
            const node = timelineNodes.find(n => n.id === currentLevelId);
            if (node) setCurrentLevelName(node.title || node.name || "Level");
        } else {
            setCurrentLevelName("Story");
        }
    }, [currentLevelId, timelineNodes]);

    const layoutItems = useMemo(() => {
        return calculateSingleLevelLayout(currentLevelId, timelineNodes, events);
    }, [currentLevelId, timelineNodes, events]);

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

        // Helper to compare positions
        const comparePositions = (
            curr: number[],
            target: number[]
        ): {
            type: 'same' | 'child' | 'sibling' | 'parent' | 'ancestor-sibling';
            diff?: number;
            dir?: 'before' | 'after';
        } => {
            const len = Math.max(curr.length, target.length);
            for (let i = 0; i < len; i++) {
                const c = curr[i] ?? 0;
                const t = target[i] ?? 0;

                // identical so far
                if (c === t) continue;

                // Case 2: sublevel
                if (c === 0 && t !== 0) {
                    return { type: 'child' };
                }

                // Case 5: parent or higher
                if (c !== 0 && t === 0) {
                    return { type: 'parent' };
                }

                // both non-zero and different
                const isLast = i === curr.length - 1;

                if (isLast) {
                    return {
                        type: 'sibling',
                        diff: t - c
                    };
                }

                return {
                    type: 'ancestor-sibling',
                    dir: t > c ? 'after' : 'before'
                };
            }

            return { type: 'same' };
        };


        const currentLevelNode = timelineNodes.find(n => n.id === currentLevelId);
        const currentPos = currentLevelNode?.position || [];

        activeEventIds.forEach(eventId => {
            const event = events.find(e => e.id === eventId);
            const sourceItem = itemMap.get(eventId);

            const links = linkMap.get(eventId);
            if (!event || !sourceItem || !links) return;

            links.forEach(link => {
                const targetEvent = events.find(e => e.id === link.linkId);
                // If target event doesn't exist in loaded events, we key off metadata if available? 
                // For now assuming we have it.
                if (!targetEvent) return;

                // Determine styling
                const isHovered = hoveredLink?.title === link.link?.title && hoveredLink?.type === link.relationshipType;
                const baseOpacity = isHovered ? 1 : 0.85;
                const strokeColor = "var(--color-accent)";

                // Event Handlers
                const handlers = {
                    onPointerDown: (e: React.PointerEvent) => {
                        e.stopPropagation();
                    },
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
                        if (targetEvent) {
                            handleArcNavigate(e as any, targetEvent);
                        }
                    }
                };


                // Case Logic
                let targetX = sourceItem.x;
                let targetY = 0;
                let pathD = "";

                // Find Target Node Level Info
                const targetLevelNode = timelineNodes.find(n => n.id === targetEvent.timelineId);
                const targetPos = targetLevelNode?.position || [];

                // Compare
                // If target is in current level (Case 1)
                if (targetEvent.timelineId === currentLevelId) {
                    const targetItem = itemMap.get(targetEvent.id);
                    if (targetItem) {
                        targetX = targetItem.x;
                        // Rainbow: Inverted arc logic.
                        // Standard arc: A posx posy rot large sweep endx endy
                        // To curve UP (negative Y), we depend on sweep flag and starting/ending order.
                        // But simple quadratic bezier is easier to control for "Rainbow".
                        // M startX 0 Q (startX+endX)/2 -height result
                        // Calculate height based on distance?
                        const dist = Math.abs(targetX - sourceItem.x);
                        const height = Math.max(50, dist / 2); // Minimum height

                        // Path: M startX 0 Q midX -height endX 0
                        const midX = (sourceItem.x + targetX) / 2;
                        pathD = `M ${sourceItem.x} 0 Q ${midX} ${-height} ${targetX} 0`;
                    }
                } else {
                    // Cross-Level Logic
                    const rel = comparePositions(currentPos, targetPos);

                    if (rel.type === 'child') {
                        // Case 2: SubLevel
                        // Find layoutItem (type subLevel) that is ancestor of target
                        const targetSubItem = layoutItems.find(i =>
                            i.type === 'subLevel' &&
                            // i.data is the Node.
                            // We check if i.data.position is a prefix of targetPos
                            // AND i.data.position.length > currentPos.length (Logic ensures layoutItems are children)
                            i.data?.position &&
                            i.data.position.length <= targetPos.length &&
                            i.data.position.every((v: number, k: number) => v === targetPos[k])
                        );

                        if (targetSubItem) {
                            targetX = targetSubItem.x;
                            // Draw arc to it
                            const dist = Math.abs(targetX - sourceItem.x);
                            const height = Math.max(50, dist / 2);
                            const midX = (sourceItem.x + targetX) / 2;
                            pathD = `M ${sourceItem.x} 0 Q ${midX} ${-height} ${targetX} -20`; // End slightly above 0 for level
                        }
                    }
                    else if (rel.type === 'sibling') {
                        // Case 3 & 4
                        const diff = rel.diff!;
                        let navItem: LayoutItem | undefined;
                        let offsetX = 0;

                        if (diff > 0) {
                            // Next
                            navItem = layoutItems.find(i => i.type === 'navigation' && i.navDirection === 'next');
                            // Case 4: Distant (>1)
                            if (diff > 1) offsetX = 150;
                        } else {
                            // Prev
                            navItem = layoutItems.find(i => i.type === 'navigation' && i.navDirection === 'prev');
                            // Case 4: Distant (<-1)
                            if (diff < -1) offsetX = -150;
                        }

                        if (navItem) {
                            targetX = navItem.x + offsetX;
                            const dist = Math.abs(targetX - sourceItem.x);
                            const height = Math.max(60, dist / 3);
                            // Control point biased towards target?
                            const midX = (sourceItem.x + targetX) / 2;
                            pathD = `M ${sourceItem.x} 0 Q ${midX} ${-height} ${targetX} 0`;
                        }
                    }
                    else if (rel.type === 'parent') {
                        // Case 5: Highest (Parent)
                        // Straight UP
                        // Fade out?
                        pathD = `M ${sourceItem.x} 0 L ${sourceItem.x} -300`;
                    }
                    else if (rel.type === 'ancestor-sibling') {
                        // Case 5: Higher Sibling (Left/Right)
                        // Curve out of view
                        const isRight = rel.dir === 'after';
                        // If sibling is 'after' (value > current), it's to the RIGHT?
                        // If parent's sibling is > parent, then that branch is to the RIGHT of current branch? 
                        // Yes, if sorted ascending.
                        const endX = isRight ? sourceItem.x + 400 : sourceItem.x - 400;
                        const endY = -400;
                        pathD = `M ${sourceItem.x} 0 Q ${sourceItem.x} -200 ${endX} ${endY}`;
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
    }, [activeEventIds, layoutItems, events, hoveredLink, linkMap, currentLevelId, timelineNodes]);


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
