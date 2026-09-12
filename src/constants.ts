import { GameMode, InstrumentType, NoiseType, ProgressionMode, Settings } from './types';

export const FREQUENCY_RANGES: Record<GameMode, { min: number; max: number }> = {
  high: { min: 660, max: 1320 },
  medium: { min: 330, max: 660 },
  low: { min: 110, max: 220 },
  changing: { min: 110, max: 1320 }, // Full range
};

export const MIN_GAP_CENTS = 1;
export const MAX_GAP_CENTS = 100;
export const DEFAULT_SETTINGS: Settings = {
  gameMode: 'medium',
  instrument: 'sine',
  backgroundNoise: 'none',
  startingGapCents: 100,
  lives: 3,
  unlimitedLives: true,
  questionLimit: 50,
  progressionMode: 'target',
  targetCorrectPercent: 75,
  adjustmentPercent: 30,
  successReductionPercent: 23,
  pitchSelection: 'arbitrary',
};

export const PROGRESSION_OPTIONS: Record<ProgressionMode, string> = {
  target: 'Target accuracy (recommended)',
  streak2: 'Two consecutive correct',
  streak3: 'Three consecutive correct',
  fixed: 'Fixed gap (manual practice)',
  custom: 'Advanced/custom percentages',
};

export const INSTRUMENT_OPTIONS: Record<InstrumentType, { name: string; description: string }> = {
  sine: { name: 'Sine Wave', description: 'Pure tone, easiest to distinguish' },
  sawtooth: { name: 'Sawtooth', description: 'Bright, buzzy sound' },
  square: { name: 'Square Wave', description: 'Hollow, clarinet-like tone' },
  triangle: { name: 'Triangle', description: 'Mellow, flute-like tone' },
  piano: { name: 'Piano', description: 'Rich harmonic tone with decay' },
  violin: { name: 'Violin', description: 'Bright string timbre' },
  flute: { name: 'Flute', description: 'Breathy, hollow woodwind' },
};

export const NOISE_OPTIONS: Record<NoiseType, { name: string; description: string }> = {
  none: { name: 'No Background Noise', description: 'Clean listening environment' },
  white: { name: 'White Noise', description: 'All frequencies equally present' },
  pink: { name: 'Pink Noise', description: 'More natural, frequency-balanced' },
};
