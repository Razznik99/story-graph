import { Event, EventType } from '@/domain/types';
import EventListItem from './EventListItem';

export default function EventList({
    events,
    onEventClick,
    onEdit,
}: {
    events: (Event & { eventType?: EventType })[];
    onEventClick: (event: Event & { eventType?: EventType }) => void;
    onEdit: (event: Event & { eventType?: EventType }) => void;
}) {
    return (
        <div className="space-y-3">
            {events.map((event) => (
                <EventListItem
                    key={event.id}
                    event={event}
                    onClick={() => onEventClick(event)}
                    onEdit={(e) => {
                        // e is handled in Item, but we pass the event here
                        onEdit(event);
                    }}
                />
            ))}
        </div>
    );
}
