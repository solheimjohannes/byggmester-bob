import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { formatEventDate } from '../api';
import { useAuth } from '../context/useAuth';
// TODO: MOCK DATA — replace with real query before production
import { getEventById } from '../lib/mock/queries';
import type { Event, FetchState } from '../types';
import './EventDetailPage.css';

export default function EventDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [state, setState] = useState<FetchState<Event>>({ status: 'loading' });

  useEffect(() => {
    if (!id) return;
    getEventById(id)
      .then((data) => {
        if (!data) {
          setState({ status: 'error', message: 'Event not found.' });
          return;
        }
        setState({ status: 'ok', data });
      })
      .catch(() => setState({ status: 'error', message: 'Failed to load event. It may not exist or you may not have permission to view it.' }));
  }, [id]);

  if (state.status === 'loading') {
    return (
      <main className="event-detail-page">
        <div className="event-detail-card">
          <div className="event-detail-skeleton" aria-busy="true" aria-label="Loading event…">
            <div className="event-detail-skeleton__line event-detail-skeleton__line--title" />
            <div className="event-detail-skeleton__line event-detail-skeleton__line--meta" />
            <div className="event-detail-skeleton__line event-detail-skeleton__line--meta-short" />
            <div className="event-detail-skeleton__line event-detail-skeleton__line--body" />
            <div className="event-detail-skeleton__line event-detail-skeleton__line--body-short" />
          </div>
        </div>
      </main>
    );
  }

  if (state.status === 'error') {
    return (
      <main className="event-detail-page">
        <div className="event-detail-card">
          <p className="event-detail-error" role="alert">{state.message}</p>
          <Link to="/" className="btn btn--secondary">← Go home</Link>
        </div>
      </main>
    );
  }

  const event = state.data;
  const isOwner = user?.id === event.createdById;

  const startStr = formatEventDate(event.startAt, event.timezone);
  const endTimeParts = new Intl.DateTimeFormat('en-GB', {
    timeZone: event.timezone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date(event.endAt));
  const endHour = endTimeParts.find((p) => p.type === 'hour')?.value ?? '00';
  const endMin = endTimeParts.find((p) => p.type === 'minute')?.value ?? '00';
  const endTimeStr = `${endHour}:${endMin}`;

  const location = [event.venue?.name, event.venue?.address, event.venue?.city]
    .filter(Boolean)
    .join(', ') || null;

  return (
    <main className="event-detail-page">
      <div className="event-detail-card">
        <div className="event-detail-header">
          <div className="event-detail-badges">
            {event.visibility === 'private' && (
              <span className="event-detail-badge event-detail-badge--private">Private</span>
            )}
            {event.status !== 'published' && (
              <span className={`event-detail-badge event-detail-badge--${event.status}`}>
                {event.status.charAt(0).toUpperCase() + event.status.slice(1)}
              </span>
            )}
          </div>

          {isOwner && (
            <Link to={`/events/${event.id}/edit`} className="btn btn--secondary">
              Edit Event
            </Link>
          )}
        </div>

        <h1 className="event-detail-title">{event.title}</h1>

        <div className="event-detail-info">
          <div className="event-detail-info-row">
            <span className="event-detail-info-label">When</span>
            <span className="event-detail-info-value">
              {startStr} – {endTimeStr}
              <span className="event-detail-tz">({event.timezone.replace(/_/g, ' ')})</span>
            </span>
          </div>

          {location && (
            <div className="event-detail-info-row">
              <span className="event-detail-info-label">Where</span>
              <span className="event-detail-info-value">{location}</span>
            </div>
          )}

          {event.maxAttendees != null && (
            <div className="event-detail-info-row">
              <span className="event-detail-info-label">Capacity</span>
              <span className="event-detail-info-value">{event.maxAttendees} attendees max</span>
            </div>
          )}
        </div>

        {event.description && (
          <div className="event-detail-description">
            <h2 className="event-detail-description__heading">About this event</h2>
            <p className="event-detail-description__text">{event.description}</p>
          </div>
        )}

        <div className="event-detail-actions">
          <Link to="/" className="btn btn--secondary">← Back</Link>
        </div>
      </div>
    </main>
  );
}
