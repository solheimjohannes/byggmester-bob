import { useEffect, useState } from 'react';
import {
  fetchFriendsEvents,
  fetchRecommendations,
  fetchSession,
  fetchUpcomingPlans,
} from './api';
import { EventCard } from './components/EventCard';
import { EventModule } from './components/EventModule';
import { Header } from './components/Header';
import type { Event, FetchState, User } from './types';
import './App.css';

type ModuleState = FetchState<Event[]>;

const LOADING: ModuleState = { status: 'loading' };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — please refresh.';
}

export default function App() {
  // undefined = auth check in flight; null = not signed in
  const [user, setUser] = useState<User | null | undefined>(undefined);
  const [upcoming, setUpcoming] = useState<ModuleState>(LOADING);
  const [recs, setRecs] = useState<ModuleState>(LOADING);
  const [friends, setFriends] = useState<ModuleState>(LOADING);

  useEffect(() => {
    fetchSession().then(setUser);
  }, []);

  useEffect(() => {
    // Only fetch when we have a confirmed signed-in user
    if (!user) return;

    const uid = user.id;

    fetchUpcomingPlans(uid)
      .then((data) => setUpcoming({ status: 'ok', data }))
      .catch((e: unknown) => setUpcoming({ status: 'error', message: errMsg(e) }));

    fetchRecommendations(uid)
      .then((data) => setRecs({ status: 'ok', data }))
      .catch((e: unknown) => setRecs({ status: 'error', message: errMsg(e) }));

    fetchFriendsEvents(uid)
      .then((data) => setFriends({ status: 'ok', data }))
      .catch((e: unknown) => setFriends({ status: 'error', message: errMsg(e) }));
  }, [user]);

  const authPending = user === undefined;
  // When not signed in, render modules as empty (no fetch in flight)
  const notSignedIn = user === null;

  function moduleProps(state: ModuleState, signedInEmpty: string, signedOutMsg: string) {
    return {
      loading: authPending || (!notSignedIn && state.status === 'loading'),
      error: !notSignedIn && state.status === 'error' ? state.message : null,
      empty: notSignedIn || (state.status === 'ok' && state.data.length === 0),
      emptyMessage: notSignedIn ? signedOutMsg : signedInEmpty,
    };
  }

  return (
    <>
      <Header user={user ?? null} />
      <main className="home-main">
        <EventModule
          title="Upcoming Plans"
          {...moduleProps(
            upcoming,
            "No upcoming plans yet — browse events to find something!",
            "Sign in to see your upcoming plans.",
          )}
        >
          {!notSignedIn && upcoming.status === 'ok' &&
            upcoming.data.map((event) => <EventCard key={event.id} event={event} />)}
        </EventModule>

        <EventModule
          title="For You"
          {...moduleProps(
            recs,
            "No recommendations yet — check back after RSVPing to some events.",
            "Sign in to get personalised recommendations.",
          )}
        >
          {!notSignedIn && recs.status === 'ok' &&
            recs.data.map((event) => <EventCard key={event.id} event={event} />)}
        </EventModule>

        <EventModule
          title="Friends' Plans"
          {...moduleProps(
            friends,
            "None of your friends have upcoming plans yet.",
            "Sign in to see what your friends are attending.",
          )}
        >
          {!notSignedIn && friends.status === 'ok' &&
            friends.data.map((event) => <EventCard key={event.id} event={event} />)}
        </EventModule>
      </main>
    </>
  );
}
