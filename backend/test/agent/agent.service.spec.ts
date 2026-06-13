import { Test } from '@nestjs/testing';
import Anthropic from '@anthropic-ai/sdk';
import { AgentService } from '@agent/agent.service';
import { ToolsRegistry } from '@tools/tools.registry';
import { ToolsExecutor } from '@tools/tools.executor';
import {
  ContentBlockType,
  FinishReason,
  ModelId,
  StreamEvent,
  ToolName,
} from '@doc-agent/shared';

// ── Test constants ────────────────────────────────────────────────────────────

const ANSWER_TEXT       = 'The answer is 42.';
const ANSWER_TEXT_CROSS = 'Based on the documents, the answer is X.';
const ANSWER_TEXT_READ  = 'Final answer after reading.';
const MOCK_FILENAME     = 'meetings.md';

// ── Response builders ─────────────────────────────────────────────────────────

function endTurnResponse(text: string) {
  return {
    stop_reason: FinishReason.EndTurn,
    content: [{ type: ContentBlockType.Text, text }],
  };
}

function toolUseResponse(name: string, input: object) {
  return {
    stop_reason: FinishReason.ToolUse,
    content: [{ type: ContentBlockType.ToolUse, id: 'tool_1', name, input }],
  };
}

// ── Suite ─────────────────────────────────────────────────────────────────────
// Tests cover the four main branches of the ReAct loop:
//   1. Immediate answer   — LLM responds directly, no tools needed
//   2. Single tool call   — LLM calls one tool, then answers
//   3. Chained tool calls — LLM chains multiple tool calls across iterations
//   4. Max iterations     — loop guard fires before LLM reaches end_turn

describe('AgentService', () => {
  let service: AgentService;
  let anthropicCreate: jest.Mock;
  let executorExecute: jest.Mock;

  beforeEach(async () => {
    // jest.fn() creates a spy: an empty function that records every call and
    // can be programmed per-test with .mockResolvedValueOnce() to return
    // specific LLM responses in sequence — no real API calls are made.
    anthropicCreate = jest.fn();
    executorExecute = jest.fn().mockResolvedValue({ success: true, content: 'mock result' });

    const module = await Test.createTestingModule({
      providers: [
        AgentService,
        { provide: ToolsRegistry,  useValue: { getDefinitions: () => [] } },
        { provide: ToolsExecutor,  useValue: { execute: executorExecute } },
          /** this is how we're overriding anthropic.messages.create functionality */
        { provide: Anthropic,      useValue: { messages: { create: anthropicCreate } } },
      ],
    }).compile();

    service = module.get(AgentService);
  });

  it('emits answer + done when LLM responds without calling any tools', async () => {
    // Programs the spy: the next call to anthropic.messages.create() will resolve
    // with this fake LLM response. The agent sees stop_reason: 'end_turn' and
    // emits the answer immediately without calling any tools.
    anthropicCreate.mockResolvedValueOnce(endTurnResponse(ANSWER_TEXT));

    const events: StreamEvent[] = [];
    await service.runAgentLoop('test query', (e) => events.push(e), ModelId.ClaudeOpus4);

    expect(events.find((e) => e.type === 'answer')).toMatchObject({
      type: 'answer',
      data: ANSWER_TEXT,
    });
    // at(-1) is the last element. We assert it's a 'done' event to verify the
    // agent always closes the stream — regardless of how it ended.
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits a step event for each tool call before the final answer', async () => {
    // Chaining mockResolvedValueOnce builds a response queue: the 1st call to
    // anthropic.messages.create() gets the tool-use response, the 2nd call gets
    // the end-turn response. This mirrors one full agent iteration — tool call
    // followed by a final answer.
    anthropicCreate
      .mockResolvedValueOnce(toolUseResponse(ToolName.ListDocuments, {}))
      .mockResolvedValueOnce(endTurnResponse(ANSWER_TEXT_CROSS));

    const events: StreamEvent[] = [];
    await service.runAgentLoop('list docs', (e) => events.push(e), ModelId.ClaudeOpus4);

    expect(executorExecute).toHaveBeenCalledWith(ToolName.ListDocuments, {});
    expect(events.find((e) => e.type === 'step')).toMatchObject({
      type: 'step',
      data: { tool: ToolName.ListDocuments, success: true },
    });
    expect(events.find((e) => e.type === 'answer')).toBeDefined();
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits one step event per tool when LLM chains multiple tool calls', async () => {
    anthropicCreate
      .mockResolvedValueOnce(toolUseResponse(ToolName.ListDocuments, {}))
      .mockResolvedValueOnce(toolUseResponse(ToolName.ReadDocument, { filename: MOCK_FILENAME }))
      .mockResolvedValueOnce(endTurnResponse(ANSWER_TEXT_READ));

    const events: StreamEvent[] = [];
    await service.runAgentLoop('cross doc query', (e) => events.push(e), ModelId.ClaudeOpus4);

    const steps = events.filter((e) => e.type === 'step');
    expect(steps).toHaveLength(2);

    /**
     *  at(-1) is JavaScript's way of reading the last element of an array (negative index counts from the end). The assertion checks that done is always the final event emitted — no
     *   matter whether the loop ended with an answer or an error, the stream must be properly closed.
     * */
    expect(steps[1]).toMatchObject({ type: 'step', data: { tool: ToolName.ReadDocument } });
  });

  it('emits error + done when the loop hits the max-iteration guard', async () => {
    // mockResolvedValue (without Once) sets a permanent default — every call
    // returns the same tool-use response forever. No end_turn is ever queued,
    // so the loop runs until the max-iteration guard fires.
    anthropicCreate.mockResolvedValue(toolUseResponse(ToolName.ListDocuments, {}));

    const events: StreamEvent[] = [];
    await service.runAgentLoop('looping query', (e) => events.push(e), ModelId.ClaudeOpus4);

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect((errorEvent as { type: string; data: string }).data).toContain('maximum iterations');
    expect(events.at(-1)).toEqual({ type: 'done' });
  });
});
