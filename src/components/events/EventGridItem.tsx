import { Event, EventType } from '@/domain/types';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Calendar, Tag } from 'lucide-react';

const INTENSITY_COLORS: Record<string, string> = {
    LOW: 'bg-green-500/10 text-green-600 border-green-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function EventGridItem({
    event,
    onClick,
}: {
    event: Event & { eventType?: EventType };
    onClick: () => void;
}) {
    return (
        <div
            onClick={onClick}
            className="group relative aspect-[10/12] bg-card border border-border rounded-xl overflow-hidden hover:shadow-xl hover:border-accent transition-all duration-300 cursor-pointer hover:-translate-y-1 flex flex-col h-full"
        >
            <div className="p-4 flex flex-col h-full">
                {/* Header: Badges */}
                <div className="flex flex-wrap gap-2 mb-3">
                    <Badge variant="outline" className="text-xs">
                        {event.eventType?.name || 'Unknown Type'}
                    </Badge>
                    <Badge variant="outline" className={cn("text-xs border", INTENSITY_COLORS[event.intensity] || INTENSITY_COLORS.MEDIUM)}>
                        {event.intensity}
                    </Badge>
                </div>

                {/* Content */}
                <h3 className="font-bold text-lg text-foreground mb-2 group-hover:text-accent transition-colors line-clamp-2">
                    {event.title}
                </h3>

                {event.description && (
                    <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                        {event.description}
                    </p>
                )}

                {/* Timeline Placeholder */}
                <div className="mt-auto mb-3 p-2 bg-muted/30 rounded-lg border border-border/50 text-xs text-muted-foreground text-center">
                    Timeline Placeholder
                </div>

                {/* Footer */}
                <div className="pt-3 border-t border-border flex items-center justify-between text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(event.updatedAt).toLocaleDateString()}
                    </span>
                    <span className="flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {event.tags?.length || 0}
                    </span>
                </div>
            </div>

            {/* Status Indicator Bar */}
            <div className={cn("absolute bottom-0 left-0 w-full h-1",
                event.intensity === 'CRITICAL' ? 'bg-red-500' :
                    event.intensity === 'HIGH' ? 'bg-orange-500' :
                        event.intensity === 'MEDIUM' ? 'bg-yellow-500' :
                            'bg-green-500'
            )} />
        </div>
    );
}
