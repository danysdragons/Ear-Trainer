import React from 'react';
import { RefreshCw, Settings as SettingsIcon } from 'lucide-react';
import { EndReason, SessionSummary, Settings } from '../types';
import SessionStats from './SessionStats';
import PracticeConditions from './PracticeConditions';

interface GameOverScreenProps {
  summary: SessionSummary;
  settings: Settings;
  endReason: EndReason;
  startNewGame: () => void;
  openSettings: () => void;
}

const GameOverScreen = ({ summary, settings, startNewGame, openSettings, endReason }: GameOverScreenProps) => (
  <section aria-label="Session results" className="space-y-5">
    <div className="text-center">
      <h2 className="text-2xl font-bold">{endReason === 'lives' ? 'Game Over!' : 'Practice complete'}</h2>
      <p className="text-sm text-gray-600 mt-1">{endReason === 'questions' ? 'Question limit reached.' : endReason === 'lives' ? 'You have used all your lives.' : 'Session ended.'}</p>
    </div>
    <SessionStats summary={summary} />
    <details className="text-sm"><summary className="font-semibold cursor-pointer">Practice conditions</summary><div className="mt-2"><PracticeConditions settings={settings} /></div></details>
    <div className="grid grid-cols-2 gap-3">
      <button onClick={startNewGame} className="primary-button flex items-center justify-center"><RefreshCw className="mr-2" size={18} />Play Again</button>
      <button onClick={openSettings} className="secondary-button flex items-center justify-center"><SettingsIcon className="mr-2" size={18} />Settings</button>
    </div>
  </section>
);

export default GameOverScreen;
