'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Note } from '@/domain/types/index';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Search, Calendar, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { formatDistanceToNow } from 'date-fns';
import { getNotePreview } from '@/lib/tiptap-utils';

interface NoteListProps {
    storyId: string;
    onSelectNote: (note: Note | null) => void;
}

export default function NoteList({ storyId, onSelectNote }: NoteListProps) {
    const [search, setSearch] = useState('');

    // Fetch General Notes (timelineId is null)
    const { data: notes = [], isLoading } = useQuery<Note[]>({
        queryKey: ['notes', 'general', storyId, search],
        queryFn: async () => {
            const params = new URLSearchParams({
                storyId,
                isTimelineNote: 'false',
                search
            });
            const res = await fetch(`/api/notes?${params.toString()}`);
            if (!res.ok) throw new Error('Failed to fetch notes');
            return res.json();
        },
        enabled: !!storyId
    });

    return (
        <div className="h-full flex flex-col bg-background">
            {/* Toolbar */}
            <div className="p-4 border-b border-border space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-bold">Notes</h2>
                    <Button onClick={() => onSelectNote(null)} size="sm">
                        <Plus className="w-4 h-4 mr-2" /> New Note
                    </Button>
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
            </div>

            {/* List */}
            <ScrollArea className="flex-1">
                <div className="p-4 space-y-3">
                    {isLoading && <div className="text-center text-muted-foreground p-4">Loading...</div>}
                    {!isLoading && notes.length === 0 && (
                        <div className="text-center text-muted-foreground p-8 border border-dashed border-border rounded-xl">
                            No notes found. Create one to get started!
                        </div>
                    )}
                    {notes.map(note => (
                        <div
                            key={note.id}
                            onClick={() => onSelectNote(note)}
                            className="bg-surface border border-border rounded-xl p-4 hover:border-accent/50 cursor-pointer transition-colors group space-y-2"
                        >
                            <div className="flex justify-between items-start gap-2">
                                <h3 className="font-semibold text-lg text-foreground group-hover:text-accent transition-colors truncate">{note.title}</h3>
                                <span className="text-xs text-muted-foreground whitespace-nowrap shrink-0">{formatDistanceToNow(new Date(note.updatedAt))} ago</span>
                            </div>

                            {/* Content Preview (Strip HTML) */}
                            <p className="text-sm text-muted-foreground line-clamp-2">
                                {getNotePreview(note.content)}
                            </p>

                            <div className="flex flex-wrap gap-2 pt-1">
                                {note.tags?.slice(0, 3).map((tag: string) => (
                                    <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0 h-5 font-normal">
                                        {tag}
                                    </Badge>
                                ))}
                                {(note.tags?.length || 0) > 3 && (
                                    <span className="text-xs text-muted-foreground self-center">+{note.tags!.length - 3} more</span>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>
        </div>
    );
}
