import { useMemo, useEffect, useState } from 'react';
import { formatEventDate } from '../api';
import { EventCard } from '../components/EventCard';
// TODO: MOCK DATA — replace with real query before production
import { fetchCalendarEvents } from '../lib/mock/queries';
import { EventModule } from '../components/EventModule';
import { useAuth } from '../context/useAuth';
import type { Event, FetchState } from '../types';
import './CalendarPage.css';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

interface TodayRef {
  year: number;
  month: number;
  day: number;
}

function getEventLocalDate(event: Event): TodayRef {
  try {
    const fmt = new Intl.DateTimeFormat('en-CA', {
      timeZone: event.timezone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const [year, month, day] = fmt.format(new Date(event.startAt)).split('-').map(Number);
    return { year, month, day };
  } catch {
    const d = new Date(event.startAt);
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
}

function buildCalendarCells(year: number, month: number): (number | null)[] {
  const firstDayOfWeek = new Date(year, month - 1, 1).getDay();
  const startOffset = (firstDayOfWeek + 6) % 7; // Monday-anchored
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = Array(startOffset).fill(null) as null[];
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

interface CalendarGridProps {
  events: Event[];
  viewYear: number;
  viewMonth: number;
  today: TodayRef;
  onPrev: () => void;
  onNext: () => void;
}

function CalendarGrid({ events, viewYear, viewMonth, today, onPrev, onNext }: CalendarGridProps) {
  const cells = buildCalendarCells(viewYear, viewMonth);

  const eventsByDay = new Map<number, Event[]>();
  for (const event of events) {
    const { year, month, day } = getEventLocalDate(event);
    if (year === viewYear && month === viewMonth) {
      const bucket = eventsByDay.get(day) ?? [];
      bucket.push(event);
      eventsByDay.set(day, bucket);
    }
  }

  const weeks: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    weeks.push(cells.slice(i, i + 7));
  }

  return (
    <div className="cal-grid">
      <div className="cal-grid__header">
        <button className="cal-grid__nav" onClick={onPrev} aria-label="Previous month">
          ‹
        </button>
        <h2 className="cal-grid__title">
          {MONTH_NAMES[viewMonth - 1]} {viewYear}
        </h2>
        <button className="cal-grid__nav" onClick={onNext} aria-label="Next month">
          ›
        </button>
      </div>

      <div className="cal-grid__weekdays" role="row">
        {DAY_NAMES.map((d) => (
          <div key={d} className="cal-grid__weekday" role="columnheader">
            {d}
          </div>
        ))}
      </div>

      <div className="cal-grid__body" role="grid">
        {weeks.map((week, wi) => (
          <div key={wi} className="cal-grid__week" role="row">
            {week.map((day, di) => {
              const isToday =
                day !== null &&
                today.year === viewYear &&
                today.month === viewMonth &&
                today.day === day;
              const dayEvents = day !== null ? (eventsByDay.get(day) ?? []) : [];
              const MAX_VISIBLE = 2;
              const overflow = dayEvents.length - MAX_VISIBLE;

              return (
                <div
                  key={di}
                  className={[
                    'cal-grid__cell',
                    day === null && 'cal-grid__cell--pad',
                    isToday && 'cal-grid__cell--today',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  role="gridcell"
                >
                  {day !== null && (
                    <>
                      <span className="cal-grid__day-num">{day}</span>
                      <div className="cal-grid__day-events">
                        {dayEvents.slice(0, MAX_VISIBLE).map((event) => (
                          <a
                            key={event.id}
                            href={`/events/${event.id}`}
                            className="cal-grid__pill"
                            title={formatEventDate(event.startAt, event.timezone)}
                          >
                            {event.title}
                          </a>
                        ))}
                        {overflow > 0 && (
                          <span className="cal-grid__overflow">+{overflow} more</span>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const { user } = useAuth();
  const [plansState, setPlansState] = useState<FetchState<Event[]>>({ status: 'loading' });

  const today = useMemo<TodayRef>(() => {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
  }, []);

  const [viewYear, setViewYear] = useState(today.year);
  const [viewMonth, setViewMonth] = useState(today.month);

  useEffect(() => {
    if (!user) return;
    fetchCalendarEvents(user.id)
      .then((data) => setPlansState({ status: 'ok', data }))
      .catch((e: unknown) =>
        setPlansState({
          status: 'error',
          message: e instanceof Error ? e.message : 'Failed to load your events.',
        }),
      );
  }, [user]);

  function prevMonth() {
    if (viewMonth === 1) {
      setViewYear((y) => y - 1);
      setViewMonth(12);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function nextMonth() {
    if (viewMonth === 12) {
      setViewYear((y) => y + 1);
      setViewMonth(1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  const authPending = user === undefined;
  const notSignedIn = user === null;
  const events = plansState.status === 'ok' ? plansState.data : [];
  const calendarLoading = authPending || (!notSignedIn && plansState.status === 'loading');

  return (
    <main className="calendar-page">
      <div className="calendar-page__inner">
        <section className="calendar-page__cal-section">
          {notSignedIn ? (
            <div className="calendar-page__sign-in">
              <p>Sign in to see your calendar.</p>
              <a href="/login" className="btn btn--primary">Sign in</a>
            </div>
          ) : calendarLoading ? (
            <div className="cal-grid cal-grid--skeleton" aria-label="Loading calendar…">
              <div className="cal-grid__skeleton-body" />
            </div>
          ) : plansState.status === 'error' ? (
            <div className="calendar-page__error" role="alert">
              {plansState.message}
            </div>
          ) : (
            <CalendarGrid
              events={events}
              viewYear={viewYear}
              viewMonth={viewMonth}
              today={today}
              onPrev={prevMonth}
              onNext={nextMonth}
            />
          )}
        </section>

        <EventModule
          title="Upcoming Plans"
          loading={authPending || (!notSignedIn && plansState.status === 'loading')}
          error={!notSignedIn && plansState.status === 'error' ? plansState.message : null}
          empty={notSignedIn || (plansState.status === 'ok' && events.length === 0)}
          emptyMessage={
            notSignedIn
              ? 'Sign in to see your upcoming plans.'
              : 'No upcoming plans yet — browse events to find something!'
          }
        >
          {!notSignedIn &&
            plansState.status === 'ok' &&
            events.map((event) => <EventCard key={event.id} event={event} />)}
        </EventModule>
      </div>
    </main>
  );
}
