import { Prisma } from '@prisma/client';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

const userIdSchema = z.string().min(1, 'userId is required');
const limitSchema = z.number().int().min(1).max(100);

/**
 * Returns upcoming events relevant to the user:
 *   - events the user created (any visibility, non-cancelled)
 *   - events the user has a confirmed RSVP for
 * Results are deduplicated (creator + attendee → one entry) and sorted soonest-first.
 */
export async function getUpcomingPlansForUser(userId: string) {
  userIdSchema.parse(userId);

  const now = new Date();

  const [attendees, createdEvents] = await Promise.all([
    prisma.attendee.findMany({
      where: {
        userId,
        status: 'confirmed',
        event: {
          startAt: { gt: now },
          status: { not: 'cancelled' },
        },
      },
      include: {
        event: { include: { venue: true } },
      },
      orderBy: { event: { startAt: 'asc' } },
    }),
    prisma.event.findMany({
      where: {
        createdById: userId,
        startAt: { gt: now },
        status: { not: 'cancelled' },
      },
      include: { venue: true },
      orderBy: { startAt: 'asc' },
    }),
  ]);

  const seen = new Set<string>();
  const merged: (typeof createdEvents)[number][] = [];

  for (const event of createdEvents) {
    if (!seen.has(event.id)) {
      seen.add(event.id);
      merged.push(event);
    }
  }

  for (const attendee of attendees) {
    if (!seen.has(attendee.event.id)) {
      seen.add(attendee.event.id);
      merged.push(attendee.event);
    }
  }

  merged.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

  return merged;
}

/**
 * Returns recommended public, published, upcoming events for a user.
 *
 * Ranking logic (simple, easy to swap):
 *   1. Events in cities the user has previously RSVP'd to come first.
 *   2. Within each tier, events are sorted by startAt ascending.
 *   3. Events the user is already attending are excluded.
 *   4. Private events are NEVER returned regardless of ranking.
 *
 * This is intentionally simple — not a real recommendation engine.
 * The ranking is isolated to this function so it can be replaced later.
 */
export async function getRecommendedEvents(userId: string, limit = 10) {
  userIdSchema.parse(userId);
  limitSchema.parse(limit);

  const now = new Date();

  // Find cities from user's non-cancelled RSVP history
  const userHistory = await prisma.attendee.findMany({
    where: { userId, status: { not: 'cancelled' } },
    include: { event: { include: { venue: { select: { city: true } } } } },
  });
  const userCities = new Set(
    userHistory
      .map((a) => a.event.venue?.city)
      .filter((c): c is string => Boolean(c)),
  );

  // Public, published, upcoming events the user isn't already attending
  const candidates = await prisma.event.findMany({
    where: {
      visibility: 'public',
      status: 'published',
      startAt: { gt: now },
      attendees: { none: { userId, status: { not: 'cancelled' } } },
    },
    include: { venue: true },
    orderBy: { startAt: 'asc' },
    // Overfetch to allow re-ranking; cap at a reasonable ceiling
    take: Math.min(limit * 5, 200),
  });

  // Re-rank: same-city events first, then soonest within each tier
  candidates.sort((a, b) => {
    const aMatch = userCities.has(a.venue?.city ?? '') ? 0 : 1;
    const bMatch = userCities.has(b.venue?.city ?? '') ? 0 : 1;
    if (aMatch !== bMatch) return aMatch - bMatch;
    return a.startAt.getTime() - b.startAt.getTime();
  });

  return candidates.slice(0, limit);
}

/**
 * Returns upcoming events that the user's accepted friends are attending.
 *
 * Privacy rules enforced here:
 *   - Public events: always eligible.
 *   - Private events: only returned if the requesting user is also
 *     an accepted attendee or invitee — never leaked via a friend's attendance.
 *   - Events are deduplicated (multiple friends attending one event → one result).
 *
 * Friendship model (Issue A) is present in the schema and used here.
 */
