import { Event, EventType } from '@/domain/types';
import { X, Edit, Calendar, Tag, Hash, Activity, Eye, FileText, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const INTENSITY_COLORS: Record<string, string> = {
    LOW: 'bg-green-500/10 text-green-600 border-green-500/20',
    MEDIUM: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    HIGH: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
    CRITICAL: 'bg-red-500/10 text-red-600 border-red-500/20',
};

export default function EventViewer({
    event,
    onClose,
    onEdit,
}: {
    event: Event & { eventType?: EventType };
    onClose: () => void;
    onEdit: () => void;
}) {
    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
            <div className={cn(
                "relative bg-surface rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200",
                "w-[90vw] max-w-4xl max-h-[90vh] flex flex-col"
            )}>
                {/* Header */}
                <div className="p-6 md:p-8 border-b border-border flex justify-between items-start bg-surface z-10 shrink-0">
                    <div>
                        <div className="flex flex-col gap-2 mb-2">
                            <div className="flex items-center gap-3">
                                <Badge variant="outline" className="text-sm">
                                    {event.eventType?.name || 'Unknown Type'}
                                </Badge>
                                <Badge variant="outline" className={cn("text-xs border", INTENSITY_COLORS[event.intensity] || INTENSITY_COLORS.MEDIUM)}>
                                    {event.intensity}
                                </Badge>
                                <Badge variant="secondary" className="text-xs">
                                    {event.visibility}
                                </Badge>
                            </div>
                            <h2 className="text-3xl font-bold text-foreground leading-tight">{event.title}</h2>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Calendar className="w-4 h-4" />
                                <span>Updated {new Date(event.updatedAt).toLocaleDateString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        <Button size="icon" variant="ghost" onClick={onEdit} title="Edit Event">
                            <Edit className="w-5 h-5" />
                        </Button>
                        <Button size="icon" variant="ghost" onClick={onClose} className="hover:text-red-500 hover:bg-red-500/10" title="Close">
                            <X className="w-6 h-6" />
                        </Button>
                    </div>
                </div>

                {/* Content */}
                <ScrollArea className="flex-1 w-full bg-surface">
                    <div className="p-6 md:p-8 space-y-8">

                        {/* Description */}
                        {event.description && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <FileText className="w-4 h-4" /> Description
                                </h3>
                                <div className="prose dark:prose-invert max-w-none bg-background/50 p-4 rounded-xl border border-border">
                                    <p className="text-secondary-foreground leading-relaxed text-base">
                                        {event.description}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Outcome */}
                        {event.outcome && (
                            <div className="space-y-2">
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                    <Target className="w-4 h-4" /> Outcome
                                </h3>
                                <div className="bg-accent/5 border border-accent/10 p-4 rounded-xl">
                                    <p className="text-foreground leading-relaxed">
                                        {event.outcome}
                                    </p>
                                </div>
                            </div>
                        )}

                        {/* Timeline Placeholder */}
                        <div className="space-y-2">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <Activity className="w-4 h-4" /> Timeline
                            </h3>
                            <div className="h-32 bg-muted/20 border-2 border-dashed border-border rounded-xl flex items-center justify-center text-muted-foreground">
                                Timeline Visualization Placeholder
                            </div>
                        </div>

                        {/* Tags */}
                        {event.tags && event.tags.length > 0 && (
                            <div>
                                <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <Hash className="w-4 h-4" /> Tags
                                </h3>
                                <div className="flex flex-wrap gap-2">
                                    {event.tags.map(tag => (
                                        <Badge key={tag} variant="secondary" className="px-3 py-1 font-medium bg-accent/10 text-accent border-accent/20">
                                            {tag}
                                        </Badge>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </ScrollArea>
            </div>
        </div>
    );
}
