import React from 'react';
import { INSTRUMENT_OPTIONS, NOISE_OPTIONS, PROGRESSION_OPTIONS } from '../constants';
import { formatGap, nominalTarget, stepMultipliers } from '../game';
import { Settings } from '../types';

const PracticeConditions = ({ settings }: { settings: Settings }) => {
  const target = nominalTarget(settings);
  const { down } = stepMultipliers(settings);
  return (
    <div className="text-sm text-gray-600 space-y-1">
      <p>{PROGRESSION_OPTIONS[settings.progressionMode]}{target === null ? '' : ` · nominal ${formatGap(target)}% correct`}</p>
      {settings.progressionMode !== 'fixed' && <p>Step: −{Number(((1 - down) * 100).toFixed(2))}% / +{formatGap(settings.adjustmentPercent)}%{settings.progressionMode.startsWith('streak') ? ' after a streak / error' : ' after success / error'}</p>}
      <p>Start: {formatGap(settings.startingGapCents)} cents · {settings.unlimitedLives ? 'unlimited lives' : `${settings.lives} lives`} · {settings.questionLimit === null ? 'no question limit' : `${settings.questionLimit} questions`}</p>
      <p><span className="capitalize">{settings.gameMode}</span> register · {settings.pitchSelection === 'note' ? 'Musical note reference' : 'Arbitrary pitches'}</p>
      <p>{INSTRUMENT_OPTIONS[settings.instrument].name} · {NOISE_OPTIONS[settings.backgroundNoise].name}</p>
    </div>
  );
};

export default PracticeConditions;
