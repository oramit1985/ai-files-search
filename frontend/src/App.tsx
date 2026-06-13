import { useState } from 'react';
import { streamQuery } from './api';
import { ChatWindow } from './components/ChatWindow';
import { QueryInput } from './components/QueryInput';
import type { ChatMessage, Message } from './types';
import { type AgentStep, MessageRole } from '@doc-agent/shared';

export default function App() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const updateLastAssistant = (updater: (msg: ChatMessage) => ChatMessage) => {
    setMessages((prev) => {
      const next = [...prev];
      const idx = next.length - 1;
      if (next[idx]?.role === MessageRole.Assistant) next[idx] = updater(next[idx]);
      return next;
    });
  };

  const handleQuery = async (query: string) => {
    const history: Message[] = messages
      .filter((m) => m.content)
      .map((m) => ({ role: m.role, content: m.content }));

    setMessages((prev) => [
      ...prev,
      { role: MessageRole.User, content: query },
      { role: MessageRole.Assistant, content: '', steps: [] },
    ]);
    setLoading(true);

    await streamQuery(query, history, (event) => {
      if (event.type === 'step') {
        updateLastAssistant((msg) => ({
          ...msg,
          steps: [...(msg.steps ?? []), event.data as AgentStep],
        }));
      } else if (event.type === 'answer') {
        updateLastAssistant((msg) => ({
          ...msg,
          content: event.data,
          durationMs: event.durationMs,
        }));
      } else if (event.type === 'error') {
        updateLastAssistant((msg) => ({
          ...msg,
          content: event.data,
          error: true,
        }));
      } else if (event.type === 'done') {
        setLoading(false);
      }
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-3xl mx-auto bg-white shadow-xl shadow-sky-200/60">
      <header className="flex-shrink-0 border-b border-sky-200 bg-gradient-to-r from-sky-500 to-sky-400 px-6 py-4">
        <h1 className="text-lg font-semibold text-white tracking-wide">Document Agent</h1>
        <p className="text-xs text-sky-100 mt-0.5">
          Ask questions about meetings, sales data, emails, config, and server logs.
        </p>
      </header>

      <ChatWindow messages={messages} loading={loading} />

      <div className="flex-shrink-0 border-t border-sky-200 bg-sky-50 px-4 py-3">
        <QueryInput onSubmit={handleQuery} loading={loading} />
      </div>
    </div>
  );
}
