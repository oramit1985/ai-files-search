import { useState } from 'react';
import type { AgentStep } from '../types';

interface Props {
  steps: AgentStep[];
}

const TOOL_LABELS: Record<string, string> = {
  list_documents:  'List Documents',
  read_document:   'Read Document',
  search_document: 'Search Document',
};

export function ThinkingSteps({ steps }: Props) {
  const [open, setOpen] = useState(false);

  if (steps.length === 0) return null;

  return (
    <div className="mt-2">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1 text-xs text-sky-500 hover:text-sky-700 transition-colors"
      >
        <span>{open ? '▼' : '▶'}</span>
        <span>{steps.length} tool call{steps.length !== 1 ? 's' : ''}</span>
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {steps.map((step, i) => (
            <StepCard key={i} step={step} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}

function StepCard({ step, index }: { step: AgentStep; index: number }) {
  const [expanded, setExpanded] = useState(false);
  const label = TOOL_LABELS[step.tool] ?? step.tool;

  return (
    <div className={`rounded-lg border text-xs font-mono ${step.success ? 'border-sky-200 bg-sky-50' : 'border-red-200 bg-red-50'}`}>
      <button
        onClick={() => setExpanded((e) => !e)}
        className="w-full flex items-center gap-2 px-3 py-2 text-left"
      >
        <span className={`inline-block w-5 h-5 rounded-full text-center leading-5 text-white text-xs font-bold ${step.success ? 'bg-green-500' : 'bg-red-500'}`}>
          {index + 1}
        </span>
        <span className="font-semibold text-sky-800">{label}</span>
        {Object.entries(step.input).map(([k, v]) => (
          <span key={k} className="text-sky-400">
            {k}=<span className="text-sky-600">"{String(v)}"</span>
          </span>
        ))}
        <span className="ml-auto text-sky-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-sky-200 px-3 py-2">
          <p className="text-sky-500 mb-1">Result:</p>
          <pre className="whitespace-pre-wrap break-all text-sky-800 max-h-48 overflow-y-auto">
            {typeof step.result === 'string'
              ? step.result
              : JSON.stringify(step.result, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
}
