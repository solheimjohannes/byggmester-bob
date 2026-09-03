import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createEvent } from '../api';
import { EventForm, type EventFormValues } from '../components/EventForm';
import { useAuth } from '../context/useAuth';

export default function CreateEventPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (user === null) navigate('/login', { replace: true });
  }, [user, navigate]);

  if (user === undefined || user === null) return null;

  async function handleSave(values: EventFormValues) {
    const cap = values.maxAttendees ? parseInt(values.maxAttendees, 10) : undefined;
    const hasVenue = values.venueName.trim() || values.venueAddress.trim() || values.venueCity.trim();
    const event = await createEvent({
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
    navigate(`/events/${event.id}`);
  }

  return (
    <EventForm
      heading="Create Event"
      submitLabel="Create Event"
      onSave={handleSave}
      cancelTo="/"
    />
  );
}
