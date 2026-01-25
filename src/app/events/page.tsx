'use client';

import { Event, EventType } from '@/domain/types';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo, useRef } from 'react';
import { useStoryStore } from '@/store/useStoryStore';
import EventGrid from '@/components/events/EventGrid';
import EventList from '@/components/events/EventList';
import EventViewer from '@/components/events/EventViewer';
import EventEditor from '@/components/events/EventEditor';
import {
    LayoutGrid,
    List,
    Plus,
    Search,
    ChevronDown,
    ArrowUpDown
} from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Loader } from 'lucide-react';

type SortOption = 'name' | 'createdAt' | 'updatedAt' | 'order';
type SortOrder = 'asc' | 'desc';

export default function EventsPage() {
    const router = useRouter();
    const storyId = useStoryStore((state) => state.selectedStoryId);

    // Data States
    const [events, setEvents] = useState<(Event & { eventType?: EventType })[]>([]);
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(true);

    // Filter/Sort States
    const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedType, setSelectedType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<SortOption>('order');
    const [sortOrder, setSortOrder] = useState<SortOrder>('asc');

    // Dynamic Type Bar States
    const [visibleCount, setVisibleCount] = useState(5);
    const containerRef = useRef<HTMLDivElement>(null);
    const measureRef = useRef<HTMLDivElement>(null);

    // Selection/Modal States
    const [selectedEvent, setSelectedEvent] = useState<(Event & { eventType?: EventType }) | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    useEffect(() => {
        if (storyId === undefined) return;
        if (!storyId) {
            setLoading(false);
            return;
        }
        setLoading(true);
        fetchEvents();
    }, [storyId, router]);

    const fetchEvents = () => {
        if (!storyId) return;
        Promise.all([
            fetch(`/api/events?storyId=${storyId}`).then(res => res.json()),
            fetch(`/api/event-types?storyId=${storyId}`).then(res => res.ok ? res.json() : [])
        ]).then(([eventsData, typesData]) => {
            if (Array.isArray(eventsData)) {
                setEvents(eventsData);
            } else {
                setEvents([]);
            }
            if (Array.isArray(typesData)) {
                setEventTypes(typesData);
            }
        }).catch(console.error)
            .finally(() => setLoading(false));
    };

    // Derived Data: Event Types with Counts
    const typeStats = useMemo(() => {
        const stats = new Map<string, { id: string; name: string; count: number }>();

        // Initialize stats with all known event types
        eventTypes.forEach(type => {
            stats.set(type.id, { id: type.id, name: type.name, count: 0 });
        });

        // Update counts
        events.forEach(event => {
            if (event.eventType?.id && stats.has(event.eventType.id)) {
                stats.get(event.eventType.id)!.count++;
            } else if (event.eventType && !stats.has(event.eventType.id)) {
                stats.set(event.eventType.id, { id: event.eventType.id, name: event.eventType.name, count: 1 });
            }
        });

        return Array.from(stats.values()).sort((a, b) => b.count - a.count);
    }, [events, eventTypes]);

    // Dynamic Type Bar Measurement
    useEffect(() => {
        const calculateVisible = () => {
            if (!containerRef.current || !measureRef.current) return;

            const containerWidth = containerRef.current.offsetWidth;
            const children = Array.from(measureRef.current.children) as HTMLElement[];

            if (children.length < 2) {
                setVisibleCount(typeStats.length);
                return;
            }

            const gap = 8;
            let currentWidth = 0;

            const firstChild = children[0];
            const lastChild = children[children.length - 1];

            if (!firstChild || !lastChild) return;

            const allEventsWidth = firstChild.offsetWidth;
            currentWidth += allEventsWidth;

            const moreBtnWidth = lastChild.offsetWidth;

            let count = 0;
            for (let i = 0; i < typeStats.length; i++) {
                const childIndex = i + 1;
                if (childIndex >= children.length - 1) break;

                const child = children[childIndex];
                if (!child) break;

                const itemWidth = child.offsetWidth;
                const isLastItem = i === typeStats.length - 1;
                const widthWithItem = currentWidth + gap + itemWidth;
                const widthWithItemAndMore = widthWithItem + gap + moreBtnWidth;

                if (isLastItem) {
                    if (widthWithItem <= containerWidth) {
                        count++;
                        currentWidth += gap + itemWidth;
                    } else {
                        break;
                    }
                } else {
                    if (widthWithItemAndMore <= containerWidth) {
                        count++;
                        currentWidth += gap + itemWidth;
                    } else {
                        break;
                    }
                }
            }
            setVisibleCount(count);
        };

        calculateVisible();
        window.addEventListener('resize', calculateVisible);
        return () => window.removeEventListener('resize', calculateVisible);
    }, [typeStats]);

    const visibleTypes = typeStats.slice(0, visibleCount);
    const hiddenTypes = typeStats.slice(visibleCount);

    const filteredAndSortedEvents = useMemo(() => {
        let result = [...events];

        // Filter by Type
        if (selectedType !== 'all') {
            result = result.filter(e => e.eventType?.id === selectedType);
        }

        // Filter by Search
        if (searchTerm) {
            const lowerTerm = searchTerm.toLowerCase();
            result = result.filter(e =>
                e.title.toLowerCase().includes(lowerTerm) ||
                e.description?.toLowerCase().includes(lowerTerm) ||
                e.tags?.some(t => t.toLowerCase().includes(lowerTerm)) ||
                e.eventType?.name.toLowerCase().includes(lowerTerm)
            );
        }

        // Sort
        result.sort((a, b) => {
            let cmp = 0;
            switch (sortBy) {
                case 'name':
                    cmp = a.title.localeCompare(b.title);
                    break;
                case 'createdAt':
                    cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
                    break;
                case 'updatedAt':
                    cmp = new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
                    break;
                case 'order':
                    cmp = a.order - b.order;
                    break;
            }
            return sortOrder === 'asc' ? cmp : -cmp;
        });

        return result;
    }, [events, searchTerm, sortBy, sortOrder, selectedType]);

    const handleCreate = () => {
        setSelectedEvent(null);
        setIsEditorOpen(true);
    };

    const handleEdit = (event: Event & { eventType?: EventType }) => {
        setSelectedEvent(event);
        setIsEditorOpen(true);
    };

    const handleEditorClose = () => {
        setIsEditorOpen(false);
        setSelectedEvent(null);
        fetchEvents();
    };

    if (!storyId) return <div className="min-h-screen flex items-center justify-center text-muted-foreground">Select a story to view events</div>;
    if (loading) return <div className="min-h-screen flex items-center justify-center text-muted-foreground"><Loader className="animate-spin mr-2" /> Loading Events...</div>;

    return (
        <div className="min-h-screen bg-background p-6 md:p-8">
            {/* Top Bar */}
            <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-8">
                <div className="relative w-full md:w-96 group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-accent transition-colors" />
                    <Input
                        type="text"
                        placeholder="Search events..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 bg-surface border-border focus:ring-accent"
                    />
                </div>

                <div className="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="justify-between min-w-[160px]">
                                <span className="flex items-center gap-2">
                                    <span className="text-muted-foreground">Sort:</span>
                                    <span className="text-foreground font-medium">
                                        {sortBy === 'name' && 'Name'}
                                        {sortBy === 'createdAt' && 'Created'}
                                        {sortBy === 'updatedAt' && 'Updated'}
                                        {sortBy === 'order' && 'Order'}
                                    </span>
                                </span>
                                <ArrowUpDown className="w-4 h-4 ml-2 text-muted-foreground" />
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-56 bg-surface border-border border-accent z-[150]" align="end">
                            {[
                                { label: 'Order', sort: 'order', order: 'asc' },
                                { label: 'Name (A-Z)', sort: 'name', order: 'asc' },
                                { label: 'Name (Z-A)', sort: 'name', order: 'desc' },
                                { label: 'Newest Created', sort: 'createdAt', order: 'desc' },
                                { label: 'Oldest Created', sort: 'createdAt', order: 'asc' },
                                { label: 'Recently Updated', sort: 'updatedAt', order: 'desc' },
                            ].map((opt: any) => (
                                <DropdownMenuItem
                                    key={opt.label}
                                    onClick={() => { setSortBy(opt.sort); setSortOrder(opt.order); }}
                                    className={cn("cursor-pointer", (sortBy === opt.sort && sortOrder === opt.order) ? 'bg-accent/10 text-accent' : '')}
                                >
                                    {opt.label}
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>

                    <div className="flex bg-surface border border-border rounded-xl p-1">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'grid' ? 'bg-accent text-accent-foreground shadow-md' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={cn("p-2 rounded-lg transition-all", viewMode === 'list' ? 'bg-accent text-accent-foreground shadow-md' : 'text-muted-foreground hover:text-foreground')}
                        >
                            <List className="w-5 h-5" />
                        </button>
                    </div>

                    <Button onClick={handleCreate} className="bg-accent text-accent-foreground hover:bg-accent/90 shadow-lg">
                        <Plus className="w-5 h-5 mr-2" />
                        <span className="hidden sm:inline">New Event</span>
                    </Button>
                </div>
            </div>

            {/* Hidden Measurement Container */}
            <div
                ref={measureRef}
                className="fixed top-0 left-0 flex items-center gap-2 invisible pointer-events-none"
                aria-hidden="true"
            >
                <div className="px-4 py-2 border">All Events {events.length}</div>
                {typeStats.map(type => (
                    <div key={type.id} className="px-4 py-2 border">{type.name} {type.count}</div>
                ))}
                <div className="px-4 py-2 border flex items-center gap-1">More <ChevronDown className="w-3 h-3" /></div>
            </div>

            {/* Type Filter Bar */}
            <div
                ref={containerRef}
                className="flex items-center gap-2 mb-8 overflow-hidden"
            >
                <button
                    onClick={() => setSelectedType('all')}
                    className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                        selectedType === 'all'
                            ? 'bg-accent text-text-primary border-foreground'
                            : 'bg-surface text-muted-foreground border-border hover:border-accent'
                    )}
                >
                    All Events <span className="ml-1 opacity-60 text-xs">{events.length}</span>
                </button>

                {visibleTypes.map(type => (
                    <button
                        key={type.id}
                        onClick={() => setSelectedType(type.id)}
                        className={cn("px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap border",
                            selectedType === type.id
                                ? 'bg-accent text-text-primary border-foreground'
                                : 'bg-surface text-muted-foreground border-border hover:border-accent'
                        )}
                    >
                        {type.name} <span className="ml-1 opacity-60 text-xs">{type.count}</span>
                    </button>
                ))}

                {hiddenTypes.length > 0 && (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <button className="px-4 py-2 rounded-full text-sm font-medium bg-surface border border-border text-muted-foreground hover:border-foreground/50 flex items-center gap-1 whitespace-nowrap">
                                More <ChevronDown className="w-3 h-3" />
                            </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-48 bg-surface border-border border-accent z-[150]" align="start">
                            {hiddenTypes.map(type => (
                                <DropdownMenuItem
                                    key={type.id}
                                    onClick={() => setSelectedType(type.id)}
                                    className="flex justify-between cursor-pointer"
                                >
                                    <span>{type.name}</span>
                                    <span className="opacity-60 text-xs bg-muted px-1.5 py-0.5 rounded-full">{type.count}</span>
                                </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                    </DropdownMenu>
                )}
            </div>

            {/* Content Area */}
            {filteredAndSortedEvents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                    <div className="w-20 h-20 bg-surface rounded-full flex items-center justify-center mb-4 shadow-sm border border-border">
                        <Search className="w-8 h-8 text-muted-foreground" />
                    </div>
                    <h3 className="text-xl font-bold text-foreground mb-2">No events found</h3>
                    <p className="text-muted-foreground max-w-md">
                        Try adjusting your filters or search terms, or create a new event to get started.
                    </p>
                    <Button
                        variant="link"
                        onClick={() => { setSearchTerm(''); setSelectedType('all'); }}
                        className="mt-6 text-accent"
                    >
                        Clear all filters
                    </Button>
                </div>
            ) : (
                <>
                    {viewMode === 'grid' ? (
                        <EventGrid
                            events={filteredAndSortedEvents}
                            onEventClick={setSelectedEvent}
                        />
                    ) : (
                        <EventList
                            events={filteredAndSortedEvents}
                            onEventClick={setSelectedEvent}
                            onEdit={handleEdit}
                        />
                    )}
                </>
            )}

            {/* Modals */}
            {isEditorOpen && (
                <EventEditor
                    storyId={storyId}
                    event={selectedEvent}
                    onClose={handleEditorClose}
                    onDelete={handleEditorClose}
                />
            )}

            {selectedEvent && !isEditorOpen && (
                <EventViewer
                    event={selectedEvent}
                    onClose={() => setSelectedEvent(null)}
                    onEdit={() => handleEdit(selectedEvent)}
                />
            )}
        </div>
    );
}
