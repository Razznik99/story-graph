import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2, ArrowRightLeft, AlertCircle } from 'lucide-react';
import { INVERSE_RELATIONSHIP_MAP } from '@/domain/constants';
import { toast } from 'sonner';

interface InverseOperation {
    id: string; // unique key for list
    type: 'CREATE' | 'DELETE';
    sourceId: string;
    sourceTitle?: string;
    targetId: string;
    targetTitle?: string;
    relationshipType: string;
}

interface RelationChange {
    sourceId: string;
    targetId: string;
    relationshipType: string;
}

interface InverseRelationManagerProps {
    storyId: string;
    isOpen: boolean;
    onClose: () => void;
    addedRelations: RelationChange[];
    deletedRelations: RelationChange[];
    currentEventTitle: string;
}

export default function InverseRelationManager({
    storyId,
    isOpen,
    onClose,
    addedRelations,
    deletedRelations,
    currentEventTitle
}: InverseRelationManagerProps) {
    const [operations, setOperations] = useState<InverseOperation[]>([]);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (isOpen) {
            calculateOperations();
            // Reset selection when opening
            setSelectedIds(new Set());
        }
    }, [isOpen, addedRelations, deletedRelations]);

    const calculateOperations = async () => {
        setIsLoading(true);
        const ops: InverseOperation[] = [];
        const uniqueEventIds = new Set<string>();

        // Collect all target IDs to fetch titles
        [...addedRelations, ...deletedRelations].forEach(r => uniqueEventIds.add(r.targetId));

        if (uniqueEventIds.size === 0) {
            setOperations([]);
            setIsLoading(false);
            return;
        }

        // Fetch event titles
        // Optimization: In a real app we might batch this better or have titles already. 
        // For now, we fetch all events to map titles (or ideally utilize a cache)
        // Since we don't have a bulk fetch by IDs endpoint readily visible without checking, 
        // we'll fetch all events for the story which is cached by query client usually.
        // Or if the list is huge, this might be slow, but let's assume reasonable size for now.
        // Alternatively, we just show "linked event" if we can't get title easily, but titles are better.

        try {
            const res = await fetch(`/api/events?storyId=${storyId}`);
            if (!res.ok) throw new Error('Failed to fetch events');
            const events = await res.json();
            const eventMap = new Map(events.map((e: any) => [e.id, e.title]));

            // Calculate Added Inverses
            addedRelations.forEach((rel, idx) => {
                const inverseType = INVERSE_RELATIONSHIP_MAP[rel.relationshipType];
                if (inverseType) {
                    ops.push({
                        id: `add-${idx}`,
                        type: 'CREATE',
                        sourceId: rel.targetId, // The target of the original link becomes the source of the inverse
                        sourceTitle: String(eventMap.get(rel.targetId) || 'Unknown Event'),
                        targetId: rel.sourceId, // The source of the original link becomes the target of the inverse
                        targetTitle: currentEventTitle,
                        relationshipType: inverseType
                    });
                }
            });

            // Calculate Deleted Inverses
            deletedRelations.forEach((rel, idx) => {
                const inverseType = INVERSE_RELATIONSHIP_MAP[rel.relationshipType];
                if (inverseType) {
                    ops.push({
                        id: `del-${idx}`,
                        type: 'DELETE',
                        sourceId: rel.targetId,
                        sourceTitle: String(eventMap.get(rel.targetId) || 'Unknown Event'),
                        targetId: rel.sourceId,
                        targetTitle: currentEventTitle,
                        relationshipType: inverseType
                    });
                }
            });

            setOperations(ops);
            // Default select all
            setSelectedIds(new Set(ops.map(o => o.id)));

        } catch (error) {
            console.error(error);
            toast.error('Failed to load event details for inverse relations');
        } finally {
            setIsLoading(false);
        }
    };

    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) {
            newSet.delete(id);
        } else {
            newSet.add(id);
        }
        setSelectedIds(newSet);
    };

    const toggleAll = () => {
        if (selectedIds.size === operations.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(operations.map(o => o.id)));
        }
    };

    const handleConfirm = async () => {
        if (selectedIds.size === 0) {
            onClose();
            return;
        }

        setIsSubmitting(true);
        const promises = [];

        for (const op of operations) {
            if (!selectedIds.has(op.id)) continue;

            if (op.type === 'CREATE') {
                promises.push(
                    fetch('/api/events/relations', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            type: 'event',
                            storyId,
                            eventId: op.sourceId,
                            linkId: op.targetId,
                            relationshipType: op.relationshipType
                        })
                    })
                );
            } else if (op.type === 'DELETE') {
                // DELETE requires the LINK ID, not just source/target. 
                // We don't have the link ID for the inverse relation here.
                // We need to find the link ID first. 
                // This implies we need to Query the relations of the sourceId to find the link to targetId with specific type.

                // Fetch relations for the remote event (sourceId of the inverse relation)
                const findAndDelete = async () => {
                    const res = await fetch(`/api/events/relations?storyId=${storyId}&eventId=${op.sourceId}&type=event`);
                    if (res.ok) {
                        const data = await res.json();
                        // Find the specific link
                        const linkToDelete = data.links?.find((l: any) =>
                            l.linkId === op.targetId &&
                            l.relationshipType === op.relationshipType
                        );

                        if (linkToDelete) {
                            await fetch(`/api/events/relations?id=${linkToDelete.id}&type=event`, { method: 'DELETE' });
                        }
                    }
                };
                promises.push(findAndDelete());
            }
        }

        try {
            await Promise.all(promises);
            toast.success(`Processed ${selectedIds.size} inverse relationships`);
            onClose();
        } catch (error) {
            console.error(error);
            toast.error('Failed to process some inverse relationships');
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
            <DialogContent className="sm:max-w-[600px] max-h-[80vh] flex flex-col">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <ArrowRightLeft className="w-5 h-5 text-accent" />
                        Manage Inverse Relationships
                    </DialogTitle>
                    <DialogDescription>
                        The following inverse relationships were detected based on your changes.
                        Select the ones you want to apply.
                    </DialogDescription>
                </DialogHeader>

                <div className="flex-1 overflow-y-auto py-4">
                    {isLoading ? (
                        <div className="flex justify-center items-center h-40">
                            <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
                        </div>
                    ) : operations.length === 0 ? (
                        <div className="text-center text-muted-foreground p-8 border border-dashed rounded-lg">
                            No applicable inverse relationships found.
                        </div>
                    ) : (
                        <div className="space-y-4">
                            <div className="flex justify-end px-1">
                                <Button variant="link" size="sm" onClick={toggleAll} className="h-auto p-0 text-xs">
                                    {selectedIds.size === operations.length ? 'Deselect All' : 'Select All'}
                                </Button>
                            </div>

                            {operations.map((op) => (
                                <div key={op.id} className="flex items-start space-x-3 p-3 rounded-lg border border-border bg-card/50">
                                    <Checkbox
                                        id={op.id}
                                        checked={selectedIds.has(op.id)}
                                        onCheckedChange={() => toggleSelection(op.id)}
                                        className="mt-1"
                                    />
                                    <div className="grid gap-1.5 leading-none">
                                        <label
                                            htmlFor={op.id}
                                            className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                                        >
                                            <span className={op.type === 'CREATE' ? "text-green-600 dark:text-green-400 font-bold text-xs uppercase" : "text-red-600 dark:text-red-400 font-bold text-xs uppercase"}>
                                                {op.type === 'CREATE' ? 'Add' : 'Remove'} Reference
                                            </span>
                                            <div className="mt-1 flex items-center gap-2 flex-wrap">
                                                <span className="font-semibold">{op.sourceTitle}</span>
                                                <span className="text-muted-foreground text-xs bg-muted px-1.5 py-0.5 rounded">
                                                    {op.relationshipType}
                                                </span>
                                                <span className="font-semibold">{op.targetTitle}</span>
                                            </div>
                                        </label>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <DialogFooter>
                    <Button variant="ghost" onClick={onClose} disabled={isSubmitting}>
                        Skip
                    </Button>
                    <Button onClick={handleConfirm} disabled={isSubmitting || operations.length === 0 || selectedIds.size === 0}>
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Confirm Changes
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
