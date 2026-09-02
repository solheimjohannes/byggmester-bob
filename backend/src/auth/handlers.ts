import type { RequestHandler } from 'express';
import { ZodError } from 'zod';
import {
  EmailTakenError,
  createUser,
  getUserById,
  loginSchema,
  registerSchema,
  verifyCredentials,
} from './service';

export const registerHandler: RequestHandler = async (req, res) => {
  let parsed;
  try {
    parsed = registerSchema.parse(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ error: e.errors[0].message, code: 'INVALID_INPUT' });
      return;
    }
    throw e;
  }

  try {
    const user = await createUser(parsed);
    req.session.userId = user.id;
    res.status(201).json(user);
  } catch (err) {
    if (err instanceof EmailTakenError) {
      res.status(409).json({ error: err.message, code: err.code });
      return;
    }
    throw err;
  }
};

export const loginHandler: RequestHandler = async (req, res) => {
  let parsed;
  try {
    parsed = loginSchema.parse(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({ error: e.errors[0].message, code: 'INVALID_INPUT' });
      return;
    }
    throw e;
  }

  const user = await verifyCredentials(parsed.email, parsed.password);
  if (!user) {
    res.status(401).json({ error: 'Invalid email or password', code: 'INVALID_CREDENTIALS' });
    return;
  }

  req.session.userId = user.id;
  res.json(user);
};

export const logoutHandler: RequestHandler = (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('sid');
    res.json({ ok: true });
  });
};

export const sessionHandler: RequestHandler = async (req, res) => {
  if (!req.session.userId) {
    res.json(null);
    return;
  }
  const user = await getUserById(req.session.userId);
  res.json(user ?? null);
};
