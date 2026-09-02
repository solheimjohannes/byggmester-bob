import type { ReactNode } from 'react';
import { SkeletonCard } from './SkeletonCard';
import './EventModule.css';

interface Props {
  title: string;
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMessage: string;
  children: ReactNode;
}

export function EventModule({ title, loading, error, empty, emptyMessage, children }: Props) {
  return (
    <section className="event-module">
      <h2 className="event-module__title">{title}</h2>
      <div className="event-module__scroll" aria-label={title}>
        {loading && (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        )}
        {!loading && error !== null && (
          <p className="event-module__state event-module__state--error" role="alert">
            {error}
          </p>
        )}
        {!loading && error === null && empty && (
          <p className="event-module__state">{emptyMessage}</p>
        )}
        {!loading && error === null && !empty && children}
      </div>
    </section>
  );
}
