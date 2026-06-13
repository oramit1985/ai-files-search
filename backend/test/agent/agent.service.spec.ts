// Set before any imports so the Anthropic constructor doesn't throw on missing key.
process.env.ANTHROPIC_API_KEY = 'test-key';

import { AgentService } from '@agent/agent.service';
import { ToolsRegistry } from '@tools/tools.registry';
import { ToolsExecutor } from '@tools/tools.executor';
import { ContentBlockType, FinishReason, ModelId, StreamEvent, ToolName } from '@doc-agent/shared';

const mockRegistry = { getDefinitions: () => [] } as unknown as ToolsRegistry;

const mockExecutor = {
  execute: jest.fn().mockResolvedValue({ success: true, content: 'mock result' }),
} as unknown as ToolsExecutor;

function makeAnthropicMock(responses: object[]) {
  let call = 0;
  return {
    messages: {
      create: jest.fn().mockImplementation(() => Promise.resolve(responses[call++])),
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
    content: [
      { type: ContentBlockType.ToolUse, id: 'tool_1', name, input },
    ],
  };
}

describe('AgentService', () => {
  let service: AgentService;

  beforeEach(() => {
    (mockExecutor.execute as jest.Mock).mockClear();
    service = new AgentService(mockRegistry, mockExecutor);
  });

  it('emits answer and done on immediate end_turn', async () => {
    (service as any).anthropic = makeAnthropicMock([endTurnResponse('The answer is 42.')]);

    const events: StreamEvent[] = [];
    await service.runAgentLoop('test query', (e) => events.push(e), ModelId.ClaudeOpus4);

    expect(events.find((e) => e.type === 'answer')).toMatchObject({ type: 'answer', data: 'The answer is 42.' });
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits a step event before the answer', async () => {
    (service as any).anthropic = makeAnthropicMock([
      toolUseResponse(ToolName.ListDocuments, {}),
      endTurnResponse('Based on the documents, the answer is X.'),
    ]);

    const events: StreamEvent[] = [];
    await service.runAgentLoop('list docs', (e) => events.push(e), ModelId.ClaudeOpus4);

    expect(mockExecutor.execute).toHaveBeenCalledWith(ToolName.ListDocuments, {});
    expect(events.find((e) => e.type === 'step')).toMatchObject({ type: 'step', data: { tool: ToolName.ListDocuments, success: true } });
    expect(events.find((e) => e.type === 'answer')).toBeDefined();
    expect(events.at(-1)).toEqual({ type: 'done' });
  });

  it('emits multiple step events when chaining tool calls', async () => {
    (service as any).anthropic = makeAnthropicMock([
      toolUseResponse(ToolName.ListDocuments, {}),
      toolUseResponse(ToolName.ReadDocument, { filename: 'meetings.md' }),
      endTurnResponse('Final answer after reading.'),
    ]);

    const events: StreamEvent[] = [];
    await service.runAgentLoop('cross doc query', (e) => events.push(e), ModelId.ClaudeOpus4);

    const steps = events.filter((e) => e.type === 'step');
    expect(steps).toHaveLength(2);
    expect(steps[1]).toMatchObject({ type: 'step', data: { tool: ToolName.ReadDocument } });
  });

  it('emits error and done when max iterations are exceeded', async () => {
    (service as any).anthropic = makeAnthropicMock(
      Array(11).fill(toolUseResponse(ToolName.ListDocuments, {})),
    );

    const events: StreamEvent[] = [];
    await service.runAgentLoop('looping query', (e) => events.push(e), ModelId.ClaudeOpus4);

    expect(events.find((e) => e.type === 'error')).toMatchObject({ type: 'error', data: expect.stringContaining('maximum iterations') });
    expect(events.at(-1)).toEqual({ type: 'done' });
  });
});
