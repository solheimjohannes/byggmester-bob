import './SkeletonCard.css';

export function SkeletonCard() {
  return (
    <div className="skeleton-card" aria-hidden="true">
      <div className="skeleton-card__bar skeleton-card__bar--title" />
      <div className="skeleton-card__bar skeleton-card__bar--date" />
      <div className="skeleton-card__bar skeleton-card__bar--location" />
    </div>
  );
}
