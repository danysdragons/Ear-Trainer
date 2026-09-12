import React, { useState } from 'react';
import { Play } from 'lucide-react';
import { HighScores, SessionRecord, Settings } from '../types';
import { formatGap } from '../game';
import { conditionsKey } from '../session';
import PracticeConditions from './PracticeConditions';
import SessionStats from './SessionStats';

interface ReadyScreenProps {
  startGame: () => void;
  openSettings: () => void;
  useRecommended: () => void;
  settings: Settings;
  highScores: HighScores;
  sessions: SessionRecord[];
  starting: boolean;
}

const ReadyScreen = ({ startGame, openSettings, useRecommended, settings, highScores, sessions, starting }: ReadyScreenProps) => {
  const [sameSettingsOnly, setSameSettingsOnly] = useState(true);
  const matching = sessions.filter(session => !sameSettingsOnly || conditionsKey(session.settings) === conditionsKey(settings));
  const historical = Object.entries(highScores).filter(([, record]) => record.score > 0);
  return (
    <div>
      <p className="mb-4 text-gray-600">Listen to two tones. Decide whether the pitch named in the question is higher or lower than the other.</p>
      <div className="bg-indigo-50 rounded-lg p-4 mb-4 space-y-2">
        <p className="font-semibold text-indigo-900">Start at {formatGap(settings.startingGapCents)} cents</p>
        <PracticeConditions settings={settings} />
        <button onClick={openSettings} className="text-sm text-indigo-700 underline pt-2" disabled={starting}>Adjust practice settings</button>
      </div>
      {settings.progressionMode === 'custom' && <div className="rounded-lg bg-amber-50 p-3 mb-4 text-sm text-amber-900">
        <p>Custom percentages are active. Recommended adaptation aims for 75% correct, with unlimited lives and a 50-question session.</p>
        <button onClick={useRecommended} disabled={starting} className="underline mt-2 font-semibold">Use recommended practice</button>
      </div>}
      <button onClick={startGame} disabled={starting} className="primary-button flex items-center justify-center w-full mb-4 disabled:opacity-50">
        <Play className="mr-2" size={20} />{starting ? 'Starting audio…' : 'Start Game'}
      </button>
      <section className="mt-6" aria-label="Recent sessions">
        <h3 className="text-lg font-semibold mb-2">Recent sessions</h3>
        <label className="flex items-center gap-2 text-sm mb-3">
          <input type="checkbox" checked={sameSettingsOnly} onChange={event => setSameSettingsOnly(event.target.checked)} className="accent-indigo-600" />
          Same settings only
        </label>
        {matching.length === 0 && <p className="text-sm text-gray-600">{sessions.length ? 'No sessions match these settings. Turn off the filter to see other sessions.' : 'Your session accuracy and practice gaps will appear here.'}</p>}
        <div className="space-y-3">
          {matching.map(session => <details key={session.id} className="rounded-lg border border-gray-200 p-3">
            <summary className="cursor-pointer text-sm">
              <span className="font-semibold">{formatGap(session.summary.accuracy!)}% correct · {session.summary.answered} {session.summary.answered === 1 ? 'answer' : 'answers'}</span>
              <span className="block text-gray-600">Typical gap {formatGap(session.summary.typicalGap!)} cents · {new Date(session.completedAt).toLocaleString()}</span>
            </summary>
            <div className="mt-4 space-y-4">
              <SessionStats summary={session.summary} />
              <PracticeConditions settings={session.settings} />
              <p className="text-xs text-gray-500">Ended: {session.endReason === 'lives' ? 'out of lives' : session.endReason === 'questions' ? 'question limit' : 'manually'}.</p>
            </div>
          </details>)}
        </div>
        <p className="text-xs text-gray-500 mt-3">The latest 30 sessions are saved on this device. Compare similar conditions; a smaller gap on its own is not a better result.</p>
      </section>
      {historical.length > 0 && <details className="mt-5 text-sm">
        <summary className="cursor-pointer font-semibold">Historical scores</summary>
        <p className="text-gray-600 my-2">Preserved from the previous scoring system. Their gaps may reflect lucky answers or unplayed difficulty levels and are not threshold measurements.</p>
        <table className="w-full text-sm">
          <thead><tr><th scope="col" className="text-left">Register</th><th scope="col">Score</th><th scope="col">Recorded gap</th></tr></thead>
          <tbody>{historical.map(([mode, record]) => <tr key={mode}>
            <th scope="row" className="text-left font-normal capitalize py-2">{mode}</th><td className="text-center">{record.score}</td><td className="text-center">{record.difficulty === null ? '—' : `${formatGap(record.difficulty)} cents`}</td>
          </tr>)}</tbody>
        </table>
      </details>}
    </div>
  );
};

export default ReadyScreen;
