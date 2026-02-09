'use client';

import { useState } from 'react';
import { useStoryStore } from '@/store/useStoryStore';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import NoteList from '@/components/notes/NoteList';
import StoryNoteList from '@/components/notes/StoryNoteList';
import NoteEditor from '@/components/notes/NoteEditor';
import { Button } from "@/components/ui/button";
import { ChevronUp, ChevronLeft, ChevronRight } from "lucide-react";
import { Note } from '@/domain/types/index';
import { useQueryClient } from '@tanstack/react-query';

export default function NotesPage() {
    const storyId = useStoryStore((state) => state.selectedStoryId);
    const [selectedNote, setSelectedNote] = useState<Note | null | 'NEW'>(null);
    const [showSidebar, setShowSidebar] = useState(true);
    const [activeTab, setActiveTab] = useState('notes');
    const queryClient = useQueryClient();

    if (!storyId) {
        return <div className="flex items-center justify-center h-screen text-muted-foreground">Please select a story.</div>;
    }

    const handleSaveNote = async (noteData: Partial<Note>) => {
        try {
            const url = noteData.id ? `/api/notes/${noteData.id}` : '/api/notes';
            const method = noteData.id ? 'PATCH' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...noteData, storyId }),
            });

            if (!res.ok) throw new Error('Failed to save');

            // Invalidate queries
            queryClient.invalidateQueries({ queryKey: ['notes'] });

            // If new, maybe select it? Or go back to list?
            // Usually keeping it open is good.
            const savedNote = await res.json();
            setSelectedNote(savedNote);

        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    const handleDeleteNote = async (noteId: string) => {
        try {
            const res = await fetch(`/api/notes/${noteId}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Failed to delete');

            queryClient.invalidateQueries({ queryKey: ['notes'] });
            setSelectedNote(null);
        } catch (error) {
            console.error(error);
            throw error;
        }
    };

    return (
        <div className="h-screen w-full bg-background flex overflow-hidden">
            {/* Left Panel: List */}
            {showSidebar && (
                <div className={`${selectedNote ? 'hidden md:flex' : 'flex'} w-full md:w-[400px] flex-col border-r border-border shrink-0 bg-surface/30 transition-all duration-300 ease-in-out`}>
                    <div className="p-2 border-b border-border flex items-center gap-2">
                        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                            <TabsList className="grid w-full grid-cols-2">
                                <TabsTrigger value="notes">Notes</TabsTrigger>
                                <TabsTrigger value="stories">Stories</TabsTrigger>
                            </TabsList>
                        </Tabs>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setShowSidebar(false)}
                            className="hidden md:flex shrink-0 text-muted-foreground hover:text-foreground"
                            title="Collapse Sidebar"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </Button>
                    </div>

                    <div className="flex-1 overflow-hidden relative">
                        {activeTab === 'notes' && (
                            <NoteList
                                storyId={storyId}
                                onSelectNote={(note) => setSelectedNote(note || 'NEW')}
                            />
                        )}
                        {activeTab === 'stories' && (
                            <StoryNoteList
                                storyId={storyId}
                                onSelectNote={(note) => setSelectedNote(note)}
                            />
                        )}
                    </div>
                </div>
            )}

            {/* Right Panel: Editor */}
            <div className={`${!selectedNote ? 'hidden md:flex' : 'flex'} flex-1 bg-background flex-col h-full overflow-hidden relative transition-all duration-300 ease-in-out`}>
                {!showSidebar && (
                    <div className="absolute top-3 left-3 z-50 hidden md:block">
                        <Button
                            variant="outline"
                            size="icon"
                            className="bg-background/80 backdrop-blur-md shadow-sm border-border hover:bg-accent/10"
                            onClick={() => setShowSidebar(true)}
                            title="Expand Sidebar"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </Button>
                    </div>
                )}

                <div className={`h-full w-full flex flex-col ${!showSidebar ? 'md:pl-14' : ''} transition-all duration-300`}>
                    {selectedNote ? (
                        <NoteEditor
                            key={selectedNote === 'NEW' ? 'new' : selectedNote.id}
                            note={selectedNote === 'NEW' ? null : selectedNote}
                            storyId={storyId}
                            onSave={handleSaveNote}
                            onDelete={handleDeleteNote}
                            onCancel={() => setSelectedNote(null)}
                            isTimelineNote={selectedNote !== 'NEW' && !!selectedNote.timelineId}
                        />
                    ) : (
                        <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-surface/10">
                            <div className="w-16 h-16 rounded-2xl bg-surface border border-border flex items-center justify-center mb-4 text-accent/50 rotate-3">
                                <span className="text-3xl">📝</span>
                            </div>
                            <h3 className="text-lg font-medium text-foreground">Select a note to view</h3>
                            <p className="max-w-xs mt-2 text-sm text-balance">Choose a note from the list or create a new one to start writing.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
