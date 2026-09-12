import React, { useState } from 'react';
import { DEFAULT_SETTINGS, FREQUENCY_RANGES, INSTRUMENT_OPTIONS, NOISE_OPTIONS, PROGRESSION_OPTIONS } from '../constants';
import { formatGap, nominalTarget, stepMultipliers } from '../game';
import { Settings } from '../types';

interface SettingsScreenProps {
  settings: Settings;
  onSave: (settings: Settings) => void;
  close: () => void;
}

const numericValues = (settings: Settings) => ({
  gap: String(settings.startingGapCents), lives: String(settings.lives),
  target: String(settings.targetCorrectPercent), speed: String(settings.adjustmentPercent),
  reduction: String(settings.successReductionPercent), questions: String(settings.questionLimit ?? 50),
});

const SettingsScreen = ({ settings, onSave, close }: SettingsScreenProps) => {
  const [draft, setDraft] = useState(settings);
  const [numbers, setNumbers] = useState(() => numericValues(settings));
  const change = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    setDraft(previous => ({ ...previous, [key]: value }));
  const numberChange = (key: keyof typeof numbers, value: string) =>
    setNumbers(previous => ({ ...previous, [key]: value }));
  const validNumber = (key: keyof typeof numbers, min: number, max: number, fallback: number) => {
    const value = Number(numbers[key]);
    const integral = (key !== 'lives' && key !== 'questions') || Number.isInteger(value);
    return numbers[key] !== '' && Number.isFinite(value) && integral && value >= min && value <= max ? value : fallback;
  };
  const proposed: Settings = {
    ...draft,
    startingGapCents: validNumber('gap', 1, 100, draft.startingGapCents),
    lives: validNumber('lives', 1, 99, draft.lives),
    questionLimit: draft.questionLimit === null ? null : validNumber('questions', 1, 1000, draft.questionLimit),
    targetCorrectPercent: validNumber('target', 60, 90, draft.targetCorrectPercent),
    adjustmentPercent: validNumber('speed', 1, 100, draft.adjustmentPercent),
    successReductionPercent: validNumber('reduction', 0, 90, draft.successReductionPercent),
  };
  const multipliers = stepMultipliers(proposed);
  const target = nominalTarget(proposed);
  const streakRule = draft.progressionMode === 'streak2' || draft.progressionMode === 'streak3';
  const recommended = () => {
    change('progressionMode', 'target');
    setNumbers(previous => ({ ...previous, target: '75', speed: '30' }));
  };

  return (
    <form onSubmit={event => {
      event.preventDefault();
      if (event.currentTarget.reportValidity()) onSave(proposed);
    }} className="space-y-6">
      <p className="text-sm text-gray-600">Choose your challenge and session length. Changes are saved on this device when you select Save settings.</p>
      <div>
        <label htmlFor="startingGap" className="block font-medium mb-1">Starting pitch gap (cents)</label>
        <input id="startingGap" type="number" required min="1" max="100" step="0.1" value={numbers.gap}
          onChange={event => numberChange('gap', event.target.value)} aria-describedby="gapHelp" className="setting-input" />
        <input aria-label="Starting pitch gap slider" type="range" min="1" max="100" step="0.1" value={numbers.gap || 1}
          onChange={event => numberChange('gap', event.target.value)} className="w-full mt-2 accent-indigo-600" />
        <p id="gapHelp" className="text-sm text-gray-600">1–100 cents. Smaller gaps are harder; 100 cents is one semitone. Every new session starts here.</p>
      </div>

      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg mb-3">Difficulty progression</legend>
        <div>
          <label htmlFor="progressionMode" className="block font-medium mb-1">Progression rule</label>
          <select id="progressionMode" value={draft.progressionMode} onChange={event => change('progressionMode', event.target.value as Settings['progressionMode'])} className="setting-input">
            {Object.entries(PROGRESSION_OPTIONS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        </div>
        {draft.progressionMode === 'target' && <div>
          <label htmlFor="targetAccuracy" className="block font-medium mb-1">Target success rate (%)</label>
          <input id="targetAccuracy" type="number" min="60" max="90" step="0.1" required value={numbers.target}
            onChange={event => numberChange('target', event.target.value)} aria-describedby="targetHelp" className="setting-input" />
          <p id="targetHelp" className="text-sm text-gray-600 mt-1">60–90%. Higher targets favour more successful answers. 75% is a starting point; actual accuracy varies.</p>
        </div>}
        {streakRule && <p className="text-sm text-gray-600">
          Narrow the gap after {draft.progressionMode === 'streak2' ? 'two' : 'three'} consecutive correct answers. One mistake widens it. The streak resets after either change. Nominal target: {formatGap(target!)}% correct.
        </p>}
        {draft.progressionMode !== 'fixed' && <div>
          <label htmlFor="adjustmentSpeed" className="block font-medium mb-1">Adjustment speed: widening on error (%)</label>
          <input id="adjustmentSpeed" type="number" min="1" max="100" step="0.1" required value={numbers.speed}
            onChange={event => numberChange('speed', event.target.value)} aria-describedby="speedHelp" className="setting-input" />
          <p id="speedHelp" className="text-sm text-gray-600 mt-1">Smaller steps are smoother; larger steps move faster but fluctuate more. Target and streak rules automatically pair the steps to preserve their nominal target.</p>
        </div>}
        {draft.progressionMode === 'custom' && <div>
          <p className="rounded-lg bg-amber-50 text-amber-900 p-3 text-sm mb-3">Your previous percentages are preserved here. Independently chosen steps can target performance near guessing.</p>
          <label htmlFor="progression" className="block font-medium mb-1">Gap reduction per correct answer (%)</label>
          <input id="progression" type="number" min="0" max="90" step="0.1" required value={numbers.reduction}
            onChange={event => numberChange('reduction', event.target.value)} className="setting-input" />
        </div>}
        {draft.progressionMode === 'fixed' ? <p className="text-sm text-gray-600">The gap does not change after answers. A slider during practice lets you choose the next pair’s gap. This replaces Sandbox; lives and session length are now separate controls.</p> : <div className="rounded-lg bg-indigo-50 p-3 text-sm text-indigo-900 space-y-1" aria-live="polite">
          <p>Nominal target: {formatGap(target!)}% correct.</p>
          <p>After {streakRule ? 'a complete streak' : 'a correct answer'}: narrow by {Number(((1 - multipliers.down) * 100).toFixed(2))}%. After a mistake: widen by {formatGap(proposed.adjustmentPercent)}%.</p>
          {target! <= 55 && <p className="font-semibold">This target is close to or below 50% guessing. Try the recommended adaptation.</p>}
          {target === 100 && <p>With 0% reduction, only mistakes change the gap. Use Fixed gap to hold it constant.</p>}
          <p>Gap limits and short sessions can prevent the rule from reaching its target.</p>
        </div>}
        <button type="button" onClick={recommended} className="text-sm text-indigo-700 underline">Use recommended adaptation (75%)</button>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="font-semibold text-lg mb-3">Session length</legend>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.unlimitedLives} onChange={event => change('unlimitedLives', event.target.checked)} className="accent-indigo-600" />
          <span className="font-medium">Unlimited lives</span>
        </label>
        {!draft.unlimitedLives && <div>
          <label htmlFor="lives" className="block font-medium mb-1">Lives</label>
          <input id="lives" type="number" required min="1" max="99" step="1" value={numbers.lives}
            onChange={event => numberChange('lives', event.target.value)} className="setting-input" />
          <p className="text-sm text-gray-600 mt-1">Short games may end before difficulty settles. Unlimited lives keeps adaptation active.</p>
        </div>}
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={draft.questionLimit !== null} onChange={event => change('questionLimit', event.target.checked ? 50 : null)} className="accent-indigo-600" />
          <span className="font-medium">End after a set number of questions</span>
        </label>
        {draft.questionLimit !== null && <div>
          <label htmlFor="questionLimit" className="block font-medium mb-1">Questions per session</label>
          <input id="questionLimit" type="number" required min="1" max="1000" step="1" value={numbers.questions}
            onChange={event => numberChange('questions', event.target.value)} className="setting-input" />
          <p className="text-sm text-gray-600 mt-1">Counts answered pairs, not replays. If lives are limited, the session ends at whichever limit comes first.</p>
        </div>}
        <p className="text-sm text-gray-600">You can always select End practice. With both limits off, practice continues until you finish it.</p>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className="font-semibold text-lg mb-3">Pitch selection</legend>
        <label className="flex items-start gap-2">
          <input type="radio" name="pitchSelection" value="arbitrary" checked={draft.pitchSelection === 'arbitrary'}
            onChange={() => change('pitchSelection', 'arbitrary')} className="mt-1 accent-indigo-600" />
          <span><span className="font-medium">Arbitrary pitches</span><span className="block text-sm text-gray-600">Compare two frequencies at the chosen gap, without snapping either to a musical note.</span></span>
        </label>
        <label className="flex items-start gap-2">
          <input type="radio" name="pitchSelection" value="note" checked={draft.pitchSelection === 'note'}
            onChange={() => change('pitchSelection', 'note')} className="mt-1 accent-indigo-600" />
          <span><span className="font-medium">Musical note reference</span><span className="block text-sm text-gray-600">One pitch is an equal-tempered note (A4 = 440 Hz); the other is offset by the chosen gap. The reference can play first or second.</span></span>
        </label>
        <p className="text-sm text-gray-600">Each round independently asks about the first or second pitch.</p>
      </fieldset>
      <div>
        <label htmlFor="register" className="block font-semibold mb-2">Pitch register</label>
        <select id="register" value={draft.gameMode} onChange={event => change('gameMode', event.target.value as Settings['gameMode'])} className="setting-input">
          {Object.entries(FREQUENCY_RANGES).map(([mode, range]) => <option key={mode} value={mode}>{mode.charAt(0).toUpperCase() + mode.slice(1)} · {range.min}–{range.max} Hz</option>)}
        </select>
      </div>
      <div>
        <label htmlFor="instrument" className="block font-semibold mb-2">Sound</label>
        <select id="instrument" value={draft.instrument} onChange={event => change('instrument', event.target.value as Settings['instrument'])} className="setting-input">
          {Object.entries(INSTRUMENT_OPTIONS).map(([type, info]) => <option key={type} value={type}>{info.name}</option>)}
        </select>
        <p className="text-sm text-gray-600 mt-1">{INSTRUMENT_OPTIONS[draft.instrument].description}</p>
      </div>
      <div>
        <label htmlFor="noise" className="block font-semibold mb-2">Background noise</label>
        <select id="noise" value={draft.backgroundNoise} onChange={event => change('backgroundNoise', event.target.value as Settings['backgroundNoise'])} className="setting-input">
          {Object.entries(NOISE_OPTIONS).map(([type, info]) => <option key={type} value={type}>{info.name}</option>)}
        </select>
      </div>
      <div className="grid grid-cols-2 gap-3 sticky bottom-0 bg-white py-3 border-t border-gray-100">
        <button type="button" onClick={close} className="secondary-button">Cancel</button>
        <button type="submit" className="primary-button">Save settings</button>
      </div>
      <button type="button" onClick={() => { setDraft({ ...DEFAULT_SETTINGS }); setNumbers(numericValues(DEFAULT_SETTINGS)); }} className="w-full text-sm text-gray-600 underline">Restore defaults</button>
    </form>
  );
};

export default SettingsScreen;
