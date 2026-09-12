import { DEFAULT_SETTINGS, FREQUENCY_RANGES } from './constants';
import { advanceDifficulty, correctAnswer, generateRound, nominalTarget, stepMultipliers } from './game';
import { GameMode, PitchSelection, Round } from './types';

const centsBetween = (a: number, b: number) => Math.abs(1200 * Math.log2(a / b));
const midiNumber = (frequency: number) => 69 + 12 * Math.log2(frequency / 440);

for (const pitchSelection of ['arbitrary', 'note'] as PitchSelection[]) {
  for (const gameMode of Object.keys(FREQUENCY_RANGES) as GameMode[]) {
    test(`${pitchSelection} pairs have the requested gap and stay within ${gameMode} register`, () => {
      const range = FREQUENCY_RANGES[gameMode];
      for (const gap of [1, 12.5, 100]) {
        for (const direction of [0, 0.9]) {
          for (const selection of [0, 0.5, 0.999999]) {
            const values = [direction, selection, 0.1, 0.1];
            const round = generateRound({ ...DEFAULT_SETTINGS, gameMode, pitchSelection }, gap, () => values.shift()!);
            expect(centsBetween(...round.pitches)).toBeCloseTo(gap, 8);
            round.pitches.forEach(frequency => {
              expect(frequency).toBeGreaterThanOrEqual(range.min - 1e-9);
              expect(frequency).toBeLessThanOrEqual(range.max + 1e-9);
            });
            if (pitchSelection === 'note') {
              const midi = midiNumber(round.pitches[0]);
              expect(midi).toBeCloseTo(Math.round(midi), 10);
            }
          }
        }
      }
    });
  }
}

test('the musical note can appear in either position, with either question and offset direction', () => {
  for (const direction of [0.1, 0.9]) {
    for (const order of [0.1, 0.9]) {
      for (const question of [0.1, 0.9]) {
        const values = [direction, 0.4, order, question];
        const round = generateRound({ ...DEFAULT_SETTINGS, pitchSelection: 'note' }, 17.5, () => values.shift()!);
        const anchorIndex = order < 0.5 ? 0 : 1;
        const midi = midiNumber(round.pitches[anchorIndex]);
        const otherMidi = midiNumber(round.pitches[1 - anchorIndex]);
        expect(midi).toBeCloseTo(Math.round(midi), 10);
        expect(Math.abs(otherMidi - Math.round(otherMidi))).toBeGreaterThan(0.01);
        expect(round.questionTarget).toBe(question < 0.5 ? 'first' : 'second');
        const target = question < 0.5 ? 0 : 1;
        expect(correctAnswer(round)).toBe(round.pitches[target] > round.pitches[1 - target] ? 'higher' : 'lower');
      }
    }
  }
});

test('arbitrary anchors are not snapped to the equal-tempered grid', () => {
  const round = generateRound(DEFAULT_SETTINGS, 12.5, () => 0.314159);
  const midi = midiNumber(round.pitches[0]);
  expect(Math.abs(midi - Math.round(midi))).toBeGreaterThan(0.001);
});

test.each([
  ['first', [440, 450], 'lower'], ['second', [440, 450], 'higher'],
  ['first', [450, 440], 'higher'], ['second', [450, 440], 'lower'],
])('grades %s pitch with %j as %s', (questionTarget, pitches, answer) => {
  expect(correctAnswer({ questionTarget, pitches, gapCents: 20 } as Round)).toBe(answer);
});


test('target rule preserves log-space balance at every speed', () => {
  for (const accuracy of [60, 75, 90]) {
    for (const speed of [1, 10, 30, 100]) {
      const settings = { ...DEFAULT_SETTINGS, targetCorrectPercent: accuracy, adjustmentPercent: speed };
      const { up, down } = stepMultipliers(settings);
      const p = accuracy / 100;
      expect(p * Math.log(down) + (1 - p) * Math.log(up)).toBeCloseTo(0, 12);
      expect(nominalTarget(settings)).toBeCloseTo(accuracy, 10);
    }
  }
  expect(stepMultipliers(DEFAULT_SETTINGS).down).toBeCloseTo(0.916260327, 8);
});

test.each([['streak2', 2], ['streak3', 3]] as const)('%s uses complete consecutive streaks and reciprocal steps', (mode, required) => {
  const settings = { ...DEFAULT_SETTINGS, progressionMode: mode };
  let state = { gap: 20, streak: 0 };
  for (let i = 1; i < required; i++) {
    state = advanceDifficulty(state.gap, true, state.streak, settings);
    expect(state).toEqual({ gap: 20, streak: i });
  }
  const afterError = advanceDifficulty(state.gap, false, state.streak, settings);
  expect(afterError).toEqual({ gap: 26, streak: 0 });
  state = advanceDifficulty(state.gap, true, state.streak, settings);
  expect(state.gap).toBeCloseTo(20 / 1.3, 10);
  expect(state.streak).toBe(0);
  expect(advanceDifficulty(state.gap, true, state.streak, settings)).toEqual({ gap: state.gap, streak: 1 });
  expect(nominalTarget(settings)).toBeCloseTo(100 * Math.pow(0.5, 1 / required), 10);
});

test('custom rules retain exact legacy behaviour and report nominal targets', () => {
  const settings = { ...DEFAULT_SETTINGS, progressionMode: 'custom' as const };
  expect(advanceDifficulty(100, true, 0, settings).gap).toBe(77);
  expect(advanceDifficulty(20, false, 0, settings).gap).toBe(26);
  expect(nominalTarget(settings)).toBeCloseTo(50.0954, 4);
  expect(nominalTarget({ ...settings, successReductionPercent: 7 })).toBeCloseTo(78.3329, 4);
  expect(nominalTarget({ ...settings, successReductionPercent: 0 })).toBe(100);
});

test('bounds reset completed streaks; fixed mode does not adapt', () => {
  expect(advanceDifficulty(1, true, 0, DEFAULT_SETTINGS)).toEqual({ gap: 1, streak: 0 });
  expect(advanceDifficulty(99, false, 0, DEFAULT_SETTINGS)).toEqual({ gap: 100, streak: 0 });
  expect(advanceDifficulty(1, true, 1, { ...DEFAULT_SETTINGS, progressionMode: 'streak2' })).toEqual({ gap: 1, streak: 0 });
  for (const correct of [true, false]) {
    expect(advanceDifficulty(12.5, correct, 2, { ...DEFAULT_SETTINGS, progressionMode: 'fixed' })).toEqual({ gap: 12.5, streak: 0 });
  }
});
