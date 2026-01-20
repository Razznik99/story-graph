
"use client";

import { useEffect, useState } from "react";
import { AttributeDefinition, CardType } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, Plus, Pencil, Trash2, LayoutTemplate } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import {
    Sheet,
    SheetContent,
    SheetDescription,
    SheetHeader,
    SheetTitle,
    SheetTrigger,
    SheetFooter,
    SheetClose,
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

import LayoutBuilder, { LayoutItem } from "./LayoutBuilder";

interface Props {
    cardTypeId: string;
    onClose?: () => void;
}

export default function CardTypeEditor({ cardTypeId, onClose }: Props) {
    const [loading, setLoading] = useState(true);
    const [cardType, setCardType] = useState<CardType | null>(null);
    const [attributes, setAttributes] = useState<AttributeDefinition[]>([]);
    const [layoutItems, setLayoutItems] = useState<LayoutItem[]>([]);

    // Form States
    const [name, setName] = useState("");
    const [description, setDescription] = useState("");

    // Layout Modal State
    const [isLayoutOpen, setIsLayoutOpen] = useState(false);

    // New Attribute State
    const [isAttrSheetOpen, setIsAttrSheetOpen] = useState(false);
    const [editingAttrId, setEditingAttrId] = useState<string | null>(null);
    const [attrForm, setAttrForm] = useState({
        name: "",
        description: "",
        attrType: "Text",
        config: {} as any
    });

    const fetchData = async () => {
        setLoading(true);
        try {
            const [typeRes, attrsRes] = await Promise.all([
                fetch(`/api/card-types/${cardTypeId}`),
                fetch(`/api/card-types/attributes?cardTypeId=${cardTypeId}`)
            ]);

            if (!typeRes.ok || !attrsRes.ok) throw new Error("Failed to fetch data");

            const typeData = await typeRes.json();
            const attrsData = await attrsRes.json();

            setCardType(typeData);
            setAttributes(attrsData);
            setName(typeData.name);
            setDescription(typeData.description || "");

            // Parse Layout
            const layout = typeData.layout as any;
            let items: LayoutItem[] = [];

            if (layout && Array.isArray(layout.items)) {
                items = [...layout.items];
            }

            // 1. Ensure "Attributes" heading exists
            let attrHeadingExists = items.some(i => i.type === 'heading' && i.text === 'Attributes');
            if (!attrHeadingExists) {
                // If missing, add it.
                items.push({ id: crypto.randomUUID(), type: 'heading', text: 'Attributes', removable: false });
            }

            // 2. Filter out items referring to deleted attributes
            const validAttrIds = new Set(attrsData.map((a: any) => a.id));
            items = items.filter(i => i.type === 'heading' || validAttrIds.has(i.id));

            // 3. Find attributes missing from layout and append them
            const existingLayoutAttrIds = new Set(items.filter(i => i.type === 'attribute').map(i => i.id));
            const missingAttributes = attrsData.filter((a: any) => !existingLayoutAttrIds.has(a.id));

            missingAttributes.forEach((attr: any) => {
                items.push({ id: attr.id, type: 'attribute' });
            });

            setLayoutItems(items);
        } catch (error) {
            toast.error("Error loading card type");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (cardTypeId) fetchData();
    }, [cardTypeId]);

    const handleSaveDetails = async () => {
        try {
            const res = await fetch(`/api/card-types/${cardTypeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, description })
            });
            if (!res.ok) throw new Error("Failed to save details");
            toast.success("Details updated");
        } catch (error) {
            toast.error("Failed to save");
        }
    };

    const handleSaveLayout = async () => {
        try {
            const layoutPayload = { items: layoutItems };
            const res = await fetch(`/api/card-types/${cardTypeId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ layout: layoutPayload })
            });
            if (!res.ok) throw new Error("Failed to save layout");
            toast.success("Layout updated");
            setIsLayoutOpen(false);
        } catch (error) {
            toast.error("Failed to save layout");
        }
    };

    const handleCreateOrUpdateAttribute = async () => {
        try {
            const url = editingAttrId
                ? `/api/card-types/attributes/${editingAttrId}`
                : `/api/card-types/attributes`;

            const method = editingAttrId ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardTypeId,
                    ...attrForm,
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to save attribute");
            }

            toast.success(editingAttrId ? "Attribute updated" : "Attribute created");
            setIsAttrSheetOpen(false);
            setAttrForm({ name: "", description: "", attrType: "Text", config: {} });
            setEditingAttrId(null);
            fetchData();
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    const handleDeleteAttribute = async (attrId: string) => {
        if (!confirm("Are you sure? This will delete this attribute and any data associated with it in existing cards.")) return;

        try {
            const res = await fetch(`/api/card-types/attributes/${attrId}`, {
                method: 'DELETE'
            });

            if (!res.ok) {
                throw new Error("Failed to delete attribute");
            }

            toast.success("Attribute deleted");
            fetchData();
        } catch (error) {
            toast.error("Failed to delete attribute");
        }
    };


    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    if (!cardType) return <div>Card Type not found</div>;

    return (
        <div className="flex flex-col bg-background">

            {/* Top Section: Details */}
            <div className="p-6 space-y-6 border-b border-border bg-surface/50">
                <div className="flex justify-between items-start w-flex">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight">{cardType.name}</h2>
                        <p className="text-muted-foreground">Manage properties and layout for this card type.</p>
                    </div>
                    <Dialog open={isLayoutOpen} onOpenChange={setIsLayoutOpen}>
                        <DialogTrigger asChild>
                            <Button variant="outline" className="gap-2">
                                <LayoutTemplate size={16} /> Edit Layout
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-3xl h-[90vh] flex flex-col overflow-y-auto">
                            <DialogHeader>
                                <DialogTitle>Edit Card Layout</DialogTitle>
                                <DialogDescription>
                                    Drag and drop to rearrange sections and attributes.
                                    Headings create new sections. The "Attributes" section catches all remaining fields.
                                </DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 py-4">
                                <LayoutBuilder
                                    layoutItems={layoutItems}
                                    attributes={attributes}
                                    onChange={setLayoutItems}
                                />
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsLayoutOpen(false)}>Cancel</Button>
                                <Button variant="outline" onClick={handleSaveLayout}>Save Layout</Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <Label htmlFor="name">Name</Label>
                        <Input
                            id="name"
                            value={name}
                            onChange={e => setName(e.target.value)}
                            placeholder="e.g. Weapon, Character"
                            className="bg-background"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="desc">Description</Label>
                        <Textarea
                            id="desc"
                            value={description}
                            onChange={e => setDescription(e.target.value)}
                            placeholder="Describe usage..."
                            className="bg-background min-h-[80px]"
                        />
                    </div>
                </div>
                <div className="flex justify-end">
                    <Button onClick={handleSaveDetails}>Save Details</Button>
                </div>
            </div>

            {/* Bottom Section: Attributes */}
            <div className="flex flex-col p-6">
                <div className="flex justify-between items-center mb-4">
                    <div className="flex items-center gap-3">
                        <h3 className="text-lg font-semibold">Attributes</h3>
                        <span className="bg-secondary text-secondary-foreground text-xs px-2 py-0.5 rounded-full">
                            {attributes.length}
                        </span>
                    </div>

                    <Sheet open={isAttrSheetOpen} onOpenChange={setIsAttrSheetOpen}>
                        <SheetTrigger asChild>
                            <Button className="gap-2" onClick={() => {
                                setEditingAttrId(null);
                                setAttrForm({ name: "", description: "", attrType: "Text", config: {} });
                            }}>
                                <Plus size={16} /> Add Attribute
                            </Button>
                        </SheetTrigger>
                        <SheetContent>
                            <SheetHeader>
                                <SheetTitle>{editingAttrId ? 'Edit Attribute' : 'Add New Attribute'}</SheetTitle>
                                <SheetDescription>
                                    Define the data field for this card type.
                                </SheetDescription>
                            </SheetHeader>
                            <div className="space-y-6 py-6">
                                <div className="space-y-2">
                                    <Label>Name</Label>
                                    <Input
                                        value={attrForm.name}
                                        onChange={e => setAttrForm({ ...attrForm, name: e.target.value })}
                                        placeholder="e.g. Strength"
                                        autoFocus
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label>Type</Label>
                                    <Select
                                        value={attrForm.attrType}
                                        onValueChange={v => setAttrForm({ ...attrForm, attrType: v })}
                                        disabled={!!editingAttrId} // Changing type usually not recommended
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {['Text', 'Number', 'UnitNumber', 'Option', 'MultiOption', 'Link', 'MultiLink'].map(t => (
                                                <SelectItem key={t} value={t}>{t}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-2">
                                    <Label>Description</Label>
                                    <Textarea
                                        value={attrForm.description}
                                        onChange={e => setAttrForm({ ...attrForm, description: e.target.value })}
                                        placeholder="Helper text for the user..."
                                    />
                                </div>
                            </div>
                            <SheetFooter>
                                <SheetClose asChild>
                                    <Button variant="outline">Cancel</Button>
                                </SheetClose>
                                <Button onClick={handleCreateOrUpdateAttribute}>
                                    {editingAttrId ? 'Update Attribute' : 'Create Attribute'}
                                </Button>
                            </SheetFooter>
                        </SheetContent>
                    </Sheet>
                </div>

                <div className="rounded-lg border border-border bg-surface/30 overflow-x-auto">
                    {attributes.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-10">
                            <p>No attributes defined.</p>
                            <p className="text-sm">Click "Add Attribute" to get started.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-border min-w-[700px]">
                            {/* Header Row */}
                            <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                                <div className="col-span-4">Name</div>
                                <div className="col-span-3">Type</div>
                                <div className="col-span-4">Description</div>
                                <div className="col-span-1 text-right">Actions</div>
                            </div>

                            {/* Items */}
                            {attributes.map(attr => (
                                <div key={attr.id} className="grid grid-cols-12 gap-4 p-4 items-center hover:bg-muted/30 transition-colors">
                                    <div className="col-span-4 font-medium">{attr.name}</div>
                                    <div className="col-span-3">
                                        <span className="bg-secondary px-2 py-1 rounded text-xs border border-border">
                                            {attr.attrType}
                                        </span>
                                    </div>
                                    <div className="col-span-4 text-sm text-muted-foreground truncate" title={attr.description || ''}>
                                        {attr.description || '-'}
                                    </div>
                                    <div className="col-span-1 flex justify-end gap-1">
                                        {/* Edit Placeholder */}
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => {
                                            setEditingAttrId(attr.id);
                                            setAttrForm({
                                                name: attr.name,
                                                description: attr.description || "",
                                                attrType: attr.attrType,
                                                config: attr.config || {}
                                            });
                                            setIsAttrSheetOpen(true);
                                        }}>
                                            <Pencil size={14} />
                                        </Button>
                                        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => handleDeleteAttribute(attr.id)}>
                                            <Trash2 size={14} />
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
