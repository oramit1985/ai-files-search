# Document Agent

An AI-powered document assistant that answers natural-language questions over a local knowledge base. The agent reads, searches, and reasons across multiple files in a ReAct-style tool-calling loop, streaming its progress to the UI in real time.

---

## Stack

| Layer | Technology |
|---|---|
| Backend | NestJS 11, TypeScript 5 |
| Frontend | React 19, Vite 8, Tailwind CSS 4 |
| LLM | Anthropic Claude (`claude-sonnet-4-6` default, `claude-opus-4-8` available) |
| Shared types | `@doc-agent/shared` — npm workspace package consumed by both sides |

---

## Prerequisites

- Node.js 20+
- An [Anthropic API key](https://console.anthropic.com/settings/keys)

---

## Monorepo structure (npm workspaces)

This repo uses [npm workspaces](https://docs.npmjs.com/cli/v10/using-npm/workspaces) — a native npm feature (v7+) that lets multiple packages live in one repo and share a single `node_modules/`.

The root `package.json` declares three workspaces:

```json
{ "workspaces": ["shared", "backend", "frontend"] }
```

What this gives you:

- **One `npm install`** at the root installs dependencies for all three packages at once.
- **Local package symlinking** — `backend` lists `@doc-agent/shared` as a dependency and npm symlinks it directly from the `shared/` folder. No publishing to a registry required; changes to `shared/` are immediately visible to both `backend` and `frontend`.
- **Hoisted `node_modules`** — shared dependencies (e.g. TypeScript) are deduplicated into the root `node_modules/` rather than installed three times.

This is the lightweight alternative to tools like Lerna: npm workspaces handles dependency management and symlinking, which is all this project needs. Lerna adds versioning, changelog generation, and multi-package publishing on top — useful for open-source libraries, overkill here.

---

## Installation

```bash
# From the repo root — installs all three workspaces at once
npm install

# Build the shared package (required before first run and after any change to shared/src/)
cd shared && npm run build && cd ..
```

> **Note:** `npm run build` inside `backend/` runs the shared build automatically via its `prebuild` script.
> During development, if you edit anything in `shared/src/`, re-run `cd shared && npm run build` so the
> compiled `dist/` stays in sync and TypeScript picks up the latest types.

---

## Configuration

Create `backend/.env`:

```env
ANTHROPIC_API_KEY=sk-ant-...
PORT=3000
CORS_ORIGIN=http://localhost:5174
```

---

## Running

Open two terminals:

```bash
# Terminal 1 — backend (hot-reload)
cd backend
npm run start:dev

# Terminal 2 — frontend (hot-reload)
cd frontend
npm run dev
```

Then open **http://localhost:5174**.

---

## API

| Method | Path | Description |
|---|---|---|
| `POST` | `/agent/query` | Runs the agent loop; streams SSE events (`step`, `answer`, `error`, `done`) |
| `GET` | `/documents` | Lists available documents with name, size, and extension |

### Request body (`POST /agent/query`)

```json
{
  "query": "What was decided in the March 12 meeting?",
  "model": "claude-sonnet-4-6",
  "history": [
    { "role": "user",      "content": "previous question" },
    { "role": "assistant", "content": "previous answer"   }
  ]
}
```

`model` and `history` are optional. `history` enables multi-turn conversation.

---

## Testing

```bash
cd backend
npm test           # unit tests (19 specs)
npm run test:cov   # with coverage report
```

All three tool handlers have 100 % statement/branch/function coverage. The agent service is tested with mocked Anthropic responses covering the full loop, including max-iteration exhaustion.

---

## LLM

**Anthropic Claude** via the official `@anthropic-ai/sdk`.

- Default model: `claude-sonnet-4-6`
- Available: `claude-opus-4-8`, `claude-haiku-4-5`
- The model can be selected per request via the `model` field in the request body.

---

## AI Coding Tools

This project was built with **[Claude Code](https://claude.ai/code)** (Anthropic's CLI coding assistant), which assisted with:

- Scaffolding the NestJS + React monorepo structure
- Implementing the ReAct agent loop and SSE streaming layer
- TypeScript type design across the shared package

---

## Architecture & Design Decisions

### Hand-rolled ReAct loop (no LangChain / LangGraph)

The agent loop in `backend/src/agent/agent.service.ts` is a plain `for` loop. 
Each iteration calls the Anthropic API, inspects `stop_reason`, executes any tool calls, and appends results to the message 
array before the next turn. 
No framework abstractions — the loop is ~60 lines and easy to follow.

### SSE streaming over a single POST

Rather than polling or WebSockets, the frontend opens a streaming `POST /agent/query`. 
The server pushes typed SSE frames (`step`, `answer`, `error`, `done`) as the agent thinks, 
so the UI can show tool calls in real time before the final answer arrives.

### Multi-turn conversation history

The frontend maintains `ChatMessage[]` state and sends completed turns as `history` on each new request. 
The backend prepends them to the Anthropic `messages` array, giving Claude full context for follow-up questions
like "are you sure?" or "tell me more about that."

### Document store abstraction (Strategy pattern)

`DocumentStore` is an interface with a `DOCUMENT_STORE` injection token. 
`LocalDocumentStore` is today's implementation (plain `fs` calls). 
Swapping to S3, GCS, or a database means writing one new class and changing one line in `DocumentsModule`:

```typescript
{ provide: DOCUMENT_STORE, useClass: S3DocumentStore }
```

All tool handlers, the executor, and the agent are completely unaware of the storage backend.

### Type-safe shared package

`@doc-agent/shared` is an npm workspace package that exports all enums (`ModelId`, `FinishReason`, `ContentBlockType`, `ToolName`, …) and interfaces (`AgentStep`, `StreamEvent`, `QueryRequest`, …). Both the NestJS backend and the React frontend consume it directly — no duplicated type definitions, and any breaking change fails compilation on both sides simultaneously.

### Path aliases

TypeScript path aliases (`@agent/*`, `@tools/*`, `@documents/*`) are wired up in three places so they resolve consistently everywhere:
- `tsconfig.json` — for `tsc` type checking
- `jest moduleNameMapper` — for unit tests
- `webpack.config.js` `resolve.alias` — for the NestJS production bundle

---

## Project Structure

```
.
├── shared/               # @doc-agent/shared — enums + interfaces
├── backend/
│   ├── documents/        # Knowledge base (5 files)
│   ├── src/
│   │   ├── agent/        # ReAct loop, SSE controller, query DTO
│   │   ├── documents/    # DocumentStore interface + LocalDocumentStore
│   │   └── tools/        # Registry, executor, 3 handlers
│   └── test/             # Unit tests (agent + all 3 tools)
└── frontend/
    └── src/
        ├── components/   # ChatWindow, MessageBubble, ThinkingSteps, QueryInput
        └── api.ts        # SSE streaming client
```

---

## Documents

| File | Format | Contents |
|---|---|---|
| `meetings.md` | Markdown | Meeting notes from 3 project team sessions |
| `sales-q1.csv` | CSV | Q1 sales data (contains deliberate inconsistencies) |
| `emails.txt` | Plain text | Email thread about revenue discrepancies |
| `config.json` | JSON | Production application configuration |
| `server-log.txt` | Plain text | Server log with timestamps, errors, and warnings |
