import { DEFAULT_SETTINGS } from './constants';
import { nominalTarget } from './game';
import { simulateListener } from './simulation';
import { ProgressionMode } from './types';

const mean = (values: number[]) => values.reduce((sum, value) => sum + value, 0) / values.length;

test.each([60, 75, 90])('weighted adaptation tracks a %s%% target across speeds and starting gaps', targetCorrectPercent => {
  for (const adjustmentPercent of [10, 30, 60]) {
    const rates: number[] = [];
    for (const startingGapCents of [1, 20, 100]) {
      for (let seed = 1; seed <= 10; seed++) {
        const settings = { ...DEFAULT_SETTINGS, targetCorrectPercent, adjustmentPercent, startingGapCents };
        const tail = simulateListener(settings, 1500, seed).trials.slice(500);
        rates.push(tail.filter(trial => trial.correct).length / tail.length * 100);
      }
    }
    expect(Math.abs(mean(rates) - targetCorrectPercent)).toBeLessThan(1.5);
  }
});

test.each(['streak2', 'streak3'] as ProgressionMode[])('%s stays near its nominal target and produces usable long-session estimates', progressionMode => {
  const accuracy: number[] = [];
  const errors: number[] = [];
  for (let seed = 1; seed <= 100; seed++) {
    const settings = { ...DEFAULT_SETTINGS, progressionMode, startingGapCents: seed % 2 ? 5 : 80 };
    const result = simulateListener(settings, 1000, seed);
    const tail = result.trials.slice(200);
    accuracy.push(tail.filter(trial => trial.correct).length / tail.length * 100);
    if (result.summary.estimate.gap !== null) errors.push(result.summary.estimate.gap / result.trueThreshold! - 1);
  }
  expect(Math.abs(mean(accuracy) - nominalTarget({ ...DEFAULT_SETTINGS, progressionMode })!)).toBeLessThan(2);
  expect(errors.length).toBeGreaterThan(50);
  expect(Math.abs(mean(errors))).toBeLessThan(0.1);
  expect(mean(errors.map(Math.abs))).toBeLessThan(0.25);
});

test('short runs do not get estimates and chance-only listeners do not earn threshold records', () => {
  for (let seed = 1; seed <= 100; seed++) {
    expect(simulateListener(DEFAULT_SETTINGS, 12, seed).summary.estimate.gap).toBeNull();
    expect(simulateListener(DEFAULT_SETTINGS, 200, seed, 4, true).summary.estimate.gap).toBeNull();
  }
});
