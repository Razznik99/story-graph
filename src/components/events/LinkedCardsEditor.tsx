import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Loader2, Plus, Trash2, Link as LinkIcon, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';

interface LinkedCardsEditorProps {
    storyId: string;
    eventId?: string | undefined;
    // For pending creation state
    pendingLinks?: { cardId: string; roleId?: string | null }[] | undefined;
    onChangePending?: ((links: { cardId: string; roleId?: string | null }[]) => void) | undefined;
}

export default function LinkedCardsEditor({ storyId, eventId, pendingLinks, onChangePending }: LinkedCardsEditorProps) {
    const queryClient = useQueryClient();
    const [selectedCardId, setSelectedCardId] = useState<string | null>(null);
    const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);

    const isPendingMode = !eventId;

    // Fetch existing links (only if eventId exists)
    const { data: linksData, isLoading: isLoadingLinks } = useQuery({
        queryKey: ['event-relations', 'cards', eventId],
        queryFn: async () => {
            if (!eventId) return { links: [] };
            const res = await fetch(`/api/events/relations?storyId=${storyId}&eventId=${eventId}`);
            if (!res.ok) throw new Error('Failed to fetch links');
            return res.json();
        },
        enabled: !!eventId,
    });

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

        if (isPendingMode) {
            if (onChangePending && pendingLinks) {
                onChangePending([...pendingLinks, { cardId: selectedCardId, roleId: selectedRoleId }]);
                setSelectedCardId(null);
                setSelectedRoleId(null);
            }
        } else {
            addMutation.mutate();
        }
    };

    const handleDelete = (idOrIndex: string | number) => {
        if (isPendingMode) {
            if (onChangePending && pendingLinks && typeof idOrIndex === 'number') {
                const newLinks = [...pendingLinks];
                newLinks.splice(idOrIndex, 1);
                onChangePending(newLinks);
            }
        } else {
            if (typeof idOrIndex === 'string') {
                deleteMutation.mutate(idOrIndex);
            }
        }
    };

    const addMutation = useMutation({
        mutationFn: async () => {
            if (!selectedCardId || !eventId) return;
            const res = await fetch('/api/events/relations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    type: 'card',
                    storyId,
                    eventId,
                    cardId: selectedCardId,
                    roleId: selectedRoleId
                }),
            });
            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || 'Failed to link card');
            }
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-relations', 'cards', eventId] });
            setSelectedCardId(null);
            setSelectedRoleId(null);
            toast.success('Card linked');
        },
        onError: (err: any) => {
            toast.error(err.message);
        }
    });

    const deleteMutation = useMutation({
        mutationFn: async (linkId: string) => {
            const res = await fetch(`/api/events/relations?id=${linkId}&type=card`, {
                method: 'DELETE',
            });
            if (!res.ok) throw new Error('Failed to delete link');
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['event-relations', 'cards', eventId] });
            toast.success('Link removed');
        },
        onError: () => toast.error('Failed to remove link')
    });

    // Derive displayed links
    const displayedLinks = isPendingMode
        ? pendingLinks?.map((l, i) => {
            const card = cards.find((c: any) => c.id === l.cardId);
            const role = roles.find((r: any) => r.id === l.roleId);
            return {
                id: i, // Use index as ID for pending
                cardId: l.cardId,
                card: card || { name: 'Unknown Card' },
                role: role ? { name: role.name } : null
            };
        }) || []
        : linksData?.links || [];

    // Filter available cards
    const linkedCardIds = new Set(displayedLinks.map((l: any) => l.cardId));
    const availableCards = cards.filter((c: any) => !linkedCardIds.has(c.id)).map((c: any) => ({
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

            {!isPendingMode && isLoadingLinks ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-3 h-3 animate-spin" /> Loading relations...
                </div>
            ) : (
                <div className="space-y-2">
                    {displayedLinks.length === 0 && (
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
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-red-500"
                                onClick={() => handleDelete(link.id)}
                            >
                                <Trash2 className="w-4 h-4" />
                            </Button>
                        </div>
                    ))}
                </div>
            )}

            {/* Add New */}
            <div className="flex gap-2 items-end">
                <div className="flex-1 space-y-1">
                    <Label className="text-xs text-muted-foreground">Select Card</Label>
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
                <Button
                    onClick={handleAdd}
                    disabled={!selectedCardId || (!isPendingMode && addMutation.isPending)}
                    className="mb-[1px]"
                >
                    {(!isPendingMode && addMutation.isPending) ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                </Button>
            </div>
        </div>
    );
}
