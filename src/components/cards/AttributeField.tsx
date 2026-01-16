
"use client";

import { useMemo, useEffect, useState } from "react";
import { AttributeDefinition, Card } from "@prisma/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
            // Ideally fetched via a hook or passed generic searcher, 
            // but assuming we can fetch generic cards here or receive valid options
            fetch(`/api/cards?storyId=${storyId}`)
                .then((res) => res.json())
                .then((data) => {
                    if (Array.isArray(data)) setAvailableCards(data);
                })
                .catch((err) => console.error(err))
                .finally(() => setLoading(false));
        }
    }, [definition.attrType, storyId]);

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
                    />
                );

            case "Number":
                return (
                    <Input
                        type="number"
                        value={value || ""}
                        onChange={(e) => onChange(Number(e.target.value))}
                        placeholder="0"
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
                            className="flex-1"
                        />
                        <div className="bg-secondary px-3 py-2 rounded-md text-sm font-medium border border-border min-w-[3rem] text-center">
                            {config.unit || unitVal.unit || '-'}
                        </div>
                    </div>
                );

            case "Option":
                return (
                    <Select value={value || ""} onValueChange={onChange}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select an option" />
                        </SelectTrigger>
                        <SelectContent>
                            {config.options?.map((opt) => (
                                <SelectItem key={opt} value={opt}>
                                    {opt}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                );

            case "MultiOption":
                // Simple implementation: multiselect via tags or checkboxes?
                // Using a simple list of badges + select to add
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
                        <Select
                            value=""
                            onValueChange={(val) => {
                                if (val) onChange([...currentOptions, val]);
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Add option..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availableOptions.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                );

            case "Link":
                return (
                    <Select value={value || ""} onValueChange={onChange} disabled={loading}>
                        <SelectTrigger>
                            <SelectValue placeholder="Select card..." />
                        </SelectTrigger>
                        <SelectContent>
                            {availableCards.map(c => (
                                <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
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
                        <Select
                            value=""
                            onValueChange={(val) => {
                                if (val) onChange([...currentLinks, val]);
                            }}
                            disabled={loading}
                        >
                            <SelectTrigger>
                                <SelectValue placeholder="Link card..." />
                            </SelectTrigger>
                            <SelectContent>
                                {availLinks.map(c => (
                                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
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
