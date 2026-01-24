import { Card, CardType } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

export default function CardGridItem({
    card,
    onClick,
}: {
    card: Card & { cardType?: CardType } & { __version?: number };
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className="group relative aspect-[10/16] bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:border-accent transition-all duration-300 cursor-pointer hover:-translate-y-1 flex flex-col h-full"
        >
            {/* Image Section */}
            <div className="aspect-[10/10] w-full bg-muted/50 relative overflow-hidden">
                {card.imageUrl ? (
                    <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-gradient-to-br from-background to-accent/10">
                        <span className="text-sm font-medium">No Image</span>
                    </div>
                )}

                {/* Type Badge */}
                <div className="absolute top-2 left-2">
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-md text-white border-white/10 hover:bg-black/60">
                        {card.cardType?.name || 'Unknown'}
                    </Badge>
                    <Badge variant="secondary" className="bg-black/50 backdrop-blur-md text-white border-white/10 hover:bg-black/60">
                        v{card.__version || '?'}
                    </Badge>
                </div>

                {/* Hidden Badge */}
                {card.hidden && (
                    <div className="absolute top-2 right-2">
                        <Badge variant="destructive" className="bg-red-500/80 backdrop-blur-md hover:bg-red-600/80">Hidden</Badge>
                    </div>
                )}
            </div>

            {/* Content Section */}
            <div className="p-4 flex flex-col flex-1">
                <h3 className="font-bold text-lg text-foreground mb-1 group-hover:text-accent transition-colors line-clamp-1">
                    {card.name}
                </h3>

                {card.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-3">
                        {card.description}
                    </p>
                )}

                {/* Footer */}
                <div className="mt-auto pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span>{new Date(card.updatedAt).toLocaleDateString()}</span>
                    <span className="flex items-center gap-1">
                        {card.attributes?.length || 0} Attrs
                        <span className="w-1.5 h-1.5 rounded-full bg-accent/50" />
                        {card.tags?.length || 0} Tags
                    </span>
                </div>
            </div>
        </div>
    );
}
