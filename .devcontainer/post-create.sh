#!/bin/bash
# Runs once after the devcontainer is first created.
# By this point the postgres service is already healthy (depends_on condition).
set -euo pipefail

WORKSPACE="/workspaces/byggmester-bob"

echo "==> Generating env files..."
bash "${WORKSPACE}/.devcontainer/setup-env.sh"

echo "==> Installing backend dependencies..."
cd "${WORKSPACE}/backend" && npm install

echo "==> Installing frontend dependencies..."
cd "${WORKSPACE}/frontend" && npm install

echo "==> Running database migrations..."
cd "${WORKSPACE}/backend" && npx prisma migrate deploy

echo ""
echo "Setup complete. Start the dev servers:"
echo "  Terminal 1 — backend:  cd backend && npm run dev"
echo "  Terminal 2 — frontend: cd frontend && npm run dev"
