
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
import { GripVertical, Plus, Trash2, Heading as HeadingIcon, List, RotateCcw } from "lucide-react";

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
    attrId?: string;     // for attributes (optional reference)
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
    } = useSortable({
        id: item.id,
        disabled: item.type === "heading" && item.removable === false // Optional: Disable dragging "Attributes" heading entirely if desired, but user just said "no heading below it"
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 999 : 'auto',
        position: 'relative' as const,
    };

    if (item.type === "heading") {
        const isDefault = item.removable === false;
        return (
            <div ref={setNodeRef} style={style} className={`flex items-center gap-2 py-4 px-4 rounded-lg mb-3 border bg-muted/50 ${isDefault ? 'border-primary/50' : 'border-dashed border-border'}`}>
                <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-1 hover:text-foreground">
                    <GripVertical size={18} />
                </div>
                {isDefault ? (
                    <span className="font-bold text-lg flex-1 pl-1 text-primary">{item.text}</span>
                ) : (
                    <Input
                        value={item.text || ''}
                        onChange={(e) => onUpdateText?.(e.target.value)}
                        className="font-bold text-lg bg-transparent border-none shadow-none h-auto p-1 focus-visible:ring-1 flex-1"
                        placeholder="Heading Name"
                    />
                )}
                {!isDefault && (
                    <Button variant="ghost" size="icon" onClick={onRemove} className="group-hover:accent-hover h-8 w-8 text-accent transition-opacity">
                        <Trash2 size={16} />
                    </Button>
                )}
            </div>
        );
    }

    // Attribute Item
    return (
        <div ref={setNodeRef} style={style} className="flex items-center gap-2 py-2 px-3 bg-card border rounded-md mb-2 shadow-sm ml-6 border-l-4 border-l-accent/50">
            <div {...attributes} {...listeners} className="cursor-grab text-muted-foreground p-1 hover:text-foreground">
                <GripVertical size={16} />
            </div>
            <div className="flex-1 flex flex-col">
                <span className="font-medium text-sm">{attribute?.name || item.text || "(Unknown Attribute)"}</span>
                <span className="text-xs text-muted-foreground">{attribute?.attrType}</span>
            </div>
        </div>
    );
}

export default function LayoutBuilder({ layoutItems, attributes, onChange }: Props) {
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (!over || active.id === over.id) return;

        const oldIndex = layoutItems.findIndex((item) => item.id === active.id);
        const newIndex = layoutItems.findIndex((item) => item.id === over.id);

        let newItems = arrayMove(layoutItems, oldIndex, newIndex);

        // ENFORCE CONSTRAINT: "Attributes" heading must be the LAST heading.
        // No heading can be below "Attributes".

        // Find "Attributes" heading index
        const attributesHeaderIndex = newItems.findIndex(i => i.type === 'heading' && i.removable === false && i.text === 'Attributes');

        if (attributesHeaderIndex !== -1) {
            // Check if any heading is after it
            const unauthorizedHeadingIndex = newItems.findIndex((item, idx) =>
                idx > attributesHeaderIndex && item.type === 'heading'
            );

            if (unauthorizedHeadingIndex !== -1) {
                // Revert or fix?
                // Revert is safest UX constraint usually, preventing the drop. 
                // However, dnd-kit dragEnd happens after visual update usually if not handled carefully.
                // We just won't apply the change if it violates.
                return;
            }
        }

        // Also, if we moved "Attributes" heading itself, ensure it didn't jump above another heading if we enforced top-down order? 
        // Or actually, user said "Attribute" is the Default Heading... "then list of attributes below it". 
        // "No heading can be moved below the default Heading 'Attribute'".
        // This effectively means "Attributes" is the anchor at the bottom of the section list.

        onChange(newItems);
    };

    const addHeading = () => {
        // Add new heading before the "Attributes" heading
        const attributesIdx = layoutItems.findIndex(i => i.type === 'heading' && i.text === 'Attributes' && i.removable === false);

        const newItem: LayoutItem = {
            id: crypto.randomUUID(),
            type: 'heading',
            text: 'New Section',
            removable: true
        };

        const newItems = [...layoutItems];
        if (attributesIdx !== -1) {
            newItems.splice(attributesIdx, 0, newItem);
        } else {
            // Should not happen if data is consistent, but fallback
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

    const resetLayout = () => {
        if (!confirm("Are you sure? This will reset the layout to default.")) return;

        const newItems: LayoutItem[] = [];

        // Add default heading
        newItems.push({
            id: crypto.randomUUID(),
            type: 'heading',
            text: 'Attributes',
            removable: false
        });

        // Add all attributes
        attributes.forEach(attr => {
            newItems.push({ id: attr.id, type: 'attribute' });
        });

        onChange(newItems);
    };

    return (
        <div className="flex flex-col h-full gap-4">
            <div className="flex align-center gap-2">
                <Button variant="outline" size="sm" onClick={addHeading} className="gap-2 bg-accent">
                    <Plus size={14} /> Add Section
                </Button>
                <Button variant="ghost" size="sm" onClick={resetLayout} className="gap-2 text-muted-foreground hover:text-destructive">
                    <RotateCcw size={14} /> Reset to Default
                </Button>
            </div>

            <div className="bg-background p-4 rounded-xl border flex-1 overflow-y-auto min-h-[400px]">
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={layoutItems.map(i => i.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className="flex flex-col">
                            {layoutItems.map((item) => (
                                <SortableLayoutItem
                                    key={item.id}
                                    item={item}
                                    attribute={item.type === 'attribute' ? attributes.find(a => a.id === item.id) : undefined}
                                    onRemove={() => removeHeading(item.id)}
                                    onUpdateText={(text) => updateHeadingText(item.id, text)}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>

                {layoutItems.length === 0 && (
                    <div className="text-center py-10 text-muted-foreground">
                        No layout items found.
                    </div>
                )}
            </div>

            <div className="text-xs text-muted-foreground px-1 shrink-0">
                <ul className="list-disc pl-4 space-y-1">
                    <li>The <strong>Attributes</strong> section displays all fields by default.</li>
                    <li>You can create new sections above it.</li>
                    <li>Drag attributes into different sections to organize them.</li>
                </ul>
            </div>
        </div>
    );
}
