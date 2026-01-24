import { Card, CardType } from '@/domain/types';
import { Edit } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function CardListItem({
    card,
    onClick,
    onEdit,
}: {
    card: Card & { cardType?: CardType } & { __version?: number };
    onClick: () => void;
    onEdit: (e: React.MouseEvent) => void;
}) {
    return (
        <div
            onClick={onClick}
            className="h-36 group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-accent hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        >
            {/* Thumbnail */}
            <div className="w-28 h-28 rounded-lg bg-muted/50 overflow-hidden flex-shrink-0 border border-border">
                {card.imageUrl ? (
                    <img
                        src={card.imageUrl}
                        alt={card.name}
                        className="w-full h-full object-cover"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground bg-gradient-to-br from-background to-accent/10">
                        No Img
                    </div>
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground truncate group-hover:text-accent transition-colors text-lg">
                        {card.name}
                    </h3>
                    <Badge variant="outline" className="text-muted-foreground">
                        {card.cardType?.name || 'Unknown'}
                    </Badge>
                    <Badge variant="outline" className="text-muted-foreground">
                        v{card.__version || '?'}
                    </Badge>
                    {card.hidden && (
                        <Badge variant="destructive" className="bg-red-500/10 text-red-500 hover:bg-red-500/20 border-red-500/20">
                            Hidden
                        </Badge>
                    )}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-3 max-w-2xl">
                    {card.description || 'No description'}
                </p>
            </div>

            {/* Meta */}
            <div className="hidden md:flex flex-col items-end gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-normal text-xs">{card.attributes?.length || 0} attrs</Badge>
                    <Badge variant="secondary" className="font-normal text-xs">{card.tags?.length || 0} tags</Badge>
                </div>
                <span className="text-xs opacity-60">Updated {new Date(card.updatedAt).toLocaleDateString()}</span>
            </div>

            {/* Actions */}
            <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(e);
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
            >
                <Edit className="w-5 h-5" />
            </Button>
        </div>
    );
}
