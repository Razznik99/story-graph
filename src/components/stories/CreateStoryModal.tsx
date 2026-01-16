'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import TagInput from '@/components/TagInput';
import GenrePicker from '@/components/GenrePicker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2 } from 'lucide-react';
import {
    LANGUAGES,
    STORY_MEDIUM,
    STORY_STATUSES,
    STORY_VISIBILITIES,
} from '@/domain/constants';

interface CreateStoryModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export default function CreateStoryModal({ open, onOpenChange }: CreateStoryModalProps) {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    // Fields
    const [title, setTitle] = useState('');
    const [abbreviation, setAbbreviation] = useState('');
    const [language, setLanguage] = useState<string>(LANGUAGES[0]);
    const [medium, setMedium] = useState<string>(STORY_MEDIUM[0]); // Default 'Story'
    const [status, setStatus] = useState<string>(STORY_STATUSES[0]); // Default 'Draft' 
    const [visibility, setVisibility] = useState<string>(STORY_VISIBILITIES[0]); // Default 'private'
    const [synopsis, setSynopsis] = useState('');
    const [coverUrl, setCoverUrl] = useState('');
    const [tags, setTags] = useState<string[]>([]);
    const [selectedGenres, setSelectedGenres] = useState<string[]>([]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            const res = await fetch('/api/stories', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    title,
                    abbreviation,
                    language,
                    medium,
                    status,
                    visibility,
                    synopsis,
                    coverUrl: coverUrl || undefined,
                    tags,
                    genres: selectedGenres
                }),
            });

            if (!res.ok) throw new Error('Failed to create story');

            const story = await res.json();
            onOpenChange(false);
            router.refresh();
            router.push(`/stories?new=${story.id}`);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto transition-all">
                <DialogHeader>
                    <DialogTitle className="text-2xl font-bold text-accent">Create New Story</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-6 pt-2">
                    {/* Top Row: Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="title" className="text-text-secondary">Title</Label>
                            <Input
                                id="title"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                required
                                placeholder="The Great Adventure"
                                className="bg-surface border-border focus-within:ring-accent"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="abbreviation" className="text-text-secondary">Abbreviation</Label>
                            <Input
                                id="abbreviation"
                                value={abbreviation}
                                onChange={(e) => setAbbreviation(e.target.value)}
                                maxLength={10}
                                required
                                placeholder="TGA"
                                className="bg-surface border-border focus-within:ring-accent"
                            />
                        </div>
                    </div>

                    {/* Second Row: Language & Type */}
                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label className="text-text-secondary">Language</Label>
                            <Select value={language} onValueChange={setLanguage}>
                                <SelectTrigger className="bg-surface border-border">
                                    <SelectValue placeholder="Select language" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border border-accent">
                                    {LANGUAGES.map(l => (
                                        <SelectItem key={l} value={l}>{l}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-text-secondary">Type</Label>
                            <Select value={medium} onValueChange={setMedium}>
                                <SelectTrigger className="bg-surface border-border">
                                    <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border border-accent">
                                    <ScrollArea className="h-[200px]">
                                        {STORY_MEDIUM.map(medium => (
                                            <SelectItem key={medium} value={medium}>{medium}</SelectItem>
                                        ))}
                                    </ScrollArea>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* Synopsis */}
                    <div className="space-y-2">
                        <Label htmlFor="synopsis" className="text-text-secondary">Synopsis</Label>
                        <Textarea
                            id="synopsis"
                            value={synopsis}
                            onChange={(e) => setSynopsis(e.target.value)}
                            placeholder="A brief summary..."
                            className="bg-surface border-border focus-within:ring-accent min-h-[100px]"
                        />
                    </div>

                    {/* Genres (Searchable Picker) */}
                    <div className="space-y-2">
                        <Label className="text-text-secondary">Genres</Label>
                        <GenrePicker
                            selected={selectedGenres}
                            onChange={setSelectedGenres}
                        />
                    </div>

                    {/* Status & Visibility & Cover */}
                    <div className="grid grid-cols-3 gap-4">
                        <div className="space-y-2">
                            <Label className="text-text-secondary">Status</Label>
                            <Select value={status} onValueChange={setStatus}>
                                <SelectTrigger className="bg-surface border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border border-accent">
                                    {STORY_STATUSES.map(s => (
                                        <SelectItem key={s} value={s}>{s}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="text-text-secondary">Visibility</Label>
                            <Select value={visibility} onValueChange={setVisibility}>
                                <SelectTrigger className="bg-surface border-border">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="bg-surface border-border border-accent">
                                    {STORY_VISIBILITIES.map(v => (
                                        <SelectItem key={v} value={v}>{v.charAt(0).toUpperCase() + v.slice(1)}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="coverUrl" className="text-text-secondary">Cover URL</Label>
                            <Input
                                id="coverUrl"
                                value={coverUrl}
                                onChange={(e) => setCoverUrl(e.target.value)}
                                placeholder="https://..."
                                className="bg-surface border-border focus-within:ring-accent"
                            />
                        </div>
                    </div>

                    {/* Tags */}
                    <div className="space-y-2">
                        <Label className="text-text-secondary">Tags</Label>
                        <TagInput
                            value={tags}
                            onChange={setTags}
                            placeholder="Add #tags..."
                        />
                    </div>

                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={() => onOpenChange(false)} className="hover:bg-surface hover:text-accent">
                            Cancel
                        </Button>
                        <Button type="submit" disabled={loading} className="bg-accent text-accent-foreground hover:bg-accent/90">
                            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Create Story
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
