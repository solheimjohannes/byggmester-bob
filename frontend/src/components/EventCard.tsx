import { formatEventDate } from '../api';
import type { Event } from '../types';
import './EventCard.css';

interface Props {
  event: Event;
}

export function EventCard({ event }: Props) {
  const dateStr = formatEventDate(event.startAt, event.timezone);
  const location = [event.venue?.name, event.venue?.city]
    .filter(Boolean)
    .join(', ') || 'Online / TBD';

  return (
    <a href={`/events/${event.id}`} className="event-card">
      <div className="event-card__accent" />
      <div className="event-card__body">
        <h3 className="event-card__title">{event.title}</h3>
        <p className="event-card__date">{dateStr}</p>
        <p className="event-card__location">
          <span aria-hidden="true">📍</span>
          {location}
        </p>
        {event.visibility === 'private' && (
          <div className="event-card__badges">
            <span className="event-card__badge event-card__badge--private">Private</span>
          </div>
        )}
      </div>
    </a>
  );
}
