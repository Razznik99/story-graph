import { Event, EventType } from '@/domain/types';
import EventGridItem from './EventGridItem';

export default function EventGrid({
    events,
    onEventClick,
}: {
    events: (Event & { eventType?: EventType })[];
    onEventClick: (event: Event & { eventType?: EventType }) => void;
}) {
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
            {events.map((event) => (
                <EventGridItem
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                />
            ))}
        </div>
    );
}
