import express, { type NextFunction, type Request, type Response } from 'express';
import cors from 'cors';
import session from 'express-session';
import { ZodError } from 'zod';

import {
  getUpcomingPlansForUser,
  getEventsCreatedByUser,
  getRecommendedEvents,
  getFriendsEvents,
  searchEvents,
  getPublicEvents,
} from './queries/events';

import {
  createEvent,
  createEventSchema,
  EndBeforeStartError,
} from './queries/createEvent';

import { getEvent } from './queries/getEvent';

import {
  updateEvent,
  updateEventSchema,
} from './queries/updateEvent';

import {
  registerHandler,
  loginHandler,
  logoutHandler,
  sessionHandler,
} from './auth/handlers';

const app = express();

const PORT = process.env.PORT || 3001;
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

const CORS_ORIGIN =
  process.env.CORS_ORIGIN ?? 'http://localhost:5173';

/*
 * Azure App Service sits behind a reverse proxy.
 * This allows Express to correctly recognize HTTPS requests,
 * which is important when secure cookies are enabled.
 */
if (IS_PRODUCTION) {
  app.set('trust proxy', 1);
}

/*
 * CORS
 *
 * Development:
 *   http://localhost:5173
 *
 * Production:
 *   CORS_ORIGIN environment variable in Azure App Service
 */
app.use(
  cors({
    origin: CORS_ORIGIN,
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type'],
    optionsSuccessStatus: 204,
  }),
);

app.use(express.json());

/*
 * Sessions
 *
 * Production frontend and backend are hosted on different domains:
 *
 * frontend:
 *   *.azurestaticapps.net
 *
 * backend:
 *   *.azurewebsites.net
 *
 * Therefore SameSite=None + Secure is required for the browser
 * to send the session cookie with cross-site requests.
 */
app.use(
  session({
    name: 'sid',
    secret:
      process.env.SESSION_SECRET ??
      'dev-secret-change-in-production',

    resave: false,
    saveUninitialized: false,

    cookie: {
      httpOnly: true,
      secure: IS_PRODUCTION,
      sameSite: IS_PRODUCTION ? 'none' : 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    },
  }),
);

/*
 * Health check
 */
