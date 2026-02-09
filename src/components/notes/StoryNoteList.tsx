'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Note } from '@/domain/types/index';
import { Input } from '@/components/ui/input';
import { Search } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils'; // Assuming utils exists
import { getNotePreview } from '@/lib/tiptap-utils';

interface StoryNoteListProps {
    storyId: string;
    onSelectNote: (note: Note) => void;
}

export default function StoryNoteList({ storyId, onSelectNote }: StoryNoteListProps) {
    const [search, setSearch] = useState('');
    const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

    // Fetch Timeline Notes
    const { data: notes = [], isLoading } = useQuery<(Note & { timeline: any })[]>({ // Type assertion for joined timeline data
        queryKey: ['notes', 'story', storyId, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                storyId,
                isTimelineNote: 'true',
                search
            });
            const res = await fetch(`/api/notes?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch notes');
            return res.json();
        },
        enabled: !!storyId
    });

    // Get available levels from notes to populate filter
    const availableLevels = Array.from(new Set(notes.map(n => n.timeline?.level).filter(Boolean))).sort();

    const filteredNotes = notes.filter(note => {
        if (selectedLevel && note.timeline?.level !== selectedLevel) return false;
        return true;
    });

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="p-4 border-b border-border space-y-4">
                <h2 className="text-xl font-bold">Timeline Stories</h2>
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Search stories..."
                        className="pl-9 bg-surface"
                    />
                </div>

                {/* Level Filter */}
                {availableLevels.length > 0 && (
                    <div className="flex gap-2 pb-2 overflow-x-auto no-scrollbar">
                        <Badge
                            variant={selectedLevel === null ? "default" : "outline"}
                            className="cursor-pointer whitespace-nowrap"
                            onClick={() => setSelectedLevel(null)}
                        >
                            All Levels
                        </Badge>
                        {availableLevels.map(level => (
                            <Badge
                                key={level}
                                variant={selectedLevel === level ? "default" : "outline"}
                                className="cursor-pointer whitespace-nowrap"
                                onClick={() => setSelectedLevel(level)}
                            >
                                Level {level}
                            </Badge>
                        ))}
                    </div>
                )}
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
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
                                                L{note.timeline?.level}
                                            </Badge>
                                            <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors truncate">{note.title}</h3>
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
            </ScrollArea>
        </div>
    );
}
