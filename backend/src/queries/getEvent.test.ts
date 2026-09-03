import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    event: { findUnique: vi.fn() },
  },
}));

import { prisma } from '../lib/prisma';
import { getEvent } from './getEvent';

const mockPrisma = vi.mocked(prisma, true);

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

describe('getEvent', () => {
  it('returns the event with venue when found', async () => {
    const event = makeEvent();
    mockPrisma.event.findUnique.mockResolvedValue(event as never);

    const result = await getEvent('e1');

    expect(result).toEqual(event);
    expect(mockPrisma.event.findUnique).toHaveBeenCalledOnce();
    expect(mockPrisma.event.findUnique.mock.calls[0][0]).toMatchObject({
      where: { id: 'e1' },
      include: { venue: true },
    });
  });

  it('returns null when event does not exist', async () => {
    mockPrisma.event.findUnique.mockResolvedValue(null);

    const result = await getEvent('nonexistent');

    expect(result).toBeNull();
  });

  it('includes createdById and maxAttendees in the returned event', async () => {
    const event = makeEvent({ createdById: 'user42', maxAttendees: 100 });
    mockPrisma.event.findUnique.mockResolvedValue(event as never);

    const result = await getEvent('e1');

    expect(result?.createdById).toBe('user42');
    expect(result?.maxAttendees).toBe(100);
  });

  it('propagates Prisma errors', async () => {
    mockPrisma.event.findUnique.mockRejectedValue(new Error('DB error'));

    await expect(getEvent('e1')).rejects.toThrow('DB error');
  });
});
