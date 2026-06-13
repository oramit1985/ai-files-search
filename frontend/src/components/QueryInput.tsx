import { useState, KeyboardEvent } from 'react';

interface Props {
  onSubmit: (query: string) => void;
  loading:  boolean;
}

export function QueryInput({ onSubmit, loading }: Props) {
  const [value, setValue] = useState('');

  const handleSubmit = () => {
    const trimmed = value.trim();
    if (!trimmed || loading) return;
    onSubmit(trimmed);
    setValue('');
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="flex gap-2 items-end bg-white border border-sky-200 rounded-2xl p-2 shadow-sm focus-within:ring-2 focus-within:ring-sky-300 transition-shadow">
      <textarea
        className="flex-1 resize-none outline-none text-sm text-gray-800 placeholder-sky-300 max-h-32 px-2 py-1"
        rows={1}
        placeholder="Ask a question about the documents… (Enter to send)"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
        disabled={loading}
      />
      <button
        onClick={handleSubmit}
        disabled={!value.trim() || loading}
        className="flex-shrink-0 bg-sky-500 hover:bg-sky-600 disabled:bg-sky-200 text-white rounded-xl px-4 py-2 text-sm font-medium transition-colors"
      >
        {loading ? '…' : 'Send'}
      </button>
    </div>
  );
}
