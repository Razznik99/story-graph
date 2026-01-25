
"use client";

import { useState, useEffect } from "react";
import { useStoryStore } from "@/store/useStoryStore";
import { EventType } from "@prisma/client";
import { Plus, Loader2, Pencil, Trash2, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea"

export default function EventsTab() {
    const { selectedStoryId } = useStoryStore();
    const [eventTypes, setEventTypes] = useState<EventType[]>([]);
    const [loading, setLoading] = useState(false);

    // Dialog States
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingType, setEditingType] = useState<EventType | null>(null);

    // Form States
    const [formData, setFormData] = useState({ name: "", description: "" });

    const fetchEventTypes = async () => {
        if (!selectedStoryId) return;
        setLoading(true);
        try {
            const res = await fetch(`/api/event-types?storyId=${selectedStoryId}`);
            if (res.ok) {
                const data = await res.json();
                setEventTypes(data);
            }
        } catch (error) {
            console.error(error);
            toast.error("Failed to load event types");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEventTypes();
    }, [selectedStoryId]);

    const handleCreate = async () => {
        if (!selectedStoryId) return;
        try {
            const res = await fetch(`/api/event-types`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    storyId: selectedStoryId,
                    name: formData.name,
                    description: formData.description
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create event type");
            }

            toast.success("Event Type created");
            setIsCreateOpen(false);
            setFormData({ name: "", description: "" });
            fetchEventTypes();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleUpdate = async () => {
        if (!editingType) return;
        try {
            const res = await fetch(`/api/event-types/${editingType.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    id: editingType.id,
                    name: formData.name,
                    description: formData.description
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to update event type");
            }

            toast.success("Event Type updated");
            setIsEditOpen(false);
            setEditingType(null);
            fetchEventTypes();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDelete = async (id: string) => {
        try {
            const res = await fetch(`/api/event-types/${id}`, {
                method: 'DELETE',
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to delete event type");
            }

            toast.success("Event Type deleted");
            fetchEventTypes();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const openEdit = (type: EventType) => {
        setEditingType(type);
        setFormData({ name: type.name, description: type.description || "" });
        setIsEditOpen(true);
    };

    if (!selectedStoryId) {
        return (
            <div className="p-8 text-center text-muted-foreground bg-surface rounded-lg border border-border">
                Please select a story to manage event types.
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-lg font-semibold text-foreground">Event Types</h2>
                    <p className="text-sm text-muted-foreground">Define categories for plot events (e.g. Battle, Meeting).</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button className="gap-2 bg-accent hover:bg-accent-hover"><Plus size={16} /> Create Type</Button>
                    </DialogTrigger>
                    <DialogContent>
                        <DialogHeader>
                            <DialogTitle>Create Event Type</DialogTitle>
                            <DialogDescription>
                                Add a new category for your story events.
                            </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4 py-4">
                            <div className="space-y-2">
                                <Label htmlFor="name">Name</Label>
                                <Input
                                    id="name"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    placeholder="e.g. Battle, Flashback"
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="desc">Description</Label>
                                <Textarea
                                    id="desc"
                                    value={formData.description}
                                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Optional description"
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button onClick={handleCreate} disabled={!formData.name}>Create</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {loading ? (
                <div className="flex justify-center p-8"><Loader2 className="animate-spin text-muted-foreground" /></div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4">
                    {eventTypes.length === 0 && (
                        <div className="col-span-full text-center p-10 border border-dashed rounded-lg text-muted-foreground">
                            No event types found. Create one to get started.
                        </div>
                    )}
                    {eventTypes.map(type => (
                        <Card key={type.id} className="group hover:border-primary/50 transition-colors">
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-base">{type.name}</CardTitle>
                                    </div>
                                    <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => openEdit(type)}>
                                            <Pencil size={14} />
                                        </Button>
                                        <AlertDialog>
                                            <AlertDialogTrigger asChild>
                                                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive/70 hover:text-destructive hover:bg-destructive/10">
                                                    <Trash2 size={14} />
                                                </Button>
                                            </AlertDialogTrigger>
                                            <AlertDialogContent>
                                                <AlertDialogHeader>
                                                    <AlertDialogTitle>Delete Event Type?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This will delete the <strong>{type.name}</strong> event type. Events using this type may become invalid or generic.
                                                    </AlertDialogDescription>
                                                </AlertDialogHeader>
                                                <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDelete(type.id)} className="bg-destructive hover:bg-destructive-hover">Delete</AlertDialogAction>
                                                </AlertDialogFooter>
                                            </AlertDialogContent>
                                        </AlertDialog>
                                    </div>
                                </div>
                                <CardDescription className="line-clamp-2 min-h-[40px]">
                                    {type.description || "No description provided."}
                                </CardDescription>
                            </CardHeader>
                        </Card>
                    ))}
                </div>
            )}

            {/* Edit Dialog */}
            <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Edit Event Type</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div className="space-y-2">
                            <Label htmlFor="edit-name">Name</Label>
                            <Input
                                id="edit-name"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="edit-desc">Description</Label>
                            <Textarea
                                id="edit-desc"
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button onClick={handleUpdate} disabled={!formData.name}>Save Changes</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
