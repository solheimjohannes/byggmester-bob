import { PrismaClient, EventVisibility, EventStatus } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'admin@example.com' },
    update: {},
    create: {
      id: 'seed-user-1',
      email: 'admin@example.com',
      name: 'Admin User',
    },
  })

  const venue = await prisma.venue.upsert({
    where: { id: 'seed-venue-1' },
    update: {},
    create: {
      id: 'seed-venue-1',
      name: 'Oslo Conference Center',
      address: 'Youngstorget 1',
      city: 'Oslo',
    },
  })

  // Public event with a capacity cap — tests the maxAttendees enforcement path
  await prisma.event.upsert({
    where: { id: 'seed-event-1' },
    update: {},
    create: {
      id: 'seed-event-1',
      title: 'React & TypeScript Workshop',
      description: 'A hands-on workshop covering modern React patterns with TypeScript.',
      startAt: new Date('2026-10-15T09:00:00Z'),
      endAt: new Date('2026-10-15T17:00:00Z'),
      timezone: 'Europe/Oslo',
      venueId: venue.id,
      visibility: EventVisibility.public,
      maxAttendees: 50,
      status: EventStatus.published,
      createdById: user.id,
    },
  })

  // Public event with unlimited capacity
  await prisma.event.upsert({
    where: { id: 'seed-event-2' },
    update: {},
    create: {
      id: 'seed-event-2',
      title: 'Oslo Tech Meetup',
      description: 'Monthly gathering of Oslo tech enthusiasts. All are welcome!',
      startAt: new Date('2026-10-22T18:00:00Z'),
      endAt: new Date('2026-10-22T21:00:00Z'),
      timezone: 'Europe/Oslo',
      venueId: venue.id,
      visibility: EventVisibility.public,
      maxAttendees: null,
      status: EventStatus.published,
      createdById: user.id,
    },
  })

  // Private event — only reachable via inviteToken; excluded from public listings
  await prisma.event.upsert({
    where: { id: 'seed-event-3' },
    update: {},
    create: {
      id: 'seed-event-3',
      title: 'Private Board Retreat',
      description: 'Invite-only strategy session.',
      startAt: new Date('2026-11-05T10:00:00Z'),
      endAt: new Date('2026-11-05T16:00:00Z'),
      timezone: 'Europe/Oslo',
      venueId: venue.id,
      visibility: EventVisibility.private,
      inviteToken: 'tok_retreat_2026_seed',
      maxAttendees: 20,
      status: EventStatus.published,
      createdById: user.id,
    },
  })

  console.log('Seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
