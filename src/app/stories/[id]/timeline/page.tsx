
'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import {
    PanelLeft,
    PanelRight,
    Maximize2,
    Minimize2,
    ArrowLeftRight,
    GripHorizontal,
    GripVertical
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { useStoryStore } from '@/store/useStoryStore';
import { getTimelineConfig, listEvents, listTLNodes, TimelineConfig, Timeline, Event } from '@/lib/timeline-api';

import TimelineExplorer from '@/components/timeline/TimelineExplorer';
import { TimelineDock, useTimelineDock } from '@/components/timeline/TimelineDock';

// Mock component for Canvas (not yet implemented)
const TimelineCanvas = (props: any) => <div className="p-4 text-text-muted flex flex-col items-center justify-center h-full">Timeline Canvas (Coming Soon)</div>;

export default function TimelinePage() {
    const router = useRouter();
    const params = useParams();
    const storyIdParam = params?.id as string;
    const storyIdStore = useStoryStore((state) => state.selectedStoryId);
    const storyId = storyIdParam || storyIdStore;

    const dock = useTimelineDock(storyId ?? undefined);

    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    // Page-level queries to feed the Canvas (Explorer fetches its own data via React Query cache)
    const { data: config } = useQuery<TimelineConfig | null>({
        queryKey: ['tl', 'config', storyId],
        queryFn: async () => {
            if (!storyId) return null;
            return (await getTimelineConfig(storyId)) as unknown as TimelineConfig;
        },
        enabled: !!storyId,
    });

    const { data: tlNodes = [] } = useQuery<Timeline[]>({
        queryKey: ['tl', 'nodes', storyId],
        queryFn: () => (storyId ? listTLNodes(storyId) : Promise.resolve([])),
        enabled: !!storyId
    });

    const { data: events = [] } = useQuery<Event[]>({
        queryKey: ['events', 'all', storyId],
        queryFn: async () => {
            if (!storyId) return [];
            return await listEvents(storyId);
        },
        enabled: !!storyId
    });

    // Layout State
    const [sidebarWidth, setSidebarWidth] = useState(320);
    const [sidebarSide, setSidebarSide] = useState<'left' | 'right'>('left');
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

    const [topHeight, setTopHeight] = useState(380);
    const [swap, setSwap] = useState(false);
    const [bottomCollapsed, setBottomCollapsed] = useState(false);

    // Dragging Refs
    const dragSidebar = useRef(false);
    const dragMain = useRef(false);

    const handleMove = (e: PointerEvent) => {
        const w = window.innerWidth;
        const h = window.innerHeight;

        if (dragSidebar.current) {
            let newWidth =
                sidebarSide === 'left'
                    ? e.clientX
                    : w - e.clientX;

            const min = 200;
            const max = w * 0.5;
            if (newWidth < min) newWidth = min;
            if (newWidth > max) newWidth = max;

            setSidebarWidth(newWidth);
        }

        if (dragMain.current) {
            let newHeight = e.clientY;

            const min = 150;
            const max = h - 150;
            if (newHeight < min) newHeight = min;
            if (newHeight > max) newHeight = max;

            setTopHeight(newHeight);
        }
    };

    const handleUp = () => {
        dragSidebar.current = false;
        dragMain.current = false;
    };

    useEffect(() => {
        window.addEventListener('pointermove', handleMove);
        window.addEventListener('pointerup', handleUp);

        return () => {
            window.removeEventListener('pointermove', handleMove);
            window.removeEventListener('pointerup', handleUp);
        };
    }, [sidebarSide]);

    if (!mounted) return <div className="p-8 flex justify-center text-text-secondary">Loading...</div>;
    if (!storyId) return <div className="p-8 flex justify-center text-text-secondary">Select a story...</div>;

    return (
        <div className="h-screen w-full flex bg-background text-text-primary overflow-hidden">

            {/* LEFT SIDEBAR */}
            {sidebarSide === 'left' && (
                <SidebarSection
                    collapsed={sidebarCollapsed}
                    width={sidebarWidth}
                    onDragStart={() => (dragSidebar.current = true)}
                    side="left"
                >
                    <TimelineExplorer />
                </SidebarSection>
            )}

            {/* MAIN CONTENT AREA */}
            <div className="flex-1 flex flex-col h-full min-w-0 bg-background relative">

                {/* Floating Controls for layout */}
                <div className="absolute top-2 right-4 z-50 flex gap-2 bg-surface/80 backdrop-blur-sm p-1 rounded-md border border-border shadow-sm">
                    <Button variant="ghost" size="icon-sm" onClick={() => setSidebarCollapsed(!sidebarCollapsed)} title="Toggle Sidebar">
                        {sidebarSide === 'left' ? <PanelLeft className="h-4 w-4" /> : <PanelRight className="h-4 w-4" />}
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setSidebarSide(sidebarSide === 'left' ? 'right' : 'left')} title="Switch Sidebar Side">
                        <ArrowLeftRight className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setSwap(!swap)} title="Swap Views">
                        <ArrowLeftRight className="h-4 w-4 rotate-90" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={() => setBottomCollapsed(!bottomCollapsed)} title="Toggle Bottom Panel">
                        {bottomCollapsed ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
                    </Button>
                </div>

                {/* TOP PANEL (Canvas or Dock) */}
                <div
                    style={{
                        height: bottomCollapsed ? '100%' : topHeight,
                        transition: bottomCollapsed ? 'height 0.3s cubic-bezier(0.16, 1, 0.3, 1)' : 'none'
                    }}
                    className="w-full bg-surface overflow-y-auto"
                >
                    {swap ? (
                        <TimelineDock />
                    ) : (
                        <TimelineCanvas
                            storyId={storyId}
                            timelineConfig={config}
                            events={events}
                            timelineNodes={tlNodes as Timeline[]}
                            onSelectEvent={(id: string) => dock.openEventById(id)}
                            onZoomToLevel={(id: string) => console.log('Zoom to', id)}
                            onRequestOpenDock={(id: string) => dock.openEventById(id)}
                            onNavigateLevel={(id: string) => console.log('Navigate', id)}
                        />
                    )}
                </div>

                {/* DRAG HANDLE */}
                {!bottomCollapsed && (
                    <div
                        className="h-1.5 w-full bg-border hover:bg-accent cursor-row-resize flex items-center justify-center transition-colors z-40"
                        onPointerDown={() => (dragMain.current = true)}
                    >
                        <GripHorizontal className="h-3 w-3 text-text-muted opacity-0 hover:opacity-100 transition-opacity" />
                    </div>
                )}

                {/* BOTTOM PANEL */}
                {!bottomCollapsed && (
                    <div className="flex-1 min-h-0 bg-surface overflow-y-auto border-t border-border">
                        {swap ? <TimelineCanvas
                            storyId={storyId}
                            timelineConfig={config}
                            events={events}
                            timelineNodes={tlNodes as Timeline[]}
                            onSelectEvent={(id: string) => dock.openEventById(id)}
                            onZoomToLevel={(id: string) => console.log('Zoom to', id)}
                            onRequestOpenDock={(id: string) => dock.openEventById(id)}
                            onNavigateLevel={(id: string) => console.log('Navigate', id)}
                        /> : <TimelineDock />}
                    </div>
                )}
            </div>

            {/* RIGHT SIDEBAR */}
            {sidebarSide === 'right' && (
                <SidebarSection
                    collapsed={sidebarCollapsed}
                    width={sidebarWidth}
                    onDragStart={() => (dragSidebar.current = true)}
                    side="right"
                >
                    <TimelineExplorer />
                </SidebarSection>
            )}

        </div>
    );
}

