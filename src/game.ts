import { FREQUENCY_RANGES, MAX_GAP_CENTS, MIN_GAP_CENTS } from './constants';
import { Answer, Round, Settings } from './types';

export const formatGap = (cents: number) => Number(cents.toFixed(1)).toString();

export function stepMultipliers(settings: Settings) {
  const up = 1 + settings.adjustmentPercent / 100;
  switch (settings.progressionMode) {
    case 'fixed': return { up: 1, down: 1 };
    case 'custom': return { up, down: 1 - settings.successReductionPercent / 100 };
    case 'target': {
      const target = settings.targetCorrectPercent / 100;
      return { up, down: Math.pow(up, -(1 - target) / target) };
    }
    default: return { up, down: 1 / up };
  }
}

export function nominalTarget(settings: Settings): number | null {
  if (settings.progressionMode === 'fixed') return null;
  if (settings.progressionMode === 'target') return settings.targetCorrectPercent;
  if (settings.progressionMode === 'streak2') return Math.sqrt(0.5) * 100;
  if (settings.progressionMode === 'streak3') return Math.cbrt(0.5) * 100;
  const { up, down } = stepMultipliers(settings);
  return 100 * Math.log(up) / (Math.log(up) - Math.log(down));
}

// The counter is reset after an error or a completed, non-overlapping streak,
// including at a gap boundary. Replay never calls this function.
export function advanceDifficulty(gap: number, correct: boolean, streak: number, settings: Settings) {
  if (settings.progressionMode === 'fixed') return { gap, streak: 0 };
  const required = settings.progressionMode === 'streak2' ? 2 : settings.progressionMode === 'streak3' ? 3 : 1;
  const count = correct ? streak + 1 : 0;
  if (correct && count < required) return { gap, streak: count };
  const { up, down } = stepMultipliers(settings);
  return {
    gap: Math.max(MIN_GAP_CENTS, Math.min(MAX_GAP_CENTS, gap * (correct ? down : up))),
    streak: 0,
  };
}

export function correctAnswer(round: Round): Answer {
  const [first, second] = round.pitches;
  const targetIsHigher = round.questionTarget === 'first' ? first > second : second > first;
  return targetIsHigher ? 'higher' : 'lower';
}

// Randomize direction, anchor position, and question independently. Replays reuse this round.
export function generateRound(settings: Settings, gapCents: number, random = Math.random): Round {
  const { min, max } = FREQUENCY_RANGES[settings.gameMode];
  const ratio = Math.pow(2, gapCents / 1200);
  const offsetIsHigher = random() < 0.5;
  // Restrict the anchor so BOTH frequencies stay inside the selected register.
  const anchorMin = offsetIsHigher ? min : min * ratio;
  const anchorMax = offsetIsHigher ? max / ratio : max;
  let anchor: number;
  if (settings.pitchSelection === 'note') {
    const lowestMidi = Math.ceil(69 + 12 * Math.log2(anchorMin / 440) - 1e-10);
    const highestMidi = Math.floor(69 + 12 * Math.log2(anchorMax / 440) + 1e-10);
    const midi = lowestMidi + Math.floor(random() * (highestMidi - lowestMidi + 1));
    anchor = 440 * Math.pow(2, (midi - 69) / 12);
  } else {
    anchor = anchorMin + random() * (anchorMax - anchorMin);
  }
  const offset = offsetIsHigher ? anchor * ratio : anchor / ratio;
  const anchorFirst = random() < 0.5;
  return {
    pitches: anchorFirst ? [anchor, offset] : [offset, anchor],
    gapCents,
    questionTarget: random() < 0.5 ? 'first' : 'second',
  };
}
