import { formatEventDate } from '../api';
import type { Event } from '../types';
import './MyEventCard.css';

interface Props {
  event: Event;
}

export function MyEventCard({ event }: Props) {
  const dateStr = formatEventDate(event.startAt, event.timezone);
  const location =
    [event.venue?.name, event.venue?.city].filter(Boolean).join(', ') || 'Virtual';

  const attendeeStr =
    event.attendeeCount !== undefined
      ? event.maxAttendees !== null
        ? `${event.attendeeCount} / ${event.maxAttendees}`
        : `${event.attendeeCount} (Unlimited)`
      : event.maxAttendees !== null
        ? `— / ${event.maxAttendees}`
        : 'Unlimited';

  return (
    <div className="my-event-card">
      <div className={`my-event-card__accent my-event-card__accent--${event.status}`} />
      <div className="my-event-card__body">
        <div className="my-event-card__info">
          <div className="my-event-card__badges">
            <span className={`my-event-card__badge my-event-card__badge--${event.status}`}>
              {event.status}
            </span>
            {event.visibility === 'private' && (
              <span className="my-event-card__badge my-event-card__badge--private">
                Private
              </span>
            )}
          </div>
          <h3 className="my-event-card__title">{event.title}</h3>
          <p className="my-event-card__date">{dateStr}</p>
          <p className="my-event-card__location">
            <span aria-hidden="true">📍</span> {location}
          </p>
          <p className="my-event-card__attendees">
            <span aria-hidden="true">👥</span> {attendeeStr} attendees
          </p>
        </div>
        <a
          href={`/events/${event.id}/edit`}
          className="btn btn--secondary my-event-card__edit"
        >
          Edit
        </a>
      </div>
    </div>
  );
}
