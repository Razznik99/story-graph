'use client';

import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Wand2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const STYLE_PRESETS = [
    '3d-model', 'analog-film', 'anime', 'cinematic', 'comic-book',
    'digital-art', 'enhance', 'fantasy-art', 'isometric', 'line-art',
    'low-poly', 'modeling-compound', 'neon-punk', 'origami', 'photographic',
    'pixel-art', 'tile-texture'
];

interface ImageGeneratorProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    imageType: 'card' | 'cover';
    onGenerate: (file: File) => void;
    initialPrompt?: string;
}

export default function ImageGenerator({ open, onOpenChange, imageType, onGenerate, initialPrompt }: ImageGeneratorProps) {
    const [prompt, setPrompt] = useState(initialPrompt || '');
    const [cfgScale, setCfgScale] = useState(7);
    const [stylePreset, setStylePreset] = useState('cinematic');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open && initialPrompt) {
            setPrompt(initialPrompt);
        }
    }, [open, initialPrompt]);

    const handleGenerate = async () => {
        if (!prompt.trim()) {
            toast.error('Please enter a prompt');
            return;
        }

        setIsGenerating(true);
        setError('');

        const width = imageType === 'cover' ? 896 : 1024;
        const height = imageType === 'cover' ? 1152 : 1024;

        try {
            const res = await fetch('/api/ai/generate-image', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    prompts: [{ text: prompt, weight: 1 }],
                    cfg_scale: cfgScale,
                    style_preset: stylePreset,
                    width,
                    height
                })
            });

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 403 || res.status === 400) {
                    setError(data.error || data.message || 'Image generation limit reached. Please upgrade your plan.');
                    return;
                }
                throw new Error(data.error || 'Failed to generate image');
            }

            const { base64 } = await res.json();

            // Convert base64 to JS File object
            const byteString = atob(base64);
            const ab = new ArrayBuffer(byteString.length);
            const ia = new Uint8Array(ab);
            for (let i = 0; i < byteString.length; i++) {
                ia[i] = byteString.charCodeAt(i);
            }
            const blob = new Blob([ab], { type: 'image/png' });
            const file = new File([blob], `generated-img-${Date.now()}.png`, { type: 'image/png' });

            onGenerate(file);
            onOpenChange(false);
            setPrompt(''); // Reset for next time
        } catch (error: any) {
            console.error(error);
            toast.error(error.message || 'Error generating image');
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2 text-accent">
                        <Wand2 className="h-5 w-5" />
                        Generate Image with AI
                    </DialogTitle>
                </DialogHeader>

                {error && (
                    <div className="p-4 mx-6 mt-4 bg-red-500/10 border border-red-500/20 text-red-600 rounded-lg flex flex-col gap-3 text-sm font-medium">
                        <div className="flex items-center gap-2">
                            <AlertCircle className="w-5 h-5 flex-shrink-0" />
                            <span>{error}</span>
                        </div>
                        {(error.toLowerCase().includes('limit') || error.toLowerCase().includes('plan')) && (
                            <Button
                                type="button"
                                onClick={() => window.location.href = '/pricing'}
                                variant="outline"
                                className="border-red-500/50 text-red-500 hover:bg-red-500/10 self-start text-sm h-8 px-3 mt-1"
                            >
                                View Pricing Plans
                            </Button>
                        )}
                    </div>
                )}

                <div className="space-y-4 py-4 px-6 pt-0 mt-4">
                    <div className="space-y-2">
                        <Label>Prompt</Label>
                        <Textarea
                            placeholder="A lighthouse on a cliff..."
                            value={prompt}
                            onChange={(e) => setPrompt(e.target.value)}
                            className="h-24 resize-none bg-surface"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>Style Preset</Label>
                            <Select value={stylePreset} onValueChange={setStylePreset}>
                                <SelectTrigger className="bg-surface">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="max-h-[200px] z-[200] bg-surface">
                                    {STYLE_PRESETS.map(style => (
                                        <SelectItem key={style} value={style}>
                                            {style.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label className="flex justify-between">
                                <span>CFG Scale</span>
                                <span className="text-muted-foreground">{cfgScale}</span>
                            </Label>
                            <Input
                                type="range"
                                min="0"
                                max="35"
                                step="1"
                                value={cfgScale}
                                onChange={(e) => setCfgScale(Number(e.target.value))}
                                className="w-full"
                            />
                            <p className="text-xs text-muted-foreground">
                                Higher values strictly adhere to prompt.
                            </p>
                        </div>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isGenerating}>Cancel</Button>
                    <Button onClick={handleGenerate} disabled={isGenerating || !prompt.trim()}>
                        {isGenerating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Generate
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
