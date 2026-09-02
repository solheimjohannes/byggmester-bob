import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchCreatedEvents, fetchUpcomingPlans } from '../api';
import { EventCard } from '../components/EventCard';
import { EventModule } from '../components/EventModule';
import { useAuth } from '../context/useAuth';
import type { Event, FetchState } from '../types';
import './ProfilePage.css';

type ModuleState = FetchState<Event[]>;
const LOADING: ModuleState = { status: 'loading' };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — please refresh.';
}

export default function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [upcoming, setUpcoming] = useState<ModuleState>(LOADING);
  const [created, setCreated] = useState<ModuleState>(LOADING);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      navigate('/login');
      return;
    }

    const uid = user.id;

    fetchUpcomingPlans(uid)
      .then((data) => setUpcoming({ status: 'ok', data }))
      .catch((e: unknown) => setUpcoming({ status: 'error', message: errMsg(e) }));

    fetchCreatedEvents(uid)
      .then((data) => setCreated({ status: 'ok', data }))
      .catch((e: unknown) => setCreated({ status: 'error', message: errMsg(e) }));
  }, [user, navigate]);

  if (user === undefined || user === null) {
    return null;
  }

  const initials = user.name
    ? user.name.split(' ').map((p) => p[0]).slice(0, 2).join('').toUpperCase()
    : '?';

  return (
    <main className="profile-main">
      <section className="profile-header">
        <div className="profile-avatar-wrap">
          {user.image ? (
            <img
              src={user.image}
              alt={user.name ?? 'Profile'}
              className="profile-avatar-img"
            />
          ) : (
            <span className="profile-avatar-initials">{initials}</span>
          )}
        </div>
        <div className="profile-info">
          <h1 className="profile-info__name">{user.name ?? 'Unknown User'}</h1>
          <p className="profile-info__email">{user.email}</p>
          <a href="/profile/edit" className="btn btn--secondary profile-info__edit">
            Edit Profile
          </a>
        </div>
      </section>

      <div className="profile-activity">
        <EventModule
          title="My Upcoming Plans"
          loading={upcoming.status === 'loading'}
          error={upcoming.status === 'error' ? upcoming.message : null}
          empty={upcoming.status === 'ok' && upcoming.data.length === 0}
          emptyMessage="You haven't joined any upcoming events yet."
        >
          {upcoming.status === 'ok' &&
            upcoming.data.map((event) => <EventCard key={event.id} event={event} />)}
        </EventModule>

        <EventModule
          title="Events I've Created"
          loading={created.status === 'loading'}
          error={created.status === 'error' ? created.message : null}
          empty={created.status === 'ok' && created.data.length === 0}
          emptyMessage="You haven't created any events yet."
        >
          {created.status === 'ok' &&
            created.data.map((event) => <EventCard key={event.id} event={event} />)}
        </EventModule>
      </div>
    </main>
  );
}
