import { prisma } from '../lib/prisma';

export async function getEvent(id: string) {
  return prisma.event.findUnique({
    where: { id },
    include: { venue: true },
  });
}
