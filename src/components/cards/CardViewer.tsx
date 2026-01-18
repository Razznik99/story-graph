import { Card, CardType } from '@/domain/types';
import { X, Edit, Calendar, Tag, Hash, LayoutGrid, List as ListIcon, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useMemo } from 'react';

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

export default function CardViewer({
    card,
    onClose,
    onEdit,
    inline = false,
}: {
    card: Card & { cardType?: CardType };
    onClose: () => void;
    onEdit: () => void;
    inline?: boolean;
}) {
    const layoutItems = useMemo(() => {
        if (!card.cardType?.layout) return [];
        const layout = card.cardType.layout as unknown as Layout;
        return layout.items || [];
    }, [card.cardType]);

    const attributesMap = useMemo(() => {
        const map = new Map<string, any>();
        if (Array.isArray(card.attributes)) {
            card.attributes.forEach((attr: any) => {
                if (attr.id) map.set(attr.id, attr);
            });
        }
        return map;
    }, [card.attributes]);

    const renderLayout = () => {
        // If no layout, fallback to simple list (legacy or error handling)
        if (layoutItems.length === 0 && card.attributes && Array.isArray(card.attributes) && card.attributes.length > 0) {
            return (
                <div>
                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-4 flex items-center gap-2">
                        <Tag className="w-4 h-4" /> Attributes
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {card.attributes.map((attr: any) => (
                            <div key={attr.id} className="p-3 bg-background border border-border rounded-xl flex flex-col">
                                <span className="text-xs text-muted-foreground font-medium mb-1">
                                    {attr.name || 'Attribute'}
                                </span>
                                <span className="text-sm font-semibold text-foreground truncate">
                                    {renderAttributeValue(attr)}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            );
        }

        return (
            <div className="space-y-6">
                {layoutItems.map((item, index) => {
                    if (item.type === 'heading') {
                        return (
                            <h3 key={index} className="text-sm font-bold text-muted-foreground uppercase tracking-wider border-b border-border pb-2 mt-6 mb-3">
                                {item.text}
                            </h3>
                        );
                    } else if (item.type === 'attribute' && item.id) {
                        const attr = attributesMap.get(item.id);
                        if (!attr) return null; // Attribute not found on card (value not set?)

                        return (
                            <div key={item.id} className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between py-2 border-b border-border/50 last:border-0 hover:bg-surface-2/50 px-2 rounded-lg transition-colors">
                                <span className="text-sm font-medium text-muted-foreground">{attr.name}</span>
                                <span className="text-sm font-semibold text-foreground text-right">{renderAttributeValue(attr)}</span>
                            </div>
                        );
                    }
                    return null;
                })}
            </div>
        );
    };

    const Content = () => (
        <div className={cn("flex flex-col md:flex-row h-full bg-surface", !inline && "rounded-2xl shadow-2xl overflow-hidden")}>
            {/* Left Side: Image */}
            <div className="w-full md:w-1/2 bg-black/5 dark:bg-black/20 relative group min-h-[300px] md:min-h-full">
                {card.imageUrl ? (
                    <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center">
                        <div className="w-24 h-24 rounded-full bg-surface border-4 border-dashed border-border flex items-center justify-center mb-6">
                            <span className="text-4xl font-bold opacity-20">{card.name.charAt(0)}</span>
                        </div>
                        <p className="text-sm font-medium">No Cover Image</p>
                    </div>
                )}

                {/* Overlay Actions */}
                <div className="absolute top-4 left-4 flex gap-2">
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-md text-white border-white/10">
                        {card.cardType?.name || 'Unknown Type'}
                    </Badge>
                    {card.hidden && (
                        <Badge variant="destructive" className="bg-red-500/80 backdrop-blur-md text-white">
                            Hidden
                        </Badge>
                    )}
                </div>
            </div>

            {/* Right Side: Details */}
            <div className="w-full md:w-1/2 bg-surface flex flex-col h-full overflow-hidden relative border-l border-border">
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border flex justify-between items-start bg-surface z-10 shrink-0">
                    <div>
                        <h2 className="text-3xl font-bold text-foreground mb-2 leading-tight">{card.name}</h2>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Updated {new Date(card.updatedAt).toLocaleDateString()}</span>
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
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 md:p-8 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="relative w-full max-w-5xl bg-surface rounded-2xl shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-200 max-h-[90vh]">
                <Content />
            </div>
        </div>
    );
}

function renderAttributeValue(attr: any): string {
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
