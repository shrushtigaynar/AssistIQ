# AGENTS.md — AssistIQ Architecture, Principles & System Guidelines

## 1. Project Vision & Overview
**AssistIQ** is an AI-powered email management and intelligence platform specifically designed for high-performance Personal Assistants (PAs) and their Executive Clients.

Unlike standard email clients or generic helpdesks, AssistIQ solves the **bilateral email delegation problem**:
- **Assistant Portal**: A command-center for full inbox triaging, AI classification, automated summaries, action tracking, meeting detection, waiting-for tracking, and reply drafting.
- **Client Portal**: An ultra-focused, zero-clutter interface displaying *only* emails requiring the client's direct personal decision, quick guidance, or approval.

The core design principle is:
> **"Less clutter. More intelligence."** (Inspired by Superhuman, Shortwave, and Missive).

---

## 2. Technology Stack & Environment
- **Frontend**: React (Vite), JavaScript (ES Modules, JSX), React Router v6.
- **Styling & UI**: Tailwind CSS, Radix UI primitives, Lucide React icons.
- **Backend**: Node.js, Express.js (REST API, structured middleware, CORS, JSON error handling).
- **Database**: MongoDB with Mongoose ODM (structured schemas, indexing, audit timestamps).
- **AI Engine**: Modular AI Provider Service with Google Gemini API as primary provider, with a clearly identified rule-based deterministic fallback for offline/demo operation.
- **Development Topology**: Clean monorepo structure containing `/client` and `/server`.

---

## 3. UI/UX & Layout Architecture

### 3.1 Visual Language & Design Standards
- **Typography-first**: High contrast, razor-sharp hierarchy, mono fonts for timestamps/tags (`font-mono`), legible body copy.
- **Subtle borders & neutral canvas**: Slate/zinc grayscale palettes (`zinc-900` dark, `zinc-50` light). Avoid bright neon gradients, rainbow status badges, or oversized KPI tiles.
- **Minimal clutter & breathing room**: Consistent spacing, clean alignment, and zero vanity decorations. Every visual element must serve triage velocity.

### 3.2 Adaptive Layout (No Forced 3-Pane Layout)
The layout adapts intelligently to screen size and user focus:
1. **Inbox Navigation & Conversation List**: Clear, uncluttered view of incoming messages filtered by category.
2. **Conversation Details**: Rendered smoothly when a conversation is selected, with clean typography and readability.
3. **Contextual AI Insights Panel**: Toggleable or contextual panel surfaced when useful (summaries, action items, meeting requests, drafts) rather than crowding the view permanently.
4. **Responsive Experience**: Seamless across desktop, tablet, and mobile breakpoints.

### 3.3 Dual-Portal Boundaries
1. **Assistant Portal (`/assistant`)**:
   - Full inbox triaging, categorization, and account simulation.
   - All categories: Inbox, Assistant to Reply, Client to Reply, Needs Review, Waiting For, and No Reply Needed.
   - Reading pane with message history, internal notes, AI insights, and draft preparation.
