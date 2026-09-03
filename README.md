# Event Application

A full-stack event planning application. Users can browse events, create events, view event details, join/leave events, and view participants. AI-powered features will be added via Claude Sonnet 4.6 through Microsoft Foundry.

## Architecture

```
/
├── frontend/    # React + Vite SPA (port 5173)
├── backend/     # Node.js + Express REST API (port 3001)
└── docs/        # Project documentation
```

The frontend and backend are independent services. The frontend communicates with the backend via REST.

## Prerequisites

- [Node.js](https://nodejs.org/) v18 or later
- npm v9 or later

## Getting started

### Backend

```bash
cd backend
cp .env.example .env
npm install
npm run dev       # development with ts-node (port 3001)
```

To build for production:

```bash
npm run build     # compiles TypeScript → dist/
npm start         # runs compiled output
```

Health check: `GET http://localhost:3001/health`

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev       # development server (port 5173)
```

To build for production:

```bash
npm run build
npm run preview
```

## MVP demo mode

The app currently runs with a mock session and mock data for demo purposes.

To revert to real auth and backend:
1. Search for `TODO: MOCK SESSION` and restore real session calls
2. Search for `TODO: MOCK DATA` and restore real query imports
3. Ensure `DATABASE_URL` and `SESSION_SECRET` are set in `backend/.env`

## Environment variables

| File | Variable | Description |
|------|----------|-------------|
| `backend/.env` | `PORT` | HTTP port (default: `3001`) |
| `backend/.env` | `NODE_ENV` | `development` or `production` |

See each directory's `.env.example` for a full list.

## Ports

| Service | Port |
|---------|------|
| Backend | 3001 |
| Frontend | 5173 |
