# Hack Club Hackathons Map

Visualize Hack Club hackathon data from Airtable on a 3D globe using Globe.GL. The app is fully Dockerized (backend + frontend) and ready to deploy to Coolify or run locally with a single command.

## Features

- Globe views
   - Bars: bar height scales with attendees; color by type
      - Scrapyard = green
      - Counterspell = purple
      - Daydream = blue
   - Heatmap: aggregated density (brighter = more attendees)
   - Toggle between Bars and Heatmap from the UI or via URL params
- Interaction
   - Auto-rotates when idle; rotation pauses while hovering over bars/points
   - Hover labels show name and attendees (when available)
   - Filter visibility and sizing for Daydream from the UI or via URL params
- Backend API with caching
   - Node.js/Express server proxies Airtable and caches responses in-memory for 10 minutes to reduce API calls
- Dockerized for simple local run and Coolify deployment

## Quick start (Docker Compose)

1. Create backend environment file at `backend/.env`:

```bash
AIRTABLE_API_KEY=your_airtable_api_key
AIRTABLE_BASE_ID=appXXXXXXXXXXXXXX
AIRTABLE_TABLE_NAME=Table1
```

1. Start everything:

```bash
docker-compose up --build -d
```

1. Open the app: <http://localhost:3000>

### URL parameters

You can control the initial view and Daydream behavior via URL query params (the UI keeps the URL in sync without reloads):

- `view`: `bars` | `heatmap`
   - Example: `?view=heatmap`
- `showDaydream`: `true|false` (default `true`)
   - Example: `?showDaydream=false` (hides Daydream events entirely)
- `useProjected`: `true|false` (default `false`) — when `true`, Daydream uses Airtable’s attendees count for heights/weights; when `false`, Daydream counts are treated as 1
   - Example: `?useProjected=true`

Combine them as needed: `?view=bars&showDaydream=false&useProjected=true`

## Architecture

- Backend: `backend/` (Node.js + Express)
   - Endpoint: `GET /api/records`
   - Returns JSON array of records: `{ name, lat, lng, type, attendees }`
   - Caching: in-memory for 10 minutes (reduces Airtable API usage)
- Frontend: `frontend/` (React + Globe.GL)
   - Default Bars view; toggle Heatmap view via top-right buttons or `?view=heatmap`
   - Daydream controls:
      - Visibility: `?showDaydream=true|false` (also a UI checkbox)
      - Sizing toggle: `?useProjected=true|false` (also a UI checkbox labelled “Use Daydream attendees”)
   - Uses `REACT_APP_API_BASE` when present; in Docker Compose it points to `http://backend:4000`

### Sample API response

```json
[
   {
      "name": "Scrapyard Vancouver",
      "lat": 49.2488091,
      "lng": -122.9805104,
      "type": "Scrapyard",
      "attendees": 107
   },
   {
      "name": "Daydream London",
      "lat": 52.1828,
      "lng": 0.14605,
      "type": "Daydream",
      "attendees": 1
   }
]
```

Notes:

- `lat`/`lng`/`attendees` are normalized to numbers by the backend; missing `attendees` defaults to `1` so it still renders.
- Daydream sizing semantics:
   - When “Use Daydream attendees” is OFF or `?useProjected=false`, Daydream count is treated as `1`.
   - When ON or `?useProjected=true`, Daydream count uses Airtable’s `attendees` field.

## Deploying to Coolify

You can deploy the whole stack using this repo’s `docker-compose.yml`:

- Add a new “Compose” application in Coolify and point it at this repository
- Set environment variables for the backend service (under the service’s Environment tab):
   - `AIRTABLE_API_KEY`
   - `AIRTABLE_BASE_ID`
   - `AIRTABLE_TABLE_NAME`
- Expose ports:
   - Frontend: 3000 (public)
   - Backend: 4000 (can be internal/private if the frontend communicates within the network)

### Frontend calling backend via public domain

Because the frontend is a static build, the API base URL is baked at build time. If your frontend and backend have separate public domains in Coolify (e.g.,

- Backend: `https://ewcs4wskc8c08ookkocssg84.a.selfhosted.hackclub.com`
- Frontend: `https://agsc8g8g88c8ows4ok0s84ck.a.selfhosted.hackclub.com`

build the frontend with `REACT_APP_API_BASE` pointing to the backend’s public URL. You can pass this as a build arg via Compose:

```yaml
services:
   frontend:
      build:
         context: ./frontend
         args:
            REACT_APP_API_BASE: https://ewcs4wskc8c08ookkocssg84.a.selfhosted.hackclub.com
```

Alternatively, if both services share an internal network and you expose only the frontend publicly, you can keep the default `http://backend:4000` and let Coolify handle internal routing.

## Troubleshooting

- No data on globe
   - Check the backend is reachable: `curl http://localhost:4000/api/records`
   - If running frontend separately, set `REACT_APP_API_BASE` to your backend origin
- Slow Docker builds
   - Dockerfiles are optimized to cache dependencies; subsequent builds should be much faster unless `package.json` changes
- Build errors with Three.js
   - Three and Globe.GL versions are pinned for compatibility in `frontend/package.json`

## Development

- Main files to look at:
   - Backend: `backend/index.js`
   - Frontend globe UI: `frontend/src/App.js`

PRs welcome for new views (e.g., clustering) or improved legends/branding.
