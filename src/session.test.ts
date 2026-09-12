import { DEFAULT_SETTINGS } from './constants';
import { advanceDifficulty } from './game';
import { conditionsKey, sessionEnd, summarizeSession } from './session';
import { Settings, Trial } from './types';

function controlledSession(count: number, settings = DEFAULT_SETTINGS): Trial[] {
  let state = { gap: 20, streak: 0 };
  return Array.from({ length: count }, (_, i) => {
    const correct = i % 4 !== 3;
    const trial = { gapCents: state.gap, correct, replays: 0 };
    state = advanceDifficulty(state.gap, correct, state.streak, settings);
    return trial;
  });
}

test('summaries describe answered trials, not unplayed or single lucky levels', () => {
  const summary = summarizeSession([{ gapCents: 20, correct: true, replays: 2 }, { gapCents: 10, correct: false, replays: 0 }], DEFAULT_SETTINGS);
  expect(summary).toMatchObject({ answered: 2, correct: 1, accuracy: 50, typicalGap: 15, smallestCorrectGap: 20, replays: 2, estimate: { gap: null, status: 'insufficient' } });
  expect(summarizeSession([], DEFAULT_SETTINGS)).toMatchObject({ answered: 0, accuracy: null, typicalGap: null, smallestCorrectGap: null });
});

test('estimates require settling, enough reversals, and stable above-chance evidence', () => {
  expect(summarizeSession(controlledSession(20), DEFAULT_SETTINGS).estimate.status).toBe('insufficient');
  const long = controlledSession(80);
  expect(summarizeSession(long, DEFAULT_SETTINGS).estimate).toMatchObject({ status: 'available', targetPercent: 75, boundary: null });
  const guessing = long.map((trial, i) => ({ ...trial, correct: i % 2 === 0 }));
  expect(summarizeSession(guessing, DEFAULT_SETTINGS).estimate.status).toBe('unstable');
  const drifting = long.map((trial, i) => ({ ...trial, gapCents: i >= 70 ? trial.gapCents * 3 : trial.gapCents }));
  expect(summarizeSession(drifting, DEFAULT_SETTINGS).estimate.status).toBe('unstable');
});

test.each([1, 100])('a gap of %s in recent trials is explicitly flagged', gap => {
  const trials = controlledSession(80);
  trials[trials.length - 1].gapCents = gap;
  expect(summarizeSession(trials, DEFAULT_SETTINGS).estimate).toMatchObject({ status: 'boundary', gap: null, boundary: gap === 1 ? 'minimum' : 'maximum' });
});

test('fixed and below-chance custom rules have no threshold estimate', () => {
  const trials = controlledSession(80);
  expect(summarizeSession(trials, { ...DEFAULT_SETTINGS, progressionMode: 'fixed' }).estimate.status).toBe('unsupported');
  expect(summarizeSession(trials, { ...DEFAULT_SETTINGS, progressionMode: 'custom', successReductionPercent: 50 }).estimate.status).toBe('unsupported');
});

test('streak holds do not count as direction changes', () => {
  const trials = Array.from({ length: 60 }, (_, i) => ({ gapCents: i < 30 ? 20 : 15, correct: true, replays: 0 }));
  expect(summarizeSession(trials, DEFAULT_SETTINGS).estimate).toMatchObject({ status: 'insufficient', reversals: 0 });
});

test('session limits are independent and the first limit ends practice', () => {
  expect(sessionEnd(DEFAULT_SETTINGS, 50, 10)).toBe('questions');
  expect(sessionEnd({ ...DEFAULT_SETTINGS, questionLimit: null }, 500, 200)).toBeNull();
  expect(sessionEnd({ ...DEFAULT_SETTINGS, unlimitedLives: false }, 12, 3)).toBe('lives');
  expect(sessionEnd({ ...DEFAULT_SETTINGS, progressionMode: 'fixed', unlimitedLives: false }, 4, 3)).toBe('lives');
});

test('comparison keys include effective practice conditions', () => {
  expect(conditionsKey(DEFAULT_SETTINGS)).toBe(conditionsKey({ ...DEFAULT_SETTINGS, successReductionPercent: 80, lives: 9 }));
  for (const change of [{ targetCorrectPercent: 80 }, { adjustmentPercent: 10 }, { startingGapCents: 10 }, { instrument: 'piano' }, { backgroundNoise: 'pink' }, { pitchSelection: 'note' }, { gameMode: 'low' }, { unlimitedLives: false }, { questionLimit: 100 }]) {
    expect(conditionsKey({ ...DEFAULT_SETTINGS, ...change } as Settings)).not.toBe(conditionsKey(DEFAULT_SETTINGS));
  }
});
