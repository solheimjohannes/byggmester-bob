import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    venue: { create: vi.fn() },
    event: { create: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { createEvent, createEventSchema, EndBeforeStartError } from './createEvent';

const mockPrisma = vi.mocked(prisma, true);

const BASE_INPUT = {
  title: 'Summer Gala',
  description: 'An outdoor event',
  startAt: '2026-08-01T14:00:00',
  endAt: '2026-08-01T18:00:00',
  timezone: 'Europe/Oslo',
  maxAttendees: 50,
  visibility: 'public' as const,
};

function makeVenue(overrides = {}) {
  return { id: 'v1', name: 'City Hall', address: '1 Main St', city: 'Oslo', ...overrides };
}

function makeEvent(overrides = {}) {
  return {
    id: 'e1',
    title: 'Summer Gala',
    description: 'An outdoor event',
    startAt: new Date('2026-08-01T12:00:00Z'),
    endAt: new Date('2026-08-01T16:00:00Z'),
    timezone: 'Europe/Oslo',
    venueId: null,
    venue: null,
    visibility: 'public',
    inviteToken: null,
    maxAttendees: 50,
    status: 'draft',
    createdById: 'user1',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// createEventSchema validation
// ---------------------------------------------------------------------------

describe('createEventSchema', () => {
  it('accepts a fully populated valid payload', () => {
    expect(() =>
      createEventSchema.parse({
        ...BASE_INPUT,
        venue: { name: 'City Hall', address: '1 Main St', city: 'Oslo' },
      }),
    ).not.toThrow();
  });

  it('accepts minimal payload (title + required datetimes + timezone + visibility)', () => {
    expect(() =>
      createEventSchema.parse({
        title: 'Test',
        startAt: '2026-08-01T10:00:00',
        endAt: '2026-08-01T12:00:00',
        timezone: 'UTC',
        visibility: 'public',
      }),
    ).not.toThrow();
  });

  it('rejects missing title', () => {
    expect(() => createEventSchema.parse({ ...BASE_INPUT, title: undefined })).toThrow();
  });

  it('rejects blank title', () => {
    expect(() => createEventSchema.parse({ ...BASE_INPUT, title: '' })).toThrow();
  });

  it('rejects invalid visibility value', () => {
    expect(() => createEventSchema.parse({ ...BASE_INPUT, visibility: 'restricted' })).toThrow();
  });

  it('rejects negative maxAttendees', () => {
    expect(() => createEventSchema.parse({ ...BASE_INPUT, maxAttendees: -1 })).toThrow();
  });

  it('rejects zero maxAttendees', () => {
    expect(() => createEventSchema.parse({ ...BASE_INPUT, maxAttendees: 0 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createEvent — happy path
// ---------------------------------------------------------------------------

describe('createEvent', () => {
  it('creates event and returns it with venue included', async () => {
    const event = makeEvent();
    mockPrisma.event.create.mockResolvedValue(event as never);

    const result = await createEvent(BASE_INPUT, 'user1');

    expect(result).toEqual(event);
    expect(mockPrisma.event.create).toHaveBeenCalledOnce();
    const call = mockPrisma.event.create.mock.calls[0][0];
    expect(call.data.title).toBe('Summer Gala');
    expect(call.data.createdById).toBe('user1');
    expect(call.data.status).toBe('draft');
    expect(call.data.startAt).toBeInstanceOf(Date);
    expect(call.data.endAt).toBeInstanceOf(Date);
    expect(call.include).toEqual({ venue: true });
  });

  it('converts startAt/endAt from provided timezone to UTC', async () => {
    mockPrisma.event.create.mockResolvedValue(makeEvent() as never);

    await createEvent(
      { ...BASE_INPUT, startAt: '2026-10-15T09:00:00', endAt: '2026-10-15T17:00:00', timezone: 'Europe/Oslo' },
      'user1',
    );

    const { startAt, endAt } = mockPrisma.event.create.mock.calls[0][0].data;
    // Europe/Oslo is UTC+2 in October; 09:00 → 07:00 UTC, 17:00 → 15:00 UTC
    expect((startAt as Date).toISOString()).toBe('2026-10-15T07:00:00.000Z');
    expect((endAt as Date).toISOString()).toBe('2026-10-15T15:00:00.000Z');
  });

  it('stores the IANA timezone string on the event', async () => {
    mockPrisma.event.create.mockResolvedValue(makeEvent() as never);

    await createEvent({ ...BASE_INPUT, timezone: 'America/New_York' }, 'user1');

    expect(mockPrisma.event.create.mock.calls[0][0].data.timezone).toBe('America/New_York');
  });

  it('creates a venue row when venue fields are provided', async () => {
    const venueInput = { name: 'City Hall', address: '1 Main St', city: 'Oslo' };
    const venue = makeVenue();
    mockPrisma.venue.create.mockResolvedValue(venue as never);
    mockPrisma.event.create.mockResolvedValue(makeEvent({ venueId: 'v1' }) as never);

    await createEvent({ ...BASE_INPUT, venue: venueInput }, 'user1');

    expect(mockPrisma.venue.create).toHaveBeenCalledOnce();
    expect(mockPrisma.venue.create.mock.calls[0][0].data).toMatchObject({
      name: 'City Hall',
      address: '1 Main St',
      city: 'Oslo',
    });
    expect(mockPrisma.event.create.mock.calls[0][0].data.venueId).toBe('v1');
  });

  it('does not create a venue row when venue is absent', async () => {
    mockPrisma.event.create.mockResolvedValue(makeEvent() as never);

    await createEvent({ ...BASE_INPUT, venue: undefined }, 'user1');

    expect(mockPrisma.venue.create).not.toHaveBeenCalled();
    expect(mockPrisma.event.create.mock.calls[0][0].data.venueId).toBeNull();
  });

  it('does not create a venue row when all venue fields are empty strings', async () => {
    mockPrisma.event.create.mockResolvedValue(makeEvent() as never);

    await createEvent({ ...BASE_INPUT, venue: { name: '', address: '', city: '' } }, 'user1');

    expect(mockPrisma.venue.create).not.toHaveBeenCalled();
  });

  it('sets maxAttendees to null when not provided', async () => {
    mockPrisma.event.create.mockResolvedValue(makeEvent({ maxAttendees: null }) as never);

    const { maxAttendees: _, ...inputWithoutMax } = BASE_INPUT;
    await createEvent(inputWithoutMax, 'user1');

    expect(mockPrisma.event.create.mock.calls[0][0].data.maxAttendees).toBeNull();
  });

  it('sets description to null when not provided', async () => {
    mockPrisma.event.create.mockResolvedValue(makeEvent({ description: null }) as never);

    const { description: _, ...inputWithoutDesc } = BASE_INPUT;
    await createEvent(inputWithoutDesc, 'user1');

    expect(mockPrisma.event.create.mock.calls[0][0].data.description).toBeNull();
  });

  it('throws EndBeforeStartError when endAt is before startAt', async () => {
    await expect(
      createEvent(
        { ...BASE_INPUT, startAt: '2026-08-01T18:00:00', endAt: '2026-08-01T14:00:00', timezone: 'UTC' },
        'user1',
      ),
    ).rejects.toBeInstanceOf(EndBeforeStartError);

    expect(mockPrisma.event.create).not.toHaveBeenCalled();
    expect(mockPrisma.venue.create).not.toHaveBeenCalled();
  });

  it('throws EndBeforeStartError when endAt equals startAt', async () => {
    await expect(
      createEvent(
        { ...BASE_INPUT, startAt: '2026-08-01T14:00:00', endAt: '2026-08-01T14:00:00', timezone: 'UTC' },
        'user1',
      ),
    ).rejects.toBeInstanceOf(EndBeforeStartError);
  });

  it('propagates Prisma errors from event creation', async () => {
    mockPrisma.event.create.mockRejectedValue(new Error('DB error'));

    await expect(createEvent(BASE_INPUT, 'user1')).rejects.toThrow('DB error');
  });
});
