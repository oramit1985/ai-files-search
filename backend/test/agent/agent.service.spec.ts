// Set before any imports so the Anthropic constructor doesn't throw on missing key.
process.env.ANTHROPIC_API_KEY = 'test-key';

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

const mockRegistry = { getDefinitions: () => [] } as unknown as ToolsRegistry;

const mockExecutor = {
  execute: jest
    .fn()
    .mockResolvedValue({ success: true, content: 'mock result' }),
} as unknown as ToolsExecutor;

function makeAnthropicMock(responses: object[]) {
  let call = 0;
  return {
    messages: {
      create: jest
        .fn()
        .mockImplementation(() => Promise.resolve(responses[call++])),
    },
  };
}

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

type AnthropicMock = ReturnType<typeof makeAnthropicMock>;

function setAnthropicMock(svc: AgentService, mock: AnthropicMock): void {
  (svc as unknown as { anthropic: AnthropicMock }).anthropic = mock;
}

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    (mockExecutor.execute as jest.Mock).mockClear();
    service = new AgentService(mockRegistry, mockExecutor);
  });

  it('emits answer and done on immediate end_turn', async () => {
    setAnthropicMock(
      service,
      makeAnthropicMock([endTurnResponse('The answer is 42.')]),
    );

    const events: StreamEvent[] = [];
    await service.runAgentLoop(
      'test query',
      (e) => events.push(e),
      ModelId.ClaudeOpus4,
    );

    expect(events.find((e) => e.type === 'answer')).toMatchObject({
      type: 'answer',
      data: 'The answer is 42.',
    });
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits a step event before the answer', async () => {
    setAnthropicMock(
      service,
      makeAnthropicMock([
        toolUseResponse(ToolName.ListDocuments, {}),
        endTurnResponse('Based on the documents, the answer is X.'),
      ]),
    );

    const events: StreamEvent[] = [];
    await service.runAgentLoop(
      'list docs',
      (e) => events.push(e),
      ModelId.ClaudeOpus4,
    );

    // eslint-disable-next-line @typescript-eslint/unbound-method
    expect(mockExecutor.execute).toHaveBeenCalledWith(
      ToolName.ListDocuments,
      {},
    );
    expect(events.find((e) => e.type === 'step')).toMatchObject({
      type: 'step',
      data: { tool: ToolName.ListDocuments, success: true },
    });
    expect(events.find((e) => e.type === 'answer')).toBeDefined();
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits multiple step events when chaining tool calls', async () => {
    setAnthropicMock(
      service,
      makeAnthropicMock([
        toolUseResponse(ToolName.ListDocuments, {}),
        toolUseResponse(ToolName.ReadDocument, { filename: 'meetings.md' }),
        endTurnResponse('Final answer after reading.'),
      ]),
    );

    const events: StreamEvent[] = [];
    await service.runAgentLoop(
      'cross doc query',
      (e) => events.push(e),
      ModelId.ClaudeOpus4,
    );

    const steps = events.filter((e) => e.type === 'step');
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({
      type: 'step',
      data: { tool: ToolName.ReadDocument },
    });
  });

  it('emits error and done when max iterations are exceeded', async () => {
    const responses = Array.from<object>({ length: 11 }).fill(
      toolUseResponse(ToolName.ListDocuments, {}),
    );
    setAnthropicMock(service, makeAnthropicMock(responses));

    const events: StreamEvent[] = [];
    await service.runAgentLoop(
      'looping query',
      (e) => events.push(e),
      ModelId.ClaudeOpus4,
    );

    const errorEvent = events.find((e) => e.type === 'error');
    expect(errorEvent).toBeDefined();
    expect((errorEvent as { type: string; data: string }).data).toContain(
      'maximum iterations',
    );
    expect(events.at(-1)).toEqual({ type: 'done' });
  });
});
