'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SimpleEditor } from '@/components/tiptap-templates/simple/simple-editor';
import TagInput from '@/components/TagInput';
import { Save, Trash2, X, PanelRightClose, PanelRightOpen, Calendar } from 'lucide-react';
import { Note } from '@/domain/types/index';
import TimelineEventsSidebar from './TimelineEventsSidebar';
import { cn } from '@/lib/utils';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getTimelineConfig, listTLNodes, updateTLNodeLabel } from '@/lib/timeline-api';
import { getDerivedNumber, getLevelName } from '@/components/timeline/timeline-explorer-helpers';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from 'sonner';

interface NoteEditorProps {
    note: Note | null; // Null if creating new
    storyId: string;
    onSave: (note: Partial<Note>) => Promise<void>;
    onDelete?: (noteId: string) => Promise<void>;
    onCancel: () => void;
    isTimelineNote?: boolean;
}

export default function NoteEditor({ note, storyId, onSave, onDelete, onCancel, isTimelineNote = false }: NoteEditorProps) {
    const queryClient = useQueryClient();
    const [title, setTitle] = useState(note?.title || '');
    const [content, setContent] = useState<any>(note?.content || '');
    const [tags, setTags] = useState<string[]>(note?.tags || []);
    const [isSaving, setIsSaving] = useState(false);
    const [showSidebar, setShowSidebar] = useState(true);

    const { data: cfg } = useQuery({
        queryKey: ['tl', 'config', storyId],
        queryFn: () => getTimelineConfig(storyId),
        enabled: isTimelineNote && !!storyId,
    });

    const { data: nodes = [] } = useQuery({
        queryKey: ['tl', 'nodes', storyId],
        queryFn: () => listTLNodes(storyId),
        enabled: isTimelineNote && !!storyId,
    });

    const timelineNode = isTimelineNote && note?.timelineId ? nodes.find(n => n.id === note.timelineId) : null;
    let timelinePrefix = "Timeline Note";

    if (timelineNode && cfg) {
        const levelName = timelineNode.name || getLevelName(timelineNode.level, cfg);
        const orderNum = getDerivedNumber(timelineNode, nodes, cfg);
        const isSingleRoot = cfg.timelineType === 'single' && timelineNode.level === 1;
        timelinePrefix = isSingleRoot ? levelName : `${levelName} ${orderNum}`;
    }

    // If existing note changes (e.g. selection), update state
    useEffect(() => {
        setTitle(note?.title || '');
        setContent(note?.content || '');
        setTags(note?.tags || []);
    }, [note]);

    const handleSave = async () => {
        if (!title.trim()) {
            toast.error("Title is required");
            return;
        }

        setIsSaving(true);
        try {
            await onSave({
                ...note,
                title,
                content,
                tags,
                storyId, // Ensure storyId is passed for new notes
            });

            if (isTimelineNote && note?.timelineId && title !== note?.title) {
                // Also update the timeline node title if it changed
                await updateTLNodeLabel(note.timelineId, title);
                queryClient.invalidateQueries({ queryKey: ['tl', 'nodes', storyId] });
            }

            // Don't close automatically, maybe just toast? User might want to keep editing.
            // Or if it's "Save & Close"? Usually Save stays.
            toast.success("Note saved");
        } catch (error) {
            console.error(error);
            toast.error("Failed to save note");
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async () => {
        if (!note?.id || !onDelete) return;
        try {
            await onDelete(note.id);
            // onCancel(); // Go back to list
        } catch (error) {
            toast.error("Failed to delete note");
        }
    };

    return (
        <div className="flex h-full w-full overflow-hidden bg-background">
            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Header */}
                <div className="border-b border-border p-4 flex items-center justify-between gap-4 bg-surface/50 backdrop-blur-sm">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {isTimelineNote ? (
                            <div className="flex flex-col w-full">
                                <span className="text-xs font-bold text-accent uppercase tracking-wider">{timelinePrefix}</span>
                                <Input
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Note Title"
                                    className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto bg-transparent placeholder:text-muted-foreground/50"
                                />
                            </div>
                        ) : (
                            <Input
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                placeholder="Note Title"
                                className="text-xl font-bold border-none shadow-none focus-visible:ring-0 px-0 h-auto bg-transparent placeholder:text-muted-foreground/50"
                            />
                        )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                        <Button variant="ghost" onClick={onCancel} disabled={isSaving}>
                            <X className="w-4 h-4 mr-2" /> Cancel
                        </Button>
                        {!isTimelineNote && note?.id && onDelete && (
                            <AlertDialog>
                                <AlertDialogTrigger asChild>
                                    <Button variant="ghost" className="text-destructive hover:text-destructive hover:bg-destructive/10">
                                        <Trash2 className="w-4 h-4" />
                                    </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                    <AlertDialogHeader>
                                        <AlertDialogTitle>Delete Note?</AlertDialogTitle>
                                        <AlertDialogDescription>
                                            This action cannot be undone.
                                        </AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                                        <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                </AlertDialogContent>
                            </AlertDialog>
                        )}
                        <Button onClick={handleSave} disabled={isSaving} className="min-w-[100px]">
                            {isSaving ? "Saving..." : (
                                <>
                                    <Save className="w-4 h-4 mr-2" /> Save
                                </>
                            )}
                        </Button>

                        {isTimelineNote && (
                            <Button variant="ghost" size="icon" onClick={() => setShowSidebar(!showSidebar)} title="Toggle Sidebar">
                                {showSidebar ? <PanelRightClose className="w-5 h-5" /> : <PanelRightOpen className="w-5 h-5" />}
                            </Button>
                        )}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 flex justify-center overflow-hidden p-4 md:p-8">

                    <div className="bg-surface rounded-xl border border-border/50 shadow-sm h-full max-w-5xl w-full overflow-hidden flex flex-col">
                        <SimpleEditor
                            key={note?.id || 'new'}
                            content={content}
                            onChange={setContent}
                        />
                    </div>
                </div>
            </div>

            {/* Sidebar for Timeline Notes */}
            {isTimelineNote && showSidebar && note?.timelineId && (
                <div className="w-80 md:w-96 shrink-0 border-l border-border h-full animate-in slide-in-from-right duration-300">
                    <TimelineEventsSidebar
                        storyId={storyId}
                        timelineId={note.timelineId}
                    />
                </div>
            )}
        </div>
    );
}
