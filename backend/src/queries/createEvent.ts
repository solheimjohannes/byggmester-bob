import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { prisma } from '../lib/prisma';

export const createEventSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().max(10000).optional(),
  startAt: z.string().min(1, 'startAt is required'),
  endAt: z.string().min(1, 'endAt is required'),
  timezone: z.string().min(1, 'timezone is required'),
  venue: z
    .object({
      name: z.string().max(200).optional(),
      address: z.string().max(500).optional(),
      city: z.string().max(100).optional(),
    })
    .optional(),
  maxAttendees: z.number().int().positive().optional(),
  visibility: z.enum(['public', 'private']),
});

export type CreateEventInput = z.infer<typeof createEventSchema>;

export class EndBeforeStartError extends Error {
  readonly code = 'END_BEFORE_START';
  constructor() {
    super('endAt must be after startAt');
  }
}

export async function createEvent(input: CreateEventInput, createdById: string) {
  const { title, description, startAt: startAtStr, endAt: endAtStr, timezone, venue, maxAttendees, visibility } =
    input;

  const startAt = fromZonedTime(startAtStr, timezone);
  const endAt = fromZonedTime(endAtStr, timezone);

  if (endAt <= startAt) {
    throw new EndBeforeStartError();
  }

  let venueId: string | null = null;
  if (venue && (venue.name || venue.address || venue.city)) {
    const created = await prisma.venue.create({
      data: {
        name: venue.name ?? null,
        address: venue.address ?? null,
        city: venue.city ?? null,
      },
    });
    venueId = created.id;
  }

  return prisma.event.create({
    data: {
      title,
      description: description ?? null,
      startAt,
      endAt,
      timezone,
      venueId,
      maxAttendees: maxAttendees ?? null,
      visibility,
      status: 'draft',
      createdById,
    },
    include: { venue: true },
  });
}
