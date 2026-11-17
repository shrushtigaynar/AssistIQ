# AssistIQ

AssistIQ is an AI-assisted email triage workspace for executive assistants and their clients. It separates assistant-owned work from conversations that need a client's personal decision, while keeping both portals synchronized through one MongoDB-backed API.

## What it does

- **Assistant Portal** — inbox triage, responsibility overrides, conversation history, internal notes, AI summaries and questions, reply drafts, action items, follow-ups, meetings, and preferences.
- **Client Portal** — a focused inbox for client-response conversations, with review, response, handled/reopen, delegation, and draft-approval workflows.
- **Human approval** — generated replies remain drafts. Sending is simulated and requires an explicit confirmation; no external email is sent.
- **AI transparency** — Gemini is optional and backend-only. If it is unavailable or unconfigured, deterministic results are labeled **Rule-Based Demo Processing**.
- **Simulated integrations** — Gmail, Outlook, and calendar connections are not live integrations.

## Technology

- React 18, Vite, JavaScript, Tailwind CSS, React Router, Radix UI, and Lucide React
- Node.js, Express, and Mongoose
- MongoDB Atlas (required by the supplied environment configuration)
- Google Gemini API (optional, server-side only)

## Project structure

```text
client/
  src/
    portals/       Assistant and Client Portal screens
    services/      Authenticated API client
    components/    Shared UI components
  .env.example     Frontend API URL placeholder
server/
  src/
    config/        MongoDB connection
    controllers/   HTTP handlers
    middleware/    Request error handling
    models/        Mongoose schemas
    routes/        Role-protected API routes
    services/      AI, portal, conversation, and workspace logic
  test/            Node test-runner suites
  .env.example     Backend-only configuration placeholders
AGENTS.md           Product and architecture guidelines
```

## Architecture and data flow

The Vite client calls the Express API using the backend URL configured by `VITE_API_URL`. Portal tokens are stored separately in the browser and sent as Bearer tokens. The API resolves each token to a role-specific user and protects assistant and client routes independently.

MongoDB Atlas is the shared source of truth. Conversation messages, notes, drafts, action items, meetings, follow-up state, and audit entries are embedded in the `Thread` document. User preferences are stored on `User`; simulated account status is stored on `EmailAccount`. The legacy standalone `Message`, `Draft`, `ActionItem`, `InternalNote`, and `ActivityLog` models are not alternate sources for these embedded workflows.

Client polling refreshes shared records without WebSockets. Client access is scoped to the authenticated client's ownership/recipient relationship, and assistant-only notes and activity are omitted from client responses.

## Classification and AI workflow

Conversations are assigned one responsibility classification:

- `ASSISTANT_REPLY`
- `CLIENT_REPLY`
- `NO_REPLY_NEEDED`
- `NEEDS_REVIEW`

Analysis uses the available message history. Model confidence is an estimate, not a calibrated probability; results below `AI_CONFIDENCE_THRESHOLD` become `NEEDS_REVIEW`. Manual classifications and user-edited task/meeting data are retained through reanalysis. Date text that cannot be safely normalized remains visible as source text and is excluded from machine-based overdue/meeting comparisons.

Gemini requests include conversation content, which is sent to Google's API when `GEMINI_API_KEY` is configured. Do not configure that key if this data flow is not acceptable. The key must remain in `server/.env`, never in a `VITE_` variable. Without a usable Gemini response, fallback output is labeled **Rule-Based Demo Processing**.

## MongoDB Atlas setup

1. Create an Atlas database user and allow the backend host's IP address in Atlas Network Access.
2. Copy `server/.env.example` to `server/.env`.
3. Replace the MongoDB URI placeholder with the Atlas connection URI. URL-encode special characters in the database password.
4. Keep `MONGODB_REQUIRED=true`. Startup fails if the URI is missing or the database cannot be reached; required mode does not route data to the local JSON store.
5. Set distinct high-entropy values for `ASSISTANT_PORTAL_TOKEN` and `CLIENT_PORTAL_TOKEN`.
6. Optionally add `GEMINI_API_KEY` and adjust `AI_CONFIDENCE_THRESHOLD` (default `0.75`).

Backend variables:

| Variable | Purpose |
| --- | --- |
| `PORT` | Express port (default `5000`) |
| `NODE_ENV` | Runtime mode |
| `CLIENT_URL` | Allowed frontend origin(s), comma-separated if needed |
| `MONGODB_URI` | MongoDB Atlas URI; keep secret |
| `MONGODB_REQUIRED` | Keep `true` to fail closed without MongoDB |
| `ASSISTANT_PORTAL_TOKEN`, `CLIENT_PORTAL_TOKEN` | Separate private Bearer tokens |
| `ASSISTANT_EMAIL`, `ASSISTANT_NAME`, `CLIENT_EMAIL`, `CLIENT_NAME` | Role identity defaults |
| `ENABLE_DEMO_RESET` | Defaults to `false`; reset is available only when explicitly enabled in development |
| `GEMINI_API_KEY` | Optional private Gemini credential |
| `GEMINI_MODEL` | Gemini model name |
| `GEMINI_TIMEOUT_MS` | Provider timeout in milliseconds |
| `AI_CONFIDENCE_THRESHOLD` | Review threshold from `0` to `1` |

Frontend variable:

| Variable | Purpose |
| --- | --- |
| `VITE_API_URL` | Express API base URL (default `http://localhost:5000`) |

Never put database credentials, AI keys, or portal tokens in frontend environment variables. `.gitignore` excludes local environment files while allowing the `.env.example` templates.

## Install, run, and test

Use separate terminals from the project root:

```powershell
npm --prefix server install
npm --prefix client install
npm run dev:server
npm run dev:client
```

