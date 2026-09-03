import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { fetchEvent, updateEvent } from '../api';
import { EventForm, type EventFormValues } from '../components/EventForm';
import { useAuth } from '../context/useAuth';
import type { Event } from '../types';
import './CreateEventPage.css';

function parseDateTimeParts(isoUtc: string, tz: string): { date: string; time: string } {
  const d = new Date(isoUtc);

  const dateParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(d);
  const year = dateParts.find((p) => p.type === 'year')?.value ?? '';
  const month = dateParts.find((p) => p.type === 'month')?.value ?? '';
  const day = dateParts.find((p) => p.type === 'day')?.value ?? '';
  const date = `${year}-${month}-${day}`;

  const timeParts = new Intl.DateTimeFormat('en-US', {
    timeZone: tz,
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(d);
  const hour = timeParts.find((p) => p.type === 'hour')?.value ?? '00';
  const minute = timeParts.find((p) => p.type === 'minute')?.value ?? '00';
  const time = `${hour.padStart(2, '0')}:${minute.padStart(2, '0')}`;

  return { date, time };
}

function eventToFormValues(event: Event): EventFormValues {
  const start = parseDateTimeParts(event.startAt, event.timezone);
  const end = parseDateTimeParts(event.endAt, event.timezone);
  return {
    title: event.title,
    description: event.description ?? '',
    date: start.date,
    startTime: start.time,
    endTime: end.time,
    timezone: event.timezone,
    venueName: event.venue?.name ?? '',
    venueAddress: event.venue?.address ?? '',
    venueCity: event.venue?.city ?? '',
    maxAttendees: event.maxAttendees != null ? String(event.maxAttendees) : '',
    visibility: event.visibility,
  };
}

export default function EditEventPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [event, setEvent] = useState<Event | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) { navigate('/login', { replace: true }); return; }
    if (!id) return;

    fetchEvent(id)
      .then((data) => {
        if (data.createdById !== user.id) {
          navigate(`/events/${id}`, { replace: true });
          return;
        }
        setEvent(data);
      })
      .catch(() => setLoadError('Failed to load event. It may not exist or you may not have permission to edit it.'));
  }, [id, user, navigate]);

  if (user === undefined || user === null) return null;
  if (!id) return null;

  if (loadError) {
    return (
      <main className="create-event-page">
        <div className="create-event-card">
          <p className="create-event-card__error" role="alert">{loadError}</p>
          <a href="/" className="btn btn--secondary">Go home</a>
        </div>
      </main>
    );
  }

  if (!event) {
    return (
      <main className="create-event-page">
        <div className="create-event-card">
          <p style={{ color: 'var(--color-text-secondary)', fontSize: '15px' }}>Loading event…</p>
        </div>
      </main>
    );
  }

  const eventId = id;

  async function handleSave(values: EventFormValues) {
    const cap = values.maxAttendees ? parseInt(values.maxAttendees, 10) : undefined;
    const hasVenue = values.venueName.trim() || values.venueAddress.trim() || values.venueCity.trim();
    await updateEvent(eventId, {
      title: values.title.trim(),
      description: values.description.trim() || undefined,
      startAt: `${values.date}T${values.startTime}:00`,
      endAt: `${values.date}T${values.endTime}:00`,
      timezone: values.timezone,
      venue: hasVenue
        ? {
            name: values.venueName.trim() || undefined,
            address: values.venueAddress.trim() || undefined,
            city: values.venueCity.trim() || undefined,
          }
        : undefined,
      maxAttendees: cap,
      visibility: values.visibility,
    });
    navigate(`/events/${eventId}`);
  }

  return (
    <EventForm
      heading="Edit Event"
      submitLabel="Save Changes"
      initialValues={eventToFormValues(event)}
      onSave={handleSave}
      cancelTo={`/events/${eventId}`}
    />
  );
}
