import express from 'express';
import {
  getUpcomingPlansForUser,
  getRecommendedEvents,
  getFriendsEvents,
  searchEvents,
} from './queries/events';

const app = express();
const PORT = process.env.PORT ?? 3001;

app.use(express.json());

// Permissive CORS for local dev; tighten CORS_ORIGIN env var for production.
const CORS_ORIGIN = process.env.CORS_ORIGIN ?? 'http://localhost:5173';
app.use((_req, res, next) => {
  res.header('Access-Control-Allow-Origin', CORS_ORIGIN);
  res.header('Access-Control-Allow-Credentials', 'true');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Auth session — no auth layer exists yet; always returns null.
// TODO: wire up session middleware and return the authenticated User.
app.get('/api/auth/session', (_req, res) => {
  res.json(null);
});

// Upcoming plans: events the user has confirmed RSVPs for, soonest-first.
app.get('/api/plans/upcoming', async (req, res) => {
  const { userId } = req.query;
  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({ error: 'userId is required', code: 'INVALID_INPUT' });
    return;
  }
  try {
    const events = await getUpcomingPlansForUser(userId);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch upcoming plans', code: 'INTERNAL_ERROR' });
  }
});

// Recommendations: public events ranked by city affinity, excluding events the user is already attending.
app.get('/api/events/recommended', async (req, res) => {
  const { userId, limit: limitStr } = req.query;
  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({ error: 'userId is required', code: 'INVALID_INPUT' });
    return;
  }
  const limit = limitStr !== undefined ? Number(limitStr) : 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({ error: 'limit must be an integer between 1 and 100', code: 'INVALID_INPUT' });
    return;
  }
  try {
    const events = await getRecommendedEvents(userId, limit);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch recommendations', code: 'INTERNAL_ERROR' });
  }
});

// Friends' events: upcoming events the user's accepted friends are attending.
app.get('/api/events/friends', async (req, res) => {
  const { userId, limit: limitStr } = req.query;
  if (typeof userId !== 'string' || !userId) {
    res.status(400).json({ error: 'userId is required', code: 'INVALID_INPUT' });
    return;
  }
  const limit = limitStr !== undefined ? Number(limitStr) : 10;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({ error: 'limit must be an integer between 1 and 100', code: 'INVALID_INPUT' });
    return;
  }
  try {
    const events = await getFriendsEvents(userId, limit);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to fetch friends events', code: 'INTERNAL_ERROR' });
  }
});

// Event search: case-insensitive match on title, description, and venue name. Never returns private events.
app.get('/api/events/search', async (req, res) => {
  const { q, limit: limitStr } = req.query;
  if (typeof q !== 'string') {
    res.status(400).json({ error: 'q is required', code: 'INVALID_INPUT' });
    return;
  }
  const limit = limitStr !== undefined ? Number(limitStr) : 20;
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) {
    res.status(400).json({ error: 'limit must be an integer between 1 and 100', code: 'INVALID_INPUT' });
    return;
  }
  try {
    const events = await searchEvents(q, limit);
    res.json(events);
  } catch {
    res.status(500).json({ error: 'Failed to search events', code: 'INTERNAL_ERROR' });
  }
});

app.listen(PORT, () => {
  console.log(`Backend running on http://localhost:${PORT}`);
});
