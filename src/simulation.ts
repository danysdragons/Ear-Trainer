// Reproducible synthetic listeners for validation, not claims about human learning.
import { advanceDifficulty, nominalTarget } from './game';
import { summarizeSession } from './session';
import { Settings, Trial } from './types';

export function seededRandom(seed: number) {
  let value = seed >>> 0;
  return () => {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

export function simulateListener(settings: Settings, questions: number, seed: number, slope = 4, chanceOnly = false) {
  const random = seededRandom(seed);
  const trials: Trial[] = [];
  let state = { gap: settings.startingGapCents, streak: 0 };
  for (let i = 0; i < questions; i++) {
    // Logistic curve on log gap, with 50% guessing and 75% correct at 15 cents.
    const probability = chanceOnly ? 0.5 : 0.5 + 0.5 / (1 + Math.exp(-slope * Math.log(state.gap / 15)));
    const correct = random() < probability;
    trials.push({ gapCents: state.gap, correct, replays: 0 });
    state = advanceDifficulty(state.gap, correct, state.streak, settings);
  }
  const target = nominalTarget(settings)! / 100;
  const q = 2 * target - 1;
  const trueThreshold = q > 0 && q < 1 ? 15 * Math.exp(Math.log(q / (1 - q)) / slope) : null;
  return { trials, summary: summarizeSession(trials, settings), trueThreshold };
}
