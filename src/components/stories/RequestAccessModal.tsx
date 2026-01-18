'use client';

import { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { COLLABORATION_ROLES } from '@/domain/constants';

interface RequestAccessModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    storyId: string;
    storyTitle: string;
    currentRole?: string | null;
}

export default function RequestAccessModal({ open, onOpenChange, storyId, storyTitle, currentRole }: RequestAccessModalProps) {
    const [loading, setLoading] = useState(false);
    const [role, setRole] = useState<string>('View');
    const [message, setMessage] = useState('');
    const [success, setSuccess] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch(`/api/stories/${storyId}/request-access`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role, message }),
            });

            if (res.ok) {
                setSuccess(true);
                setTimeout(() => {
                    setSuccess(false);
                    onOpenChange(false);
                    setMessage('');
                    setRole('View');
                }, 2000);
            } else {
                const txt = await res.text();
                if (txt.includes('already pending')) {
                    alert('A request is already pending.'); // Better UI toast needed
                } else {
                    console.error('Failed to request access');
                }
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Request Access to "{storyTitle}"</DialogTitle>
                </DialogHeader>

                {success ? (
                    <div className="py-8 text-center text-green-500 font-medium animate-in fade-in">
                        Request sent successfully!
                    </div>
                ) : (
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="space-y-2">
                            <Label>Role Requested</Label>
                            <Select value={role} onValueChange={setRole}>
                                <SelectTrigger className="bg-surface border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border">
                                    {COLLABORATION_ROLES.map(r => (
                                        <SelectItem key={r} value={r} disabled={r === currentRole}>
                                            {r}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <p className="text-xs text-text-tertiary">
                                {role === 'View' && "Can view the story dashboard."}
                                {role === 'Comment' && "Can view and leave comments."}
                                {role === 'Edit' && "Can edit story content."}
                            </p>
                        </div>

                        <div className="space-y-2">
                            <Label>Message (Optional)</Label>
                            <Textarea
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                placeholder="Hi, I'd like to join because..."
                                className="bg-surface border-border"
                            />
                        </div>

                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
                            <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground">
                                {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
                                Send Request
                            </Button>
                        </DialogFooter>
                    </form>
                )}
            </DialogContent>
        </Dialog>
    );
}
