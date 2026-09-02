import type { Event, User } from './types';

const BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:3001';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, { credentials: 'include' });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json() as T | { error: string; code?: string };
  if (!res.ok) throw Object.assign(new Error((data as { error: string }).error), { data });
  return data as T;
}

export interface RegisterInput { name?: string; email: string; password: string }
export interface LoginInput { email: string; password: string }

export function register(input: RegisterInput): Promise<User> {
  return post<User>('/api/auth/register', input);
}

export function login(input: LoginInput): Promise<User> {
  return post<User>('/api/auth/login', input);
}

export function logout(): Promise<{ ok: boolean }> {
  return post<{ ok: boolean }>('/api/auth/logout', {});
}

export function fetchSession(): Promise<User | null> {
  return get<User | null>('/api/auth/session').catch(() => null);
}

export function fetchUpcomingPlans(userId: string): Promise<Event[]> {
  return get<Event[]>(`/api/plans/upcoming?userId=${encodeURIComponent(userId)}`);
}

export function fetchCreatedEvents(userId: string): Promise<Event[]> {
  return get<Event[]>(`/api/events/created?userId=${encodeURIComponent(userId)}`);
}

export function fetchRecommendations(userId: string, limit = 10): Promise<Event[]> {
  return get<Event[]>(
    `/api/events/recommended?userId=${encodeURIComponent(userId)}&limit=${limit}`,
  );
}

export function fetchFriendsEvents(userId: string, limit = 10): Promise<Event[]> {
  return get<Event[]>(
    `/api/events/friends?userId=${encodeURIComponent(userId)}&limit=${limit}`,
  );
}

export function searchEvents(query: string, limit = 20): Promise<Event[]> {
  return get<Event[]>(
    `/api/events/search?q=${encodeURIComponent(query)}&limit=${limit}`,
  );
}

export function fetchCreatedEvents(userId: string): Promise<Event[]> {
  return get<Event[]>(`/api/events/created?userId=${encodeURIComponent(userId)}`);
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
