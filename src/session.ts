import { MAX_GAP_CENTS, MIN_GAP_CENTS } from './constants';
import { nominalTarget } from './game';
import { EndReason, SessionSummary, Settings, Trial } from './types';

export const SETTLING_TRIALS = 20;
export const MIN_ESTIMATE_TRIALS = 40;
export const REQUIRED_REVERSALS = 8;

const geometricMean = (values: number[]) => Math.exp(values.reduce((sum, value) => sum + Math.log(value), 0) / values.length);
const median = (values: number[]) => {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
};

export function sessionEnd(settings: Settings, answered: number, mistakes: number): EndReason | null {
  if (!settings.unlimitedLives && mistakes >= settings.lives) return 'lives';
  if (settings.questionLimit !== null && answered >= settings.questionLimit) return 'questions';
  return null;
}

// Descriptive summaries use answered pairs only, never the next generated gap.
// The threshold is an approximate staircase summary, not a validated sensory measurement.
export function summarizeSession(trials: Trial[], settings: Settings): SessionSummary {
  const correctTrials = trials.filter(trial => trial.correct);
  const recent = trials.slice(-20);
  const settled = trials.slice(SETTLING_TRIALS);
  const atMin = recent.some(trial => trial.gapCents <= MIN_GAP_CENTS + 1e-9);
  const atMax = recent.some(trial => trial.gapCents >= MAX_GAP_CENTS - 1e-9);
  const reversals: number[] = [];
  let previousDirection = 0;
  for (let i = 1; i < trials.length; i++) {
    const difference = Math.log(trials[i].gapCents / trials[i - 1].gapCents);
    if (Math.abs(difference) < 1e-9) continue;
    const direction = Math.sign(difference);
    if (previousDirection && direction !== previousDirection && i - 1 >= SETTLING_TRIALS) {
      reversals.push(trials[i - 1].gapCents);
    }
    previousDirection = direction;
  }
  const estimate: SessionSummary['estimate'] = {
    status: 'insufficient', gap: null, targetPercent: nominalTarget(settings),
    reversals: reversals.length,
    boundary: atMin && atMax ? 'both' : atMin ? 'minimum' : atMax ? 'maximum' : null,
  };
  if (estimate.targetPercent === null || estimate.targetPercent <= 50 || estimate.targetPercent >= 100) {
    estimate.status = 'unsupported';
  } else if (estimate.boundary) {
    estimate.status = 'boundary';
  } else if (trials.length >= MIN_ESTIMATE_TRIALS && reversals.length >= REQUIRED_REVERSALS) {
    // A conservative evidence gate: the Wilson lower bound for post-settling
    // accuracy must exceed chance. This is not a confidence interval on the gap.
    const n = settled.length;
    const p = settled.filter(trial => trial.correct).length / n;
    const z = 1.96;
    const lower = (p + z * z / (2 * n) - z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / (1 + z * z / n);
    const early = geometricMean(recent.slice(0, 10).map(trial => trial.gapCents));
    const late = geometricMean(recent.slice(10).map(trial => trial.gapCents));
    if (lower <= 0.5 || Math.max(early / late, late / early) > 1.5) {
      estimate.status = 'unstable';
    } else {
      estimate.status = 'available';
      estimate.gap = geometricMean(reversals.slice(-REQUIRED_REVERSALS));
    }
  }
  return {
    answered: trials.length,
    correct: correctTrials.length,
    accuracy: trials.length ? correctTrials.length / trials.length * 100 : null,
    typicalGap: recent.length ? median(recent.map(trial => trial.gapCents)) : null,
    smallestCorrectGap: correctTrials.length ? Math.min(...correctTrials.map(trial => trial.gapCents)) : null,
    replays: trials.reduce((sum, trial) => sum + trial.replays, 0),
    estimate,
  };
}

// Include all effective settings, while ignoring dormant controls (e.g. the
// custom percentage during target mode). Replay usage is displayed separately.
export function conditionsKey(settings: Settings): string {
  return JSON.stringify([
    settings.gameMode, settings.instrument, settings.backgroundNoise, settings.pitchSelection,
    settings.startingGapCents, settings.unlimitedLives ? null : settings.lives, settings.questionLimit,
    settings.progressionMode,
    settings.progressionMode === 'fixed' ? null : settings.adjustmentPercent,
    settings.progressionMode === 'target' ? settings.targetCorrectPercent : null,
    settings.progressionMode === 'custom' ? settings.successReductionPercent : null,
  ]);
}
