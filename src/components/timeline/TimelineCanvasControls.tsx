import React from 'react';
import { Button } from '@/components/ui/button';
import { SearchableSelect, Option } from '@/components/ui/searchable-select';
import {
    Search,
    Fullscreen,
    ZoomIn,
    ZoomOut,
    ChevronUp,
    ChevronLeft,
    ChevronRight,
} from 'lucide-react';
import { Timeline } from '@/lib/timeline-api';
import { LayoutItem } from '@/lib/timeline-layout';

interface TimelineCanvasControlsProps {
    // State
    isSearchOpen: boolean;
    setIsSearchOpen: (isOpen: boolean) => void;
    currentLevelId: string | null;
    currentLevelName: string;

    // Data
    timelineNodes: Timeline[];
    layoutItems: LayoutItem[];
    searchOptions: Option[];

    // Actions
    onSearchSelect: (val: string | null) => void;
    onResetCamera: () => void;
    onZoomIn: () => void;
    onZoomOut: () => void;
    onNavigate: (id: string) => void;
    canNavigatePrev: boolean;
    canNavigateNext: boolean;
    onNavigatePrev: () => void;
    onNavigateNext: () => void;
    onNavigateUp: () => void;
}

export function TimelineCanvasControls({
    isSearchOpen,
    setIsSearchOpen,
    currentLevelId,
    currentLevelName,
    timelineNodes,
    layoutItems,
    searchOptions,
    onSearchSelect,
    onResetCamera,
    onZoomIn,
    onZoomOut,
    onNavigate,
    canNavigatePrev,
    canNavigateNext,
    onNavigatePrev,
    onNavigateNext,
    onNavigateUp
}: TimelineCanvasControlsProps) {
    const handleSearchOpen = () => {
        setIsSearchOpen(true);
    };


    return (
        <>
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-20 flex flex-col items-center gap-2 pointer-events-none">
                {/* Row 1 */}
                <div className="flex items-center gap-2 pointer-events-auto bg-surface-2/80 backdrop-blur p-1.5 rounded-lg border border-border shadow-lg">

                    <Button variant="ghost" size="icon-sm" onClick={handleSearchOpen} title="Search">
                        <Search className="w-4 h-4" />
                    </Button>

                    <Button variant="ghost" size="icon-sm" onClick={onResetCamera} title="Fit to Screen">
                        <Fullscreen className="w-4 h-4" />
                    </Button>
                    <div className="w-px h-4 bg-divider mx-1" />

                    <div className="flex flex-col items-center">
                        <Button
                            variant="ghost"
                            size="icon-sm"
                            title="Up to Parent"
                            disabled={!currentLevelId || !timelineNodes.find(n => n.id === currentLevelId)?.parentId}
                            onClick={onNavigateUp}
                        >
                            <ChevronUp className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="w-px h-4 bg-divider mx-1" />
                    <Button variant="ghost" size="icon-sm" onClick={onZoomIn} title="Zoom In">
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon-sm" onClick={onZoomOut} title="Zoom Out">
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                </div>

                {/* Row 2 - Explicit Breadcrumb/Nav */}
                <div className="flex items-center gap-2 pointer-events-auto bg-surface-2/80 backdrop-blur p-1.5 rounded-lg border border-border shadow-lg">
                    <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canNavigatePrev}
                        onClick={onNavigatePrev}
                        title="Previous Level"
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>

                    <span className="px-3 min-w-[100px] text-center font-medium text-sm text-text-primary">
                        {currentLevelName}
                    </span>

                    <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={!canNavigateNext}
                        onClick={onNavigateNext}
                        title="Next Level"
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>

                </div>
            </div>

            {isSearchOpen && (
                <div
                    className="absolute inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
                    onClick={() => setIsSearchOpen(false)}
                >
                    <div
                        className="relative w-[70%] h-[70%] bg-surface border border-accent rounded-lg shadow-2xl p-6 flex flex-col"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <SearchableSelect
                            options={searchOptions}
                            onChange={onSearchSelect}
                            searchPlaceholder="Search events or levels..."
                            className="w-full"
                            fullWidth
                            resetAfterSelect
                        />
                    </div>
                </div>
            )}
        </>
    );
}
