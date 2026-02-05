import React, { useEffect, useMemo, useState } from 'react';
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

    // Calculate Arcs
    const arcs = useMemo(() => {
        if (activeEventIds.size === 0) return [];

        const itemMap = new Map<string, LayoutItem>();
        layoutItems.forEach(item => itemMap.set(item.id, item));

        const arcItems: React.ReactNode[] = [];

        activeEventIds.forEach(eventId => {
            const event = events.find(e => e.id === eventId);
            if (!event?.linkedEventsTo) return;

            const sourceItem = itemMap.get(event.id);
            if (!sourceItem) return;

            event.linkedEventsTo.forEach(link => {
                const targetItem = itemMap.get(link.toEventId);
                if (!targetItem) return;

                const startX = sourceItem.x;
                const endX = targetItem.x;
                const radius = Math.abs(endX - startX) / 2;
                const sweep = startX < endX ? 0 : 1;

                arcItems.push(
                    <path
                        key={`${event.id}-${link.toEventId}`}
                        d={`M ${startX} 0 A ${radius} ${radius} 0 0 ${sweep} ${endX} 0`}
                        fill="none"
                        stroke="var(--color-accent)"
                        strokeWidth={1.5}
                        vectorEffect="non-scaling-stroke"
                        opacity={0.85}
                    />
                );
            });
        });

        return arcItems;
    }, [activeEventIds, layoutItems, events]);


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


    const handleSearchSelect = (val: string | null) => {
        if (!val) return;

        const targetEvent = events.find(e => e.id === val);
        const targetNode = timelineNodes.find(n => n.id === val);

        if (targetNode) {
            setCurrentLevelId(targetNode.id);
            resetCamera();

        } else if (targetEvent) {
            if (targetEvent.timelineId) {
                setCurrentLevelId(targetEvent.timelineId);
                // Ideally jump to event x-position after layout updates.
                // Simple version: switch level and let user see it.
                setActiveEventIds(new Set([targetEvent.id]));
                onSelectEvent(targetEvent.id);
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
                        {/* Mainline */}
                        <line
                            x1={-5000} y1={0}
                            x2={5000} y2={0}
                            vectorEffect="non-scaling-stroke"
                            strokeWidth={10}
                            stroke='var(--color-primary)'
                            className="stroke-primary"
                        />


                        {/* Arcs */}
                        {arcs}

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
                                                    : 'fill-[var(--color-surface)] hover:fill-[var(--color-accent)]'}
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
                                        role="button"
                                        tabIndex={0}
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
