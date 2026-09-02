import type { Event, User } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function fetchSession(): Promise<User | null> {
  return get<User | null>('/api/auth/session').catch(() => null);
}

export function fetchUpcomingPlans(userId: string): Promise<Event[]> {
  return get<Event[]>(`/api/events/upcoming-plans?userId=${encodeURIComponent(userId)}`);
}

export function fetchRecommendations(userId: string, limit = 10): Promise<Event[]> {
  return get<Event[]>(
    `/api/events/recommendations?userId=${encodeURIComponent(userId)}&limit=${limit}`,
  );
}

export function fetchFriendsEvents(userId: string, limit = 10): Promise<Event[]> {
  return get<Event[]>(
    `/api/events/friends-events?userId=${encodeURIComponent(userId)}&limit=${limit}`,
  );
}

export function searchEvents(query: string, limit = 20): Promise<Event[]> {
  return get<Event[]>(
    `/api/events/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
}

export function formatEventDate(isoString: string, timezone: string): string {
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return new Date(isoString).toLocaleString();
  }
}
