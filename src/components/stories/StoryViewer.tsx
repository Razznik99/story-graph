'use client';

import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Lock, Users, Pencil, Trash2, Loader2, LogIn, KeySquare } from 'lucide-react';
import { useStoryStore } from '@/store/useStoryStore';
import RequestAccessModal from './RequestAccessModal';

interface StoryViewerProps {
    story: any | null;
    open: boolean;
    onOpenChange: (open: boolean) => void;
    currentUserId?: string;
    onEdit?: (story: any) => void; // Parent handles opening edit modal
}

export default function StoryViewer({ story, open, onOpenChange, currentUserId, onEdit }: StoryViewerProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);
    const setSelectedStoryId = useStoryStore((state) => state.setSelectedStoryId);

    // Request Access Modal State
    const [isRequestOpen, setIsRequestOpen] = useState(false);

    if (!story) return null;

    // --- Role Logic ---
    const ownerId = story.ownerId || story.owner?.id;
    const isOwner = currentUserId && ownerId === currentUserId;

    // Find my collaboration record
    const myCollab = story.collaborators?.find((c: any) => c.userId === currentUserId && c.accepted);
    const myRole = isOwner ? 'Owner' : (myCollab?.role || null); // 'Edit', 'Comment', 'View'

    // Determine basic access
    const isPublic = story.visibility === 'public';
    const hasAccess = isOwner || !!myCollab;

    // Logic for Buttons
    const canEdit = isOwner || myRole === 'Edit';
    const canDelete = isOwner; // Only owner
    const canComment = isOwner || ['Edit', 'Comment'].includes(myRole);

    const handleSelect = () => {
        setSelectedStoryId(story.id, myRole);
        router.push('/dashboard');
    };

    const handleDelete = async () => {
        if (!story || !confirm("Are you sure you want to delete this story? This action cannot be undone.")) return;
        setLoading(true);

        try {
            const res = await fetch(`/api/stories/${story.id}`, {
                method: 'DELETE',
            });

            if (!res.ok) throw new Error("Failed to delete story");

            onOpenChange(false);
            router.refresh(); // Refresh list to remove deleted story
            router.push('/stories'); // Redirect to main stories page just in case
        } catch (error) {
            console.error("Delete error:", error);
            // Optionally show toast error here
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl p-0 overflow-hidden gap-0">
                <div className="grid md:grid-cols-[240px_1fr] h-full sm:h-[500px]">
                    {/* Cover Section */}
                    <div className="bg-surface-hover/30 p-6 flex flex-col gap-6 relative">
                        <div className="relative w-full aspect-[3/4] bg-surface rounded-xl overflow-hidden border border-border/50 shadow-sm">
                            {story.coverUrl ? (
                                <Image src={story.coverUrl} alt={story.title} fill className="object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface to-surface-hover">
                                    <span className="text-5xl font-serif opacity-10 font-bold select-none">{story.abbreviation?.toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-wrap gap-2 justify-center">
                            {story.tags?.slice(0, 5).map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="justify-center cursor-default bg-background/50 text-[10px] sm:text-xs text-accent">
                                    {tag}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="flex flex-col h-full bg-background relative">
                        <DialogHeader className="p-6 pb-2">
                            <div className="flex items-start justify-between gap-4">
                                <div>
                                    <DialogTitle className="text-2xl font-bold tracking-tight mb-1 leading-tight">{story.title}</DialogTitle>
                                    <div className="flex items-center gap-2 text-sm text-text-tertiary">
                                        <span className="font-mono text-xs px-1.5 py-0.5 bg-surface-hover rounded text-text-secondary border border-border/50">
                                            {story.abbreviation}
                                        </span>
                                        <span>by <span className="text-text-primary font-medium">{story.owner?.username || story.owner?.name || 'Unknown'}</span></span>
                                    </div>
                                </div>
                                {isPublic ? (
                                    <Badge variant="outline" className="shrink-0 border-green-500/30 text-green-600 bg-green-500/5">Public</Badge>
                                ) : (
                                    <Badge variant="outline" className="shrink-0 border-border text-text-tertiary bg-surface"><Lock className="w-3 h-3 mr-1" /> Private</Badge>
                                )}
                            </div>
                        </DialogHeader>

                        {/* Scrolling Content */}
                        <div className="px-6 py-4 flex-1 overflow-y-auto text-sm text-text-secondary leading-relaxed custom-scrollbar">
                            <div className="prose prose-sm dark:prose-invert max-w-none">
                                {story.synopsis || <span className="italic opacity-50">No synopsis provided.</span>}
                            </div>
                        </div>

                        {/* Footer Stats & Actions */}
                        <div className="p-6 border-t border-border bg-surface/30">
                            <div className="flex items-center gap-4 text-xs text-text-tertiary mb-6">
                                <span className="flex items-center gap-1.5">
                                    <Users className="w-3.5 h-3.5" />
                                    <span className="font-medium text-text-secondary">{story._count?.collaborators || 0}</span> Collaborators
                                </span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{story.medium || 'Story'}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{story.status || 'Draft'}</span>
                                <span className="w-1 h-1 rounded-full bg-border" />
                                <span>{story.language || 'English'}</span>
                            </div>

                            <div className="flex flex-wrap gap-3">
                                {/* Only show Select/Edit if we have access or if Public (View only) */}
                                {(hasAccess || isPublic) && (
                                    <Button onClick={handleSelect} className="flex-1 bg-accent text-accent-foreground hover:bg-accent/90">
                                        <LogIn className="w-4 h-4 mr-2" />
                                        {hasAccess ? 'Open Dashboard' : 'View Story'}
                                    </Button>
                                )}

                                {/* Owner Actions */}
                                {isOwner ? (
                                    <>
                                        <Button variant="outline" onClick={() => onEdit && onEdit(story)} className="px-3 hover:text-accent">
                                            <Pencil className="w-4 h-4" />
                                        </Button>
                                        {story && (
                                            <Button variant="outline" className="px-3 text-red-500 hover:text-red-600 hover:bg-red-500/10 border-red-200 dark:border-red-900/30" disabled={loading} onClick={handleDelete}>
                                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                                            </Button>
                                        )}
                                    </>
                                ) : (
                                    /* Non-Owner Actions */
                                    <>
                                        {/* Join / Upgrade Request */}
                                        <Button
                                            variant="outline"
                                            onClick={() => setIsRequestOpen(true)}
                                            className={!hasAccess && !isPublic ? "flex-1" : ""} // If private & no access, button takes full width
                                        >
                                            {hasAccess ? (
                                                <>
                                                    <KeySquare className="w-4 h-4 mr-2 text-text-tertiary" />
                                                    Upgrade Role
                                                </>
                                            ) : (
                                                'Request to Join'
                                            )}
                                        </Button>
                                    </>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </DialogContent>

            <RequestAccessModal
                open={isRequestOpen}
                onOpenChange={setIsRequestOpen}
                storyId={story.id}
                storyTitle={story.title}
                currentRole={myRole}
            />
        </Dialog>
    );
}
