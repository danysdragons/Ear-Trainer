import { DEFAULT_SETTINGS } from './constants';
import { summarizeSession } from './session';
import { loadScores, loadSessions, loadSettings, save, SCORES_KEY, SESSIONS_KEY, SETTINGS_KEY } from './storage';

beforeEach(() => localStorage.clear());
afterEach(() => jest.restoreAllMocks());

test.each(['bad JSON', 'null', '[]', '42'])('recovers from invalid stored settings: %s', value => {
  localStorage.setItem(SETTINGS_KEY, value);
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
});

test('validates saved values while preserving valid preferences', () => {
  save(SETTINGS_KEY, { startingGapCents: 0, lives: 1.5, successReductionPercent: 101, pitchSelection: 'note', gameMode: 'toString', instrument: 'banjo', backgroundNoise: 'white', sandboxMode: 'false' });
  expect(loadSettings()).toEqual({ ...DEFAULT_SETTINGS, pitchSelection: 'note', backgroundNoise: 'white' });
});

test('settings round-trip and old high scores remain available', () => {
  const settings = { ...DEFAULT_SETTINGS, startingGapCents: 12.5, lives: 7, successReductionPercent: 10 };
  save(SETTINGS_KEY, settings);
  expect(loadSettings()).toEqual(settings);
  save(SCORES_KEY, { medium: { score: 12, difficulty: 5.7 }, high: null, low: { score: -1, difficulty: 'oops' } });
  expect(loadScores().medium).toEqual({ score: 12, difficulty: 5.7 });
  expect(loadScores().high).toEqual({ score: 0, difficulty: null });
  expect(loadScores().low).toEqual({ score: 0, difficulty: null });
});

test('blocked storage does not prevent practice', () => {
  jest.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('blocked'); });
  jest.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('blocked'); });
  expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
  expect(() => save(SETTINGS_KEY, DEFAULT_SETTINGS)).not.toThrow();
});

test('migrates old percentages without changing their behaviour and preserves the original data', () => {
  const legacy = { startingGapCents: 12.5, lives: 7, successReductionPercent: 7, gameMode: 'high', instrument: 'piano', sandboxMode: false };
  localStorage.setItem('intonationEarTrainerSettings.v1', JSON.stringify(legacy));
  expect(loadSettings()).toMatchObject({ startingGapCents: 12.5, lives: 7, successReductionPercent: 7, gameMode: 'high', instrument: 'piano', progressionMode: 'custom', unlimitedLives: false, questionLimit: null, adjustmentPercent: 30 });
  expect(JSON.parse(localStorage.getItem('intonationEarTrainerSettings.v1')!)).toEqual(legacy);
});

test('migrates Sandbox to fixed-gap practice with independent unlimited lives', () => {
  localStorage.setItem('intonationEarTrainerSettings.v1', JSON.stringify({ sandboxMode: true, startingGapCents: 4 }));
  expect(loadSettings()).toMatchObject({ progressionMode: 'fixed', unlimitedLives: true, questionLimit: null, startingGapCents: 4 });
});

test('session records survive reload, validate conditions, and cap retained history', () => {
  const record = {
    id: 'test-session', completedAt: '2026-09-02T12:00:00Z', settings: DEFAULT_SETTINGS, endReason: 'manual',
    summary: summarizeSession([{ gapCents: 20, correct: true, replays: 0 }], DEFAULT_SETTINGS),
  };
  save(SESSIONS_KEY, [null, { ...record, settings: { ...DEFAULT_SETTINGS, targetCorrectPercent: 999 } }, { ...record, summary: { ...record.summary, accuracy: 42 } }, record]);
  expect(loadSessions()).toEqual([record]);
  save(SESSIONS_KEY, Array.from({ length: 35 }, (_, index) => ({ ...record, id: `session-${index}` })));
  expect(loadSessions()).toHaveLength(30);
  expect(loadSessions()[0].id).toBe('session-0');
});

test('current preferences take precedence over historical settings', () => {
  localStorage.setItem('intonationEarTrainerSettings.v1', JSON.stringify({ successReductionPercent: 23 }));
  save(SETTINGS_KEY, { ...DEFAULT_SETTINGS, targetCorrectPercent: 80 });
  expect(loadSettings()).toMatchObject({ progressionMode: 'target', targetCorrectPercent: 80 });
});
