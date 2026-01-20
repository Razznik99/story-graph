import { useState, useEffect } from 'react';
import { Card as CardType, AttributeDefinition, Suggestion } from '@/domain/types';
import { CollaborationRole } from '@/domain/roles';
import AttributeField from './AttributeField';
import { SearchableSelect } from '@/components/ui/searchable-select';
import TagInput from '../TagInput';
import { X, Plus, Image as ImageIcon, Trash2, AlertCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';

type CardTypeOption = { id: string; name: string; prefix: string };

interface CardEditorProps {
    storyId: string;
    card: (CardType & { cardType?: { id: string;[key: string]: any } }) | null;
    onClose: () => void;
    suggestion?: Suggestion | null;
    onSuggestionAccepted?: () => void;
    inline?: boolean;
    onDelete?: () => void;
}

export default function CardEditor({
    storyId,
    card,
    onClose,
    suggestion,
    onSuggestionAccepted,
    inline = false,
    onDelete,
}: CardEditorProps) {
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
        if (attributes.length > 0) {
            if (confirm('Changing card type will remove all current attributes. Continue?')) {
                setAttributes([]);
                setFormData(prev => ({ ...prev, cardTypeId: value }));
            }
        } else {
            setFormData(prev => ({ ...prev, cardTypeId: value }));
        }
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

    const renderFormContent = () => (
        <form onSubmit={handleSubmit} className="space-y-6 pt-2">
            {error && (
                <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 rounded-xl text-sm font-medium flex items-center gap-2">
                    <AlertCircle className="w-5 h-5" />
                    {error}
                </div>
            )}

            {/* Top Row: Basic Info */}
            <div className="grid grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2">
                    <Label htmlFor="name" className="text-text-secondary">Name</Label>
                    <Input
                        id="name"
                        name="name"
                        value={formData.name}
                        onChange={handleTextChange}
                        placeholder="The Great Sword"
                        required
                        className="bg-surface border-border focus-within:ring-accent"
                    />
                </div>
                <div className="space-y-2">
                    <Label className="text-text-secondary">Type</Label>
                    <Select value={formData.cardTypeId} onValueChange={handleSelectChange}>
                        <SelectTrigger className="bg-surface border-border">
                            <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent className="bg-surface border-border border-accent">
                            {cardTypes.map(type => (
                                <SelectItem key={type.id} value={type.id}>{type.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
                <Label htmlFor="description" className="text-text-secondary">Description</Label>
                <Textarea
                    id="description"
                    name="description"
                    value={formData.description}
                    onChange={handleTextChange}
                    placeholder="A brief description..."
                    className="bg-surface border-border focus-within:ring-accent min-h-[100px]"
                />
            </div>

            {/* Media & Tags */}
            <div className="space-y-2">
                <Label htmlFor="imageUrl" className="text-text-secondary">Image URL</Label>
                <div className="relative">
                    <ImageIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                        id="imageUrl"
                        name="imageUrl"
                        value={formData.imageUrl}
                        onChange={handleTextChange}
                        className="bg-surface border-border focus-within:ring-accent pl-9"
                        placeholder="https://..."
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Label className="text-text-secondary">Tags</Label>
                <TagInput
                    value={formData.tags}
                    onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                    storyId={storyId}
                    placeholder="Add #tags..."
                />
            </div>

            {/* Attributes Section */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label className="text-text-secondary uppercase tracking-wider text-xs font-semibold">Attributes</Label>

                </div>
                <div className="space-y-3 rounded-lg bg-surface/50 p-1">
                    {attributes.length === 0 && (
                        <div className="text-center py-4 border-2 border-dashed border-border rounded-lg text-muted-foreground text-xs">
                            No attributes added yet.
                        </div>
                    )}
                    {attributes.map((attr, index) => (
                        <div key={index} className="p-3 bg-background border border-border rounded-lg shadow-sm group hover:border-accent/30 transition-colors">
                            <div className="flex items-start gap-2">
                                <div className="flex-1">
                                    <AttributeField
                                        definition={availableAttrs.find(a => a.id === attr.attrId) || { id: attr.attrId, name: 'Select Attribute', attrType: 'Text', config: null, cardTypeId: '', storyId: '', createdAt: new Date(), description: null }}
                                        value={attr.value}
                                        onChange={newVal => {
                                            const updated = [...attributes];
                                            updated[index] = { ...updated[index], value: newVal };
                                            setAttributes(updated);
                                        }}
                                        storyId={storyId}
                                    />
                                    {/* Attribute selector removed as we now select before adding */}
                                </div>
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    onClick={() => {
                                        const updated = [...attributes];
                                        updated.splice(index, 1);
                                        setAttributes(updated);
                                    }}
                                    className="text-muted-foreground hover:text-red-500 h-8 w-8 -mt-1"
                                    title="Remove Attribute"
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
                <div className='bg-background'>
                    <SearchableSelect
                        options={availableAttrs
                            .filter(a => !attributes.some(attr => attr.attrId === a.id))
                            .map(a => ({ label: a.name, value: a.id }))}
                        value={null}
                        onChange={(val) => {
                            if (val) {
                                setAttributes(prev => [...prev, { attrId: val, value: '' }]);
                            }
                        }}
                        placeholder="Add Attribute..."
                        searchPlaceholder="Search attributes..."
                        fullWidth
                        resetAfterSelect
                        trigger={
                            <Button
                                type="button"
                                variant="outline"
                                className="w-full justify-center gap-2 border-dashed border-2 hover:border-accent hover:text-text-primary"
                            >
                                <Plus className="w-4 h-4" /> Add Attribute
                            </Button>
                        }
                    />
                </div>
            </div>

            {/* Visibility */}
            <div className="flex items-center gap-4 p-3 bg-surface border border-border rounded-lg">

                <Button
                    type="button"
                    variant={formData.hidden ? "secondary" : "outline"}
                    onClick={() =>
                        setFormData(prev => ({
                            ...prev,
                            hidden: !prev.hidden,
                        }))
                    }
                    className={cn(
                        "px-3",
                        formData.hidden &&
                        "bg-accent/10 text-accent border-accent/20 hover:bg-accent/20"
                    )}
                    title="Toggle Hidden"
                >
                    {formData.hidden ? (
                        <EyeOff className="w-5 h-5" />
                    ) : (
                        <Eye className="w-5 h-5" />
                    )}
                </Button>
                <div className="space-y-0.5">
                    <div className="text-sm font-medium">Hidden Card</div>
                    <div className="text-xs text-muted-foreground">
                        Hide this card from main lists
                    </div>
                </div>
            </div>
        </form>
    );

    const ModalFooter = () => (
        <DialogFooter className="gap-2 sm:gap-0">
            {inline && card && onDelete && (
                <Button
                    variant="ghost"
                    onClick={handleDelete}
                    className="text-red-500 hover:text-red-600 hover:bg-red-500/10 mr-auto"
                >
                    Delete
                </Button>
            )}
            {!inline && (
                <Button type="button" variant="ghost" onClick={onClose} className="hover:bg-surface hover:text-accent">
                    Cancel
                </Button>
            )}
            <Button
                onClick={() => handleSubmit()}
                disabled={isSubmitting}
                className="bg-accent text-accent-foreground hover:bg-accent/90"
            >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {suggestion ? 'Accept Suggestion' :
                    userRole === CollaborationRole.Comment ? 'Suggest Change' :
                        card ? 'Save Changes' : 'Create Card'}
            </Button>
        </DialogFooter>
    );

    // If inline, render without Dialog wrapper
    if (inline) {
        return (
            <div className="flex flex-col h-full bg-surface p-4">
                <div className="mb-4">
                    <h2 className="text-xl font-bold text-foreground">{card ? 'Edit Card' : 'New Card'}</h2>
                </div>
                <div className="flex-1 overflow-y-auto pr-2">
                    {renderFormContent()}
                </div>
                <div className="pt-4 mt-4 border-t border-border">
                    <ModalFooter />
                </div>

                {/* Suggestion Modal (Manual overlay for now if nested) */}
                {showSuggestionModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-surface p-6 rounded-2xl shadow-2xl border border-border">
                            <h3 className="text-lg font-bold mb-2 text-foreground">Suggest Changes</h3>
                            <Textarea
                                value={suggestionMessage}
                                onChange={(e) => setSuggestionMessage(e.target.value)}
                                className="mb-4"
                                placeholder="Reason for this change..."
                                rows={4}
                            />
                            <div className="flex justify-end gap-3">
                                <Button variant="outline" onClick={() => setShowSuggestionModal(false)}>Cancel</Button>
                                <Button onClick={handleSendSuggestion} disabled={!suggestionMessage.trim() || isSubmitting}>Submit</Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // Default Dialog View
    return (
        <>
            <Dialog open={true} onOpenChange={(open) => !open && onClose()}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto transition-all">
                    <DialogHeader>
                        <DialogTitle className="text-2xl font-bold text-accent">
                            {card ? 'Edit Card' : 'Create New Card'}
                        </DialogTitle>
                    </DialogHeader>

                    {renderFormContent()}

                    <ModalFooter />
                </DialogContent>
            </Dialog>

            {/* Suggestion Modal Helper */}
            {showSuggestionModal && (
                <Dialog open={true} onOpenChange={() => setShowSuggestionModal(false)}>
                    <DialogContent className="sm:max-w-md z-[150]">
                        <DialogHeader>
                            <DialogTitle>Suggest Changes</DialogTitle>
                        </DialogHeader>
                        <p className="text-sm text-muted-foreground mb-2">
                            You have comment-only access. Describe your changes below to submit a suggestion.
                        </p>
                        <Textarea
                            value={suggestionMessage}
                            onChange={(e) => setSuggestionMessage(e.target.value)}
                            placeholder="Why are you making these changes?"
                            className="min-h-[100px]"
                        />
                        <DialogFooter>
                            <Button variant="ghost" onClick={() => setShowSuggestionModal(false)}>Cancel</Button>
                            <Button onClick={handleSendSuggestion} disabled={!suggestionMessage.trim() || isSubmitting}>Submit Suggestion</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            )}
        </>
    );
}
