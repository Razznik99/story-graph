'use client';

import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Note } from '@/domain/types/index';
import { Input } from '@/components/ui/input';
import { Search, Loader2, Book, StickyNote, Folders } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';
import { getNotePreview } from '@/lib/tiptap-utils';
import { useTimelineStore } from '@/store/useTimelineStore';
import { getTimelineGraphs } from '@/lib/timeline-api';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export const BranchIcon = ({ state, className }: { state: 'start' | 'center' | 'end', className?: string }) => {
    const svgStates = {
        start: { rect1: 16, rect2: 6, line: 2 },
        center: { rect1: 16, rect2: 2, line: 12 },
        end: { rect1: 12, rect2: 2, line: 22 }
    };
    const s = svgStates[state];
    return (
        <svg viewBox="0 0 24 24" className={className || "w-4 h-4"} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect width="14" height="6" x="5" y={s.rect1} rx="2" stroke="currentColor" />
            <rect width="10" height="6" x="7" y={s.rect2} rx="2" stroke="currentColor" />
            <path d={`M2 ${s.line}h20`} stroke="currentColor" />
        </svg>
    );
};

interface StoryNoteListProps {
    storyId: string;
    onSelectNote: (note: Note) => void;
}

export default function StoryNoteList({ storyId, onSelectNote }: StoryNoteListProps) {
    const [search, setSearch] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);
    const { activeTimelineId, setActiveTimelineId } = useTimelineStore();

    // Fetch Timelines
    const { data: timelines = [] } = useQuery({
        queryKey: ['tl', 'graphs', storyId],
        queryFn: () => getTimelineGraphs(storyId),
        enabled: !!storyId
    });

    const activeTimeline = useMemo(() => {
        return timelines.find(t => t.id === activeTimelineId) || timelines[0] || null;
    }, [timelines, activeTimelineId]);

    // Fetch Timeline Notes
    const { data: notes = [], isLoading } = useQuery<any[]>({
        queryKey: ['notes', 'story', storyId, activeTimelineId, search],
        queryFn: async () => {
            const params = new URLSearchParams({ storyId, search });
            if (activeTimeline?.id) {
                params.append('timelineId', activeTimeline.id);
            } else {
                params.append('isTimelineNote', 'true');
            }
            const res = await fetch(`/api/notes?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch notes');
            return res.json();
        },
        enabled: !!storyId && (timelines.length > 0)
    });

    const filteredNotes = notes.filter(note => {
        let noteLevel = 0;
        if (note.timelineId) noteLevel = 0;
        else if (note.branchId) noteLevel = note.branch?.level || 1;
        else if (note.leafId) noteLevel = 4;

        if (selectedLevel !== null && noteLevel !== selectedLevel) return false;
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="p-4 border-b border-border space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Timeline Notes</h2>
                    {timelines.length > 0 && (
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="bg-surface gap-2">
                                    <Folders className="w-4 h-4" />
                                    {activeTimeline?.name || 'Swap Timeline'}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent className='bg-background' align="end">
                                {timelines.map(t => (
                                    <DropdownMenuItem key={t.id} onClick={() => setActiveTimelineId(t.id)}>
                                        {t.name}
                                    </DropdownMenuItem>
                                ))}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    )}
                </div>

                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search notes..."
                        className="pl-9 bg-surface"
                    />
                </div>

                {/* Level Filter */}
                {activeTimeline && (
                    <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                        <Button
                            variant={selectedLevel === null ? "default" : "outline"}
                            size="sm"
                            className={cn("h-8 gap-2 shrink-0 border-dashed rounded-full", selectedLevel === null && "bg-accent")}
                            onClick={() => setSelectedLevel(null)}
                        >
                            All
                        </Button>
                        <Button
                            variant={selectedLevel === 0 ? "default" : "outline"}
                            size="sm"
                            className={cn("h-8 gap-2 shrink-0 rounded-full", selectedLevel === 0 && "bg-accent")}
                            onClick={() => setSelectedLevel(selectedLevel === 0 ? null : 0)}
                        >
                            <Book className="w-3.5 h-3.5" /> Timeline
                        </Button>
                        <Button
                            variant={selectedLevel === 1 ? "default" : "outline"}
                            size="sm"
                            className={cn("h-8 gap-2 shrink-0 rounded-full", selectedLevel === 1 && "bg-accent")}
                            onClick={() => setSelectedLevel(selectedLevel === 1 ? null : 1)}
                        >
                            <BranchIcon state="start" className="w-3.5 h-3.5" /> {activeTimeline.branch1Name || 'Branch 1'}
                        </Button>
                        {!!activeTimeline.branch2Name && (
                            <Button
                                variant={selectedLevel === 2 ? "default" : "outline"}
                                size="sm"
                                className={cn("h-8 gap-2 shrink-0 rounded-full", selectedLevel === 2 && "bg-accent")}
                                onClick={() => setSelectedLevel(selectedLevel === 2 ? null : 2)}
                            >
                                <BranchIcon state="center" className="w-3.5 h-3.5" /> {activeTimeline.branch2Name}
                            </Button>
                        )}
                        {!!activeTimeline.branch3Name && (
                            <Button
                                variant={selectedLevel === 3 ? "default" : "outline"}
                                size="sm"
                                className={cn("h-8 gap-2 shrink-0 rounded-full", selectedLevel === 3 && "bg-accent")}
                                onClick={() => setSelectedLevel(selectedLevel === 3 ? null : 3)}
                            >
                                <BranchIcon state="end" className="w-3.5 h-3.5" /> {activeTimeline.branch3Name}
                            </Button>
                        )}
                        <Button
                            variant={selectedLevel === 4 ? "default" : "outline"}
                            size="sm"
                            className={cn("h-8 gap-2 shrink-0 rounded-full", selectedLevel === 4 && "bg-accent")}
                            onClick={() => setSelectedLevel(selectedLevel === 4 ? null : 4)}
                        >
                            <StickyNote className="w-3.5 h-3.5" /> {activeTimeline.leafName || 'Leaf'}
                        </Button>
                    </div>
                )}
            </div>

            {/* List */}
            <div className="p-4 space-y-3 overflow-y-auto">
                {isLoading && <div className="text-center text-muted-foreground p-4">Loading...</div>}
                {!isLoading && filteredNotes.length === 0 && (
                    <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl">
                        No timeline notes found.
                    </div>
                )}
                {filteredNotes.map(note => {
                    // Format Title: (timeline.name - timeline.title) or ...
                    // Note title is already formatted on backend sync usually, but we can display custom if needed.
                    // But the note.title might have been user edited? 
                    // Wait, "the title wouldnt be editable" for timeline notes.
                    // So we trust note.title.
                    // Or we use the timeline data to constructing display name?
                    // "story tab would display the timeline notes with title(timeline name )"
                    // "timeline name can either be in the format of (timeline.name - timeline.title) or ..."
                    // Since `note.title` is synced with `timeline.name + title` in backend, we can just use `note.title`.
                    // But requirements also say "timeline path".

                    return (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note)}
                            className="bg-surface border border-border rounded-xl p-4 hover:border-accent/50 cursor-pointer transition-colors group space-y-2"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <div className="flex flex-col min-w-0">
                                    <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-[10px] h-4 px-1 border-input">
                                            {note.timelineId ? 'T' : note.branchId ? `B${note.branch?.level}` : note.leafId ? 'L' : ''}
                                        </Badge>
                                        <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors truncate">{note.title || 'Untitled'}</h3>
                                    </div>
                                    {/* Timeline Path or Breadcrumb? */}
                                    {/* Ideally we construct path from position, but we don't have full tree here easily. */}
                                </div>
                                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDistanceToNow(new Date(note.updatedAt))} ago</span>
                            </div>

                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {getNotePreview(note.content)}
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {note.tags?.slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 h-5 font-normal">
                                        {tag}
                                    </Badge>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
