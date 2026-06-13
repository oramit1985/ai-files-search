import type { Message, StreamEvent } from './types';

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export async function streamQuery(
  query: string,
  history: Message[],
  onEvent: (event: StreamEvent) => void,
): Promise<void> {
  const res = await fetch(`${BASE}/agent/query`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, history }),
  });

  if (!res.ok || !res.body) {
    onEvent({ type: 'error', data: `Request failed: ${res.status}` });
    onEvent({ type: 'done' });
    return;
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const chunks = buffer.split('\n\n');
    buffer = chunks.pop() ?? '';

    for (const chunk of chunks) {
      const dataLine = chunk.split('\n').find((l) => l.startsWith('data: '));
      if (!dataLine) continue;
      try {
        const event = JSON.parse(dataLine.slice(6)) as StreamEvent;
        onEvent(event);
      } catch {
        // ignore malformed SSE frames
      }
    }
  }
}
