'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Loader2, Upload, X, Image as ImageIcon, Wand2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ImageGenerator from '@/components/ai/ImageGenerator';

interface ImageUploadProps {
    value?: string | null;
    onChange: (url: string | null) => void;
    className?: string;
    disabled?: boolean;
    imageType?: 'card' | 'cover';
    initialPrompt?: string;
}

export default function ImageUpload({
    value,
    onChange,
    className,
    disabled,
    imageType,
    initialPrompt
}: ImageUploadProps) {
    const [isUploading, setIsUploading] = useState(false);
    const [isDragging, setIsDragging] = useState(false);
    const [showGenerator, setShowGenerator] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFile = async (file: File) => {
        if (!file) return;

        // Validate type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate size (2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        setIsUploading(true);

        try {
            // If there's an existing value, try to delete it first if it's hosted by us
            // But maybe safer to delete AFTER successful upload or just let the user "replace" it UI-wise
            // and let backend handle cleanup or do it here. 
            // For now, we just overwrite the value in UI. Cleanup can generally be done via a separate "Delete" action or implicit replacement.
            // However, to avoid orphaned files, we should probably delete the old one if we are replacing it.
            // But let's keep it simple: if user explicitly deletes, we call delete API. 
            // If they replace, we might leave the old one (orphaned) or try to delete it.
            // Let's implement delete-old-on-success strategy.
            const oldUrl = value;

            // 1. Get Signed URL
            const res = await fetch(`/api/upload?filename=${encodeURIComponent(file.name)}&contentType=${encodeURIComponent(file.type)}`);
            if (!res.ok) throw new Error('Failed to get upload URL');

            const { uploadUrl, publicUrl } = await res.json();

            // 2. Upload to R2
            const uploadRes = await fetch(uploadUrl, {
                method: 'PUT',
                body: file,
                headers: {
                    'Content-Type': file.type,
                },
            });

            if (!uploadRes.ok) throw new Error('Failed to upload image');

            // 3. Update State
            onChange(publicUrl);
            toast.success('Image uploaded');

            // 4. Cleanup old image if it exists and looks like ours
            if (oldUrl && (oldUrl.includes('/api/image/') || oldUrl.includes('r2.dev'))) {
                // Fire and forget delete
                fetch(`/api/upload?url=${encodeURIComponent(oldUrl)}`, { method: 'DELETE' }).catch(console.error);
            }

        } catch (error) {
            console.error(error);
            toast.error('Upload failed');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const onDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const onDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        if (disabled) return;

        const file = e.dataTransfer.files?.[0];
        if (file) handleFile(file);
    };

    const handleRemove = async (e: React.MouseEvent) => {
        e.stopPropagation();
        e.preventDefault();
        if (disabled || !value) return;

        // Optimistic update
        const urlToDelete = value;
        onChange(null);

        // Call API to delete
        try {
            await fetch(`/api/upload?url=${encodeURIComponent(urlToDelete)}`, { method: 'DELETE' });
            toast.success('Image removed');
        } catch (error) {
            console.error(error);
            // If it fails, silent fail or toast? Silent usually fine for cleanup.
        }
    };

    return (
        <div className={cn("w-full flex flex-col gap-2", className)}>
            <div
                className={cn(
                    "relative group flex flex-col items-center justify-center w-full h-40 rounded-lg border-2 border-dashed transition-all cursor-pointer overflow-hidden",
                    isDragging ? "border-accent bg-accent/5" : "border-border bg-surface hover:border-accent/50 hover:bg-surface/80",
                    disabled && "opacity-50 cursor-not-allowed hover:bg-surface"
                )}
                onDragOver={onDragOver}
                onDragLeave={onDragLeave}
                onDrop={onDrop}
                onClick={() => !disabled && fileInputRef.current?.click()}
            >
                <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/*"
                    onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleFile(file);
                    }}
                    disabled={disabled}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-8 w-8 animate-spin text-accent" />
                        <span className="text-sm">Uploading...</span>
                    </div>
                ) : value ? (
                    <>
                        {/* Image Preview */}
                        <div className="absolute inset-0 w-full h-full">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                src={value}
                                alt="Uploaded preview"
                                className="w-full h-full object-cover"
                            />
                            {/* Overlay */}
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <p className="text-white text-sm font-medium">Click or Drop to Replace</p>
                            </div>
                        </div>

                        {/* Remove Button */}
                        <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute top-2 right-2 h-7 w-7 rounded-full bg-red-500/80 hover:bg-red-600 shadow-md opacity-0 group-hover:opacity-100 transition-opacity translate-y-2 group-hover:translate-y-0"
                            onClick={handleRemove}
                        >
                            <X className="h-4 w-4" />
                        </Button>
                    </>
                ) : (
                    <div className="flex flex-col items-center gap-2 text-muted-foreground p-4 text-center">
                        <div className="p-3 rounded-full bg-background border border-border shadow-sm">
                            <Upload className="h-5 w-5 text-accent" />
                        </div>
                        <div className="space-y-1">
                            <p className="text-sm font-medium text-foreground">Click to upload or drag & drop</p>
                            <p className="text-xs text-muted-foreground">SVG, PNG, JPG (max 2MB)</p>
                        </div>
                    </div>
                )}
            </div>
            {imageType && (
                <>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="w-full gap-2 text-accent hover:text-accent border-accent/20 hover:border-accent hover:bg-accent/10"
                        onClick={(e) => {
                            e.preventDefault();
                            setShowGenerator(true);
                        }}
                        disabled={disabled || isUploading}
                    >
                        <Wand2 className="h-4 w-4" />
                        Generate with AI
                    </Button>
                    <ImageGenerator
                        open={showGenerator}
                        onOpenChange={setShowGenerator}
                        imageType={imageType}
                        onGenerate={(file) => handleFile(file)}
                        initialPrompt={initialPrompt || ''}
                    />
                </>
            )}
        </div>
    );
}