app.get('/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

/*
 * Authentication
 */
app.get('/api/auth/session', sessionHandler);
app.post('/api/auth/register', registerHandler);
app.post('/api/auth/login', loginHandler);
app.post('/api/auth/logout', logoutHandler);

/*
 * Upcoming plans
 */
app.get('/api/plans/upcoming', async (req, res) => {
  const { userId } = req.query;

  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({
      error: 'userId is required',
      code: 'INVALID_INPUT',
    });
    return;
  }

  try {
    const events = await getUpcomingPlansForUser(userId);
    res.json(events);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch upcoming plans',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Events created by user
 */
app.get('/api/events/created', async (req, res) => {
  const { userId } = req.query;

  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({
      error: 'userId is required',
      code: 'INVALID_INPUT',
    });
    return;
  }

  try {
    const events = await getEventsCreatedByUser(userId);
    res.json(events);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch created events',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Recommended events
 */
app.get('/api/events/recommended', async (req, res) => {
  const { userId, limit: limitStr } = req.query;

  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({
      error: 'userId is required',
      code: 'INVALID_INPUT',
    });
    return;
  }

  const limit =
    limitStr !== undefined ? Number(limitStr) : 10;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    res.status(400).json({
      error: 'limit must be an integer between 1 and 100',
      code: 'INVALID_INPUT',
    });
    return;
  }

  try {
    const events = await getRecommendedEvents(
      userId,
      limit,
    );

    res.json(events);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch recommendations',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Friends' events
 */
app.get('/api/events/friends', async (req, res) => {
  const { userId, limit: limitStr } = req.query;

  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({
      error: 'userId is required',
      code: 'INVALID_INPUT',
    });
    return;
  }

  const limit =
    limitStr !== undefined ? Number(limitStr) : 10;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    res.status(400).json({
      error: 'limit must be an integer between 1 and 100',
      code: 'INVALID_INPUT',
    });
    return;
  }

  try {
    const events = await getFriendsEvents(
      userId,
      limit,
    );

    res.json(events);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch friends events',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Create event
 */
app.post('/api/events', async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  let parsed;

  try {
    parsed = createEventSchema.parse(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({
        error: e.errors[0].message,
        code: 'INVALID_INPUT',
      });
      return;
    }

    throw e;
  }

  try {
    const event = await createEvent(
      parsed,
      req.session.userId,
    );

    res.status(201).json(event);
  } catch (err) {
    if (err instanceof EndBeforeStartError) {
      res.status(400).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    throw err;
  }
});

/*
 * Browse all public events (with optional q and city filters)
 */
app.get('/api/events/public', async (req, res) => {
  const { q, city, limit: limitStr } = req.query;

  if (q !== undefined && typeof q !== 'string') {
    res.status(400).json({ error: 'q must be a string', code: 'INVALID_INPUT' });
    return;
  }

  if (city !== undefined && typeof city !== 'string') {
    res.status(400).json({ error: 'city must be a string', code: 'INVALID_INPUT' });
    return;
  }

  const limit = limitStr !== undefined ? Number(limitStr) : 50;

  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({
      error: 'limit must be an integer between 1 and 100',
      code: 'INVALID_INPUT',
    });
    return;
  }

  try {
    const events = await getPublicEvents({
      q: typeof q === 'string' ? q : undefined,
      city: typeof city === 'string' ? city : undefined,
      limit,
    });
    res.json(events);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch public events',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Search public events
 */
app.get('/api/events/search', async (req, res) => {
  const { q, limit: limitStr } = req.query;

  if (typeof q !== 'string') {
    res.status(400).json({
      error: 'q is required',
      code: 'INVALID_INPUT',
    });
    return;
  }

  const limit =
    limitStr !== undefined ? Number(limitStr) : 20;

  if (
    !Number.isInteger(limit) ||
    limit < 1 ||
    limit > 100
  ) {
    res.status(400).json({
      error: 'limit must be an integer between 1 and 100',
      code: 'INVALID_INPUT',
    });
    return;
  }

  try {
    const events = await searchEvents(q, limit);
    res.json(events);
  } catch {
    res.status(500).json({
      error: 'Failed to search events',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Get individual event
 */
app.get('/api/events/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const event = await getEvent(id);

    if (!event) {
      res.status(404).json({
        error: 'Event not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    if (
      event.visibility === 'private' &&
      req.session.userId !== event.createdById
    ) {
      res.status(404).json({
        error: 'Event not found',
        code: 'NOT_FOUND',
      });
      return;
    }

    res.json(event);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch event',
      code: 'INTERNAL_ERROR',
    });
  }
});

/*
 * Update event
 */
app.patch('/api/events/:id', async (req, res) => {
  if (!req.session.userId) {
    res.status(401).json({
      error: 'Authentication required',
      code: 'UNAUTHENTICATED',
    });
    return;
  }

  const { id } = req.params;

  let existing;

  try {
    existing = await getEvent(id);
  } catch {
    res.status(500).json({
      error: 'Failed to fetch event',
      code: 'INTERNAL_ERROR',
    });
    return;
  }

  if (!existing) {
    res.status(404).json({
      error: 'Event not found',
      code: 'NOT_FOUND',
    });
    return;
  }

  if (existing.createdById !== req.session.userId) {
    res.status(403).json({
      error: 'Forbidden',
      code: 'FORBIDDEN',
    });
    return;
  }

  let parsed;

  try {
    parsed = updateEventSchema.parse(req.body);
  } catch (e) {
    if (e instanceof ZodError) {
      res.status(400).json({
        error: e.errors[0].message,
        code: 'INVALID_INPUT',
      });
      return;
    }

    throw e;
  }

  try {
    const event = await updateEvent(id, parsed);
    res.json(event);
  } catch (err) {
    if (err instanceof EndBeforeStartError) {
      res.status(400).json({
        error: err.message,
        code: err.code,
      });
      return;
    }

    throw err;
  }
});

/*
 * Catch-all error handler
 */
app.use(
  (
    err: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction,
  ) => {
    console.error('Unhandled error:', err);

    res.status(500).json({
      error: 'Internal server error',
      code: 'INTERNAL_ERROR',
    });
  },
);

/*
 * Start server
 */
app.listen(PORT, () => {
  console.log(
    `Backend running on port ${PORT} (${IS_PRODUCTION ? 'production' : 'development'})`,
  );
});
