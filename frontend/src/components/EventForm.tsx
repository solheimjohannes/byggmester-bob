import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import '../pages/CreateEventPage.css';

const COMMON_TIMEZONES = [
  'Europe/Oslo',
  'Europe/Stockholm',
  'Europe/Copenhagen',
  'Europe/Helsinki',
  'Europe/London',
  'Europe/Dublin',
  'Europe/Paris',
  'Europe/Berlin',
  'Europe/Amsterdam',
  'Europe/Brussels',
  'Europe/Zurich',
  'Europe/Rome',
  'Europe/Madrid',
  'Europe/Lisbon',
  'Europe/Warsaw',
  'Europe/Prague',
  'Europe/Vienna',
  'Europe/Budapest',
  'Europe/Athens',
  'Europe/Bucharest',
  'Europe/Kiev',
  'Europe/Moscow',
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Toronto',
  'America/Vancouver',
  'America/Sao_Paulo',
  'America/Buenos_Aires',
  'Asia/Dubai',
  'Asia/Kolkata',
  'Asia/Bangkok',
  'Asia/Singapore',
  'Asia/Shanghai',
  'Asia/Tokyo',
  'Asia/Seoul',
  'Australia/Sydney',
  'Australia/Melbourne',
  'Australia/Perth',
  'Pacific/Auckland',
  'Pacific/Honolulu',
  'Africa/Johannesburg',
  'Africa/Cairo',
  'Africa/Lagos',
];

const DEFAULT_TZ = (() => {
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone; } catch { return 'UTC'; }
})();

function getTzOptions(): string[] {
  const tz = DEFAULT_TZ;
  if (COMMON_TIMEZONES.includes(tz)) return COMMON_TIMEZONES;
  return [tz, ...COMMON_TIMEZONES];
}

const TZ_OPTIONS = getTzOptions();

export interface EventFormValues {
  title: string;
  description: string;
  date: string;
  startTime: string;
  endTime: string;
  timezone: string;
  venueName: string;
  venueAddress: string;
  venueCity: string;
  maxAttendees: string;
  visibility: 'public' | 'private';
}

interface EventFormProps {
  heading: string;
  submitLabel: string;
  initialValues?: Partial<EventFormValues>;
  onSave: (values: EventFormValues) => Promise<void>;
  cancelTo: string;
}

function getErrorMessage(e: unknown): string {
  if (e && typeof e === 'object' && 'data' in e) {
    const data = (e as { data: { error?: string } }).data;
    if (data.error) return data.error;
  }
  if (e instanceof Error) return e.message;
  return 'Something went wrong — please try again.';
}

