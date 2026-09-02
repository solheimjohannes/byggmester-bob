import { PrismaClient, EventVisibility, EventStatus } from '@prisma/client'

const prisma = new PrismaClient()

const seedUsers = [
  {
    id: 'seed-user-1',
    email: 'admin@example.com',
    name: 'Admin User',
    bio: null,
    image: null,
  },
  {
    id: 'seed-user-2',
    email: 'emma.larsen@example.com',
    name: 'Emma Larsen',
    bio: 'Software developer based in Oslo. Passionate about open-source projects and community-driven tech events.',
    image: 'https://multica.ai/api/attachments/01a06128-2f5b-7a6d-865e-49b2a54b415c/download',
  },
  {
    id: 'seed-user-3',
    email: 'mikkel.hansen@example.com',
    name: 'Mikkel Hansen',
    bio: 'Event manager with 8 years of experience organising conferences and meetups across Scandinavia.',
    image: 'https://multica.ai/api/attachments/01a06128-2ec4-7ce5-be0f-d8811a22d922/download',
  },
  {
    id: 'seed-user-4',
    email: 'sofia.andersen@example.com',
    name: 'Sofia Andersen',
    bio: 'UX designer and accessibility advocate. Trondheim-based, currently working on civic tech tools.',
    image: 'https://multica.ai/api/attachments/01a06128-2ee9-779e-9235-62c887bfc3d6/download',
  },
  {
    id: 'seed-user-5',
    email: 'lars.nilsson@example.com',
    name: 'Lars Nilsson',
    bio: 'Product manager in the energy sector. Enjoys hiking, board games, and local startup events in Stavanger.',
    image: 'https://multica.ai/api/attachments/01a06128-2ee9-780d-8ce6-48d29ae42573/download',
  },
  {
    id: 'seed-user-6',
    email: 'astrid.berg@example.com',
    name: 'Astrid Berg',
    bio: 'Community organiser and volunteer coordinator. Brings people together through cultural events in Tromsø.',
    image: 'https://multica.ai/api/attachments/01a06128-2ec4-7d3e-8b4d-c4e10af1e1ca/download',
  },
  {
    id: 'seed-user-7',
    email: 'jakob.dahl@example.com',
    name: 'Jakob Dahl',
    bio: 'Data scientist specialising in natural language processing. PhD candidate, regular speaker at tech meetups.',
    image: 'https://multica.ai/api/attachments/01a06128-2ec2-78f5-beb6-72feadcd1211/download',
  },
  {
    id: 'seed-user-8',
    email: 'ingrid.bakke@example.com',
    name: 'Ingrid Bakke',
    bio: 'Marketing director with a background in journalism. Passionate about storytelling, live events, and good coffee.',
    image: 'https://multica.ai/api/attachments/01a06128-2ec0-766c-9ca2-068932a04f71/download',
  },
  {
    id: 'seed-user-9',
    email: 'tobias.christensen@example.com',
    name: 'Tobias Christensen',
    bio: 'Frontend developer and open-source contributor. Builds design systems and loves React, TypeScript, and craft beer.',
    image: 'https://multica.ai/api/attachments/01a06128-2e99-759b-bf42-02398f02728c/download',
  },
  {
    id: 'seed-user-10',
    email: 'maja.eriksen@example.com',
    name: 'Maja Eriksen',
    bio: 'Project manager and Agile coach. Based in Drammen, working with cross-functional teams in the public sector.',
    image: 'https://multica.ai/api/attachments/01a06128-2e98-72c3-b504-0ddfab99d66c/download',
  },
  {
    id: 'seed-user-11',
    email: 'erik.lindqvist@example.com',
    name: 'Erik Lindqvist',
    bio: 'Business analyst turned entrepreneur. Co-founder of two Oslo-based startups. Mentor at local accelerator programs.',
    image: 'https://multica.ai/api/attachments/01a06128-2e99-7076-a422-3cdc9bb45984/download',
  },
]

async function main() {
  for (const userData of seedUsers) {
    await prisma.user.upsert({
      where: { id: userData.id },
      update: {},
      create: userData,
    })
  }

  const adminUser = seedUsers[0]

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
      createdById: adminUser.id,
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
      createdById: adminUser.id,
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
      createdById: adminUser.id,
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
