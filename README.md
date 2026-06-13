# Document Agent

A document Q&A agent built with NestJS and React. Ask natural-language questions about a collection of documents and the agent reasons over them using tool calls.

---

## How to Install & Run

### Prerequisites
- Node.js 20+
- An OpenAI API key

### Backend

```bash
cd backend
npm install
export OPENAI_API_KEY=your-key-here
npm run start:dev
```

The API starts on **http://localhost:3000**.

### Frontend

```bash
cd frontend
npm install
npm run dev
```

The UI opens at **http://localhost:5173**.

### Run Tests

```bash
cd backend
npm test
```

---

## LLM API Used

**OpenAI GPT-4o** via the official `openai` npm package.

---

## AI Coding Tools Used

- **Claude Code (claude-sonnet-4-6)** — used throughout: system design, planning, implementation of all backend and frontend code, debugging TypeScript errors, and writing tests.

---

## Design Decisions

### Agent loop — hand-rolled, no framework

The loop in `backend/src/agent/agent.service.ts` is a plain `for` loop (max 10 iterations). Each iteration sends the current message history to GPT-4o with tool definitions. If the response has `finish_reason: tool_calls`, the tools are executed and their results are appended as `role: tool` messages. If `finish_reason: stop`, the loop returns the final answer. This is the ReAct pattern implemented from scratch — no LangChain, LangGraph, or similar.

### 3 tools, not 6

Initial design had separate `parse_csv`, `parse_json`, and `parse_log` tools. These were folded into a smarter `read_document`:

- `.csv` → parsed JSON rows with currency symbols stripped and empty cells as `null`
- `.json` → parsed JavaScript object
- `.txt` / `.md` → raw string

This reduces the decision surface for the agent (fewer tools to choose from) while keeping the same capabilities. `search_document` stays separate because line-level keyword search with context is genuinely different from reading the whole file.

### No RAG / vector search

All 5 documents are under 10 KB total — well within GPT-4o's 128 K context window. Chunking and embedding would add API cost and complexity for zero improvement on this corpus. The LLM is the semantic reasoning layer; `search_document` is only used to jump to a relevant section without sending the full file.

### Shared types

`backend/src/types/` is the single source of truth for enums (`MessageRole`, `ModelId`, `ToolName`, `FinishReason`, `FileExtension`, `LogLevel`) and interfaces (`AgentResponse`, `AgentStep`, `ToolResult`, etc.). The frontend's `types.ts` re-exports only the API contract shapes to avoid coupling the React app to backend-internal types.

### Path traversal protection

`DocumentsService.resolveSafePath` resolves the requested filename against the documents directory and rejects any path that escapes it before the file is opened.
