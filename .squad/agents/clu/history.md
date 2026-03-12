# Clu — History

## Project Context
Hockey Pong — 2D pixel art multiplayer hockey pong game. HTML5 Canvas client with Node.js/Express backend and WebSocket (ws library) multiplayer. Single-player with AI opponent, 2-player online via invite links. User: Jose Corral.

## Key Files
- `src/server/index.js` — Express + WebSocket server (port 3000)
- `src/client/` — Static client files (HTML, CSS, JS)
- `src/shared/` — Shared modules (constants, protocol, physics)
- `package.json` — Dependencies: express ^4.21.0, ws ^8.18.0

## Learnings

### Azure Infrastructure for Hockey Pong
**Date:** 2026-03-12

Created complete Azure deployment infrastructure:

**Files created:**
- `infra/main.bicep` — Azure infrastructure definition (App Service + Plan)
- `infra/main.bicepparam` — Parameter values for deployment
- `infra/README.md` — Setup guide and troubleshooting documentation
- `.github/workflows/deploy.yml` — CI/CD pipeline for infrastructure + app deployment

**Architecture decisions:**
- **App Service Plan:** Linux B1 SKU — cheapest tier with WebSocket support and alwaysOn
- **Runtime:** Node.js 20 LTS on Linux
- **Critical settings for WebSocket:**
  - `webSocketsEnabled: true` — enables WebSocket protocol upgrade
  - `http20Enabled: false` — HTTP/2 breaks WebSocket upgrade on Azure App Service
  - `alwaysOn: true` — prevents cold starts that would drop WebSocket connections
  - `WEBSITE_RUN_FROM_PACKAGE: '0'` — deploy via zip for better WebSocket compatibility
- **Startup:** `node src/server/index.js` (direct startup, no npm start wrapper)
- **Port:** Azure sets `PORT=8080`, server already uses `process.env.PORT || 3000`

**CI/CD workflow:**
- Two-job pipeline: `infra` → `deploy`
- Infrastructure job creates resource group + deploys Bicep template
- Deploy job builds app, creates zip package (src/ + node_modules), deploys to App Service
- Uses GitHub secrets: `AZURE_CREDENTIALS`, `AZURE_SUBSCRIPTION_ID`, `AZURE_RG`
- Workflow can be triggered on push to main or manually via workflow_dispatch

**Key patterns:**
- Parameterized Bicep for flexibility (SKU, location, app name, node version)
- Resource group scoped deployment (RG created by workflow if needed)
- Production-only npm install (`npm ci --omit=dev`) before packaging
- Post-deployment validation step ensures WebSockets stay enabled
