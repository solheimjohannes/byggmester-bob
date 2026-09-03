import { z } from 'zod';
import { fromZonedTime } from 'date-fns-tz';
import { prisma } from '../lib/prisma';
import { EndBeforeStartError } from './createEvent';

export const updateEventSchema = z.object({
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

export type UpdateEventInput = z.infer<typeof updateEventSchema>;

export async function updateEvent(id: string, input: UpdateEventInput) {
  const { title, description, startAt: startAtStr, endAt: endAtStr, timezone, venue, maxAttendees, visibility } =
    input;

  const startAt = fromZonedTime(startAtStr, timezone);
  const endAt = fromZonedTime(endAtStr, timezone);

  if (endAt <= startAt) {
    throw new EndBeforeStartError();
  }

  // Create a new venue row when venue fields are provided (mirrors createEvent behaviour).
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

  return prisma.event.update({
    where: { id },
    data: {
      title,
      description: description ?? null,
      startAt,
      endAt,
      timezone,
      venueId,
      maxAttendees: maxAttendees ?? null,
      visibility,
    },
    include: { venue: true },
  });
}
