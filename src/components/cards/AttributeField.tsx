
"use client";

import { useMemo, useEffect, useState } from "react";
import { AttributeDefinition, Card } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { SearchableSelect } from "@/components/ui/searchable-select";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Card as UICard } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

// Types for props
interface Props {
    definition: AttributeDefinition;
    value: any;
    onChange: (val: any) => void;
    storyId: string;
}

interface AttributeConfig {
    options?: string[];
    unit?: string;
    cardTypeId?: string;
}

export default function AttributeField({
    definition,
    value,
    onChange,
    storyId,
}: Props) {
    const [loading, setLoading] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [availableCards, setAvailableCards] = useState<Card[]>([]);

    // Config parsing with safe fallback
    const config = useMemo<AttributeConfig>(() => {
        if (!definition.config || typeof definition.config !== 'object') return {};
        return definition.config as AttributeConfig;
    }, [definition.config]);

    // Fetch cards for Link types
    useEffect(() => {
        if (
            definition.attrType === "Link" ||
            definition.attrType === "MultiLink"
        ) {
            setLoading(true);
            let url = `/api/cards?storyId=${storyId}`;
            // If config has cardTypeId, we could filter server side if API supports it,
            // otherwise we filter client side. Assuming API might not support it yet,
            // we'll filter client side for now, OR if the user implied the route supports it.
            // But to be safe and efficient, let's fetch all and filter client side as requested.
            fetch(url)
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) {
                        let filtered = data;
                        if (config.cardTypeId) {
                            filtered = data.filter((c: any) =>
                                c.cardTypeId === config.cardTypeId ||
                                (c.cardType && c.cardType.id === config.cardTypeId)
                            );
                        }
                        setAvailableCards(filtered);
                    }
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [definition.attrType, storyId, config.cardTypeId]);

    const handleUnitValueChange = (val: string | number, type: 'value' | 'unit') => {
        const current = (typeof value === 'object' && value) ? value : { value: 0, unit: config.unit || '' };
        onChange({ ...current, [type]: type === 'value' ? Number(val) : val });
    };

    const renderField = () => {
        switch (definition.attrType) {
            case "Text":
                return (
                    <Input
                        value={value || ""}
                        onChange={(e) => onChange(e.target.value)}
                        placeholder={`Enter ${definition.name}...`}
                        className="focus-within:ring-accent"
                    />
                );

            case "Number":
                return (
                    <Input
                        type="number"
                        className="focus-within:ring-accent"
                        value={value || ""}
                        onChange={(e) => onChange(Number(e.target.value))}
                        placeholder="0"
                        onKeyDown={(e) => {
                            // Basic restriction to 0-9 and controls
                            if (!/[0-9]/.test(e.key) &&
                                !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'].includes(e.key)) {
                                e.preventDefault();
                            }
                        }}
                    />
                );

            case "UnitNumber":
                const unitVal = (typeof value === 'object' && value) ? value : { value: 0, unit: config.unit || '' };
                return (
                    <div className="flex gap-2 items-center">
                        <Input
                            type="number"
                            value={unitVal.value}
                            onChange={(e) => handleUnitValueChange(e.target.value, 'value')}
                            className="flex-1 focus-within:ring-accent"
                            onKeyDown={(e) => {
                                if (!/[0-9]/.test(e.key) &&
                                    !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'].includes(e.key)) {
                                    e.preventDefault();
                                }
                            }}
                        />
                        <div className="bg-secondary px-3 py-2 rounded-md text-sm font-medium border border-border min-w-[3rem] text-center">
                            {config.unit || unitVal.unit || '-'}
                        </div>
                    </div>
                );

            case "Option":
                return (
                    <SearchableSelect
                        options={config.options?.map(opt => ({ label: opt, value: opt })) || []}
                        value={value || ""}
                        onChange={(val) => onChange(val || "")}
                        placeholder="Select an option"
                        searchPlaceholder="Search options..."
                        fullWidth
                    />
                );

            case "MultiOption":
                // Simple implementation: multiselect via tags
                const currentOptions = Array.isArray(value) ? value : [];
                const availableOptions = config.options?.filter(o => !currentOptions.includes(o)) || [];

                return (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {currentOptions.map((opt: string) => (
                                <Badge key={opt} variant="secondary" className="gap-1 pr-1">
                                    {opt}
                                    <button onClick={() => onChange(currentOptions.filter((o: string) => o !== opt))} className="hover:text-destructive">
                                        <X size={14} />
                                    </button>
                                </Badge>
                            ))}
                        </div>
                        <SearchableSelect
                            options={availableOptions.map(opt => ({ label: opt, value: opt }))}
                            value={null}
                            onChange={(val) => {
                                if (val) onChange([...currentOptions, val]);
                            }}
                            placeholder="Add option..."
                            searchPlaceholder="Search options..."
                            fullWidth
                            resetAfterSelect
                        />
                    </div>
                );

            case "Link":
                return (
                    <SearchableSelect
                        options={availableCards.map(c => ({ label: c.name, value: c.id }))}
                        value={value || ""}
                        onChange={(val) => onChange(val || "")}
                        placeholder="Select card..."
                        searchPlaceholder="Search cards..."
                        fullWidth
                        disabled={loading}
                    />
                );

            case "MultiLink":
                const currentLinks = Array.isArray(value) ? value : [];
                const availLinks = availableCards.filter(c => !currentLinks.includes(c.id));

                return (
                    <div className="space-y-2">
                        <div className="flex flex-wrap gap-2 mb-2">
                            {currentLinks.map((linkId: string) => {
                                const card = availableCards.find(c => c.id === linkId);
                                return (
                                    <Badge key={linkId} variant="outline" className="gap-1 pr-1">
                                        {card?.name || 'Unknown'}
                                        <button onClick={() => onChange(currentLinks.filter((l: string) => l !== linkId))} className="hover:text-destructive">
                                            <X size={14} />
                                        </button>
                                    </Badge>
                                )
                            })}
                        </div>
                        <SearchableSelect
                            options={availLinks.map(c => ({ label: c.name, value: c.id }))}
                            value={null}
                            onChange={(val) => {
                                if (val) onChange([...currentLinks, val]);
                            }}
                            placeholder="Link card..."
                            searchPlaceholder="Search cards..."
                            fullWidth
                            disabled={loading}
                            resetAfterSelect
                        />
                    </div>
                );

            default:
                return <div className="text-destructive text-sm">Unknown type: {definition.attrType}</div>;
        }
    };

    return (
        <div className="space-y-1.5">
            <Label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                {definition.name}
            </Label>
            {renderField()}
        </div>
    );
}
