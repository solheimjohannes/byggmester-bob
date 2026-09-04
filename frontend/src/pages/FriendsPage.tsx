import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
// TODO: MOCK DATA — replace with real query imports from '../api' before production
import {
  getFriendRequestsForUser,
  getFriendsForUser,
  getSentFriendRequestsForUser,
  getUpcomingEventCountsForFriends,
  searchUsers,
} from '../lib/mock/queries';
import { useAuth } from '../context/useAuth';
import type { FriendRequest, Friendship, User } from '../types';
import './FriendsPage.css';

type PageState =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | {
      status: 'ok';
      friends: Friendship[];
      requests: FriendRequest[];
      sentRequests: Friendship[];
      allUsers: User[];
      upcomingCounts: Record<string, number>;
    };

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : 'Something went wrong — please refresh.';
}

function getInitials(name: string | null, email: string): string {
  if (name) {
    return name
      .split(' ')
      .map((p) => p[0])
      .slice(0, 2)
      .join('')
      .toUpperCase();
  }
  return email[0].toUpperCase();
}

interface AvatarProps {
  name: string | null;
  email: string;
  image: string | null;
}

function UserAvatar({ name, email, image }: AvatarProps) {
  if (image) {
    return (
      <img
        src={image}
        alt={name ?? email}
        className="friends-avatar friends-avatar--img"
      />
    );
  }
  return (
    <div className="friends-avatar friends-avatar--initials" aria-hidden="true">
      {getInitials(name, email)}
    </div>
  );
}

