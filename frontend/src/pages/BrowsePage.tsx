import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { fetchPublicEvents } from '../api';
import { EventCard } from '../components/EventCard';
import { SkeletonCard } from '../components/SkeletonCard';
import type { Event, FetchState } from '../types';
import './BrowsePage.css';

type PageState = FetchState<Event[]>;
const LOADING: PageState = { status: 'loading' };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — please refresh.';
}

export default function BrowsePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQ = searchParams.get('q') ?? '';

  // Local input shadow for debouncing — null means display the URL value.
  const [pendingInput, setPendingInput] = useState<string | null>(null);
  // Track the previous urlQ so we can detect external URL navigation (e.g. header Enter).
  const [prevUrlQ, setPrevUrlQ] = useState(urlQ);

  // Track which query the current state was loaded for so we can derive loading.
  const [loadedForQ, setLoadedForQ] = useState<string | undefined>(undefined);
  const [loadedState, setLoadedState] = useState<PageState>(LOADING);

  const debounceRef = useRef<number | undefined>(undefined);

  // React-approved derived-state update: when the URL changes externally, reset the local input
  // shadow so the input reflects the new URL value rather than the stale typed value.
  if (urlQ !== prevUrlQ) {
    setPrevUrlQ(urlQ);
    setPendingInput(null);
  }

  // Derive display values — show loading whenever the URL has changed and data hasn't arrived yet.
  const displayValue = pendingInput ?? urlQ;
  const state: PageState = loadedForQ !== urlQ ? LOADING : loadedState;

  useEffect(() => {
    let cancelled = false;
    fetchPublicEvents({ q: urlQ || undefined })
      .then((data) => {
        if (!cancelled) {
          setLoadedState({ status: 'ok', data });
          setLoadedForQ(urlQ);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setLoadedState({ status: 'error', message: errMsg(e) });
          setLoadedForQ(urlQ);
        }
      });
    return () => { cancelled = true; };
  }, [urlQ]);

  useEffect(() => {
    return () => { clearTimeout(debounceRef.current); };
  }, []);

  const handleInput = useCallback(
    (value: string) => {
      setPendingInput(value);
      clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => {
        setSearchParams(
          (prev) => {
            const next = new URLSearchParams(prev);
            if (value.trim()) {
              next.set('q', value.trim());
            } else {
              next.delete('q');
            }
            return next;
          },
          { replace: true },
        );
      }, 350);
    },
    [setSearchParams],
  );

  return (
    <main className="browse-main">
      <div className="browse-header">
        <h1 className="browse-heading">Browse Events</h1>
        <p className="browse-subheading">Discover upcoming public events.</p>
      </div>

      <div className="browse-search">
        <input
          className="browse-search__input"
          type="search"
          placeholder="Search by title or location…"
          value={displayValue}
          onChange={(e) => handleInput(e.target.value)}
          aria-label="Filter events"
        />
      </div>

      {state.status === 'loading' && (
        <div className="browse-grid" aria-label="Loading events" aria-busy="true">
          {Array.from({ length: 8 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p className="browse-state browse-state--error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'ok' && state.data.length === 0 && (
        <p className="browse-state">
          {urlQ
            ? `No events found for "${urlQ}".`
            : 'No upcoming public events yet — check back soon.'}
        </p>
      )}

      {state.status === 'ok' && state.data.length > 0 && (
        <div className="browse-grid">
          {state.data.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