2. **Client Portal (`/client`)**:
   - Ultra-focused stream showing **only** items with status `Client to Reply` or explicit assistant delegation.
   - Three quick actions per thread:
     1. **Respond** (Quick approve assistant's draft or type/dictate reply).
     2. **Mark Handled** (Archive/complete).
     3. **Delegate to Assistant** (Add a 1-sentence instruction note; drops into assistant's active queue).

---

## 4. Email Responsibility Taxonomy & Safety Invariants

Every incoming or synced email is processed through the AI Classification Engine and tagged into one of four mutually exclusive responsibility buckets:

| Category | Definition | Assistant Action | Client Experience | Retention Rule |
| :--- | :--- | :--- | :--- | :--- |
| `ASSISTANT_REPLY` | Routine operational emails, scheduling requests, inquiries the PA can handle. | PA reviews AI draft, adjusts, and sends. | Invisible to client unless flagged. | Active in PA queue. |
| `CLIENT_REPLY` | Strategic decisions, VIP personal correspondence, confidential matters, explicit client approvals. | PA verifies classification, optionally prepares background notes. | Visible in Client Portal inbox. | Active until client acts. |
| `NO_REPLY_NEEDED` | Receipts, newsletters, shipping notices, automated confirmations, FYI announcements. | PA can review anytime in dedicated segment. | Filtered out completely. | **Never auto-deleted or hidden**. Kept fully accessible in "No Reply Needed" segment. |
| `NEEDS_REVIEW` | Ambiguous tone, complex multi-party negotiations, or low AI confidence (< 0.70). | PA manually assigns responsibility with 1 click. | Hidden until PA resolves. | High visibility in PA review queue. |

### Email Safety Rules:
1. **Explicit Human Approval**: Never send a generated reply without explicit human approval (PA or Client). Drafts remain strictly drafts until "Send" is triggered.
2. **Manual Classification Overrides**: Any manual override immediately updates the classification, logs the change reason, and refreshes both portals reactively. The original AI decision remains auditable.
3. **No Reply Needed Access**: Emails classified as `NO_REPLY_NEEDED` must remain permanently accessible in their designated segment for audit or retrieval.
4. **Transparent AI Estimates**: Classification confidence scores are treated as estimates. The system flags uncertain items for assistant review rather than over-confidently miscategorizing them.

---

## 5. AI Service & Fallback Architecture

1. **Primary Provider**: Google Gemini API (`@google/genai` or `@google/generative-ai`) utilizing structured JSON schema outputs.
2. **Modular Architecture**: Provider-agnostic service layer allowing alternate or future LLM providers (e.g., OpenAI) without changing controller logic.
3. **Deterministic Fallback Transparency**:
   - When API keys are absent, rate-limited, or offline, the system activates a deterministic rule-based demo processor.
   - **Crucial Rule**: Fallback results must be clearly labeled as `Rule-Based Demo Processing` in the UI and metadata. Never claim heuristic results are genuine AI or imply 100% classification accuracy.

---

## 6. Phased Implementation Roadmap

Development strictly follows a **UI/UX First** sequence, delivering a polished, working dashboard with realistic mock data before integrating backend and AI pipelines:

- **Phase 1: Project Foundation & Design System**
  - Setup Vite + React + Tailwind CSS with dark/light neutral palette, Radix UI primitives, Lucide icons.
  - Setup common layout shell, typography hierarchy, and top-level Portal Switcher.
- **Phase 2: Assistant Dashboard UI with Realistic Sample Data**
  - Build responsive Assistant Dashboard layout (navigation, metrics overview, triage tabs).
  - Load high-fidelity realistic executive email dataset (mock state).
  - Verify visual polish, spacing, typography, and responsive behavior.
- **Phase 3: Inbox, Conversation Details & Core Interactions**
  - Adaptive conversation list and thread reader view.
  - Contextual AI insights panel (collapsible/drawer).
  - Core triage actions: classification override, status changes, internal notes.
- **Phase 4: Backend, Database & Persistent Data Integration**
  - Node.js + Express REST API structure with MongoDB + Mongoose models.
  - Endpoints for threads, emails, drafts, and classification overrides.
  - Connect frontend to backend with persistent state updates and seed data scripts.
- **Phase 5: AI Classification, Summaries, Extraction & Reply Drafting**
  - Gemini API integration with structured JSON prompt runners.
  - Transparent rule-based fallback labeled as demo processing.
  - Action item checklist, meeting proposals detection, waiting-for tracking, and draft editor.
- **Phase 6: Client Portal & Bilateral Synchronization**
  - Minimalist Client Portal interface with focused action cards.
  - 3 client actions: Respond (approve draft / reply), Mark Handled, Delegate to Assistant with note.
  - Real-time shared state reflection between both portals.
- **Phase 7: Action Center, Meetings & Settings**
  - Consolidated Action Items tracker and Deadlines/Meetings calendar preview.
  - Simulated Gmail/Outlook sync controls with mock injection.
  - Assistant settings and classification preferences.
- **Phase 8: Testing, Responsive Refinement & Deployment Preparation**
  - Cross-device responsive audits (desktop, tablet, mobile).
  - Keyboard navigation refinement (kept secondary to core workflows).
  - Production build verification and documentation.

---

## 7. Implementation Discipline & Constraints
- **Visual Inspection**: Build, run, and visually inspect each major module before proceeding to the next.
- **Deliverable Milestone 1**: A polished, responsive Assistant Dashboard with realistic data and working navigation.
- **No Scope Creep**: Avoid building unnecessary enterprise DevOps, complex microservices, or full IMAP/SMTP mail servers. Focus strictly on triage velocity, intelligence, and executive-assistant delegation.
