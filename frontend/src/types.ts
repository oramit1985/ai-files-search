import type { AgentStep, Message, MessageRole } from '@doc-agent/shared';

export type { AgentResponse, DocumentInfo, Message, QueryRequest, StreamEvent } from '@doc-agent/shared';

// UI-only type — not part of the API contract
export interface ChatMessage {
  role:        MessageRole.User | MessageRole.Assistant;
  content:     string;
  steps?:      AgentStep[];
  durationMs?: number;
  error?:      boolean;
}
