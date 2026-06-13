import { Injectable, Logger } from '@nestjs/common';
import Anthropic from '@anthropic-ai/sdk';
import { ToolsRegistry } from '@tools/tools.registry';
import { ToolsExecutor } from '@tools/tools.executor';
import { AgentStep, ContentBlockType, FinishReason, Message, MessageRole, ModelId, StreamEvent, ToolName } from '@doc-agent/shared';

const MAX_ITERATIONS = 10;
const MAX_TOKENS = 4096;

const SYSTEM_PROMPT = `You are a document analysis assistant. You have access to a collection of documents and tools to read and search them.

You may receive prior conversation turns as context. Use them to understand follow-up questions, confirmations, or references to earlier answers — treat them as the same ongoing conversation.

Guidelines:
- If you have not yet listed the available documents in this conversation, call list_documents first so you know what exists.
- For follow-up questions that reference a previous answer, skip list_documents and respond directly using the conversation context.
- Use search_document to locate a specific section before reading the whole file when the question targets a known keyword (e.g. a date, a name, an error code).
- Use read_document when you need the full content of a file (e.g. for cross-document comparison or when the entire context matters).
- When answering, always state which document(s) you consulted (if any were used).
- If data is missing, ambiguous, or inconsistent, say so explicitly rather than guessing.`;

@Injectable()
export class AgentService {
  private readonly logger = new Logger(AgentService.name);
  private readonly anthropic = new Anthropic();

  constructor(
    private readonly toolsRegistry: ToolsRegistry,
    private readonly toolsExecutor: ToolsExecutor,
  ) {}

  async runAgentLoop(
    query: string,
    emit: (event: StreamEvent) => void,
    model: ModelId = ModelId.ClaudeSonnet4,
    history: Message[] = [],
  ): Promise<void> {
    const start = Date.now();
    const tools = this.toolsRegistry.getDefinitions();
    this.logger.debug(`Starting loop — history: ${history.length} turn(s)`);
    const messages: Anthropic.MessageParam[] = [
      ...history.map((m): Anthropic.MessageParam => ({ role: m.role as 'user' | 'assistant', content: m.content })),
      { role: MessageRole.User, content: query },
    ];

    for (let i = 0; i < MAX_ITERATIONS; i++) {
      const response = await this.anthropic.messages.create({
        model,
        max_tokens: MAX_TOKENS,
        system: SYSTEM_PROMPT,
        tools,
        messages,
      });

      if (response.stop_reason === FinishReason.EndTurn) {
        const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === ContentBlockType.Text);
        emit({ type: 'answer', data: textBlock?.text ?? '', durationMs: Date.now() - start });
        emit({ type: 'done' });
        return;
      }

      if (response.stop_reason === FinishReason.ToolUse) {
        messages.push({ role: MessageRole.Assistant, content: response.content });

        const toolResults: Anthropic.ToolResultBlockParam[] = [];

        for (const block of response.content) {
          if (block.type !== ContentBlockType.ToolUse) continue;

          const input = block.input as Record<string, string>;
          this.logger.debug(`Tool call: ${block.name} ${JSON.stringify(input)}`);

          const result = await this.toolsExecutor.execute(block.name, input);

          const step: AgentStep = {
            tool: block.name as ToolName,
            input,
            result: result.content,
            success: result.success,
          };
          emit({ type: 'step', data: step });

          toolResults.push({
            type: ContentBlockType.ToolResult,
            tool_use_id: block.id,
            content: JSON.stringify(result.content),
          });
        }

        messages.push({ role: MessageRole.User, content: toolResults });
      }
    }

    emit({ type: 'error', data: 'Agent exceeded maximum iterations without reaching a final answer.' });
    emit({ type: 'done' });
  }
}
