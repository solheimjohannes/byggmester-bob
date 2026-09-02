import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('bcryptjs', () => ({
  default: {
    hash: vi.fn(),
    compare: vi.fn(),
  },
}));

import { prisma } from '../lib/prisma';
import bcrypt from 'bcryptjs';
import { createUser, verifyCredentials, getUserById, EmailTakenError, registerSchema } from './service';

const mockPrisma = vi.mocked(prisma, true);
const mockBcrypt = vi.mocked(bcrypt, true);

function makeUser(overrides = {}) {
  return {
    id: 'user1',
    email: 'alice@example.com',
    name: 'Alice',
    image: null,
    hashedPassword: 'hashed-pw',
    bio: null,
    emailVerified: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

beforeEach(() => {
  vi.resetAllMocks();
});

// ---------------------------------------------------------------------------
// registerSchema validation
// ---------------------------------------------------------------------------

describe('registerSchema', () => {
  it('accepts valid email and password', () => {
    expect(() => registerSchema.parse({ email: 'a@b.com', password: '12345678' })).not.toThrow();
  });

  it('rejects password shorter than 8 characters', () => {
    expect(() => registerSchema.parse({ email: 'a@b.com', password: 'short' })).toThrow();
  });

  it('rejects invalid email', () => {
    expect(() => registerSchema.parse({ email: 'not-an-email', password: '12345678' })).toThrow();
  });

  it('accepts optional name', () => {
    expect(() => registerSchema.parse({ name: 'Alice', email: 'a@b.com', password: '12345678' })).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// createUser
// ---------------------------------------------------------------------------

describe('createUser', () => {
  it('creates a user and returns safe fields', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);
    mockBcrypt.hash.mockResolvedValue('hashed' as never);
    const created = { id: 'u1', email: 'alice@example.com', name: 'Alice', image: null };
    mockPrisma.user.create.mockResolvedValue(created as never);

    const result = await createUser({ email: 'alice@example.com', password: 'password123', name: 'Alice' });

    expect(result).toEqual(created);
    expect(mockBcrypt.hash).toHaveBeenCalledWith('password123', 12);
    expect(mockPrisma.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: 'alice@example.com', hashedPassword: 'hashed' }),
      }),
    );
  });

  it('throws EmailTakenError when email is already registered', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(
      createUser({ email: 'alice@example.com', password: 'password123' }),
    ).rejects.toBeInstanceOf(EmailTakenError);

    expect(mockPrisma.user.create).not.toHaveBeenCalled();
  });

  it('does not hash the password when email is already taken', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());

    await expect(createUser({ email: 'alice@example.com', password: 'password123' })).rejects.toThrow();

    expect(mockBcrypt.hash).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// verifyCredentials
// ---------------------------------------------------------------------------

describe('verifyCredentials', () => {
  it('returns user when credentials are valid', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockBcrypt.compare.mockResolvedValue(true as never);

    const result = await verifyCredentials('alice@example.com', 'correct-password');

    expect(result).toEqual({ id: 'user1', email: 'alice@example.com', name: 'Alice', image: null });
  });

  it('returns null for wrong password', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser());
    mockBcrypt.compare.mockResolvedValue(false as never);

    const result = await verifyCredentials('alice@example.com', 'wrong-password');

    expect(result).toBeNull();
  });

  it('returns null when user does not exist', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await verifyCredentials('nobody@example.com', 'password123');

    expect(result).toBeNull();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });

  it('returns null when user has no hashedPassword (OAuth-only account)', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(makeUser({ hashedPassword: null }));

    const result = await verifyCredentials('alice@example.com', 'password123');

    expect(result).toBeNull();
    expect(mockBcrypt.compare).not.toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// getUserById
// ---------------------------------------------------------------------------

describe('getUserById', () => {
  it('returns safe user fields by id', async () => {
    const safe = { id: 'user1', email: 'alice@example.com', name: 'Alice', image: null };
    mockPrisma.user.findUnique.mockResolvedValue(safe as never);

    const result = await getUserById('user1');

    expect(result).toEqual(safe);
    expect(mockPrisma.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: 'user1' } }),
    );
  });

  it('returns null when user not found', async () => {
    mockPrisma.user.findUnique.mockResolvedValue(null);

    const result = await getUserById('nonexistent');

    expect(result).toBeNull();
  });
});
