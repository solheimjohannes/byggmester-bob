import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    attendee: { findMany: vi.fn() },
    event: { findMany: vi.fn() },
    friendship: { findMany: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import {
  getUpcomingPlansForUser,
  getRecommendedEvents,
  getFriendsEvents,
  searchEvents,
} from './events';

const mockPrisma = vi.mocked(prisma, true);

// Minimal fixture builders

function makeVenue(overrides = {}) {
  return { id: 'v1', name: 'Venue', address: null, city: 'Oslo', ...overrides };
}

function makeEvent(overrides = {}) {
  return {
    id: 'e1',
    title: 'Test Event',
    description: null,
    startAt: new Date(Date.now() + 86400_000), // tomorrow
    endAt: new Date(Date.now() + 90000_000),
    timezone: 'Europe/Oslo',
    venueId: 'v1',
    venue: makeVenue(),
    visibility: 'public',
    inviteToken: null,
    maxAttendees: null,
    status: 'published',
    createdById: 'u1',
    createdAt: new Date(),
    updatedAt: new Date(),
    attendees: [],
    ...overrides,
  };
}

function makeAttendee(overrides = {}) {
  return {
    id: 'a1',
    eventId: 'e1',
    event: makeEvent(),
    userId: 'user1',
    name: 'Alice',
    email: 'alice@example.com',
    status: 'confirmed',
    createdAt: new Date(),
    ...overrides,
  };
}

function makeFriendship(overrides = {}) {
  return {
    id: 'f1',
    requesterId: 'user1',
    addresseeId: 'friend1',
    status: 'accepted',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// getUpcomingPlansForUser
// ---------------------------------------------------------------------------

describe('getUpcomingPlansForUser', () => {
  it('returns event objects from confirmed future attendances', async () => {
    const event = makeEvent();
    mockPrisma.attendee.findMany.mockResolvedValue([makeAttendee({ event })]);

    const result = await getUpcomingPlansForUser('user1');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('e1');
    expect(mockPrisma.attendee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user1',
          status: 'confirmed',
        }),
      }),
    );
  });

  it('returns empty array when user has no upcoming confirmed attendances', async () => {
    mockPrisma.attendee.findMany.mockResolvedValue([]);

    const result = await getUpcomingPlansForUser('user1');

    expect(result).toEqual([]);
  });

  it('queries with a future-only filter on event startAt', async () => {
    mockPrisma.attendee.findMany.mockResolvedValue([]);

    await getUpcomingPlansForUser('user1');

    const call = mockPrisma.attendee.findMany.mock.calls[0][0];
    expect(call.where.event.startAt).toEqual(expect.objectContaining({ gt: expect.any(Date) }));
    expect(call.where.event.status).toEqual({ not: 'cancelled' });
  });

  it('throws on blank userId', async () => {
    await expect(getUpcomingPlansForUser('')).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getRecommendedEvents
// ---------------------------------------------------------------------------

describe('getRecommendedEvents', () => {
  it('returns public published upcoming events excluding ones already attended', async () => {
    mockPrisma.attendee.findMany.mockResolvedValue([]); // no history
    mockPrisma.event.findMany.mockResolvedValue([makeEvent()]);

    const result = await getRecommendedEvents('user1', 10);

    expect(result).toHaveLength(1);
    const eventQuery = mockPrisma.event.findMany.mock.calls[0][0];
    expect(eventQuery.where.visibility).toBe('public');
    expect(eventQuery.where.status).toBe('published');
  });

  it('returns empty array when no upcoming public events exist', async () => {
    mockPrisma.attendee.findMany.mockResolvedValue([]);
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await getRecommendedEvents('user1');

    expect(result).toEqual([]);
  });

  it('never returns private events', async () => {
    mockPrisma.attendee.findMany.mockResolvedValue([]);
    // Even if the DB mock returns a private event (shouldn't happen with correct where clause)
    // the where clause should prevent it
    mockPrisma.event.findMany.mockResolvedValue([]);

    await getRecommendedEvents('user1');

    const eventQuery = mockPrisma.event.findMany.mock.calls[0][0];
    // The query must restrict to public events
    expect(eventQuery.where.visibility).toBe('public');
  });

  it('ranks same-city events before others', async () => {
    // User previously attended an event in Oslo
    const osloAttendee = makeAttendee({
      event: makeEvent({ venue: makeVenue({ city: 'Oslo' }) }),
    });
    mockPrisma.attendee.findMany.mockResolvedValue([osloAttendee]);

    const tomorrow = new Date(Date.now() + 86400_000);
    const dayAfter = new Date(Date.now() + 172800_000);

    const bergenEvent = makeEvent({ id: 'e-bergen', startAt: tomorrow, venue: makeVenue({ city: 'Bergen' }) });
    const osloEvent = makeEvent({ id: 'e-oslo', startAt: dayAfter, venue: makeVenue({ city: 'Oslo' }) });
    // Bergen event is sooner but Oslo should rank first due to city match
    mockPrisma.event.findMany.mockResolvedValue([bergenEvent, osloEvent]);

    const result = await getRecommendedEvents('user1', 10);

    expect(result[0].id).toBe('e-oslo');
    expect(result[1].id).toBe('e-bergen');
  });

  it('throws on invalid limit (zero)', async () => {
    await expect(getRecommendedEvents('user1', 0)).rejects.toThrow();
  });
});

// ---------------------------------------------------------------------------
// getFriendsEvents
// ---------------------------------------------------------------------------

describe('getFriendsEvents', () => {
  it('returns events attended by accepted friends', async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([makeFriendship()]);
    mockPrisma.event.findMany.mockResolvedValue([makeEvent()]);

    const result = await getFriendsEvents('user1', 10);

    expect(result).toHaveLength(1);
    const friendQuery = mockPrisma.event.findMany.mock.calls[0][0];
    expect(friendQuery.where.attendees.some.userId.in).toContain('friend1');
  });

  it('returns empty array when user has no friends', async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([]);

    const result = await getFriendsEvents('user1');

    expect(result).toEqual([]);
    // Should not query events at all
    expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
  });

  it('returns empty array when friends have no upcoming events', async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([makeFriendship()]);
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await getFriendsEvents('user1');

    expect(result).toEqual([]);
  });

  it('never leaks private events the user is not attending', async () => {
    mockPrisma.friendship.findMany.mockResolvedValue([makeFriendship()]);
    mockPrisma.event.findMany.mockResolvedValue([]);

    await getFriendsEvents('user1');

    const eventQuery = mockPrisma.event.findMany.mock.calls[0][0];
    // Must have an OR clause that only allows private events when user is an attendee
    expect(eventQuery.where.OR).toEqual(
      expect.arrayContaining([
        { visibility: 'public' },
        expect.objectContaining({
          visibility: 'private',
          attendees: expect.objectContaining({
            some: expect.objectContaining({ userId: 'user1' }),
          }),
        }),
      ]),
    );
  });

  it('handles friendships where user is the addressee', async () => {
    // user1 received a friend request from friend2
    mockPrisma.friendship.findMany.mockResolvedValue([
      makeFriendship({ requesterId: 'friend2', addresseeId: 'user1' }),
    ]);
    mockPrisma.event.findMany.mockResolvedValue([]);

    await getFriendsEvents('user1');

    const eventQuery = mockPrisma.event.findMany.mock.calls[0][0];
    expect(eventQuery.where.attendees.some.userId.in).toContain('friend2');
  });
});

