export type GameMode = 'high' | 'medium' | 'low' | 'changing';
export type WaveformType = 'sine' | 'sawtooth' | 'square' | 'triangle';
export type InstrumentType = 'sine' | 'sawtooth' | 'square' | 'triangle' | 'piano' | 'violin' | 'flute';
export type NoiseType = 'none' | 'white' | 'pink';
export type PitchSelection = 'arbitrary' | 'note';
export type QuestionTarget = 'first' | 'second';
export type Answer = 'higher' | 'lower';
export type ProgressionMode = 'target' | 'streak2' | 'streak3' | 'fixed' | 'custom';
export type Settings = {
  gameMode: GameMode;
  instrument: InstrumentType;
  backgroundNoise: NoiseType;
  startingGapCents: number;
  lives: number;
  unlimitedLives: boolean;
  questionLimit: number | null;
  progressionMode: ProgressionMode;
  targetCorrectPercent: number;
  adjustmentPercent: number;
  successReductionPercent: number;
  pitchSelection: PitchSelection;
};
export type Round = {
  pitches: [number, number];
  gapCents: number;
  questionTarget: QuestionTarget;
};
export type HighScore = { score: number; difficulty: number | null };
export type HighScores = Record<GameMode, HighScore>;
export type Trial = { gapCents: number; correct: boolean; replays: number };
export type EstimateStatus = 'available' | 'insufficient' | 'boundary' | 'unsupported' | 'unstable';
export type SessionSummary = {
  answered: number;
  correct: number;
  accuracy: number | null;
  typicalGap: number | null;
  smallestCorrectGap: number | null;
  replays: number;
  estimate: {
    status: EstimateStatus;
    gap: number | null;
    targetPercent: number | null;
    reversals: number;
    boundary: 'minimum' | 'maximum' | 'both' | null;
  };
};
export type EndReason = 'manual' | 'lives' | 'questions';
export type SessionRecord = {
  id: string;
  completedAt: string;
  settings: Settings;
  summary: SessionSummary;
  endReason: EndReason;
};
