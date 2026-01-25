import { Event, EventType } from '@/domain/types';
import { Edit, Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const INTENSITY_COLORS: Record<string, string> = {
    LOW: 'bg-green-500/10 text-green-600 border-green-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function EventListItem({
    event,
    onClick,
    onEdit,
}: {
    event: Event & { eventType?: EventType };
    onClick: () => void;
    onEdit: (e: React.MouseEvent) => void;
}) {
    return (
        <div
            onClick={onClick}
            className="group flex items-center gap-4 p-4 bg-card border border-border rounded-xl hover:border-accent hover:-translate-y-1 transition-all duration-300 cursor-pointer"
        >
            {/* Simple Status Indicator */}
            <div className={cn("w-1.5 self-stretch rounded-full",
                event.intensity === 'CRITICAL' ? 'bg-red-500' :
                    event.intensity === 'HIGH' ? 'bg-orange-500' :
                        event.intensity === 'MEDIUM' ? 'bg-yellow-500' :
                            'bg-green-500'
            )} />

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-foreground truncate group-hover:text-accent transition-colors text-lg">
                        {event.title}
                    </h3>
                    <Badge variant="outline" className="text-muted-foreground mr-1">
                        {event.eventType?.name || 'Unknown'}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs border", INTENSITY_COLORS[event.intensity] || INTENSITY_COLORS.MEDIUM)}>
                        {event.intensity}
                    </Badge>
                </div>
                <p className="text-sm text-muted-foreground line-clamp-1 max-w-3xl">
                    {event.description || 'No description'}
                </p>
                <div className="mt-2 text-xs text-muted-foreground italic">
                    Timeline Placeholder
                </div>
            </div>

            {/* Meta */}
            <div className="hidden md:flex flex-col items-end gap-2 text-sm text-muted-foreground">
                <div className="flex items-center gap-3">
                    <Badge variant="secondary" className="font-normal text-xs flex gap-1">
                        <Tag className="w-3 h-3" />
                        {event.tags?.length || 0} tags
                    </Badge>
                </div>
                <span className="text-xs opacity-60">Updated {new Date(event.updatedAt).toLocaleDateString()}</span>
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