// ---------------------------------------------------------------------------
// searchEvents
// ---------------------------------------------------------------------------

describe('searchEvents', () => {
  it('returns matching public published events', async () => {
    mockPrisma.event.findMany.mockResolvedValue([makeEvent({ title: 'Jazz Night' })]);

    const result = await searchEvents('jazz');

    expect(result).toHaveLength(1);
    const q = mockPrisma.event.findMany.mock.calls[0][0];
    expect(q.where.visibility).toBe('public');
    expect(q.where.status).toBe('published');
  });

  it('returns empty array without calling Prisma when query is blank', async () => {
    const result = await searchEvents('   ');

    expect(result).toEqual([]);
    expect(mockPrisma.event.findMany).not.toHaveBeenCalled();
  });

  it('returns empty array for a query that matches nothing', async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    const result = await searchEvents('zzznomatch');

    expect(result).toEqual([]);
  });

  it('never returns private events', async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    await searchEvents('secret');

    const q = mockPrisma.event.findMany.mock.calls[0][0];
    expect(q.where.visibility).toBe('public');
  });

  it('uses case-insensitive matching', async () => {
    mockPrisma.event.findMany.mockResolvedValue([]);

    await searchEvents('JAZZ');

    const q = mockPrisma.event.findMany.mock.calls[0][0];
    const orClauses = q.where.OR;
    orClauses.forEach((clause: { title?: { mode: string }; description?: { mode: string }; venue?: { name: { mode: string } } }) => {
      const field = clause.title ?? clause.description ?? clause.venue?.name;
      if (field) expect((field as { mode: string }).mode).toBe('insensitive');
    });
  });

  it('throws on query longer than 200 characters', async () => {
    await expect(searchEvents('a'.repeat(201))).rejects.toThrow();
  });

  it('throws on invalid limit', async () => {
    await expect(searchEvents('test', 0)).rejects.toThrow();
  });
});