function SidebarSection({
    width,
    collapsed,
    onDragStart,
    side,
    children,
}: {
    width: number;
    collapsed: boolean;
    onDragStart: (e: React.PointerEvent<HTMLDivElement>) => void;
    side: 'left' | 'right';
    children: React.ReactNode;
}) {
    if (collapsed) return null;

    return (
        <div className="h-full flex flex-row relative z-40 bg-surface-2" style={{ width }}>
            {side === 'right' && (
                <div
                    className="w-1 bg-border hover:bg-accent cursor-col-resize flex flex-col items-center justify-center transition-colors border-l border-border"
                    onPointerDown={onDragStart}
                >
                    <GripVertical className="h-3 w-3 text-text-muted opacity-0 hover:opacity-100 transition-opacity" />
                </div>
            )}

            <div className={`flex-1 overflow-hidden border-border ${side === 'left' ? 'border-r' : 'border-l'}`}>
                {children}
            </div>

            {side === 'left' && (
                <div
                    className="w-1 bg-border hover:bg-accent cursor-col-resize flex flex-col items-center justify-center transition-colors border-r border-border"
                    onPointerDown={onDragStart}
                >
                    <GripVertical className="h-3 w-3 text-text-muted opacity-0 hover:opacity-100 transition-opacity" />
                </div>
            )}
        </div>
    );
}