export default function FriendsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState<PageState>({ status: 'loading' });
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<number | undefined>(undefined);

  useEffect(() => {
    return () => clearTimeout(toastTimer.current);
  }, []);

  useEffect(() => {
    if (user === undefined) return;
    if (user === null) {
      void navigate('/login');
      return;
    }

    const uid = user.id;
    let cancelled = false;

    async function load() {
      const [friends, requests, sentRequests, allUsers] = await Promise.all([
        getFriendsForUser(uid),
        getFriendRequestsForUser(uid),
        getSentFriendRequestsForUser(uid),
        searchUsers('', uid),
      ]);
      const friendIds = friends.map((f) => f.friendId);
      const upcomingCounts = await getUpcomingEventCountsForFriends(friendIds);
      if (!cancelled) {
        setState({ status: 'ok', friends, requests, sentRequests, allUsers, upcomingCounts });
      }
    }

    load().catch((e: unknown) => {
      if (!cancelled) setState({ status: 'error', message: errMsg(e) });
    });

    return () => {
      cancelled = true;
    };
  }, [user, navigate]);

  const filteredUsers = useMemo(() => {
    if (state.status !== 'ok') return [];
    const q = searchQuery.toLowerCase().trim();
    if (!q) return [];
    return state.allUsers.filter(
      (u) =>
        u.id !== user?.id &&
        ((u.name?.toLowerCase().includes(q) ?? false) || u.email.toLowerCase().includes(q)),
    );
  }, [searchQuery, state, user]);

  function getUserStatus(userId: string): 'friends' | 'sent' | 'pending' | 'none' {
    if (state.status !== 'ok') return 'none';
    if (state.friends.some((f) => f.friendId === userId)) return 'friends';
    if (state.sentRequests.some((r) => r.friendId === userId)) return 'sent';
    if (state.requests.some((r) => r.userId === userId)) return 'pending';
    return 'none';
  }

  function showComingSoon() {
    clearTimeout(toastTimer.current);
    setToast('Friend requests coming soon!');
    toastTimer.current = window.setTimeout(() => setToast(null), 3000);
  }

  if (user === undefined || user === null) return null;

  return (
    <main className="friends-main">
      <div className="friends-header">
        <h1 className="friends-heading">Friends</h1>
      </div>

      {toast && (
        <div className="friends-toast" role="status" aria-live="polite">
          {toast}
        </div>
      )}

      {state.status === 'error' && (
        <p className="friends-status friends-status--error" role="alert">
          {state.message}
        </p>
      )}

      {state.status === 'loading' && (
        <div className="friends-list friends-list--skeleton" aria-label="Loading friends" aria-busy="true">
          {[0, 1, 2].map((i) => (
            <div key={i} className="friends-skeleton" aria-hidden="true">
              <div className="friends-skeleton__avatar" />
              <div className="friends-skeleton__lines">
                <div className="friends-skeleton__line friends-skeleton__line--name" />
                <div className="friends-skeleton__line friends-skeleton__line--email" />
              </div>
            </div>
          ))}
        </div>
      )}

      {state.status === 'ok' && (
        <>
          {/* Pending incoming friend requests */}
          {state.requests.length > 0 && (
            <section className="friends-section">
              <h2 className="friends-section-title">Friend Requests</h2>
              <div className="friends-list">
                {state.requests.map((req) => (
                  <div key={req.id} className="friends-card">
                    <UserAvatar
                      name={req.from.name}
                      email={req.from.email}
                      image={req.from.image}
                    />
                    <div className="friends-card__info">
                      <p className="friends-card__name">{req.from.name ?? req.from.email}</p>
                      <p className="friends-card__email">{req.from.email}</p>
                    </div>
                    <div className="friends-card__actions">
                      {/* TODO: wire accept friend request action */}
                      <button
                        className="btn btn--primary friends-card__btn"
                        onClick={showComingSoon}
                      >
                        Accept
                      </button>
                      {/* TODO: wire decline friend request action */}
                      <button
                        className="btn btn--secondary friends-card__btn"
                        onClick={showComingSoon}
                      >
                        Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Add friend search */}
          <section className="friends-section">
            <h2 className="friends-section-title">Find People</h2>
            <input
              className="friends-search"
              type="search"
              placeholder="Find people by name or email"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Find people by name or email"
            />

            {searchQuery.trim() !== '' && filteredUsers.length === 0 && (
              <p className="friends-search-empty">No people found for "{searchQuery}"</p>
            )}

            {filteredUsers.length > 0 && (
              <div className="friends-list">
                {filteredUsers.map((u) => {
                  const status = getUserStatus(u.id);
                  return (
                    <div key={u.id} className="friends-card">
                      <UserAvatar name={u.name} email={u.email} image={u.image} />
                      <div className="friends-card__info">
                        <p className="friends-card__name">{u.name ?? u.email}</p>
                        <p className="friends-card__email">{u.email}</p>
                      </div>
                      <div className="friends-card__actions">
                        {status === 'friends' && (
                          <span className="friends-badge friends-badge--friends">Friends</span>
                        )}
                        {(status === 'sent' || status === 'pending') && (
                          <span className="friends-badge friends-badge--pending">Pending</span>
                        )}
                        {status === 'none' && (
                          // TODO: wire add friend action
                          <button
                            className="btn btn--primary friends-card__btn"
                            onClick={showComingSoon}
                          >
                            Add Friend
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Friends list */}
          <section className="friends-section">
            <h2 className="friends-section-title">
              Your Friends
              {state.friends.length > 0 && (
                <span className="friends-count">{state.friends.length}</span>
              )}
            </h2>

            {state.friends.length === 0 ? (
              <p className="friends-empty">
                You haven't added any friends yet — search for someone above.
              </p>
            ) : (
              <div className="friends-list">
                {state.friends.map((friendship) => {
                  const f = friendship.friend;
                  const count = state.upcomingCounts[friendship.friendId] ?? 0;
                  return (
                    <div key={friendship.id} className="friends-card">
                      <UserAvatar name={f.name} email={f.email} image={f.image} />
                      <div className="friends-card__info">
                        <p className="friends-card__name">{f.name ?? f.email}</p>
                        <p className="friends-card__email">{f.email}</p>
                        <p className="friends-card__meta">
                          {count === 0
                            ? 'No upcoming events'
                            : `${count} upcoming ${count === 1 ? 'event' : 'events'}`}
                        </p>
                      </div>
                      <div className="friends-card__actions">
                        {/* TODO: profile page /profile/[id] not implemented yet — follow-up issue */}
                        <a
                          href={`/profile/${f.id}`}
                          className="btn btn--secondary friends-card__btn"
                        >
                          View Profile
                        </a>
                        {/* TODO: wire remove friend action */}
                        <button
                          className="btn friends-card__btn friends-card__btn--remove"
                          onClick={showComingSoon}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}
    </main>
  );
}
