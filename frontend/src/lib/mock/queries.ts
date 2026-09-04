// TODO: MOCK DATA — remove this file before production
import type { FetchPublicEventsParams } from '../../api';
import type { Event, EventPost, FriendRequest, Friendship, User } from '../../types';
import {
  MOCK_ALL_USERS,
  MOCK_CREATED_EVENTS,
  MOCK_EVENT_ATTENDEES,
  MOCK_FRIEND_REQUESTS,
  MOCK_FRIENDS,
  MOCK_FRIENDS_EVENTS,
  MOCK_POSTS,
  MOCK_PUBLIC_EVENTS,
  MOCK_RECOMMENDATIONS,
  MOCK_SENT_REQUESTS,
  MOCK_UPCOMING_PLANS,
  MOCK_USER,
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

// TODO: MOCK DATA — replace with real query before production
export async function getFriendsForUser(_userId: string): Promise<Friendship[]> {
  return MOCK_FRIENDS;
}

// TODO: MOCK DATA — replace with real query before production
export async function getFriendRequestsForUser(_userId: string): Promise<FriendRequest[]> {
  return MOCK_FRIEND_REQUESTS;
}

// TODO: MOCK DATA — replace with real query before production
export async function getSentFriendRequestsForUser(_userId: string): Promise<Friendship[]> {
  return MOCK_SENT_REQUESTS;
}

// TODO: MOCK DATA — replace with real query before production
// Search is client-side in mock mode; this signature is for the real implementation
// where it will hit the database
export async function searchUsers(_query: string, _excludeUserId: string): Promise<User[]> {
  return MOCK_ALL_USERS;
}

// TODO: MOCK DATA — replace with real query before production
export async function getPostsForEvent(eventId: string): Promise<EventPost[]> {
  return MOCK_POSTS[eventId] ?? [];
}

// TODO: MOCK DATA — replace with real Server Action before production
export async function createPost(eventId: string, content: string): Promise<EventPost> {
  return {
    id: `post-mock-${Date.now()}`,
    eventId,
    authorId: MOCK_USER.id,
    author: {
      name: MOCK_USER.name,
      email: MOCK_USER.email,
      image: MOCK_USER.image,
    },
    content,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

// TODO: MOCK DATA — replace with real Server Action before production
export async function deletePost(_postId: string): Promise<{ success: boolean }> {
  return { success: true };
}

// TODO: MOCK DATA — replace with real query before production
export async function getUpcomingEventCountsForFriends(
  friendIds: string[],
): Promise<Record<string, number>> {
  const now = new Date().toISOString();
  const counts: Record<string, number> = {};
  for (const uid of friendIds) {
    counts[uid] = MOCK_EVENT_ATTENDEES.filter(
      (a) =>
        a.userId === uid && MOCK_PUBLIC_EVENTS.some((e) => e.id === a.eventId && e.startAt > now),
    ).length;
  }
  return counts;
}
