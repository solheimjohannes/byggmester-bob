import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// TODO: MOCK DATA — replace with real query import from '../api' before production
import { fetchCreatedEvents } from '../lib/mock/queries';
import { MyEventCard } from '../components/MyEventCard';
import { useAuth } from '../context/useAuth';
import type { Event, FetchState } from '../types';
import './MyEventsPage.css';

type PageState = FetchState<Event[]>;
const LOADING: PageState = { status: 'loading' };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — please refresh.';
}

export default function MyEventsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [pageState, setPageState] = useState<PageState>(LOADING);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      void navigate('/login');
      return;
    }

    fetchCreatedEvents(user.id)
      .then((data) => setPageState({ status: 'ok', data }))
      .catch((e: unknown) => setPageState({ status: 'error', message: errMsg(e) }));
  }, [user, navigate]);

  const { upcoming, past } = useMemo(() => {
    if (pageState.status !== 'ok') return { upcoming: [], past: [] };
    const now = new Date();
    const up = pageState.data
      .filter((e) => new Date(e.startAt) >= now)
      .sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime());
    const pa = pageState.data
      .filter((e) => new Date(e.startAt) < now)
      .sort((a, b) => new Date(b.startAt).getTime() - new Date(a.startAt).getTime());
    return { upcoming: up, past: pa };
  }, [pageState]);

  if (user === undefined || user === null) return null;

  const isLoading = pageState.status === 'loading';
  const isError = pageState.status === 'error';
  const isEmpty = pageState.status === 'ok' && pageState.data.length === 0;

  return (
    <main className="my-events-main">
      <div className="my-events-header">
        <h1 className="my-events-header__title">My Events</h1>
        <a href="/events/create" className="btn btn--primary">
          + Create Event
        </a>
      </div>

      {isError && (
        <p className="my-events-status my-events-status--error" role="alert">
          {pageState.message}
        </p>
      )}

      {isLoading && (
        <div className="my-events-grid" aria-label="Loading events">
          {[0, 1, 2].map((i) => (
            <div key={i} className="my-events-skeleton" aria-hidden="true">
              <div className="my-events-skeleton__bar my-events-skeleton__bar--accent" />
              <div className="my-events-skeleton__body">
                <div className="my-events-skeleton__bar my-events-skeleton__bar--badge" />
                <div className="my-events-skeleton__bar my-events-skeleton__bar--title" />
                <div className="my-events-skeleton__bar my-events-skeleton__bar--date" />
                <div className="my-events-skeleton__bar my-events-skeleton__bar--location" />
              </div>
            </div>
          ))}
        </div>
      )}

      {isEmpty && (
        <div className="my-events-empty">
          <p className="my-events-empty__message">
            You haven't created any events yet.
          </p>
          <a href="/events/create" className="btn btn--primary">
            Create Your First Event
          </a>
        </div>
      )}

      {!isLoading && !isError && !isEmpty && (
        <>
          {upcoming.length > 0 && (
            <section className="my-events-section">
              <h2 className="my-events-section__title">Upcoming</h2>
              <div className="my-events-grid">
                {upcoming.map((event) => (
                  <MyEventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}

          {past.length > 0 && (
            <section className="my-events-section my-events-section--past">
              <h2 className="my-events-section__title">Past Events</h2>
              <div className="my-events-grid">
                {past.map((event) => (
                  <MyEventCard key={event.id} event={event} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </main>
  );
}
