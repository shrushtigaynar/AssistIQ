# AssistIQ

AssistIQ is an AI-powered email management assistant that categorizes incoming emails by **who needs to respond**:

| Category | Meaning |
| --- | --- |
| **Assistant to Reply** | Routine operational email (scheduling, coordination, follow-ups) that an assistant can handle. |
| **Client to Reply** | Emails requiring the account owner's personal decision, approval, or response. |
| **No Reply Needed** | Newsletters, receipts, notifications. Never deleted; always accessible. |
| **Needs Review** | Ambiguous or low-confidence emails awaiting manual assignment. |

## Stack

- **Frontend**: React 18, Vite, React Router v6, Tailwind CSS, Lucide icons.
- **Backend**: Node.js, Express, MongoDB (Mongoose).
- **AI**: Google Gemini (structured JSON output) with a clearly-labeled deterministic rule-based fallback when the provider is unavailable.
- **Email**: Real Google OAuth 2.0 + Gmail API integration (connect, sync, send with explicit approval).

## Getting Started

### 1. Backend

```bash
cd server
npm install
cp .env.example .env   # then edit
npm run dev
```

Required environment variables (see `server/.env.example`):

| Variable | Purpose |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string (Atlas or self-hosted). Required. |
| `ENCRYPTION_SECRET` | Secret used to encrypt stored Gmail OAuth tokens at rest (32+ chars). |
| `GEMINI_API_KEY` | Optional. Enables real AI classification; without it the labeled rule-based fallback is used. |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google Cloud OAuth credentials for Gmail connections. |
| `GOOGLE_REDIRECT_URI` | Must match an authorized redirect URI in Google Cloud (default `http://localhost:5000/api/email-accounts/google/callback`). |
| `CLIENT_URL` | Frontend origin(s), comma separated. |

### 2. Enabling Gmail connections (Google Cloud setup)

1. Open https://console.cloud.google.com/apis/credentials and create an **OAuth 2.0 Client ID** of type *Web application*.
2. Under **Authorized redirect URIs**, add your redirect URI, e.g. `http://localhost:5000/api/email-accounts/google/callback` (use the HTTPS production URL when deployed).
3. Enable the **Gmail API** for the project.
4. Set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` and `GOOGLE_REDIRECT_URI` in `server/.env` and restart the backend.

The app requests only `gmail.readonly` and `gmail.send` scopes. Tokens are stored encrypted and are never exposed to the frontend. Disconnecting revokes the Google credentials.

### 3. Frontend

```bash
cd client
npm install
npm run dev
```

Set `VITE_API_URL` (defaults to `http://localhost:5000` in development). For production builds it must be an absolute HTTPS URL.

## Flow

1. Visit the landing page and create an account (email + password).
2. Connect your Gmail account in **Settings**.
3. Sync — AssistIQ fetches your inbox, groups messages into conversations, and runs the AI classifier over each one.
4. Your inbox shows every email with its classification, the reasoning, and a suggested next step. You can manually change any classification (overrides are preserved during re-analysis).
5. For **Assistant to Reply** emails, generate an AI-suggested reply, edit it, and send it with an explicit confirmation. **No email is ever sent without explicit human approval.**

## Safety rules

- Drafts remain drafts until an explicit "Approve & Send" confirmation.
- Sending requires a connected Gmail account; nothing is ever faked as sent.
- `No Reply Needed` emails are never deleted or hidden.
- Fallback (rule-based) results are labeled as `Rule-Based Demo Processing` in the UI — they are never presented as genuine AI.
