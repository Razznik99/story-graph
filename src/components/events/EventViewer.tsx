import { Event, EventType } from '@/domain/types';
import { X, Edit, Calendar, Tag, Hash, Activity, Eye, FileText, Target, Link as LinkIcon, GitCommitHorizontal, ArrowRightLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { INTENSITY_COLORS } from '@/domain/constants';
import TimelinePath from './TimelinePath';



interface EventViewerProps {
    event: Event & { eventType?: EventType };
    onClose: () => void;
    onEdit: () => void;
    onOpenCard?: (cardId: string) => void;
    onOpenEvent?: (eventId: string) => void;
    inline?: boolean;
}

export default function EventViewer({
    event,
    onClose,
    onEdit,
    onOpenCard,
    onOpenEvent,
    inline = false,
}: EventViewerProps) {
    // Fetch Linked Cards
    const { data: cardLinks } = useQuery({
        queryKey: ['event-relations', 'cards', event.id],
        queryFn: async () => {
            const res = await fetch(`/api/events/relations?storyId=${event.storyId}&eventId=${event.id}&type=card`);
            if (!res.ok) return { links: [] };
            return res.json();
        }
    });

    // Fetch Outgoing Events
    const { data: outgoingLinks } = useQuery({
        queryKey: ['event-relations', 'events-outgoing', event.id],
        queryFn: async () => {
            const res = await fetch(`/api/events/relations?storyId=${event.storyId}&eventId=${event.id}&type=event`);
            if (!res.ok) return { links: [] };
            return res.json();
        }
    });

    // Content component to be reused (though here we just restructure)
    // Actually we can just dynamically apply classes.

    // Wrapper classes vs Content classes
    // If inline, we don't need fixed backdrop.

    const wrapperClass = inline
        ? "h-full w-full flex flex-col overflow-y-auto bg-background"
        : "fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in duration-200";

    const containerClass = inline
        ? "flex-1 flex flex-col overflow-y-auto"
        : cn(
            "relative bg-surface rounded-2xl shadow-2xl overflow-y-auto animate-in zoom-in-95 duration-200",
            "w-[90vw] max-w-4xl max-h-[90vh] flex flex-col"
        );

    const content = (
        <div className={containerClass}>
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
                    {!inline && (
                        <Button size="icon" variant="ghost" onClick={onClose} className="hover:text-red-500 hover:bg-red-500/10" title="Close">
                            <X className="w-6 h-6" />
                        </Button>
                    )}
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
                        <TimelinePath
                            storyId={event.storyId}
                            timelineId={event.timelineId}
                            className="text-sm text-muted-foreground bg-accent/5 px-3 py-2 rounded-lg border border-accent/10 block"
                        />
                    </div>

                    {/* Linked Cards */}
                    {cardLinks?.links?.length > 0 && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <LinkIcon className="w-4 h-4" /> Linked Cards
                            </h3>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                {cardLinks.links.map((link: any) => (
                                    <div
                                        key={link.id}
                                        className="p-3 bg-secondary/30 border border-border rounded-xl flex items-center justify-between group hover:border-accent/50 cursor-pointer transition-colors"
                                        onClick={() => onOpenCard?.(link.cardId)}
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                                                <FileText className="w-4 h-4" />
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">{link.card.name}</span>
                                                {link.role && <span className="text-xs text-muted-foreground">{link.role.name}</span>}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Linked Events */}
                    {(outgoingLinks?.links?.length > 0) && (
                        <div className="space-y-3">
                            <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-wider flex items-center gap-2">
                                <GitCommitHorizontal className="w-4 h-4" /> Related Events
                            </h3>
                            <div className="space-y-2">
                                {/* Outgoing */}
                                {outgoingLinks?.links?.map((link: any) => (
                                    <div
                                        key={link.id}
                                        className="p-3 bg-secondary/30 border border-border rounded-xl flex items-center gap-3 group hover:border-accent/50 cursor-pointer transition-colors"
                                        onClick={() => onOpenEvent?.(link.linkId)}
                                    >
                                        <Badge variant="outline" className="text-xs shrink-0">
                                            {link.relationshipType}
                                        </Badge>
                                        <span className="text-muted-foreground text-sm">→</span>
                                        <span className="text-sm font-medium text-foreground group-hover:text-accent transition-colors">
                                            {link.link?.title || 'Unknown'}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}


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
    );

    if (inline) {
        return <div className={wrapperClass}>{content}</div>;
    }

    return (
        <div className={wrapperClass}>
            {content}
        </div>
    );
}
