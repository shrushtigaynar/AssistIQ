# AssistIQ API and AI

## Run locally

1. Copy `.env.example` to `.env` and replace the Atlas `MONGODB_URI` placeholder.
2. Optionally set `GEMINI_API_KEY`. The key is read only by the backend.
3. From the repository root, run `npm run dev:server` and `npm run dev:client`.
4. Run backend checks with `npm --prefix server test`; build the frontend with `npm run build`.

`MONGODB_REQUIRED=true` is the required configuration. The backend fails at startup if the URI is missing or unavailable; it does not switch to the local persistent store in this mode. A local-store fallback requires explicitly setting `MONGODB_REQUIRED=false`.

Without a Gemini key, or when Gemini times out or returns an unusable response, AI operations use deterministic rules or a conservative reply template. The response metadata and UI identify this as `Rule-Based Demo Processing`; it is not represented as a Gemini result.

`GEMINI_MODEL` defaults to `gemini-2.0-flash`, `GEMINI_TIMEOUT_MS` defaults to `15000`, and `AI_CONFIDENCE_THRESHOLD` defaults to `0.75`. A confidence below the threshold is reported as `NEEDS_REVIEW`. Confidence is an estimate, not a calibrated probability.

## AI endpoints

- `POST /api/ai/conversations/:id/analyze` and `POST /api/ai/conversations/:id/reanalyze` — analyze and persist conversation insights.
- `GET /api/ai/conversations/:id/analysis` — retrieve the saved analysis.
- `POST /api/ai/conversations/:id/summary` — regenerate and return the summary.
- `POST /api/ai/conversations/:id/action-items` — regenerate and return extracted action items.
- `POST /api/ai/conversations/:id/meeting` — regenerate and return meeting details.
- `POST /api/ai/conversations/:id/draft` — generate and persist a draft; accepts `{ "tone": "professional" | "friendly" | "concise" }`.
- `POST /api/ai/conversations/:id/questions` — answer a conversation-specific question; accepts `{ "question": "..." }`.
- Existing `POST /api/ai/analyze` and `POST /api/ai/classify` remain available for non-persisted thread payloads.

Analysis, meeting details, action items, classification history, and drafts are stored in the existing Thread document (or local persistent thread store). Manual classification is retained across reanalysis; the latest AI suggestion and analysis history remain available for review. Draft generation never sends email. Existing simulated sending still requires confirmation in the UI.

The deterministic fallback is intentionally conservative: it leaves unclear ownership unknown, does not create missing meeting dates or deadlines, and sends ambiguous responsibility to manual review. It is not a substitute for provider-backed semantic analysis.

## Assistant productivity workspace

The assistant-only `/api/workspace` endpoints expose the Action Center, follow-ups, meetings, settings, and dashboard summary. Action items, follow-up state, meeting details, and their audit entries remain embedded in the existing `Thread` document; the separate legacy collections are not a second source of truth. Workspace operations require MongoDB and return an error rather than writing to the local fallback.

- `GET /api/workspace/overview` — dynamic action, follow-up, and meeting counts.
- `GET /api/workspace/action-items?status=&priority=&search=` and `PATCH /api/workspace/action-items/:threadId/:actionId` — list and update tasks.
- `GET /api/workspace/follow-ups?status=` and `PATCH /api/workspace/follow-ups/:threadId` — schedule, reschedule, complete, cancel, or reopen follow-ups.
- `GET /api/workspace/meetings?status=` and `PATCH /api/workspace/meetings/:threadId` — list and edit extracted meeting details.
- `GET /api/workspace/settings` and `PATCH /api/workspace/settings/profile` — retrieve and persist assistant preferences.

Gmail and Outlook account cards are persisted as `DEMO`/`SIMULATED`. No live email or calendar integrations are provided.

## Development dataset reset

`POST /api/seed/reset` and `npm run seed` replace conversation data. They are disabled unless `NODE_ENV=development` and `ENABLE_DEMO_RESET=true` are both set. Only enable this for a disposable database; never use the reset against shared or real data.
