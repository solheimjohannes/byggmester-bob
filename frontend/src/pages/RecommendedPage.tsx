import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchRecommendations } from '../api';
import { EventCard } from '../components/EventCard';
import { SkeletonCard } from '../components/SkeletonCard';
import { useAuth } from '../context/useAuth';
import type { Event, FetchState } from '../types';
import './RecommendedPage.css';

type PageState = FetchState<Event[]>;
const LOADING: PageState = { status: 'loading' };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — please refresh.';
}

export default function RecommendedPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>(LOADING);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      void navigate('/login');
      return;
    }
    fetchRecommendations(user.id, 24)
      .then((data) => setState({ status: 'ok', data }))
      .catch((e: unknown) => setState({ status: 'error', message: errMsg(e) }));
  }, [user, navigate]);

  if (user === undefined || user === null) {
    return null;
  }

  return (
    <main className="recommended-main">
      <div className="recommended-header">
        <h1 className="recommended-heading">Recommended for You</h1>
        <p className="recommended-subheading">
          Events picked based on your past plans and location.
        </p>
      </div>

      {state.status === 'loading' && (
        <div
          className="recommended-grid"
          aria-label="Loading recommendations"
          aria-busy="true"
        >
          {Array.from({ length: 6 }).map((_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      )}

      {state.status === 'error' && (
        <p className="recommended-state recommended-state--error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'ok' && state.data.length === 0 && (
        <p className="recommended-state">
          No recommendations yet — check back after RSVPing to some events.
        </p>
      )}

      {state.status === 'ok' && state.data.length > 0 && (
        <div className="recommended-grid">
          {state.data.map((event) => (
            <EventCard key={event.id} event={event} />
          ))}
        </div>
      )}
    </main>
  );
}
