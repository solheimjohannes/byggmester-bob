// TODO: MOCK DATA — remove this file before production
import type { FetchPublicEventsParams } from '../../api';
import type { Event } from '../../types';
import {
  MOCK_CREATED_EVENTS,
  MOCK_FRIENDS_EVENTS,
  MOCK_PUBLIC_EVENTS,
  MOCK_RECOMMENDATIONS,
  MOCK_UPCOMING_PLANS,
} from './data';

export function fetchUpcomingPlans(_userId: string): Promise<Event[]> {
  return Promise.resolve(MOCK_UPCOMING_PLANS);
}

export function fetchCreatedEvents(_userId: string): Promise<Event[]> {
  return Promise.resolve(MOCK_CREATED_EVENTS);
}

export function fetchRecommendations(_userId: string, _limit = 10): Promise<Event[]> {
  return Promise.resolve(MOCK_RECOMMENDATIONS);
}

export function fetchFriendsEvents(_userId: string, _limit = 10): Promise<Event[]> {
  return Promise.resolve(MOCK_FRIENDS_EVENTS);
}

export function fetchPublicEvents(_params: FetchPublicEventsParams = {}): Promise<Event[]> {
  return Promise.resolve(MOCK_PUBLIC_EVENTS);
}

export function searchEvents(_query: string, _limit = 20): Promise<Event[]> {
  return Promise.resolve(MOCK_PUBLIC_EVENTS.slice(0, 5));
}

// TODO: MOCK DATA — replace with real query before production
export function getEventById(id: string): Promise<Event | null> {
  const all = [
    ...MOCK_UPCOMING_PLANS,
    ...MOCK_CREATED_EVENTS,
    ...MOCK_RECOMMENDATIONS,
    ...MOCK_FRIENDS_EVENTS,
  ];
  return Promise.resolve(all.find((e) => e.id === id) ?? null);
}

// TODO: MOCK DATA — replace with real query before production
export function fetchCalendarEvents(_userId: string): Promise<Event[]> {
  return Promise.resolve([...MOCK_UPCOMING_PLANS, ...MOCK_CREATED_EVENTS]);
}
