
"use client";

import { useEffect, useState } from "react";
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from "@dnd-kit/core";
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { AttributeDefinition } from "@prisma/client";
import { GripVertical, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Layout Item Type Definition
export interface LayoutItem {
    id: string;
    type: "heading" | "attribute";
    text?: string;       // for headings
    removable?: boolean; // mostly for "Attributes" heading
    attrId?: string;     // if type is attribute (Wait, schema says id is just unique ID, but we need to map to physical attribute)
    // Actually, if type='attribute', the ID *IS* the attribute ID usually, or we map it.
    // The schema in implementation plan: { id: "attr-uuid", type: "attribute" }
    // So 'id' is the AttributeDefinition ID.
}

interface Props {
    layoutItems: LayoutItem[];
    attributes: AttributeDefinition[]; // To access names
    onChange: (items: LayoutItem[]) => void;
}

// Sortable Item Component
function SortableLayoutItem({
    item,
    attribute,
    onRemove,
    onUpdateText
}: {
    item: LayoutItem;
    attribute?: AttributeDefinition;
    onRemove?: () => void;
    onUpdateText?: (text: string) => void;
}) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: item.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    if (item.type === "heading") {
        return (
            <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-3 bg-secondary/30 rounded-lg px-3 mb-2 group border border-dashed border-transparent hover:border-border">
                <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-1 hover:text-foreground">
                    <GripVertical size={16} />
                </div>
                {item.removable === false ? (
                    <span className="font-semibold text-lg flex-1 pl-1">{item.text}</span>
                ) : (
                    <Input
                        value={item.text || ''}
                        onChange={(e) => onUpdateText?.(e.target.value)}
                        className="font-semibold text-lg bg-transparent border-none shadow-none h-auto p-1 focus-visible:ring-1"
                        placeholder="Heading Name"
                    />
                )}
                {item.removable !== false && (
                    <Button variant="ghost" size="icon" onClick={onRemove} className="opacity-0 group-hover:opacity-100 h-8 w-8 text-destructive">
                        <Trash2 size={16} />
                    </Button>
                )}
            </div>
        );
    }

    // Attribute Item
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-2 px-3 bg-card border rounded-md mb-2 shadow-sm group">
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-1 hover:text-foreground">
                <GripVertical size={16} />
            </div>
            <div className="flex-1 flex flex-col">
                <span className="font-medium text-sm">{attribute?.name || "(Unknown Attribute)"}</span>
                <span className="text-xs text-muted-foreground">{attribute?.attrType}</span>
            </div>
            {/* We usually don't delete attributes from here, only reorder. Deletion happens in attribute manager. */}
        </div>
    );
}

export default function LayoutBuilder({ layoutItems, attributes, onChange }: Props) {
    // Sync local state if needed, or just use props. Using props + optimistic updates via onChange is cleaner.

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (active.id !== over?.id) {
            const oldIndex = layoutItems.findIndex((item) => item.id === active.id);
            const newIndex = layoutItems.findIndex((item) => item.id === over?.id);

            const newItems = arrayMove(layoutItems, oldIndex, newIndex);

            // Validate "Attributes" heading position
            // "Attributes" heading must be the LAST heading.
            // Simplified check: Just let them move, but maybe show warning?
            // Or enforce validation in parent.
            // For now, allow movement, API will validate strictly.
            onChange(newItems);
        }
    };

    const addHeading = () => {
        // Add new heading before the "Attributes" heading
        const attributesIdx = layoutItems.findIndex(i => i.type === 'heading' && i.text === 'Attributes' && i.removable === false);

        // Generate simple ID. In real app use uuid lib or crypto.randomUUID
        const newItem: LayoutItem = {
            id: crypto.randomUUID(),
            type: 'heading',
            text: 'New Section',
            removable: true
        };

        const newItems = [...layoutItems];
        // Insert before Attributes heading if found, else at end (should verify)
        if (attributesIdx !== -1) {
            newItems.splice(attributesIdx, 0, newItem);
        } else {
            newItems.push(newItem);
        }
        onChange(newItems);
    };

    const removeHeading = (id: string) => {
        onChange(layoutItems.filter(i => i.id !== id));
    };

    const updateHeadingText = (id: string, text: string) => {
        onChange(layoutItems.map(i => i.id === id ? { ...i, text } : i));
    };

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center">
                <h3 className="text-sm font-medium text-muted-foreground">Card Layout</h3>
                <Button variant="outline" size="sm" onClick={addHeading} className="gap-2">
                    <Plus size={14} /> Add Section
                </Button>
            </div>

            <div className="bg-muted/30 p-4 rounded-xl border min-h-[300px]">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={layoutItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        {layoutItems.map((item) => (
                            <SortableLayoutItem
                                key={item.id}
                                item={item}
                                attribute={item.type === 'attribute' ? attributes.find(a => a.id === item.id) : undefined}
                                onRemove={() => removeHeading(item.id)}
                                onUpdateText={(text) => updateHeadingText(item.id, text)}
                            />
                        ))}
                    </SortableContext>
                </DndContext>

                {layoutItems.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No layout items.
                    </div>
                )}
            </div>

            <p className="text-xs text-muted-foreground">
                Drag items to reorder. Attributes will be displayed in this order.
                The "Attributes" section catches all new attributes automatically.
            </p>
        </div>
    );
}
