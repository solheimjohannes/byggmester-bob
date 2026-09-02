import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { prisma } from '../lib/prisma';

export const registerSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  email: z.string().email().max(254),
  password: z.string().min(8, 'Password must be at least 8 characters').max(128),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export class EmailTakenError extends Error {
  readonly code = 'EMAIL_TAKEN';
  constructor() { super('Email already registered'); }
}

export async function createUser(data: z.infer<typeof registerSchema>) {
  const existing = await prisma.user.findUnique({ where: { email: data.email } });
  if (existing) throw new EmailTakenError();

  const hashedPassword = await bcrypt.hash(data.password, 12);
  return prisma.user.create({
    data: { email: data.email, name: data.name ?? null, hashedPassword },
    select: { id: true, email: true, name: true, image: true },
  });
}

export async function verifyCredentials(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user?.hashedPassword) return null;
  const valid = await bcrypt.compare(password, user.hashedPassword);
  if (!valid) return null;
  return { id: user.id, email: user.email, name: user.name, image: user.image };
}

export async function getUserById(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true, image: true },
  });
}
