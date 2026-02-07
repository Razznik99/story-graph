import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Plus, Trash2, Link as LinkIcon, Pencil, X } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LinkedCardsEditorProps {
    storyId: string;
    eventId?: string | undefined;
    // For pending/managed state
    pendingLinks: { id?: string; cardId: string; roleId?: string | null }[];
    onChangePending: (links: { id?: string; cardId: string; roleId?: string | null }[]) => void;
}

export default function LinkedCardsEditor({ storyId, pendingLinks, onChangePending }: LinkedCardsEditorProps) {
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);

    // Fetch all cards for selection
    const { data: cards = [] } = useQuery({
        queryKey: ['cards', storyId],
        queryFn: async () => {
            const res = await fetch(`/api/cards?storyId=${storyId}`);
            if (!res.ok) throw new Error('Failed to fetch cards');
            return res.json();
        }
    });

    // Fetch card roles
    const { data: roles = [] } = useQuery({
        queryKey: ['card-roles', storyId],
        queryFn: async () => {
            const res = await fetch(`/api/card-roles?storyId=${storyId}`);
            if (res.ok) return res.json();
            return [];
        },
        retry: false
    });

    const handleAdd = () => {
        if (!selectedCardId) return;

        onChangePending([...pendingLinks, { cardId: selectedCardId, roleId: selectedRoleId }]);
        setSelectedCardId(null);
        setSelectedRoleId(null);
        setIsEditing(false);
    };

    const handleDelete = (index: number) => {
        const newLinks = [...pendingLinks];
        newLinks.splice(index, 1);
        onChangePending(newLinks);
    };

    const handleEdit = (index: number) => {
        const link = pendingLinks[index];
        if (!link) return;
        setSelectedCardId(link.cardId);
        setSelectedRoleId(link.roleId || null);
        handleDelete(index); // Remove from list while editing
        setIsEditing(true);
    };

    const handleCancelEdit = () => {
        setSelectedCardId(null);
        setSelectedRoleId(null);
        setIsEditing(false);
    }

    // Derive displayed links
    const displayedLinks = pendingLinks.map((l, i) => {
        const card = cards.find((c: any) => c.id === l.cardId);
        const role = roles.find((r: any) => r.id === l.roleId);
        return {
            id: i, // Use index as ID for UI mapping
            cardId: l.cardId,
            card: card || { name: 'Unknown Card' },
            role: role ? { name: role.name } : null
        };
    });

    // Filter available cards
    const linkedCardIds = new Set(displayedLinks.map((l: any) => l.cardId));
    // If editing, allow the currently selected card
    const availableCards = cards.filter((c: any) => !linkedCardIds.has(c.id) || c.id === selectedCardId).map((c: any) => ({
        label: c.name,
        value: c.id,
        ...c
    }));

    // Filter roles
    const selectedCard = cards.find((c: any) => c.id === selectedCardId);
    const validRoles = roles.filter((r: any) => !r.cardTypeId || (selectedCard && selectedCard.cardType && r.cardTypeId === selectedCard.cardType.id));

    return (
        <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                <LinkIcon className="w-4 h-4" /> Linked Cards
            </h3>

            <div className="space-y-2">
                {displayedLinks.length === 0 && !isEditing && (
                    <div className="text-sm text-muted-foreground italic">No linked cards.</div>
                )}
                {displayedLinks.map((link: any) => (
                    <div key={link.id} className="flex items-center justify-between p-2 rounded-lg border border-border bg-card">
                        <div className="flex items-center gap-3">
                            <div className="text-sm font-medium">{link.card.name}</div>
                            {link.role && (
                                <div className="text-xs px-2 py-0.5 rounded-full bg-accent/10 text-accent border border-accent/20">
                                    {link.role.name}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-accent"
                                onClick={() => handleEdit(link.id)}
                            >
                                <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDelete(link.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    </div>
                ))}
            </div>

            {/* Add New */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">{isEditing ? 'Editing Card Link' : 'Select Card'}</Label>
                    <SearchableSelect
                        options={availableCards}
                        value={selectedCardId}
                        onChange={setSelectedCardId}
                        placeholder="Search card..."
                        fullWidth
                    />
                </div>
                {selectedCardId && (
                    <div className="w-[150px] space-y-1 animate-in fade-in slide-in-from-left-2">
                        <Label className="text-xs text-muted-foreground">Role (Optional)</Label>
                        <Select value={selectedRoleId || '__no_role__'} onValueChange={(val) => setSelectedRoleId(val === '__no_role__' ? null : val)}>
                            <SelectTrigger className="h-10">
                                <SelectValue placeholder="No Role" />
                            </SelectTrigger>
                            <SelectContent className="bg-background border-border border-accent">
                                <SelectItem value="__no_role__">No Role</SelectItem>
                                {validRoles.map((r: any) => (
                                    <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                )}
                <div className="flex gap-1">
                    {isEditing && (
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={handleCancelEdit}
                            className="mb-[1px]"
                        >
                            <X className="w-4 h-4" />
                        </Button>
                    )}
                    <Button
                        onClick={handleAdd}
                        disabled={!selectedCardId}
                        className="mb-[1px] bg-accent rounded "
                    >
                        {isEditing ? <Pencil className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
                    </Button>
                </div>
            </div>
        </div>
    );
}
