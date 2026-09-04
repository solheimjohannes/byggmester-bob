export interface Venue {
  id: string;
  name: string | null;
  address: string | null;
  city: string | null;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  endAt: string;
  timezone: string;
  visibility: 'public' | 'private';
  venue: Venue | null;
  status: 'draft' | 'published' | 'cancelled';
  createdById: string;
  maxAttendees: number | null;
  attendeeCount?: number;
}

export interface User {
  id: string;
  name: string | null;
  email: string;
  image: string | null;
}

export interface Friendship {
  id: string;
  userId: string;
  friendId: string;
  status: 'accepted' | 'pending';
  friend: User;
}

export interface FriendRequest {
  id: string;
  userId: string;
  friendId: string;
  status: 'pending';
  from: User;
}

export type FetchState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ok'; data: T };
