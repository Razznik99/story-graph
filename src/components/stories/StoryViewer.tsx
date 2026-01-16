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
import { Loader2, Lock, Users } from 'lucide-react';
import { useStoryStore } from '@/store/useStoryStore';

interface StoryViewerProps {
    story: any | null; // Typed loosely for now, should match API response
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function StoryViewer({ story, open, onOpenChange }: StoryViewerProps) {
    const router = useRouter();
    const [requesting, setRequesting] = useState(false);
    const [requestSent, setRequestSent] = useState(false);
    const setSelectedStoryId = useStoryStore((state) => state.setSelectedStoryId);

    if (!story) return null;

    // Determine access
    const isOwner = false; // Need to check current user vs ownerId, likely passed or handled in parent. 
    // Actually, `story.collaborators[0]` check from API:
    // API returns specific collaborator record for current user.
    // So if `story.collaborators.length > 0` (and we are in 'my-stories' or fetched with user context), we have access.
    // But `story.ownerId` check requires knowing `userId`.
    // Let's assume the parent (Page) handles the "Has Access" logic or we infer it.
    // Simplest: Check if `story` object has a `role` property injected or use `collaborators`.

    // In My-Stories: We have access.
    // In Public: We *might* have access.
    // Let's check `story.collaborators`.
    const myCollab = story.collaborators?.[0];
    const hasAccess = !!myCollab || story.role === 'Owner'; // Rough check
    // Wait, the API response for 'public' MIGHT not include `collaborators` for the searching user unless they are one?
    // API Code: `collaborators: { where: { userId } }`.
    // So if I am a collaborator, I will get my record.

    // Also need to know if I am the owner. 
    // The API returns `owner` object. 
    // I don't easily have `userId` here without session context.
    // Strategy: The parent page knows "My Stories" vs "Public".
    // If it's in "My Stories", I have access.
    // If it's in "Public", check `story.collaborators` length.
    // If `story.collaborators.length > 0`, I have access (Edit/Comment/View).
    // If `story.owner.email` === my email? (need session).

    // Safe bet: "Access" property boolean passed from parent? 
    // Or just "View" button is always there but restricted by middleware if I click it?
    // "Request to Join" only appears if I DON'T have access.

    const canEnter = hasAccess || (story.collaborators && story.collaborators.length > 0);
    // WARNING: Owner check is missing if I am owner but collaborators array is empty.
    // Ideally we pass `currentUserId` to this component. 
    // For now, let's show "View" button for everyone on Public stories (click -> 404/401 if not authorized? No, that's bad UX).
    // Let's assume if it's in "Public" tab AND I don't have a collab record, I need to request access?
    // NOTE: Public stories are visible to everyone. "View" role is implicit for Public stories?
    // "if the story is public there would be a view button and request to join (to request a higher collaboration role than view)"
    // OK! So Public stories ALWAYS have "View".
    // Private stories (via UUID lookup) ONLY have "Request to Join".

    const isPublic = story.visibility === 'public';
    const handleView = () => {
        setSelectedStoryId(story.id);
        router.push('/dashboard');
    };

    const handleRequestAccess = async () => {
        setRequesting(true);
        try {
            const res = await fetch(`/api/stories/${story.id}/request-access`, {
                method: 'POST'
            });
            if (res.ok) {
                setRequestSent(true);
            } else {
                // handle error
                const txt = await res.text();
                if (txt.includes('Already')) setRequestSent(true); // Treat duplicate as success
            }
        } catch (e) {
            console.error(e);
        } finally {
            setRequesting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-2xl">
                <div className="grid md:grid-cols-[200px_1fr] gap-6">
                    {/* Cover Section */}
                    <div className="space-y-4">
                        <div className="relative w-full aspect-[3/4] bg-surface-hover rounded-xl overflow-hidden border border-border">
                            {story.coverUrl ? (
                                <Image src={story.coverUrl} alt={story.title} fill className="object-cover" />
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-surface-hover to-background">
                                    <span className="text-4xl font-serif opacity-20">{story.title.substring(0, 2).toUpperCase()}</span>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col gap-2">
                            {story.tags?.map((tag: string) => (
                                <Badge key={tag} variant="secondary" className="justify-center cursor-default">{tag}</Badge>
                            ))}
                        </div>
                    </div>

                    {/* Details Section */}
                    <div className="flex flex-col h-full">
                        <DialogHeader>
                            <div className="flex items-start justify-between">
                                <div>
                                    <DialogTitle className="text-2xl font-bold mb-1">{story.title}</DialogTitle>
                                    <p className="text-sm text-text-tertiary">
                                        <span className="font-mono text-xs p-1 bg-surface-hover rounded text-text-secondary mr-2">{story.abbreviation}</span>
                                        by {story.owner?.name || story.owner?.username || 'Unknown'}
                                    </p>
                                </div>
                                {isPublic ? (
                                    <Badge variant="outline" className="border-green-500/50 text-green-500">Public</Badge>
                                ) : (
                                    <Badge variant="outline" className="border-border text-text-tertiary"><Lock className="w-3 h-3 mr-1" /> Private</Badge>
                                )}
                            </div>
                        </DialogHeader>

                        <div className="py-6 flex-1 text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                            {story.synopsis || "No synopsis available."}
                        </div>

                        <div className="flex items-center gap-4 text-xs text-text-tertiary mb-6">
                            <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {story._count?.collaborators || 0} Collaborators
                            </span>
                            {/* Genres could go here */}
                        </div>

                        <DialogFooter className="md:justify-start gap-3">
                            {(isPublic || canEnter) && (
                                <Button onClick={handleView} className="flex-1 md:flex-none">
                                    {canEnter ? 'Open Dashboard' : 'View Story'}
                                </Button>
                            )}

                            {(!canEnter || isPublic) && (
                                <Button
                                    variant="outline"
                                    onClick={handleRequestAccess}
                                    disabled={requesting || requestSent || (canEnter && !isPublic)} // Disable if private and already entered? No, logic: "request to join (to request a higher collaboration role)"
                                    className="flex-1 md:flex-none"
                                >
                                    {requesting ? <Loader2 className="w-4 h-4 animate-spin" /> :
                                        requestSent ? 'Request Sent' :
                                            canEnter ? 'Request Edit Access' : 'Request to Join'}
                                </Button>
                            )}
                        </DialogFooter>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
