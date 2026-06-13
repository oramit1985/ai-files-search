import { FileExtension, LogLevel, MessageRole, ModelId, ToolName } from './enums';

// ── Documents ─────────────────────────────────────────────────────────────────

export interface DocumentInfo {
  name:      string;
  size:      number;
  extension: FileExtension | string;
}

// ── Agent ─────────────────────────────────────────────────────────────────────

export interface AgentStep {
  tool:    ToolName | string;
  input:   Record<string, unknown>;
  result:  unknown;
  success: boolean;
}

export interface AgentResponse {
  answer:     string;
  steps:      AgentStep[];
  durationMs: number;
}

// ── Streaming events ──────────────────────────────────────────────────────────

export interface StepEvent   { type: 'step';   data: AgentStep; }
export interface AnswerEvent { type: 'answer'; data: string; durationMs: number; }
export interface ErrorEvent  { type: 'error';  data: string; }
export interface DoneEvent   { type: 'done'; }

export type StreamEvent = StepEvent | AnswerEvent | ErrorEvent | DoneEvent;

export interface QueryRequest {
  query:    string;
  model?:   ModelId;
  history?: Message[];
}

// ── Tools ─────────────────────────────────────────────────────────────────────

export interface ToolResult<T = unknown> {
  success: boolean;
  content: T;
  error?:  string;
}

// ── File-type specific results ─────────────────────────────────────────────────

export interface LogEntry {
  timestamp: string;
  level:     LogLevel;
  message:   string;
  raw:       string;
}

export interface CsvRow {
  [column: string]: string | null;
}

export interface SearchMatch {
  lineNumber: number;
  line:       string;
  context:    string[];
}

// ── Messaging ─────────────────────────────────────────────────────────────────

export interface Message {
  role:    MessageRole;
  content: string;
}