export function EventForm({ heading, submitLabel, initialValues = {}, onSave, cancelTo }: EventFormProps) {
  const [title, setTitle] = useState(initialValues.title ?? '');
  const [description, setDescription] = useState(initialValues.description ?? '');
  const [date, setDate] = useState(initialValues.date ?? '');
  const [startTime, setStartTime] = useState(initialValues.startTime ?? '');
  const [endTime, setEndTime] = useState(initialValues.endTime ?? '');
  const [timezone, setTimezone] = useState(initialValues.timezone ?? DEFAULT_TZ);
  const [venueName, setVenueName] = useState(initialValues.venueName ?? '');
  const [venueAddress, setVenueAddress] = useState(initialValues.venueAddress ?? '');
  const [venueCity, setVenueCity] = useState(initialValues.venueCity ?? '');
  const [maxAttendees, setMaxAttendees] = useState(initialValues.maxAttendees ?? '');
  const [visibility, setVisibility] = useState<'public' | 'private'>(initialValues.visibility ?? 'public');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!title.trim()) { setError('Event title is required.'); return; }
    if (!date) { setError('Please select a date.'); return; }
    if (!startTime) { setError('Please select a start time.'); return; }
    if (!endTime) { setError('Please select an end time.'); return; }
    if (startTime >= endTime) { setError('End time must be after start time.'); return; }
    const cap = maxAttendees ? parseInt(maxAttendees, 10) : undefined;
    if (cap !== undefined && (isNaN(cap) || cap < 1)) {
      setError('Maximum attendees must be a positive number.');
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await onSave({ title, description, date, startTime, endTime, timezone, venueName, venueAddress, venueCity, maxAttendees, visibility });
    } catch (err: unknown) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="create-event-page">
      <div className="create-event-card">
        <h1 className="create-event-card__title">{heading}</h1>

        {error && (
          <p className="create-event-card__error" role="alert">{error}</p>
        )}

        <form className="create-event-form" onSubmit={handleSubmit} noValidate>
          <section className="create-event-section">
            <h2 className="create-event-section__heading">Event details</h2>

            <label className="create-event-form__label" htmlFor="ef-title">
              Event title <span className="create-event-form__required">*</span>
            </label>
            <input
              id="ef-title"
              className="create-event-form__input"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              disabled={loading}
              required
              placeholder="Give your event a clear, descriptive name"
            />

            <label className="create-event-form__label" htmlFor="ef-description">
              Description <span className="create-event-form__optional">(optional)</span>
            </label>
            <textarea
              id="ef-description"
              className="create-event-form__textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={loading}
              rows={4}
              placeholder="Describe what attendees can expect"
            />
          </section>

          <section className="create-event-section">
            <h2 className="create-event-section__heading">Date &amp; time</h2>

            <label className="create-event-form__label" htmlFor="ef-date">
              Date <span className="create-event-form__required">*</span>
            </label>
            <input
              id="ef-date"
              className="create-event-form__input create-event-form__input--date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              disabled={loading}
              required
            />

            <div className="create-event-form__row">
              <div className="create-event-form__row-item">
                <label className="create-event-form__label" htmlFor="ef-startTime">
                  Start time <span className="create-event-form__required">*</span>
                </label>
                <input
                  id="ef-startTime"
                  className="create-event-form__input"
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
              <div className="create-event-form__row-item">
                <label className="create-event-form__label" htmlFor="ef-endTime">
                  End time <span className="create-event-form__required">*</span>
                </label>
                <input
                  id="ef-endTime"
                  className="create-event-form__input"
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  disabled={loading}
                  required
                />
              </div>
            </div>

            <label className="create-event-form__label" htmlFor="ef-timezone">
              Timezone
            </label>
            <select
              id="ef-timezone"
              className="create-event-form__select"
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              disabled={loading}
            >
              {TZ_OPTIONS.map((tz) => (
                <option key={tz} value={tz}>{tz.replace(/_/g, ' ')}</option>
              ))}
            </select>
          </section>

          <section className="create-event-section">
            <h2 className="create-event-section__heading">
              Location <span className="create-event-form__optional">(optional)</span>
            </h2>

            <label className="create-event-form__label" htmlFor="ef-venueName">Venue name</label>
            <input
              id="ef-venueName"
              className="create-event-form__input"
              type="text"
              value={venueName}
              onChange={(e) => setVenueName(e.target.value)}
              disabled={loading}
              placeholder="e.g. Oslo Conference Center"
            />

            <label className="create-event-form__label" htmlFor="ef-venueAddress">Address</label>
            <input
              id="ef-venueAddress"
              className="create-event-form__input"
              type="text"
              value={venueAddress}
              onChange={(e) => setVenueAddress(e.target.value)}
              disabled={loading}
              placeholder="Street address"
            />

            <label className="create-event-form__label" htmlFor="ef-venueCity">City</label>
            <input
              id="ef-venueCity"
              className="create-event-form__input"
              type="text"
              value={venueCity}
              onChange={(e) => setVenueCity(e.target.value)}
              disabled={loading}
              placeholder="City"
            />
          </section>

          <section className="create-event-section">
            <h2 className="create-event-section__heading">Settings</h2>

            <label className="create-event-form__label" htmlFor="ef-maxAttendees">
              Maximum attendees{' '}
              <span className="create-event-form__optional">(optional — leave blank for unlimited)</span>
            </label>
            <input
              id="ef-maxAttendees"
              className="create-event-form__input create-event-form__input--short"
              type="number"
              min={1}
              value={maxAttendees}
              onChange={(e) => setMaxAttendees(e.target.value)}
              disabled={loading}
              placeholder="e.g. 100"
            />

            <fieldset className="create-event-form__fieldset">
              <legend className="create-event-form__label">Visibility</legend>

              <label className="create-event-form__radio-label">
                <input
                  type="radio"
                  name="ef-visibility"
                  value="public"
                  checked={visibility === 'public'}
                  onChange={() => setVisibility('public')}
                  disabled={loading}
                />
                <span>
                  <strong>Public</strong>
                  <span className="create-event-form__radio-hint"> — listed in public search results</span>
                </span>
              </label>

              <label className="create-event-form__radio-label">
                <input
                  type="radio"
                  name="ef-visibility"
                  value="private"
                  checked={visibility === 'private'}
                  onChange={() => setVisibility('private')}
                  disabled={loading}
                />
                <span>
                  <strong>Private</strong>
                  <span className="create-event-form__radio-hint"> — invite-only, not listed publicly</span>
                </span>
              </label>
            </fieldset>
          </section>

          <div className="create-event-form__actions">
            <Link to={cancelTo} className="btn btn--secondary">
              Cancel
            </Link>
            <button
              type="submit"
              className="btn btn--primary"
              disabled={loading}
            >
              {loading ? 'Saving…' : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
