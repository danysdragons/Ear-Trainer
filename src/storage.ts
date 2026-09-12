import { DEFAULT_SETTINGS, FREQUENCY_RANGES, INSTRUMENT_OPTIONS, NOISE_OPTIONS, PROGRESSION_OPTIONS } from './constants';
import { GameMode, HighScores, SessionRecord, SessionSummary, Settings } from './types';

export const LEGACY_SETTINGS_KEY = 'intonationEarTrainerSettings.v1';
export const SETTINGS_KEY = 'intonationEarTrainerSettings.v2';
export const SCORES_KEY = 'intonationEarTrainerHighScores';
export const SESSIONS_KEY = 'intonationEarTrainerSessions.v1';
export const MAX_SAVED_SESSIONS = 30;

function read(key: string): unknown {
  try { return JSON.parse(localStorage.getItem(key) || 'null'); }
  catch { return null; }
}
const isObject = (data: unknown): data is Record<string, unknown> =>
  !!data && typeof data === 'object' && !Array.isArray(data);
export function save(key: string, value: unknown) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch { /* Practice still works when browser storage is unavailable. */ }
}
const inRange = (value: unknown, min: number, max: number): value is number =>
  typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const isInteger = (value: unknown, min: number, max: number): value is number => inRange(value, min, max) && Number.isInteger(value);
const isOption = <T extends string>(value: unknown, options: Record<T, unknown>): value is T =>
  typeof value === 'string' && Object.prototype.hasOwnProperty.call(options, value);

function decodeSettings(data: Record<string, unknown>): Settings {
  return {
    gameMode: isOption(data.gameMode, FREQUENCY_RANGES) ? data.gameMode : DEFAULT_SETTINGS.gameMode,
    instrument: isOption(data.instrument, INSTRUMENT_OPTIONS) ? data.instrument : DEFAULT_SETTINGS.instrument,
    backgroundNoise: isOption(data.backgroundNoise, NOISE_OPTIONS) ? data.backgroundNoise : DEFAULT_SETTINGS.backgroundNoise,
    startingGapCents: inRange(data.startingGapCents, 1, 100) ? data.startingGapCents : DEFAULT_SETTINGS.startingGapCents,
    lives: isInteger(data.lives, 1, 99) ? data.lives : DEFAULT_SETTINGS.lives,
    unlimitedLives: typeof data.unlimitedLives === 'boolean' ? data.unlimitedLives : DEFAULT_SETTINGS.unlimitedLives,
    questionLimit: data.questionLimit === null || isInteger(data.questionLimit, 1, 1000) ? data.questionLimit : DEFAULT_SETTINGS.questionLimit,
    progressionMode: isOption(data.progressionMode, PROGRESSION_OPTIONS) ? data.progressionMode : DEFAULT_SETTINGS.progressionMode,
    targetCorrectPercent: inRange(data.targetCorrectPercent, 60, 90) ? data.targetCorrectPercent : DEFAULT_SETTINGS.targetCorrectPercent,
    adjustmentPercent: inRange(data.adjustmentPercent, 1, 100) ? data.adjustmentPercent : DEFAULT_SETTINGS.adjustmentPercent,
    successReductionPercent: inRange(data.successReductionPercent, 0, 90) ? data.successReductionPercent : DEFAULT_SETTINGS.successReductionPercent,
    pitchSelection: data.pitchSelection === 'note' ? 'note' : 'arbitrary',
  };
}

export function loadSettings(): Settings {
  const current = read(SETTINGS_KEY);
  if (isObject(current)) return decodeSettings(current);
  const legacy = read(LEGACY_SETTINGS_KEY);
  if (!isObject(legacy) || !Object.keys(legacy).length) return { ...DEFAULT_SETTINGS };
  return decodeSettings({
    ...legacy,
    progressionMode: legacy.sandboxMode === true ? 'fixed' : 'custom',
    unlimitedLives: legacy.sandboxMode === true,
    questionLimit: null,
    adjustmentPercent: 30,
  });
}

// These are historical scores only. New sessions never overwrite the old data.
export function loadScores(): HighScores {
  const raw = read(SCORES_KEY);
  const data = isObject(raw) ? raw : {};
  const scores = {} as HighScores;
  (Object.keys(FREQUENCY_RANGES) as GameMode[]).forEach(mode => {
    const entry = data[mode];
    scores[mode] = {
      score: isObject(entry) && isInteger(entry.score, 0, Number.MAX_SAFE_INTEGER) ? entry.score : 0,
      difficulty: isObject(entry) && inRange(entry.difficulty, 1, 100) ? entry.difficulty : null,
    };
  });
  return scores;
}

function validSummary(data: unknown): data is SessionSummary {
  if (!isObject(data) || !isObject(data.estimate)) return false;
  const { estimate } = data;
  const nullableGap = (value: unknown) => value === null || inRange(value, 1, 100);
  return isInteger(data.answered, 1, Number.MAX_SAFE_INTEGER) &&
    isInteger(data.correct, 0, data.answered) &&
    inRange(data.accuracy, 0, 100) && Math.abs(data.accuracy - 100 * data.correct / data.answered) < 1e-6 &&
    inRange(data.typicalGap, 1, 100) && nullableGap(data.smallestCorrectGap) &&
    isInteger(data.replays, 0, Number.MAX_SAFE_INTEGER) &&
    isOption(estimate.status, { available: 0, insufficient: 0, boundary: 0, unsupported: 0, unstable: 0 }) &&
    (estimate.status === 'available' ? inRange(estimate.gap, 1, 100) : estimate.gap === null) &&
    (estimate.targetPercent === null || inRange(estimate.targetPercent, 0, 100)) &&
    isInteger(estimate.reversals, 0, data.answered) &&
    (estimate.boundary === null || ['minimum', 'maximum', 'both'].includes(String(estimate.boundary)));
}

export function loadSessions(): SessionRecord[] {
  const data = read(SESSIONS_KEY);
  if (!Array.isArray(data)) return [];
  return data.filter((record): record is SessionRecord => {
    if (!isObject(record) || !isObject(record.settings) || !validSummary(record.summary)) return false;
    const settings = record.settings;
    // Discard malformed records instead of silently changing their conditions.
    if (!Object.entries(decodeSettings(settings)).every(([key, value]) => settings[key] === value)) return false;
    return typeof record.id === 'string' && record.id.length < 100 &&
      typeof record.completedAt === 'string' && Number.isFinite(Date.parse(record.completedAt)) &&
      ['manual', 'lives', 'questions'].includes(String(record.endReason));
  }).slice(0, MAX_SAVED_SESSIONS);
}
