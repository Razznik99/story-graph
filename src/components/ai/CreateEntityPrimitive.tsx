'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Check, X, Sparkles, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import ImageUpload from '@/components/ImageUpload';
import { useQuery } from '@tanstack/react-query';
import { useStoryStore } from '@/store/useStoryStore';

interface SchemaField {
    name: string;
    type: 'string' | 'number' | 'text' | 'select' | 'multiselect' | 'json' | 'attributes_array';
    label: string;
    description?: string;
    required?: boolean;
    options?: readonly { label: string; value: string }[];
}

interface CreateEntityPrimitiveProps {
    type: 'Card' | 'Event' | 'Note' | 'Attribute' | 'CardType' | 'EventType' | 'CardRole' | 'Story';
    initialData: any;
    schema: readonly SchemaField[];
    onAccept: (data: any) => Promise<void>;
    onReject: () => void;
}

export function CreateEntityPrimitive({ type, initialData, schema, onAccept, onReject }: CreateEntityPrimitiveProps) {
    const [data, setData] = useState(() => {
        const initial = { ...initialData };
        schema.forEach(field => {
            if (field.type === 'json' && typeof initial[field.name] === 'object' && initial[field.name] !== null) {
                initial[field.name] = JSON.stringify(initial[field.name], null, 2);
            }
        });
        return initial;
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});
    const storyId = useStoryStore(state => state.selectedStoryId);

    // Fetch dynamic options
    const { data: cardTypes } = useQuery({
        queryKey: ['cardTypes', storyId],
        queryFn: async () => {
            if (!storyId) return [];
            const res = await fetch(`/api/card-types?storyId=${storyId}`);
            if (!res.ok) throw new Error('Failed to fetch card types');
            return res.json();
        },
        enabled: !!storyId && schema.some(f => f.name === 'cardTypeId')
    });

    const { data: eventTypes } = useQuery({
        queryKey: ['eventTypes', storyId],
        queryFn: async () => {
            if (!storyId) return [];
            const res = await fetch(`/api/event-types?storyId=${storyId}`);
            if (!res.ok) throw new Error('Failed to fetch event types');
            return res.json();
        },
        enabled: !!storyId && schema.some(f => f.name === 'eventTypeId')
    });

    const { data: attributes } = useQuery({
        queryKey: ['attributes', data.cardTypeId],
        queryFn: async () => {
            if (!data.cardTypeId) return [];
            const res = await fetch(`/api/card-types/attributes?cardTypeId=${data.cardTypeId}`);
            if (!res.ok) throw new Error('Failed to fetch attributes');
            return res.json();
        },
        enabled: !!data.cardTypeId && schema.some(f => f.name === 'attributeDefinitionId')
    });

    // Validate on change
    useEffect(() => {
        validate();
    }, [data]);

    const validate = () => {
        const newErrors: Record<string, string> = {};
        schema.forEach(field => {
            if (field.required && !data[field.name]) {
                newErrors[field.name] = 'This field is required';
            }
            if (field.type === 'json' && data[field.name]) {
                if (typeof data[field.name] === 'string') {
                    try {
                        JSON.parse(data[field.name]);
                    } catch (e) {
                        newErrors[field.name] = 'Invalid JSON format';
                    }
                }
            }
        });
        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleAccept = async () => {
        if (!validate()) {
            toast.error('Please fix the errors before creating.');
            return;
        }

        setIsSubmitting(true);
        try {
            const payload = { ...data };
            schema.forEach(field => {
                if (field.type === 'json' && typeof payload[field.name] === 'string' && payload[field.name].trim()) {
                    try {
                        payload[field.name] = JSON.parse(payload[field.name]);
                    } catch (e) { }
                }
            });

            await onAccept(payload);
            toast.success(`${type} created successfully!`);
        } catch (error) {
            console.error(error);
            toast.error(`Failed to create ${type}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleChange = (field: string, value: any) => {
        setData((prev: any) => ({ ...prev, [field]: value }));
    };

    return (
        <Card
            className="w-full border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden my-2 animate-in fade-in zoom-in-95 duration-300"
            onClick={(e) => e.stopPropagation()}
        >
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary/50 via-accent/50 to-primary/50" />

            <CardHeader className="pb-2 bg-muted/20">
                <CardTitle className="flex items-center gap-2 text-base">
                    <Sparkles className="h-4 w-4 text-primary animate-pulse" />
                    <span>Create {type}</span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4 pt-4 max-h-[60vh] overflow-y-auto">
                {schema.map((field) => (
                    <div key={field.name} className="space-y-1.5">
                        <Label htmlFor={field.name} className="flex items-center gap-1 text-xs uppercase tracking-wide text-muted-foreground">
                            {field.label}
                            {field.required && <span className="text-destructive">*</span>}
                        </Label>

                        {field.type === 'string' && field.name !== 'imageUrl' && field.name !== 'coverUrl' && (
                            <Input
                                id={field.name}
                                value={data[field.name] || ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                className={cn(errors[field.name] && "border-destructive focus-visible:ring-destructive")}
                                placeholder={field.description}
                            />
                        )}

                        {(field.name === 'imageUrl' || field.name === 'coverUrl') && (
                            <div className="space-y-2">
                                <Textarea
                                    value={data[field.name + '_prompt'] ?? (data[field.name] && !data[field.name].startsWith('http') ? data[field.name] : '')}
                                    onChange={(e) => {
                                        handleChange(field.name + '_prompt', e.target.value);
                                    }}
                                    placeholder={`Describe the ${field.name.replace('Url', '')} for the AI generator...`}
                                    className="min-h-[60px]"
                                />
                                <ImageUpload
                                    imageType={field.name === 'coverUrl' ? 'cover' : 'card'}
                                    value={data[field.name]?.startsWith('http') ? data[field.name] : null}
                                    onChange={(url) => handleChange(field.name, url)}
                                    initialPrompt={data[field.name + '_prompt'] ?? (data[field.name] && !data[field.name].startsWith('http') ? data[field.name] : '')}
                                />
                            </div>
                        )}

                        {field.type === 'number' && (
                            <Input
                                id={field.name}
                                type="number"
                                value={data[field.name] || ''}
                                onChange={(e) => handleChange(field.name, parseFloat(e.target.value))}
                                className={cn(errors[field.name] && "border-destructive focus-visible:ring-destructive")}
                                placeholder={field.description}
                            />
                        )}

                        {field.type === 'text' && (
                            <Textarea
                                id={field.name}
                                value={data[field.name] || ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                className={cn("min-h-[80px]", errors[field.name] && "border-destructive focus-visible:ring-destructive")}
                                placeholder={field.description}
                            />
                        )}

                        {field.type === 'select' && field.name !== 'timelineId' && (
                            <Select
                                value={data[field.name]}
                                onValueChange={(val) => handleChange(field.name, val)}
                            >
                                <SelectTrigger id={field.name} className={cn(errors[field.name] && "border-destructive ring-destructive")}>
                                    <SelectValue placeholder={`Select ${field.label}`} />
                                </SelectTrigger>
                                <SelectContent
                                    className="bg-background z-[1500] max-h-[300px]"
                                    position="popper"
                                    sideOffset={5}
                                >
                                    {field.name === 'cardTypeId' && cardTypes?.map((ct: any) => (
                                        <SelectItem key={ct.id} value={ct.id}>{ct.name}</SelectItem>
                                    ))}
                                    {field.name === 'eventTypeId' && eventTypes?.map((et: any) => (
                                        <SelectItem key={et.id} value={et.id}>{et.name}</SelectItem>
                                    ))}
                                    {field.name === 'attributeDefinitionId' && attributes?.map((attr: any) => (
                                        <SelectItem key={attr.id} value={attr.id}>{attr.name}</SelectItem>
                                    ))}
                                    {/* Fallback to static options if any */}
                                    {(!['cardTypeId', 'eventTypeId', 'attributeDefinitionId'].includes(field.name)) && field.options?.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}



                        {field.type === 'json' && (
                            <Textarea
                                id={field.name}
                                value={data[field.name] || ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                className={cn("min-h-[100px] font-mono text-xs", errors[field.name] && "border-destructive focus-visible:ring-destructive")}
                                placeholder={field.description || "{ }"}
                            />
                        )}

                        {field.type === 'attributes_array' && Array.isArray(data[field.name]) && data[field.name].length > 0 && (
                            <div className="space-y-2 mt-2">
                                {data[field.name].map((attr: any, i: number) => (
                                    <div key={i} className="text-xs p-2 rounded border bg-muted/40 flex flex-col gap-1">
                                        <div className="font-semibold text-primary">{attr.name || attr.attributeDefinitionId || 'Unknown Attribute'}</div>
                                        <div className="text-muted-foreground break-all">
                                            {typeof attr.value === 'object' ? JSON.stringify(attr.value, null, 2) : String(attr.value)}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        {field.type === 'attributes_array' && (!Array.isArray(data[field.name]) || data[field.name].length === 0) && (
                            <div className="text-xs text-muted-foreground italic p-2 border border-dashed rounded bg-muted/20">
                                No attributes proposed.
                            </div>
                        )}

                        {errors[field.name] && (
                            <div className="flex items-center gap-1 text-xs text-destructive">
                                <AlertCircle className="h-3 w-3" />
                                <span>{errors[field.name]}</span>
                            </div>
                        )}
                    </div>
                ))}
            </CardContent>

            <CardFooter className="flex justify-end gap-2 bg-muted/20 py-3">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={onReject}
                    disabled={isSubmitting}
                    className="hover:bg-destructive/10 hover:text-destructive"
                >
                    <X className="h-4 w-4 mr-1" />
                    Reject
                </Button>
                <Button
                    size="sm"
                    onClick={handleAccept}
                    disabled={isSubmitting || Object.keys(errors).length > 0}
                    className="bg-primary hover:bg-primary/90"
                >
                    {isSubmitting ? (
                        <>Processing...</>
                    ) : (
                        <>
                            <Check className="h-4 w-4 mr-1" />
                            Create
                        </>
                    )}
                </Button>
            </CardFooter>
        </Card>
    );
}
