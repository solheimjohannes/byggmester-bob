import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    venue: { create: vi.fn() },
    event: { update: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { updateEvent, updateEventSchema } from './updateEvent';
import { EndBeforeStartError } from './createEvent';

const mockPrisma = vi.mocked(prisma, true);

const BASE_INPUT = {
  title: 'Summer Gala Updated',
  description: 'An updated outdoor event',
  startAt: '2026-08-01T14:00:00',
  endAt: '2026-08-01T18:00:00',
  timezone: 'Europe/Oslo',
  maxAttendees: 100,
  visibility: 'public' as const,
};

function makeEvent(overrides = {}) {
  return {
    id: 'e1',
    title: 'Summer Gala Updated',
    description: 'An updated outdoor event',
    startAt: new Date('2026-08-01T12:00:00Z'),
    endAt: new Date('2026-08-01T16:00:00Z'),
    timezone: 'Europe/Oslo',
    venueId: null,
    venue: null,
    visibility: 'public',
    inviteToken: null,
    maxAttendees: 100,
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
// updateEventSchema validation
// ---------------------------------------------------------------------------

describe('updateEventSchema', () => {
  it('accepts a fully populated valid payload', () => {
    expect(() =>
      updateEventSchema.parse({
        ...BASE_INPUT,
        venue: { name: 'City Hall', address: '1 Main St', city: 'Oslo' },
      }),
    ).not.toThrow();
  });

  it('rejects missing title', () => {
    expect(() => updateEventSchema.parse({ ...BASE_INPUT, title: undefined })).toThrow();
  });

  it('rejects blank title', () => {
    expect(() => updateEventSchema.parse({ ...BASE_INPUT, title: '' })).toThrow();
  });

  it('rejects invalid visibility', () => {
    expect(() => updateEventSchema.parse({ ...BASE_INPUT, visibility: 'restricted' })).toThrow();
  });

  it('rejects zero maxAttendees', () => {
    expect(() => updateEventSchema.parse({ ...BASE_INPUT, maxAttendees: 0 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// updateEvent — happy path
// ---------------------------------------------------------------------------

describe('updateEvent', () => {
  it('updates and returns the event with venue included', async () => {
    const event = makeEvent();
    mockPrisma.event.update.mockResolvedValue(event as never);

    const result = await updateEvent('e1', BASE_INPUT);

    expect(result).toEqual(event);
    expect(mockPrisma.event.update).toHaveBeenCalledOnce();
    const call = mockPrisma.event.update.mock.calls[0][0];
    expect(call.where).toEqual({ id: 'e1' });
    expect(call.data.title).toBe('Summer Gala Updated');
    expect(call.data.startAt).toBeInstanceOf(Date);
    expect(call.data.endAt).toBeInstanceOf(Date);
    expect(call.include).toEqual({ venue: true });
  });

  it('converts startAt/endAt from timezone to UTC', async () => {
    mockPrisma.event.update.mockResolvedValue(makeEvent() as never);

    await updateEvent('e1', {
      ...BASE_INPUT,
      startAt: '2026-10-15T09:00:00',
      endAt: '2026-10-15T17:00:00',
      timezone: 'Europe/Oslo',
    });

    const { startAt, endAt } = mockPrisma.event.update.mock.calls[0][0].data;
    // Europe/Oslo is UTC+2 in October; 09:00 → 07:00 UTC, 17:00 → 15:00 UTC
    expect((startAt as Date).toISOString()).toBe('2026-10-15T07:00:00.000Z');
    expect((endAt as Date).toISOString()).toBe('2026-10-15T15:00:00.000Z');
  });

  it('creates a new venue row when venue fields are provided', async () => {
    const venue = { id: 'v2', name: 'New Venue', address: '2 Other St', city: 'Bergen' };
    mockPrisma.venue.create.mockResolvedValue(venue as never);
    mockPrisma.event.update.mockResolvedValue(makeEvent({ venueId: 'v2' }) as never);

    await updateEvent('e1', {
      ...BASE_INPUT,
      venue: { name: 'New Venue', address: '2 Other St', city: 'Bergen' },
    });

    expect(mockPrisma.venue.create).toHaveBeenCalledOnce();
    expect(mockPrisma.event.update.mock.calls[0][0].data.venueId).toBe('v2');
  });

  it('sets venueId to null when venue is not provided', async () => {
    mockPrisma.event.update.mockResolvedValue(makeEvent() as never);

    await updateEvent('e1', { ...BASE_INPUT, venue: undefined });

    expect(mockPrisma.venue.create).not.toHaveBeenCalled();
    expect(mockPrisma.event.update.mock.calls[0][0].data.venueId).toBeNull();
  });

  it('sets maxAttendees to null when not provided', async () => {
    mockPrisma.event.update.mockResolvedValue(makeEvent({ maxAttendees: null }) as never);

    const { maxAttendees: _, ...inputWithoutMax } = BASE_INPUT;
    await updateEvent('e1', inputWithoutMax);

    expect(mockPrisma.event.update.mock.calls[0][0].data.maxAttendees).toBeNull();
  });

  it('throws EndBeforeStartError when endAt is before startAt', async () => {
    await expect(
      updateEvent('e1', {
        ...BASE_INPUT,
        startAt: '2026-08-01T18:00:00',
        endAt: '2026-08-01T14:00:00',
        timezone: 'UTC',
      }),
    ).rejects.toBeInstanceOf(EndBeforeStartError);

    expect(mockPrisma.event.update).not.toHaveBeenCalled();
  });

  it('throws EndBeforeStartError when endAt equals startAt', async () => {
    await expect(
      updateEvent('e1', {
        ...BASE_INPUT,
        startAt: '2026-08-01T14:00:00',
        endAt: '2026-08-01T14:00:00',
        timezone: 'UTC',
      }),
    ).rejects.toBeInstanceOf(EndBeforeStartError);
  });

  it('propagates Prisma errors', async () => {
    mockPrisma.event.update.mockRejectedValue(new Error('DB error'));

    await expect(updateEvent('e1', BASE_INPUT)).rejects.toThrow('DB error');
  });
});
