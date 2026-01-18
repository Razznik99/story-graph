import { useState, useEffect } from 'react';
import { Card as CardType, AttributeDefinition, Suggestion } from '@/domain/types';
import { CollaborationRole } from '@/lib/permissions';
import AttributeField from './AttributeField';
import TagInput from '../TagInput';
import { X, Plus, Image as ImageIcon, Check, Trash2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type CardTypeOption = { id: string; name: string; prefix: string };

export default function CardEditor({
    storyId,
    card,
    onClose,
    suggestion,
    onSuggestionAccepted,
    inline = false,
    onDelete,
}: {
    storyId: string;
    card: (CardType & { cardType?: { id: string;[key: string]: any } }) | null;
    onClose: () => void;
    suggestion?: Suggestion | null;
    onSuggestionAccepted?: () => void;
    inline?: boolean;
    onDelete?: () => void;
}) {
    const [cardTypes, setCardTypes] = useState<CardTypeOption[]>([]);
    const [formData, setFormData] = useState({
        name: '',
        cardTypeId: '',
        description: '',
        tags: [] as string[],
        imageUrl: '',
        hidden: false,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState('');
    const [attributes, setAttributes] = useState<{ attrId: string; value: unknown }[]>([]);
    const [availableAttrs, setAvailableAttrs] = useState<AttributeDefinition[]>([]);
    const [userRole, setUserRole] = useState<CollaborationRole | 'Owner' | null>(null);
    const [showSuggestionModal, setShowSuggestionModal] = useState(false);
    const [suggestionMessage, setSuggestionMessage] = useState('');


    useEffect(() => {
        fetch(`/api/card-types?storyId=${storyId}`)
            .then(res => res.json())
            .then(types => {
                setCardTypes(types);
                if (types.length > 0 && !formData.cardTypeId && !card) {
                    setFormData(prev => ({ ...prev, cardTypeId: types[0].id }));
                }
            })
            .catch(console.error);

        // Fetch user role
        fetch(`/api/stories/${storyId}`)
            .then(res => res.json())
            .then(data => setUserRole(data.role))
            .catch(console.error);

        // Initialize form if editing
        if (card) {
            setFormData({
                name: card.name,
                cardTypeId: card.cardType?.id || card.cardTypeId,
                description: card.description || '',
                tags: card.tags || [],
                imageUrl: card.imageUrl || '',
                hidden: card.hidden,
            });
            if (card.attributes && Array.isArray(card.attributes)) {
                setAttributes(card.attributes.map((a: any) => ({ attrId: a.id, value: a.value })));
            }
        }
    }, [storyId, card]);

    useEffect(() => {
        if (formData.cardTypeId) {
            fetch(`/api/card-types/attributes?cardTypeId=${formData.cardTypeId}`)
                .then(res => res.json())
                .then(setAvailableAttrs)
                .catch(console.error);
        }
    }, [formData.cardTypeId]);

    const handleTextChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSelectChange = (value: string) => {
        setFormData(prev => ({ ...prev, cardTypeId: value }));
        // Reset attributes when type changes? 
        // Maybe we should warn user, but for now we just keep them, 
        // though the UI available definitions will change.
    };

    const handleSwitchChange = (checked: boolean) => {
        setFormData(prev => ({ ...prev, hidden: checked }));
    };



    const handleSubmit = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();

        // If Comment Role and NOT reviewing a suggestion -> Open Suggestion Modal
        if (!suggestion && userRole === CollaborationRole.Comment) {
            setShowSuggestionModal(true);
            return;
        }

        setIsSubmitting(true);
        setError('');

        try {
            const { cardTypeId, ...rest } = formData;
            const payload: { [key: string]: unknown } = {
                ...rest,
                storyId,
                cardTypeId,
                attributes,
            };
            if (card?.id) payload.id = card.id;
            if (!payload.imageUrl) payload.imageUrl = null;

            const res = await fetch('/api/cards', {
                method: card ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            });

            if (res.ok) {
                if (suggestion && onSuggestionAccepted) {
                    await onSuggestionAccepted();
                }
                toast.success(card ? 'Card updated' : 'Card created');
                onClose();
            } else {
                const errData = await res.json();
                setError(errData.error || 'Failed to save card');
                toast.error(errData.error || 'Failed to save card');
            }
        } catch {
            setError('Network error');
            toast.error('Network error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSendSuggestion = async () => {
        setIsSubmitting(true);
        try {
            const { cardTypeId, ...rest } = formData;
            const payload = {
                ...rest,
                storyId,
                cardTypeId,
                attributes,
                ...(card?.id ? { id: card.id } : {})
            };

            const res = await fetch('/api/suggestions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId,
                    targetType: 'CARD', // SuggestionTarget.CARD
                    targetId: card?.id,
                    action: card ? 'UPDATE' : 'CREATE',
                    message: suggestionMessage,
                    payload
                })
            });

            if (res.ok) {
                toast.success('Suggestion sent');
                onClose();
            } else {
                const errData = await res.json();
                setError(errData.error || 'Failed to send suggestion');
            }
        } catch (err) {
            setError('Network error');
        } finally {
            setIsSubmitting(false);
            setShowSuggestionModal(false);
        }
    };

    const handleDelete = async () => {
        if (!card?.id || !onDelete) return;
        if (!confirm('Are you sure you want to delete this card?')) return;

        try {
            const res = await fetch(`/api/cards?id=${card.id}`, { method: 'DELETE' });
            if (res.ok) {
                toast.success('Card deleted successfully');
                onDelete();
                onClose();
            } else {
                toast.error('Failed to delete card');
            }
        } catch {
            toast.error('Network error');
        }
    };

    const Content = () => (
        <div className={`flex flex-col h-full bg-surface ${inline ? '' : 'rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] w-full max-w-3xl relative animate-in zoom-in-95'}`}>
            {/* Header */}
            <div className="p-6 border-b border-border flex justify-between items-center bg-surface shrink-0">
                <div>
                    <h2 className="text-2xl font-bold text-foreground">{card ? 'Edit Card' : 'Create New Card'}</h2>
                    <p className="text-sm text-muted-foreground">Fill in the details below to {card ? 'update' : 'create'} your card.</p>
                </div>
                <div className="flex items-center gap-2">
                    {inline && (
                        <>
                            {card && onDelete && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={handleDelete}
                                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                                    title="Delete Card"
                                >
                                    <Trash2 className="w-5 h-5" />
                                </Button>
                            )}
                            <Button
                                variant="default"
                                size="icon"
                                onClick={() => handleSubmit()}
                                disabled={isSubmitting}
                                className="bg-accent text-accent-foreground hover:bg-accent/90"
                                title="Save Changes"
                            >
                                <Check className="w-5 h-5" />
                            </Button>
                        </>
                    )}
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={onClose}
                        className="text-muted-foreground hover:text-foreground"
                        title="Close"
                    >
                        <X className="w-6 h-6" />
                    </Button>
                </div>
            </div>

            {/* Scrollable Content */}
            <ScrollArea className="flex-1">
                <div className="p-6">
                    {error && (
                        <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                            <AlertCircle className="w-5 h-5" />
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-8">
                        {/* Basic Info Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Basic Information</h3>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label>Name *</Label>
                                    <Input
                                        name="name"
                                        value={formData.name}
                                        onChange={handleTextChange}
                                        placeholder="e.g. The One Ring"
                                        required
                                    />
                                </div>

                                <div className="space-y-2">
                                    <Label>Type *</Label>
                                    <Select value={formData.cardTypeId} onValueChange={handleSelectChange}>
                                        <SelectTrigger>
                                            <SelectValue placeholder="Select type" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {cardTypes.map(type => (
                                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Description</Label>
                                <Textarea
                                    name="description"
                                    value={formData.description}
                                    onChange={handleTextChange}
                                    rows={4}
                                    placeholder="Describe this card..."
                                    className="resize-none"
                                />
                            </div>
                        </div>

                        {/* Media & Tags Section */}
                        <div className="space-y-4">
                            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Media & Tags</h3>

                            <div className="space-y-2">
                                <Label>Image URL</Label>
                                <div className="relative">
                                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                                    <Input
                                        name="imageUrl"
                                        value={formData.imageUrl}
                                        onChange={handleTextChange}
                                        className="pl-9"
                                        placeholder="https://example.com/image.jpg"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Tags</Label>
                                <TagInput
                                    value={formData.tags}
                                    onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                                    storyId={storyId}
                                />
                            </div>
                        </div>

                        {/* Attributes Section */}
                        <div className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Attributes</h3>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => setAttributes(prev => [...prev, { attrId: '', value: '' }])}
                                    className="text-accent hover:text-accent font-medium gap-1"
                                >
                                    <Plus className="w-4 h-4" /> Add Attribute
                                </Button>
                            </div>

                            <div className="space-y-3">
                                {attributes.length === 0 && (
                                    <div className="text-center py-6 border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm">
                                        No attributes added yet.
                                    </div>
                                )}
                                {attributes.map((attr, index) => (
                                    <div key={index} className="p-4 bg-background border border-border rounded-xl shadow-sm group hover:border-accent/50 transition-colors">
                                        <AttributeField
                                            definition={availableAttrs.find(a => a.id === attr.attrId) || { id: attr.attrId, name: 'Unknown', attrType: 'Text', config: null, cardTypeId: '', storyId: '', createdAt: new Date(), description: null }}
                                            // usedAttributes={attributes.map(a => a.attrId).filter((id, i) => id && i !== index)}
                                            value={attr}
                                            onChange={newVal => {
                                                const updated = [...attributes];
                                                updated[index] = newVal;
                                                setAttributes(updated);
                                            }}
                                            storyId={storyId}
                                        />
                                        <div className="mt-2 flex justify-end">
                                            <Button
                                                type="button"
                                                variant="ghost"
                                                size="sm"
                                                onClick={() => {
                                                    const updated = [...attributes];
                                                    updated.splice(index, 1);
                                                    setAttributes(updated);
                                                }}
                                                className="text-xs text-red-500 hover:text-red-600 hover:bg-red-500/10 h-auto py-1"
                                            >
                                                Remove Attribute
                                            </Button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Visibility */}
                        <div className="pt-2">
                            <div className="flex items-center gap-4 p-4 bg-background border border-border rounded-xl">
                                <Switch
                                    checked={formData.hidden}
                                    onCheckedChange={handleSwitchChange}
                                    id="hidden-switch"
                                />
                                <div className="space-y-0.5">
                                    <Label htmlFor="hidden-switch" className="text-base">Hidden Card</Label>
                                    <div className="text-xs text-muted-foreground">Hide this card from the main list views</div>
                                </div>
                            </div>
                        </div>
                    </form>
                </div>
            </ScrollArea>

            {/* Footer (Only show if NOT inline) */}
            {!inline && (
                <div className="p-6 border-t border-border bg-surface flex justify-end gap-3 shrink-0">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={onClose}
                    >
                        Cancel
                    </Button>
                    <Button
                        onClick={() => handleSubmit()}
                        disabled={isSubmitting}
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                    >
                        {isSubmitting ? 'Processing...' :
                            suggestion ? 'Accept Suggestion' :
                                userRole === CollaborationRole.Comment ? 'Suggest Change' :
                                    card ? 'Update Card' : 'Create Card'}
                    </Button>
                </div>
            )}

            {/* Suggestion Modal should technically be its own dialog or managed at a higher level, but keeping it here for now */}
            {/* Reusing standard approach for nested modal if possible, or just strict overlay */}
            {showSuggestionModal && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                    {/* Simple manual modal override for now as nesting Dialogs can be tricky */}
                    <div className="w-full max-w-md bg-surface p-6 rounded-2xl shadow-2xl border border-border animate-in zoom-in-95 duration-200">
                        <h3 className="text-lg font-bold mb-2 text-foreground">Suggest Changes</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                            You have comment-only access. Describe your changes below to submit a suggestion.
                        </p>
                        <Textarea
                            value={suggestionMessage}
                            onChange={(e) => setSuggestionMessage(e.target.value)}
                            className="mb-4"
                            placeholder="Why are you making these changes?"
                            rows={4}
                        />
                        <div className="flex justify-end gap-3">
                            <Button variant="outline" onClick={() => setShowSuggestionModal(false)}>Cancel</Button>
                            <Button onClick={handleSendSuggestion} disabled={!suggestionMessage.trim() || isSubmitting}>Submit Suggestion</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );

    if (inline) {
        return <Content />;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <Content />
        </div>
    );
}
