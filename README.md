<div align="center">

# ⚡ Chronos
### The AI Life Negotiator

**An Agentic Execution Intelligence Platform — a Groq-powered agent layered over Google Calendar, Gmail, and Firebase Authentication.**

*Not a to-do list. Not a smarter calendar. An execution operating system.*

[![React](https://img.shields.io/badge/React-18+-61DAFB?style=flat-square&logo=react&logoColor=black)](https://reactjs.org/)
[![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Node.js](https://img.shields.io/badge/Node.js-18+-339933?style=flat-square&logo=node.js&logoColor=white)](https://nodejs.org/)
[![Firebase](https://img.shields.io/badge/Firebase-Authentication-FFCA28?style=flat-square&logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vercel](https://img.shields.io/badge/Vercel-Deployment-000000?style=flat-square&logo=vercel&logoColor=white)](https://vercel.com/)
[![Groq](https://img.shields.io/badge/Groq_API-Grounded_AI-F55036?style=flat-square)](https://groq.com/)
[![Calendar API](https://img.shields.io/badge/Google_Calendar_API-v3-4285F4?style=flat-square&logo=googlecalendar&logoColor=white)](https://developers.google.com/calendar)
[![Gmail API](https://img.shields.io/badge/Gmail_API-v1-EA4335?style=flat-square&logo=gmail&logoColor=white)](https://developers.google.com/gmail)
[![Status](https://img.shields.io/badge/Status-Active-brightgreen?style=flat-square)]()

| **9** Deterministic Engines | **4** Google Technologies | **0** Planning Hallucinations | **2** Vercel Projects |
|:---:|:---:|:---:|:---:|

[Problem](#-the-problem) · [Solution](#-the-solution) · [Features](#-features) · [Architecture](#️-architecture) · [AI Design](#-ai-architecture) · [Tech Stack](#-tech-stack) · [Setup](#️-installation--setup) · [Usage](#️-usage) · [Roadmap](#-future-scope)

</div>

---

## 🧩 The Problem

We live in the most tool-rich era in history — yet people still miss deadlines, experience burnout, and struggle with prioritization. The average knowledge worker juggles Gmail, Google Calendar, task managers, project trackers, and messaging platforms. Not one of these tools understands the complete picture.

> **The problem is not information scarcity. The problem is intelligence fragmentation.**

Consider a typical morning. Gmail holds a surprise assignment, an interview invitation, a deadline change, and a conference registration. Calendar shows lectures, a society meeting, and an exam. A task list holds long-term projects. No existing application understands all of these simultaneously — so every prioritization decision falls to the user. **The human mind becomes the integration layer.** It was never designed to be one.

**What's missing:** a layer of intelligence that sits *above* all these tools — one that continuously understands commitments, evaluates capacity, detects conflicts, and recommends action.

Chronos is that layer.

---

## 💡 The Solution

Chronos ingests commitments from every corner of your digital life, normalizes them into a single unified model, and runs nine deterministic intelligence engines — entirely in the browser — to reason about workload, capacity, conflicts, and priorities in real time as your data changes.

The result is not another dashboard of charts. It's an **Executive Briefing**: what matters, what's at risk, and what should happen next — delivered through a companion dashboard and a Groq-powered conversation layer grounded in deterministic evidence.

```
Google Calendar ─┐
Gmail            ├──► Commitment Store ──► 9 Intelligence Engines ──► chronosReport ──► Executive Agent ──► Dashboard
Manual Tasks     │                                                                                    └──► Groq (Llama) Agent
Ongoing Projects─┘
```

### Cooperating Layers

| Layer | Responsibility |
|---|---|
| **Data Sources** | Google Calendar, Gmail, Manual Tasks, and Ongoing Projects — read directly from the browser via the user's OAuth token |
| **Unified Commitment Engine** | Every source normalized into one schema by dedicated transformers. The Planner never asks "Did this come from Gmail?" — it just sees a Commitment |
| **Deterministic Intelligence** | Nine specialized engines, all running client-side, independently compute capacity, conflicts, schedules, rescue plans, simulations, and behavioral patterns |
| **Executive Intelligence** | The Executive Agent (a pure client-side function) synthesizes all nine engine reports into one coherent `ExecutiveReport` |
| **Conversational Intelligence** | The backend's Groq-powered agent receives pre-computed engine context from the client and delivers evidence-based conversation and real calendar/email actions |

---

## ✨ Features

### 🧠 Unified Commitment Model
Chronos introduces a single foundational abstraction: the **Commitment** — any responsibility that competes for a person's finite cognitive or temporal resources. Calendar events, Gmail messages, manual tasks, and ongoing projects all pass through dedicated transformers (`client/src/lib/commitmentTransformer.js`) and resolve to the same schema. Every downstream engine reasons over one consistent world model, regardless of where a commitment originated.

---

### ⚙️ Nine Deterministic Intelligence Engines

Each engine solves exactly one problem, produces exactly one structured report, and runs entirely client-side (`client/src`) — no engine imports another.

| Engine | Source | Responsibility |
|---|---|---|
| 🔋 **Capacity Engine** | `capacity/` | Models human capacity as a multidimensional resource — time, energy, context-switching penalties, and recovery. |
| 📊 **Reality Gap Engine** | `reality/` | Quantifies the gap between planned workload and actual human capacity, with a severity scale. |
| ⚠️ **Conflict Detection Engine** | `conflicts/` | Detects scheduling conflicts, overloads, and dependency blocks across a day's commitments. |
| 📋 **Planner Engine** | `planner/` | Performs constraint-satisfaction planning — balancing deadlines, dependencies, Life Anchors, and cognitive sustainability. |
| 🚑 **Rescue Engine** | `rescue/` | Activates when execution begins to collapse. Applies compression, redistribution, deferment, and drop strategies under hard constraints — Fixed and Life Anchor commitments are untouchable. |
| 🧯 **Firefighter Engine** | `services/firefighterEngine.js` | Crisis escalation with structured commitment triage and real, ready-to-send message drafts. |
| 🔍 **Blocker Breaker Engine** | `services/blockerBreakerEngine.js` | Builds a dependency graph, identifies root-cause blockers, and finds the critical path. |
| 🔮 **Consequence Simulator** | `services/consequenceSimulatorEngine.js` | "What if I postpone this?" runs the planning pipeline against an isolated snapshot and returns a delta analysis before any change is applied to real data. |
| 📖 **Reflection & Statistics Engine** | `services/reflectionEngine.js`, `services/statisticsEngine.js`, `services/streakEngine.js` | Transforms completion history into behavioral patterns, streaks, and quantitative trends. |

---

### 🌐 chronosReport — The Unified World Model

`chronosReport` (`client/src/services/chronosReport.js`) is the architectural centerpiece of Chronos. It is a pure function that assembles all nine engine reports — plus completion statistics, chart data, and plain-language explanations — into a single structured object consumed by the Dashboard and by every AI-facing feature.

> *The `chronosReport` is to Chronos what the kernel is to an operating system.*

It is safe to call with empty or partial input — every sub-report has a fallback — and every calculation happens exactly once, in exactly one place.

---

### 🕴️ Executive Agent

The Executive Agent (`client/src/intelligence/executiveAgent.ts`) is a pure, side-effect-free function — no React, no network calls. It consumes the complete `chronosReport` and produces a single `ExecutiveReport` containing:

- **Priorities** — ranked, actionable items with a reason, urgency, and originating engine
- **Alerts** — typed by category (`emergency`, `blocker`, `conflict`, `capacity`, `reality_gap`, `rescue`, `firefighter`)
- **Recommendations** and an **executive summary**
- An overall **urgency level** (`critical / high / medium / low / normal`)

It never touches a network call and never invokes an LLM — it is orchestration over already-computed deterministic data.

---

### 🔄 Continuous Agent Loop (Client-Side, Reactive)

Chronos's agent loop (`client/src/context/AgentContext.jsx`) is **reactive, not polling-based**. A `useEffect` fires whenever the in-memory `commitments` array changes (a new task added, a calendar sync completing, a project updated). On each run it:

- Diffs the previous and current commitment sets (added / removed / changed)
- Re-runs `chronosReport` → `executiveAgent` → `intelligenceReport`
- Emits typed events (`commitment:added`, `conflict:detected`, `rescue:activated`, `firefighter:triggered`, `blocker:critical`, `capacity:overload`, `reality_gap:high`, `executive:notify`, …) ranked by urgency
- Filters alerts down to medium-urgency-and-above into `executiveNotifications`, so low-value updates never surface as a notification

There is no fixed polling interval — the loop only runs in response to an actual change in the commitment data.

---

### 💬 Converse — Groq-Powered Conversation & Agent Actions

The **Converse** screen (`/converse`) is the conversational layer, backed by the `/api/converse` endpoint (`server/src/routes/converse.js`). The client sends the user's message together with a pre-sanitized `engineContext` (never the raw commitment data) and conversation history; the server independently re-classifies intent (planning, rescue, firefighter, explain, reflection, productivity, what-if, general) and lets the model call real tools:

- `create_calendar_event` / `reschedule_calendar_event` — real Google Calendar writes
- `draft_email` — creates a Gmail draft only; the agent can **never** send it
- `activate_rescue_mode` / `activate_firefighter_mode` — switches the app's own crisis modes

Sending a drafted email requires a separate, explicit user click that calls `/api/send-email` — the agent itself has no path to send mail.

---

### 🎭 Demo Mode

Demo Mode (`client/src/demo/`, toggled via `DemoContext`) generates a synthetic commitment set and state (`demoGenerator.js`, `demoData.js`, `firefighterMockData.js`, `consequenceDemoScenarios.js`) and runs it through the **identical** client-side intelligence pipeline as live data. It requires no Google sign-in and is persisted locally via `chronos_demo_mode` in `localStorage`.

---

### 🌿 Life Anchors

Certain commitments define identity, not productivity: sleep, exercise, meals, family time. These are modeled as the `LIFE_ANCHOR` commitment type. The Planner Engine's rule set (`planner/PlannerRules.ts`) unconditionally protects `LIFE_ANCHOR` commitments — they are never moved, never postponed, and never treated as compressible by the Rescue Engine, regardless of category or urgency elsewhere in the schedule.

---

## 🏗️ Architecture

Chronos is a **two-project system**: a Vite/React single-page app and an Express API, deployed as **two independent Vercel projects** on separate domains. Almost all planning intelligence runs in the browser; the backend's only job is the Groq-powered conversation/agent layer and the small set of actions that must happen server-side (sending Gmail, forwarding tool calls).

```
┌─────────────────────────────────────────────────────────────┐
│  PRESENTATION (client/src/screens, components)               │
│  Companion Dashboard · Rescue · Converse                     │
│  Renders ExecutiveReport / chronosReport. No calculations.   │
└─────────────────────┬─────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  CLIENT-SIDE INTELLIGENCE (client/src)                        │
│  Capacity · Reality Gap · Conflicts · Planner · Rescue        │
│  Firefighter · Blocker Breaker · Consequence · Reflection     │
│  → chronosReport → executiveAgent → ExecutiveReport           │
└─────────────────────┬─────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  COMMITMENT STORE (client/src/context/CommitmentContext.jsx) │
│  In-memory React state, hydrated from Calendar/Gmail/manual   │
└─────────────────────┬─────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  GOOGLE INTEGRATION (client, direct from browser)             │
│  Calendar API v3 (read) · Gmail API v1 (read)                │
│  Firebase Authentication · Google Identity Services (OAuth)   │
└─────────────────────┬─────────────────────────────────────────┘
                      ↓
┌─────────────────────────────────────────────────────────────┐
│  BACKEND (server/, separate Vercel project, Express)          │
│  /api/plan /rescue /review /reflect /simulate /prep           │
│  /api/intelligence /api/converse /api/send-email              │
│  Groq API (openai/gpt-oss-120b) — conversation + agent tools  │
└─────────────────────────────────────────────────────────────┘
```

### Architectural Principles

```
1. All nine deterministic engines run client-side and never call an LLM.
2. Engines never communicate directly with each other — only through chronosReport.
3. The backend never recalculates planning logic; it only interprets and converses.
4. The agent can create calendar events and Gmail drafts, but can never send mail
   without a separate, explicit user confirmation.
5. Every calculation exists in exactly one place.
```

---

## 📂 Project Structure

```
Chronos/
│
├── package.json                 # Root: runs client + server concurrently for local dev
│
├── server/                      # Express backend — deployed as its own Vercel project
│   ├── vercel.json               # Rewrites all paths to api/index.js
│   ├── api/
│   │   └── index.js              # Vercel serverless entry point (exports the Express app)
│   └── src/
│       ├── app.js                # Express app: CORS, JSON body parsing, routes, error handling
│       ├── index.js               # Local dev entry point (node src/index.js)
│       ├── lib/
│       │   ├── groq.js            # Groq client, groq() / groqJSON() / groqWithTools()
│       │   ├── agentTools.js      # Tool definitions + dispatcher for the Converse agent
│       │   └── googleApis.js      # Server-side Calendar/Gmail writes using the user's OAuth token
│       └── routes/
│           ├── plan.js
│           ├── rescue.js
│           ├── review.js
│           ├── reflect.js
│           ├── simulate.js
│           ├── prep.js
│           ├── intelligence.js
│           ├── converse.js        # Tool-calling agent loop
│           └── sendEmail.js       # The only route that can send a Gmail draft
│
└── client/                      # Vite + React SPA — deployed as its own Vercel project
    ├── vercel.json                # SPA fallback rewrite (all paths → index.html)
    ├── vite.config.js
    └── src/
        ├── App.jsx                # Routes: /dashboard, /rescue, /converse
        ├── main.jsx
        ├── lib/
        │   ├── api.js              # fetch wrapper for every /api/* call
        │   ├── firebase.js         # Firebase Auth + Google OAuth scopes
        │   ├── googleIdentityServices.js  # GIS token popup
        │   ├── calendarService.js  # Direct Google Calendar API reads
        │   ├── gmailService.js     # Direct Gmail API reads
        │   └── commitmentTransformer.js  # Calendar/Gmail/manual/project → Commitment
        ├── capacity/               # Capacity Engine
        ├── reality/                # Reality Gap Engine
        ├── conflicts/              # Conflict Detection Engine
        ├── planner/                # Planner Engine + rules
        ├── rescue/                 # Rescue Engine
        ├── services/
        │   ├── firefighterEngine.js
        │   ├── blockerBreakerEngine.js
        │   ├── consequenceSimulatorEngine.js
        │   ├── reflectionEngine.js
        │   ├── statisticsEngine.js
        │   ├── streakEngine.js
        │   └── chronosReport.js    # Assembles all engine reports into one world model
        ├── intelligence/
        │   ├── executiveAgent.ts   # chronosReport → ExecutiveReport
        │   ├── intelligenceReport.js
        │   └── review/             # Nightly review / learning / reflection pipeline
        ├── context/
        │   ├── AuthContext.jsx      # Firebase sign-in + Google OAuth token lifecycle
        │   ├── CommitmentContext.jsx # Unified commitment store (in-memory)
        │   ├── ChronosContext.jsx   # Tasks/plan/rescue/review state (localStorage-backed)
        │   ├── AgentContext.jsx     # Reactive agent loop (see above)
        │   ├── CalendarContext.jsx  # Selected date / mini-calendar state
        │   ├── DemoContext.jsx      # Demo Mode toggle + synthetic state
        │   └── ToastContext.jsx
        ├── demo/                   # Synthetic Demo Mode data + generator
        ├── components/             # Dashboard cards, charts (pure SVG), companion orb, etc.
        └── screens/
            ├── CompanionDashboard.jsx  # Routed at /dashboard — the main hub
            ├── Rescue.jsx              # Routed at /rescue
            ├── Converse.jsx            # Routed at /converse
            └── Tasks.jsx, Plan.jsx, Review.jsx, Reflect.jsx, Firefighter.jsx,
                Consequence.jsx, IntelligenceCenter.jsx
                # ^ Still present in the codebase and still run their engines via
                #   AgentContext, but are not currently wired into the router —
                #   their output currently surfaces through the Dashboard and Converse.
```

---

## 🤖 AI Architecture

### Groq, Not a General-Purpose Chatbot

Chronos's LLM layer runs on **Groq** (`groq-sdk`, model `openai/gpt-oss-120b`), not a general prompt-and-hope chatbot. All nine planning engines are deterministic and run entirely client-side, before any model is ever called.

| | Deterministic Layer (client-side) | Groq Layer (server-side) |
|---|---|---|
| **Answers** | *What? How much? When? Which conflicts?* | *Why? What if? What should happen next?* |
| **Responsibility** | Capacity calculation, conflict detection, scheduling, dependency analysis, simulation, rescue planning | Explains decisions, drafts messages, executes calendar/email tool calls, holds conversation |
| **Rule** | Groq never touches this layer | Groq never calculates — it interprets pre-computed engine output |

### The Nine Backend AI Endpoints

Every one of these endpoints (`server/src/routes/`) sends a single structured JSON-mode prompt to Groq and returns the parsed JSON directly — no server-side planning logic recomputes anything the client already calculated:

`/api/plan`, `/api/rescue`, `/api/review`, `/api/reflect`, `/api/simulate`, `/api/prep`, `/api/intelligence` — single-shot completions.
`/api/converse` — a tool-calling loop (capped at 3 rounds) followed by one final structured JSON reply.

### Gmail Commitment Extraction Is Rule-Based, Not AI

Gmail messages are converted into Commitments by a deterministic pattern classifier (`client/src/lib/commitmentClassifier.ts` + `commitmentTransformer.js`) that scores subject/sender/body patterns and assigns a confidence value — there is no LLM call in this path. Once inserted into the Commitment Store, a Gmail-derived commitment is indistinguishable from a Calendar event to every downstream engine.

---

## 🧪 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | React 18, Vite 5, Tailwind CSS, React Router v6, Lucide Icons |
| **Backend** | Node.js, Express — deployed as Vercel serverless functions (`@vercel/node`) |
| **State** | React Context (in-memory) + browser `localStorage` (plans, rescue results, reflections, demo mode) — no server-side database |
| **Auth** | Firebase Authentication (Google sign-in popup) + Google Identity Services (OAuth 2.0 access token for Calendar/Gmail) |
| **AI Engine** | Groq API via `groq-sdk`, model `openai/gpt-oss-120b` |
| **Calendar** | Google Calendar API v3 — read directly from the browser; write (create/reschedule) via the backend agent |
| **Email** | Gmail API v1 — read directly from the browser; draft creation via the backend agent; sending only via explicit user action |
| **Deployment** | Two independent Vercel projects (`client/`, `server/`), each with its own `vercel.json` |

---

## ⚙️ Installation & Setup

### Prerequisites

- [Node.js](https://nodejs.org/) v18+
- A [Firebase](https://firebase.google.com/) project with **Authentication** (Google provider) enabled
- A [Google Cloud](https://console.cloud.google.com/) project with the Calendar API and Gmail API enabled, and an OAuth 2.0 Web Client ID with `calendar.events` and `gmail.compose` scopes added to the consent screen
- A [Groq API key](https://console.groq.com/) (free)

### 1. Clone the Repository

```bash
git clone https://github.com/yourusername/chronos.git
cd Chronos
```

### 2. Install Dependencies

```bash
npm run install:all
```

This installs the root, `server`, and `client` dependencies in one step (equivalent to running `npm install` in each of the three).

### 3. Configure Environment Variables

Create `server/.env`:

```env
PORT=8080
NODE_ENV=development
GROQ_API_KEY=your_groq_api_key
```

Create `client/.env.local`:

```env
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
VITE_FIREBASE_APP_ID=your_app_id
VITE_GOOGLE_OAUTH_CLIENT_ID=your_oauth_client_id.apps.googleusercontent.com

# Only required in production, where frontend and backend are separate
# Vercel projects on different domains. Leave unset for local dev — Vite's
# dev-server proxy forwards /api to http://localhost:8080 automatically.
# VITE_API_URL=https://your-backend.vercel.app
```

### 4. Run Locally

```bash
# From the project root — starts backend (8080) and frontend (5173) together
npm run dev
```

- **Frontend:** `http://localhost:5173`
- **Backend API:** `http://localhost:8080`

### 5. Deploy to Vercel

Deploy `client/` and `server/` as **two separate Vercel projects**:

- **Backend project** — Root Directory: `server`. Set `GROQ_API_KEY` and `CLIENT_ORIGIN` (the deployed frontend URL, for CORS) as environment variables.
- **Frontend project** — Root Directory: `client`. Set all `VITE_FIREBASE_*` variables, `VITE_GOOGLE_OAUTH_CLIENT_ID`, and `VITE_API_URL` (the deployed backend URL) as environment variables, then redeploy so the build picks them up.

Each project's `vercel.json` (already in the repo) handles routing: the backend rewrites every path to its single Express function; the frontend rewrites every path to `index.html` so client-side routes survive a browser refresh.

---

## 🖥️ Usage

### Getting Started (Live Mode)

1. **Sign in with Google** on the Dashboard — this opens a Firebase popup followed by a lightweight Google Identity Services confirmation, granting Calendar and Gmail access in effectively one click
2. **Calendar and Gmail sync automatically** — Chronos reads your upcoming Calendar events and scans recent Gmail messages for commitment-shaped content, transforming both into the unified Commitment Store
3. **Read your Executive Briefing** — the Companion Dashboard (`/dashboard`) surfaces what matters, what's at risk, and what's next, alongside a voice-capable companion orb
4. **Talk to Chronos** — the Converse screen (`/converse`) answers questions, explains recommendations, and can create/reschedule calendar events or draft emails on your behalf (never sending without your explicit confirmation)
5. **Rescue a broken day** — the Rescue screen (`/rescue`) applies compression, redistribution, and deferment when the day's plan has collapsed

### Using Demo Mode

No account connection needed. Toggle Demo Mode from the Dashboard to explore the full intelligence pipeline against a pre-built synthetic commitment set, with no Google sign-in required.

### Current API Endpoints

All endpoints are mounted on the backend under `/api` and expect/return JSON.

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Root health check |
| `GET` | `/api/health` | Health check, reports whether required env vars are set |
| `POST` | `/api/plan` | Generate a schedule from a task list |
| `POST` | `/api/rescue` | Generate a rescue plan for a broken day |
| `POST` | `/api/review` | Nightly review of tomorrow's plan |
| `POST` | `/api/reflect` | Weekly reflection synthesis |
| `POST` | `/api/simulate` | Consequence simulation for a proposed new commitment |
| `POST` | `/api/prep` | Preparation checklist for a single task |
| `POST` | `/api/intelligence` | Grounded Q&A over the current `chronosReport` |
| `POST` | `/api/converse` | Conversational agent turn, with real calendar/email tool calls |
| `POST` | `/api/send-email` | Sends a previously created Gmail draft — only ever called after explicit user confirmation |

---

## 🔐 Security

- **HTTPS only** in production (Vercel-provisioned certificates for both projects)
- **CORS is configured per deployment** — the backend allows only the `CLIENT_ORIGIN` you configure (falls back to allowing all origins if unset, which is safe for local dev but should always be set in production)
- **No server-side database** — Chronos does not persist commitments, plans, or conversation history outside the browser (React state + `localStorage`); the backend only processes each request in memory
- **Google OAuth access tokens are never stored server-side** — the client forwards the token per-request (`X-Google-Access-Token` header) and the backend discards it after the request completes
- **Draft-only email guarantee is enforced in application logic** — `gmail.compose` is the only scope that covers both drafting and sending, so the agent is only ever wired to the draft-creating tool; sending requires a separate endpoint the agent cannot call itself
- **API keys never reach the client** — `GROQ_API_KEY` lives only in the backend's Vercel environment variables
- **Demo Mode** uses entirely synthetic, generated data — no real Google account data is ever used

---

## 🧭 Future Scope

The following are **not implemented** — they describe the intended direction of the project, not current behavior.

**Near-term — Restoring full navigation**
Tasks, Plan, Review, Reflect, Firefighter, Consequence, and Intelligence Center screens already exist in the codebase and their engines already run via `AgentContext`; wiring them back into the router as dedicated routes is the most immediate planned change.

**Near-term — Adaptive Intelligence**
Duration learning, energy pattern recognition, and planning memory that personalizes recommendations based on observed execution behavior — without ever replacing deterministic reasoning.

**Medium-term — Platform Integrations**
Slack, Notion, GitHub, Microsoft Teams, Jira, and Linear integrations — each requiring only one new commitment transformer, with zero changes to the intelligence pipeline.

**Medium-term — Persistent Storage**
A real database layer so commitments, plans, and reflection history survive across devices and browser sessions, rather than living only in `localStorage` and in-memory state.

**Long-term — Organizational Intelligence**
Shared projects, team dashboards, and cross-team dependency analysis, naturally accommodated because shared commitments are simply additional inputs to the deterministic pipeline.

**Long-term — Ambient Intelligence**
Wearable integration for energy and stress sensing, and behavioral forecasting for goal completion probability. Learning enriches planning — but never replaces deterministic reasoning.

---

## 👩‍💻 Author

**Ria Chadha**

[![GitHub](https://img.shields.io/badge/GitHub-@Ria--Chadha--05-181717?style=flat-square&logo=github)](https://github.com/Ria-Chadha-05)

---

### Contributions

This project was built as a solo architectural and implementation effort for the **Google AI Hackathon — Vibe2Ship 2025** (Problem Statement 1: The Last-Minute Life Saver).

I designed and implemented the full system from scratch: the Unified Commitment Model, all nine client-side deterministic intelligence engines, the `chronosReport` world model, the Executive Agent synthesis pipeline, the reactive Agent Loop, the Groq-powered conversation and tool-calling layer, and the complete two-project Vercel deployment architecture, alongside the React frontend — the Companion Dashboard, the Rescue screen, and Converse.

---

<div align="center">

*Chronos — built on Groq · Firebase · Google Calendar API · Gmail API · Vercel*

> ***Deterministic intelligence decides. Conversational intelligence communicates. Humans stay in control.***

⭐ **If Chronos resonates with you, give it a star!** ⭐

</div>