Open `http://localhost:5173`. The server starts at `http://localhost:5000`; `GET /api/health` reports `MONGODB_LIVE` only while the Mongoose connection is live.

```powershell
npm --prefix server test
npm run build
```

To run the production client bundle locally after building:

```powershell
npm run preview
```

The development seed reset replaces all conversations and is disabled by default. Only enable `ENABLE_DEMO_RESET=true` in a disposable development database, and use the UI confirmation. Never use it against real or shared data. The seed command is also destructive under that explicit opt-in.

## API overview

All assistant endpoints require the assistant Bearer token; `/api/client/*` requires the client token.

- `GET /api/health` — service and database status
- `POST /api/auth/session` — validate a portal token and return role identity
- `/api/threads` and `/api/conversations` — assistant inbox, history, status, notes, drafts, actions, and audit data
- `/api/ai` — analyze/reanalyze, retrieve analysis, generate summaries/drafts, extract actions/meetings, and ask conversation questions
- `/api/workspace` — action items, follow-ups, meetings, dashboard overview, and assistant settings
- `/api/client` — profile, attention inbox, client conversation actions, responses, and draft decisions
- `/api/email-accounts` — read simulated account status; live connection changes are not supported

See [server/README.md](./server/README.md) for the AI and workspace endpoint details.

## Demonstration flow

Use clearly identified sample data and disposable Atlas records:

1. Sign in to the Assistant Portal and review live inbox counts.
2. Open a conversation, inspect its original messages and AI summary/classification source.
3. Generate or edit a reply draft and save it.
4. Use the explicit confirmation to record a simulated send; no email leaves AssistIQ.
5. Create or update an action item or follow-up and verify its status in the workspace.
6. Sign in to the Client Portal with the separate client token and open an assigned attention item.
7. Delegate it with an instruction or record a confirmed simulated response.
8. Return to the Assistant Portal and confirm the shared record and audit history updated.

## Known limitations

- Gmail, Outlook, SMTP, and calendar integrations are simulated and do not synchronize external accounts.
- Gemini behavior requires a valid server-side key and reachable provider; without it, only the labeled deterministic fallback is used.
- Natural-language dates without an explicit, unambiguous date/timezone are displayed but not used for overdue or upcoming calculations.
- API tokens are a local prototype authentication mechanism, not a complete user-management or credential-rotation system.
- No production deployment is performed or included in this development phase.

## Deployment preparation (Vercel + Render)

Deployment is not performed by this repository. Do not commit credentials or local `.env` files. The Vercel project should use the `client` directory as its root; the Render Blueprint is at `render.yaml` and deploys the `server` directory.

### Configure Vercel

1. Import the repository into Vercel and set **Root Directory** to `client`.
2. Keep the commands from `client/vercel.json`: install with `npm ci`, build with `npm run build`, and publish `dist`.
3. Assign the production domain before deploying and add this Production environment variable:
   - `VITE_API_URL` — the Render service's HTTPS base URL, for example `https://assistiq-api.onrender.com` (no trailing slash or `/api` path).
4. Trigger a new build after changing `VITE_API_URL`. Production builds fail if it is missing, non-HTTPS, or points to localhost.

`VITE_API_URL` is public client configuration, not a secret. Do not put database credentials, portal tokens, or the Gemini key in Vercel.

### Configure Render

1. Create a Render Blueprint from the repository root using `render.yaml`. It defines a Node web service rooted at `server`, uses `npm ci` and `npm start`, and relies on Render's injected `PORT`.
2. Enter all Blueprint `sync: false` values before the first deployment:
   - `MONGODB_URI` — the existing Atlas connection URI.
   - `CLIENT_URL` — the exact Vercel production origin, e.g. `https://assistiq.vercel.app`, with no path or trailing slash. Multiple explicitly approved HTTPS origins may be comma-separated.
   - `ASSISTANT_PORTAL_TOKEN` and `CLIENT_PORTAL_TOKEN` — separate random values of at least 32 characters.
   - `ASSISTANT_EMAIL`, `ASSISTANT_NAME`, `CLIENT_EMAIL`, and `CLIENT_NAME` — the production portal identities.
3. Keep `NODE_ENV=production` and `MONGODB_REQUIRED=true`. `ENABLE_DEMO_RESET` is disabled by the Blueprint. Do not set `MONGODB_REQUIRED=false`.
4. Optionally add `GEMINI_API_KEY` in Render only to enable Gemini. Without it, AssistIQ uses its labeled rule-based fallback. Never add it as a `VITE_` variable.
5. In Atlas Network Access, allow the backend host's required egress. Use a dedicated database user with only `readWrite` on the AssistIQ database; do not use `readWriteAnyDatabase` or unrestricted network access.

The shared browser URLs in development are not production CORS origins. The actual Vercel domain was not provided; set `CLIENT_URL` only after choosing that domain. The production backend refuses to start when required variables are missing, tokens are identical/too short, MongoDB is not required, or `CLIENT_URL` is not an exact HTTPS origin.

### Pre-deployment verification and rollback

After both host URLs and variables are configured, but before serving real traffic:

1. Build the client with the actual Render URL in `VITE_API_URL`.
2. Check Render's `/api/health` reports `MONGODB_LIVE`.
3. Verify assistant and client sessions and cross-portal access boundaries using their separate credentials.
4. Confirm Atlas backups/PITR are enabled in the Atlas project and perform or document a restore test. Application database credentials cannot verify Atlas backup policy.
5. Keep the previous Vercel and Render releases available for application rollback. For database recovery, use the verified Atlas backup/PITR process; no destructive database migration is part of this deployment preparation.

No hosting project, production variable, Atlas setting, or deployment is changed by these instructions.
