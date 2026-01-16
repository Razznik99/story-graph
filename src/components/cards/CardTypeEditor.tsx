
"use client";

import { useEffect, useState } from "react";
import { AttributeDefinition, CardType } from "@prisma/client";
import { toast } from "sonner";
import { Loader2, Plus, GripVertical, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
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

    // New Attribute State
    const [isAttrSheetOpen, setIsAttrSheetOpen] = useState(false);
    const [newAttr, setNewAttr] = useState({
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
            if (layout && layout.items) {
                setLayoutItems(layout.items);
            } else {
                setLayoutItems([]);
            }
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
            // Optionally refresh
        } catch (error) {
            toast.error("Failed to save layout");
        }
    };

    const handleCreateAttribute = async () => {
        try {
            const res = await fetch(`/api/card-types/attributes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cardTypeId,
                    ...newAttr,
                    // basic config parsing if needed
                })
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.error || "Failed to create attribute");
            }

            toast.success("Attribute created");
            setIsAttrSheetOpen(false);
            setNewAttr({ name: "", description: "", attrType: "Text", config: {} });
            fetchData(); // Refresh to see new attribute in layout
        } catch (error: any) {
            toast.error(error.message);
        }
    };

    if (loading) {
        return <div className="flex justify-center p-10"><Loader2 className="animate-spin" /></div>;
    }

    if (!cardType) return <div>Card Type not found</div>;

    return (
        <div className="h-full flex flex-col space-y-4">
            <div className="flex justify-between items-center px-4 py-2 border-b">
                <div>
                    <h2 className="text-xl font-bold">{cardType.name} <span className="text-muted-foreground font-normal text-sm">Editor</span></h2>
                </div>
                <div>
                    {/* <Button variant="ghost" onClick={onClose}>Close</Button> */}
                </div>
            </div>

            <div className="flex-1 px-4 overflow-hidden">
                <Tabs defaultValue="details" className="h-full flex flex-col">
                    <TabsList>
                        <TabsTrigger value="details">Details</TabsTrigger>
                        <TabsTrigger value="attributes">Attributes</TabsTrigger>
                        <TabsTrigger value="layout">Layout</TabsTrigger>
                    </TabsList>

                    <TabsContent value="details" className="flex-1 space-y-4 pt-4">
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="name">Name</Label>
                            <Input id="name" value={name} onChange={e => setName(e.target.value)} />
                        </div>
                        <div className="space-y-2 max-w-md">
                            <Label htmlFor="desc">Description</Label>
                            <Textarea id="desc" value={description} onChange={e => setDescription(e.target.value)} />
                        </div>
                        <Button onClick={handleSaveDetails}>Save Details</Button>
                    </TabsContent>

                    <TabsContent value="attributes" className="flex-1 pt-4 space-y-4">
                        <div className="flex justify-end">
                            <Sheet open={isAttrSheetOpen} onOpenChange={setIsAttrSheetOpen}>
                                <SheetTrigger asChild>
                                    <Button className="gap-2"><Plus size={16} /> Add Attribute</Button>
                                </SheetTrigger>
                                <SheetContent>
                                    <SheetHeader>
                                        <SheetTitle>Add Attribute</SheetTitle>
                                        <SheetDescription>Define a new attribute for this card type.</SheetDescription>
                                    </SheetHeader>
                                    <div className="space-y-4 py-4">
                                        <div className="space-y-2">
                                            <Label>Name</Label>
                                            <Input value={newAttr.name} onChange={e => setNewAttr({ ...newAttr, name: e.target.value })} placeholder="e.g. Health, Level" />
                                        </div>
                                        <div className="space-y-2">
                                            <Label>Type</Label>
                                            <Select value={newAttr.attrType} onValueChange={v => setNewAttr({ ...newAttr, attrType: v })}>
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
                                            <Textarea value={newAttr.description} onChange={e => setNewAttr({ ...newAttr, description: e.target.value })} />
                                        </div>
                                        {/* Config fields based on type could go here */}
                                    </div>
                                    <SheetFooter>
                                        <SheetClose asChild>
                                            <Button variant="outline">Cancel</Button>
                                        </SheetClose>
                                        <Button onClick={handleCreateAttribute}>Create Attribute</Button>
                                    </SheetFooter>
                                </SheetContent>
                            </Sheet>
                        </div>

                        <ScrollArea className="h-[500px] border rounded-md">
                            <div className="p-4 space-y-2">
                                {attributes.length === 0 && <div className="text-muted-foreground text-center">No attributes yet.</div>}
                                {attributes.map(attr => (
                                    <div key={attr.id} className="flex justify-between items-center p-3 bg-card border rounded-lg shadow-sm">
                                        <div>
                                            <div className="font-semibold">{attr.name}</div>
                                            <div className="text-xs text-muted-foreground">{attr.attrType}</div>
                                        </div>
                                        <div className="flex gap-2">
                                            {/* Future: Edit Attribute */}
                                            {/* <Button variant="ghost" size="icon"><Pencil size={14} /></Button> */}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </ScrollArea>
                    </TabsContent>

                    <TabsContent value="layout" className="flex-1 pt-4 flex flex-col overflow-hidden">
                        <div className="flex-1 overflow-auto">
                            <LayoutBuilder
                                layoutItems={layoutItems}
                                attributes={attributes}
                                onChange={setLayoutItems}
                            />
                        </div>
                        <div className="pt-4 border-t mt-4">
                            <Button onClick={handleSaveLayout} className="w-full sm:w-auto">Save Layout Changes</Button>
                        </div>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}