export async function getFriendsEvents(userId: string, limit = 10) {
  userIdSchema.parse(userId);
  limitSchema.parse(limit);

  const now = new Date();

  const friendships = await prisma.friendship.findMany({
    where: {
      status: 'accepted',
      OR: [{ requesterId: userId }, { addresseeId: userId }],
    },
  });

  const friendIds = friendships.map((f) =>
    f.requesterId === userId ? f.addresseeId : f.requesterId,
  );

  if (friendIds.length === 0) return [];

  return prisma.event.findMany({
    where: {
      startAt: { gt: now },
      status: { not: 'cancelled' },
      // At least one friend must be attending
      attendees: {
        some: { userId: { in: friendIds }, status: { not: 'cancelled' } },
      },
      // Privacy gate: public events freely shown; private only if user is also attending
      OR: [
        { visibility: 'public' },
        {
          visibility: 'private',
          attendees: { some: { userId, status: { not: 'cancelled' } } },
        },
      ],
    },
    include: { venue: true },
    orderBy: { startAt: 'asc' },
    take: limit,
  });
}

const GET_EVENTS_CREATED_BY_USER_INCLUDE = {
  venue: true,
  _count: { select: { attendees: true } },
} satisfies Prisma.EventInclude;

export type UserCreatedEvent = Prisma.EventGetPayload<{
  include: typeof GET_EVENTS_CREATED_BY_USER_INCLUDE;
}>;

/**
 * Returns all events created by the user, sorted by startAt descending.
 * Includes all statuses and visibilities — the caller is the creator.
 */
export async function getEventsCreatedByUser(userId: string): Promise<UserCreatedEvent[]> {
  userIdSchema.parse(userId);

  return prisma.event.findMany({
    where: { createdById: userId },
    include: GET_EVENTS_CREATED_BY_USER_INCLUDE,
    orderBy: { startAt: 'desc' },
  });
}

const querySchema = z.string().max(200);

export interface GetPublicEventsParams {
  q?: string;
  limit?: number;
}

/**
 * Returns all upcoming public, published events with optional q filter.
 * q searches title, description, venue name, and venue city (case-insensitive).
 * Returns all events when q is absent or blank. Never returns private events.
 * Sorted soonest-first.
 */
export async function getPublicEvents({
  q,
  limit = 50,
}: GetPublicEventsParams = {}) {
  if (q !== undefined) querySchema.parse(q);
  limitSchema.parse(limit);

  const now = new Date();
  const trimmed = q?.trim();

  const where: Prisma.EventWhereInput = {
    visibility: 'public',
    status: 'published',
    startAt: { gt: now },
    ...(trimmed
      ? {
          OR: [
            { title: { contains: trimmed, mode: 'insensitive' } },
            { description: { contains: trimmed, mode: 'insensitive' } },
            { venue: { name: { contains: trimmed, mode: 'insensitive' } } },
            { venue: { city: { contains: trimmed, mode: 'insensitive' } } },
          ],
        }
      : {}),
  };

  return prisma.event.findMany({
    where,
    include: { venue: true },
    orderBy: { startAt: 'asc' },
    take: limit,
  });
}

/**
 * Case-insensitive search against public, published events.
 * Matches title, description, and venue name.
 * Returns empty array for blank queries; never returns private events.
 */
export async function searchEvents(query: string, limit = 20) {
  z.string().max(200).parse(query);
  limitSchema.parse(limit);

  const trimmed = query.trim();
  if (!trimmed) return [];

  return prisma.event.findMany({
    where: {
      visibility: 'public',
      status: 'published',
      OR: [
        { title: { contains: trimmed, mode: 'insensitive' } },
        { description: { contains: trimmed, mode: 'insensitive' } },
        { venue: { name: { contains: trimmed, mode: 'insensitive' } } },
      ],
    },
    include: { venue: true },
    orderBy: { startAt: 'asc' },
    take: limit,
  });
}
