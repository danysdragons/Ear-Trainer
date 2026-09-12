import React from 'react';
import { formatGap } from '../game';
import { SessionSummary } from '../types';

const SessionStats = ({ summary }: { summary: SessionSummary }) => {
  const { estimate } = summary;
  const explanation = {
    insufficient: 'Not enough data. An estimate needs at least 40 answered pairs and 8 changes in difficulty direction after the first 20 settling answers.',
    boundary: `Recent practice reached the ${estimate.boundary === 'both' ? 'minimum and maximum' : estimate.boundary} gap limit. A threshold within this range cannot be estimated reliably.`,
    unsupported: 'No threshold estimate for fixed gaps or custom rules targeting at/below chance or 100% success.',
    unstable: 'Not enough stable evidence above chance. Continue practising; an estimate would be premature.',
    available: 'Approximate practice estimate from recent changes in difficulty direction. It is not a validated hearing measurement.',
  };
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 text-center">
        <div className="rounded-lg bg-indigo-50 p-3">
          <p className="text-sm text-gray-600">Accuracy</p>
          <p className="text-2xl font-semibold text-indigo-800">{summary.accuracy === null ? '—' : `${formatGap(summary.accuracy)}%`}</p>
          <p className="text-xs text-gray-600">{summary.correct} correct / {summary.answered} answered</p>
        </div>
        <div className="rounded-lg bg-gray-100 p-3">
          <p className="text-sm text-gray-600">Typical practice gap</p>
          <p className="text-2xl font-semibold">{summary.typicalGap === null ? '—' : `${formatGap(summary.typicalGap)}`}</p>
          <p className="text-xs text-gray-600">{summary.typicalGap === null ? 'No answers yet' : `cents · median of last ${Math.min(20, summary.answered)} ${summary.answered === 1 ? 'answer' : 'answers'}`}</p>
        </div>
      </div>
      <div className="rounded-lg border border-gray-200 p-3 text-sm">
        <h3 className="font-semibold">Practice threshold estimate</h3>
        {estimate.gap !== null && <p className="text-lg font-semibold mt-1">{formatGap(estimate.gap)} cents</p>}
        {estimate.targetPercent !== null && <p className="text-gray-600">At approximately {formatGap(estimate.targetPercent)}% correct</p>}
        <p className="text-gray-600 mt-1">{explanation[estimate.status]}</p>
        {summary.replays > 0 && <p className="text-gray-600 mt-2">{summary.replays} {summary.replays === 1 ? 'replay' : 'replays'} used on answered pairs. These results include replay-assisted answers.</p>}
      </div>
      <details className="text-sm text-gray-600">
        <summary className="cursor-pointer">Single-answer statistic</summary>
        <p className="mt-2">{summary.smallestCorrectGap === null ? 'No correct answers this session.' : `Smallest gap answered correctly once: ${formatGap(summary.smallestCorrectGap)} cents.`} A single correct answer can be a lucky guess and does not establish a threshold.</p>
      </details>
    </div>
  );
};

export default SessionStats;
