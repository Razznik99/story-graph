import { Card, CardWithVersion, AttributeWithValue } from '@/domain/types';
import { X, Edit, Calendar, Tag, Hash, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemo, useEffect, useState } from 'react';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

// Interfaces for Layout Items (matching schema roughly)
interface LayoutItem {
    id?: string;
    type: 'heading' | 'attribute';
    text?: string;
    removable?: boolean;
}

interface Layout {
    items: LayoutItem[];
}

function deriveVersions(cards: Card[]) {
    const sorted = [...cards].sort((a, b) => {
        if (!a.orderKey || !b.orderKey) return 0
        return Number(a.orderKey) - Number(b.orderKey)
    })

    return sorted.map((card, index) => ({
        ...card,
        __version: index + 1,
    })) as CardWithVersion[];
}

export default function CardViewer({
    card: initialCard,
    onClose,
    onEdit,
    inline = false,
}: {
    card: CardWithVersion;
    onClose: () => void;
    onEdit: () => void;
    inline?: boolean;
}) {
    const [card, setCard] = useState<CardWithVersion>(initialCard);
    const [versions, setVersions] = useState<CardWithVersion[]>([]);

    useEffect(() => {
        setCard(initialCard);
    }, [initialCard]);

    useEffect(() => {
        if (card.identityId) {
            fetch(`/api/cards?identityId=${card.identityId}&storyId=${card.storyId}&hidden=all`) // hidden=all implies we want all, though API expects explicit hidden=true/false filters. We need to fetch ALL.
                // My API implementation: if hiddenFilter is absent, it returns all (both hidden and not hidden) unless default logic applies?
                // Checking API: 
                // if (hiddenFilter === 'true') where.hidden = true;
                // if (hiddenFilter === 'false') where.hidden = false;
                // so if omitted, it returns all. Good.
                .then(res => res.json())
                .then(data => {
                    if (!Array.isArray(data)) return;

                    const withVersions = deriveVersions(data);
                    setVersions(withVersions);
                })
                .catch(console.error);
        }
    }, [card.identityId, card.storyId]);

    const handleVersionChange = (cardId: string) => {
        const selected = versions.find(v => v.id === cardId);
        if (selected) {
            // We need to keep the cardType populated if possible, or assume it's included?
            // The API returns include: { cardType: true } for list too.
            setCard(selected);
        }
    };

    const layoutItems = useMemo(() => {
        if (!card.cardType?.layout) return [];
        const layout = card.cardType.layout as unknown as Layout;
        return layout.items || [];
    }, [card.cardType]);

    // State to store resolved card names for Link attributes
    const [resolvedNames, setResolvedNames] = useState<Record<string, string>>({});

    const attributesMap = useMemo(() => {
        const map = new Map<string, AttributeWithValue>();
        if (Array.isArray(card.attributes)) {
            card.attributes.forEach((attr: AttributeWithValue) => {
                if (attr.id) map.set(attr.id, attr);
            });
        }
        return map;
    }, [card.attributes]);

    // Fetch card names for Link/MultiLink attributes
    useEffect(() => {
        const linkIds: string[] = [];
        if (Array.isArray(card.attributes)) {
            card.attributes.forEach((attr: AttributeWithValue) => {
                if (attr.attrType === 'Link' && attr.value && typeof attr.value === 'string') {
                    linkIds.push(attr.value);
                } else if (attr.attrType === 'MultiLink' && Array.isArray(attr.value)) {
                    attr.value.forEach((id: unknown) => {
                        if (typeof id === 'string') linkIds.push(id);
                    });
                }
            });
        }

        if (linkIds.length === 0) return;

        // Dedup ids
        const uniqueIds = Array.from(new Set(linkIds));

        // Fetch names
        const fetchNames = async () => {
            try {
                const params = new URLSearchParams();
                params.set('storyId', card.storyId);
                params.set('ids', uniqueIds.join(','));

                const res = await fetch(`/api/cards?${params.toString()}`);
                if (!res.ok) return;

                const data = await res.json();
                if (Array.isArray(data)) {
                    const mapping: Record<string, string> = {};
                    data.forEach((c: Card) => {
                        mapping[c.id] = c.name;
                    });
                    setResolvedNames(prev => ({ ...prev, ...mapping }));
                }
            } catch (err) {
                console.error("Failed to fetch linked card names", err);
            }
        };

        fetchNames();
    }, [card.attributes, card.storyId]);

    // Helper to check if an attribute has a displayable value
    const hasValue = (attr: AttributeWithValue | undefined) => {
        if (!attr || attr.value === undefined || attr.value === null) return false;
        if (typeof attr.value === 'string' && attr.value.trim() === '') return false;
        // Check for empty arrays (e.g. empty MultiOption)
        if (Array.isArray(attr.value) && attr.value.length === 0) return false;
        return true;
    };

    const renderResolvedValue = (attr: AttributeWithValue) => {
        if (attr.attrType === 'Link' && typeof attr.value === 'string') {
            return resolvedNames[attr.value] || attr.value || '-';
        }
        if (attr.attrType === 'MultiLink' && Array.isArray(attr.value)) {
            return attr.value.map((id: string) => resolvedNames[id] || id).join(', ');
        }
        return renderAttributeValue(attr);
    };

    const renderLayout = () => {
        // Fallback for no layout
        if (layoutItems.length === 0) {
            if (card.attributes && Array.isArray(card.attributes) && card.attributes.length > 0) {
                // Filter only attributes with values
                const visibleAttributes = card.attributes.filter((attr: AttributeWithValue) => hasValue(attr));

                if (visibleAttributes.length === 0) return null;

                return (
                    <div>
                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                            <Tag className="w-4 h-4" /> Attributes
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            {visibleAttributes.map((attr: AttributeWithValue) => (
                                <div key={attr.id} className="p-3 bg-background border border-border rounded-xl flex flex-col">
                                    <span className="text-xs text-muted-foreground font-medium mb-1">
                                        {attr.name || 'Attribute'}
                                    </span>
                                    <span className="text-sm font-semibold text-foreground truncate">
                                        {renderResolvedValue(attr)}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                );
            }
            return null;
        }

        // Process layout items to filter hidden headers
        const renderedItems: React.ReactNode[] = [];
        let currentHeading: { item: LayoutItem, index: number } | null = null;
        let hasAttributeSinceHeading = false;

        // Temporary storage for attributes under the current heading
        let currentSectionAttributes: React.ReactNode[] = [];

        for (let i = 0; i < layoutItems.length; i++) {
            const item = layoutItems[i];
            const index = i;

            if (!item) continue;

            if (item.type === 'heading') {
                // formatting: Push previous heading and its attributes IF there were valid attributes
                if (currentHeading && hasAttributeSinceHeading) {
                    renderedItems.push(
                        <h3 key={`h-${currentHeading.index}`} className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2 mt-6 mb-3">
                            {currentHeading.item.text}
                        </h3>
                    );
                    renderedItems.push(...currentSectionAttributes);
                }

                // Reset for new heading
                currentHeading = { item, index };
                hasAttributeSinceHeading = false;
                currentSectionAttributes = [];
            } else if (item.type === 'attribute' && item.id) {
                const attr = attributesMap.get(item.id);
                if (attr && hasValue(attr)) {
                    hasAttributeSinceHeading = true;
                    // Prepare the attribute element but don't add to main list yet
                    // If there is NO current heading, just add it directly (top level attributes)
                    const element = (
                        <div key={item.id} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between py-2 border-b border-border/50 last:border-0 hover:bg-surface-2/50 px-2 rounded-lg transition-colors">
                            <span className="text-sm font-medium text-muted-foreground">{attr.name}</span>
                            <span className="text-sm font-semibold text-foreground text-right">{renderResolvedValue(attr)}</span>
                        </div>
                    );

                    if (currentHeading) {
                        currentSectionAttributes.push(element);
                    } else {
                        renderedItems.push(element);
                    }
                }
            }
        }

        // Flush the last section
        if (currentHeading && hasAttributeSinceHeading) {
            renderedItems.push(
                <h3 key={`h-${currentHeading.index}`} className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2 mt-6 mb-3">
                    {currentHeading.item.text}
                </h3>
            );
            renderedItems.push(...currentSectionAttributes);
        }

        return <div className="space-y-6">{renderedItems}</div>;
    };

    const Content = () => (
        <div className={cn("flex flex-col md:flex-row bg-surface h-full w-full", !inline && "rounded-2xl shadow-2xl overflow-hidden")}>
            {/* Left/Top Side: Image (Square) */}
            <div className="shrink-0 relative group bg-black/5 dark:bg-black/20 aspect-square w-full md:w-auto md:h-full">
                {card.imageUrl ? (
                    <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-muted/20">
                        <div className="w-24 h-24 rounded-full bg-surface border-4 border-dashed border-border flex items-center justify-center mb-6">
                            <span className="text-4xl font-bold opacity-20">{card.name.charAt(0)}</span>
                        </div>
                        <p className="text-sm font-medium">No Cover Image</p>
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute top-4 left-4 flex gap-2 flex-wrap">
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-md text-white border-white/10">
                        {card.cardType?.name || 'Unknown Type'}
                    </Badge>
                    {card.hidden && (
                        <Badge variant="destructive" className="bg-red-500/80 backdrop-blur-md text-white">
                            Hidden (v{card.__version || '?'})
                        </Badge>
                    )}
                    {!card.hidden && (
                        <Badge variant="default" className="bg-green-500/80 backdrop-blur-md text-white">
                            Active (v{card.__version || '?'})
                        </Badge>
                    )}
                </div>
            </div>

            {/* Right/Bottom Side: Details - Flex-1 to take remaining space */}
            <div className="flex-1 flex flex-col h-full min-h-0 overflow-y-auto relative border-l border-border bg-surface">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border flex justify-between items-start bg-surface z-10 shrink-0">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <h2 className="text-3xl font-bold text-foreground leading-tight">{card.name}</h2>
                            {versions.length > 1 && (
                                <Select value={card.id} onValueChange={handleVersionChange}>
                                    <SelectTrigger className="bg-surface border-border">
                                        <SelectValue placeholder="Version" />
                                    </SelectTrigger>
                                    <SelectContent className="bg-surface border-border border-accent z-[101]">
                                        {versions.map(v => (
                                            <SelectItem key={v.id} value={v.id}>
                                                v{v.__version || '?'} {v.hidden ? '' : '(Active)'}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Updated {new Date(card.updatedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <History className="w-4 h-4" />
                                <span>Version {card.__version || '?'}</span>
                            </div>
                        </div>
                    </div>
                    {!inline && (
                        <div className="flex gap-2">
                            <Button size="icon" variant="ghost" onClick={onEdit} title="Edit Card">
                                <Edit className="w-5 h-5" />
                            </Button>
                            <Button size="icon" variant="ghost" onClick={onClose} className="hover:text-red-500 hover:bg-red-500/10" title="Close">
                                <X className="w-6 h-6" />
                            </Button>
                        </div>
                    )}
                </div>

                {/* Scrollable Content */}
                <ScrollArea className="flex-1 w-full">
                    <div className="p-6 md:p-8 space-y-8">
                        {/* Description */}
                        {card.description && (
                            <div className="prose dark:prose-invert max-w-none">
                                <p className="text-secondary-foreground leading-relaxed text-base">
                                    {card.description}
                                </p>
                            </div>
                        )}

                        {/* Tags */}
                        {card.tags && card.tags.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {card.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="px-3 py-1 font-medium bg-accent/10 text-accent border-accent/20">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Attributes rendered via Layout */}
                        {renderLayout()}
                    </div>
                </ScrollArea>

                {/* Inline Edit Button (if inline mode) */}
                {inline && (
                    <div className="p-4 border-t border-border bg-surface shrink-0">
                        <Button onClick={onEdit} variant="outline" className="w-full gap-2">
                            <Edit className="w-4 h-4" /> Edit Card
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );

    if (inline) {
        return <Content />;
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "relative bg-surface rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
                "w-[90vw] max-h-[90vh] flex flex-col",
                "md:w-auto md:h-[90vh] md:max-w-[90vw] md:flex-row"
            )}>
                <Content />
            </div>
        </div>
    );
}

function renderAttributeValue(attr: AttributeWithValue | undefined | null): string {
    if (!attr || attr.value === undefined || attr.value === null) return '-';

    // Handle different value types from schema
    if (typeof attr.value === 'object') {
        // Check for UnitNumber { value, unit }
        if ('unit' in attr.value && 'value' in attr.value) return `${attr.value.value} ${attr.value.unit}`;

        // Check for array (MultiOption, etc)
        if (Array.isArray(attr.value)) return attr.value.join(', ');

        return JSON.stringify(attr.value);
    }

    return String(attr.value);
}
