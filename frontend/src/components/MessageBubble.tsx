import type { ChatMessage } from '../types';
import { ThinkingSteps } from './ThinkingSteps';

interface Props {
  message: ChatMessage;
}

export function MessageBubble({ message }: Props) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] ${isUser ? 'order-2' : 'order-1'}`}>
        {!isUser && (
          <p className="text-xs text-sky-400 mb-1 px-1">Agent</p>
        )}
        <div
          className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap ${
            isUser
              ? 'bg-sky-500 text-white rounded-tr-sm shadow-sm shadow-sky-200'
              : message.error
              ? 'bg-red-50 text-red-700 border border-red-200 rounded-tl-sm'
              : 'bg-sky-50 text-gray-800 border border-sky-200 rounded-tl-sm shadow-sm shadow-sky-100'
          }`}
        >
          {message.content}
        </div>

        {!isUser && message.steps && message.steps.length > 0 && (
          <div className="px-1">
            <ThinkingSteps steps={message.steps} />
          </div>
        )}

        {!isUser && message.durationMs != null && (
          <p className="text-xs text-sky-400 mt-1 px-1">
            {(message.durationMs / 1000).toFixed(1)}s
          </p>
        )}
      </div>
    </div>
  );
}
