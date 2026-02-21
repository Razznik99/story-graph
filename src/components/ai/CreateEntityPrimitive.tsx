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

interface SchemaField {
    name: string;
    type: 'string' | 'number' | 'text' | 'select' | 'multiselect';
    label: string;
    description?: string;
    required?: boolean;
    options?: readonly { label: string; value: string }[];
}

interface CreateEntityPrimitiveProps {
    type: 'Card' | 'Event' | 'Note' | 'Attribute' | 'CardType' | 'EventType' | 'CardRole';
    initialData: any;
    schema: readonly SchemaField[];
    onAccept: (data: any) => Promise<void>;
    onReject: () => void;
}

export function CreateEntityPrimitive({ type, initialData, schema, onAccept, onReject }: CreateEntityPrimitiveProps) {
    const [data, setData] = useState(initialData);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errors, setErrors] = useState<Record<string, string>>({});

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
            await onAccept(data);
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
        <Card className="w-full border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg overflow-hidden my-2 animate-in fade-in zoom-in-95 duration-300">
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

                        {field.type === 'string' && (
                            <Input
                                id={field.name}
                                value={data[field.name] || ''}
                                onChange={(e) => handleChange(field.name, e.target.value)}
                                className={cn(errors[field.name] && "border-destructive focus-visible:ring-destructive")}
                                placeholder={field.description}
                            />
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

                        {field.type === 'select' && (
                            <Select
                                value={data[field.name]}
                                onValueChange={(val) => handleChange(field.name, val)}
                            >
                                <SelectTrigger id={field.name} className={cn(errors[field.name] && "border-destructive ring-destructive")}>
                                    <SelectValue placeholder={`Select ${field.label}`} />
                                </SelectTrigger>
                                <SelectContent>
                                    {field.options?.map((opt) => (
                                        <SelectItem key={opt.value} value={opt.value}>
                                            {opt.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
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
