import React from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import App from './App';
import { AudioEngine } from './audio';
import { DEFAULT_SETTINGS } from './constants';
import { LEGACY_SETTINGS_KEY, SCORES_KEY, SESSIONS_KEY, SETTINGS_KEY } from './storage';
import { Settings } from './types';

jest.mock('./audio');
const playTone = AudioEngine.prototype.playTone as jest.Mock;
const initAudio = AudioEngine.prototype.init as jest.Mock;
const advance = (ms: number) => act(() => { jest.advanceTimersByTime(ms); });
const higher = () => screen.getByRole('button', { name: 'Higher (Up Arrow)' });
const lower = () => screen.getByRole('button', { name: 'Lower (Down Arrow)' });
const mount = (settings: Partial<Settings> = {}) => {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, ...settings }));
  return render(<App />);
};
const start = async () => {
  await act(async () => { fireEvent.click(screen.getByRole('button', { name: 'Start Game' })); });
};
const playedGap = () => {
  const calls = playTone.mock.calls;
  return Math.abs(1200 * Math.log2(calls[calls.length - 1][0] / calls[calls.length - 2][0]));
};

beforeEach(() => {
  jest.useFakeTimers();
  jest.clearAllMocks();
  localStorage.clear();
  initAudio.mockResolvedValue(undefined);
  // The default test round asks about the first (lower) tone.
  jest.spyOn(Math, 'random').mockReturnValue(0.25);
});
afterEach(() => {
  cleanup();
  jest.clearAllTimers();
  jest.useRealTimers();
  jest.restoreAllMocks();
});

test('edits and saves practice settings, including a fractional starting gap', () => {
  const app = mount();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.change(screen.getByLabelText('Starting pitch gap (cents)'), { target: { value: '12.5' } });
  fireEvent.click(screen.getByLabelText('Unlimited lives'));
  fireEvent.change(screen.getByLabelText('Lives'), { target: { value: '7' } });
  fireEvent.change(screen.getByLabelText('Target success rate (%)'), { target: { value: '80' } });
  fireEvent.click(screen.getByRole('radio', { name: /Musical note reference/ }));
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(screen.getByText('Start at 12.5 cents')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ startingGapCents: 12.5, lives: 7, targetCorrectPercent: 80, pitchSelection: 'note' });
  app.unmount();
  render(<App />);
  expect(screen.getByText('Start at 12.5 cents')).toBeInTheDocument();
});

test('invalid numeric settings cannot be submitted, and cancel discards changes', () => {
  mount({ unlimitedLives: false });
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.change(screen.getByLabelText('Lives'), { target: { value: '0' } });
  expect(screen.getByLabelText('Lives')).toBeInvalid();
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(screen.getByRole('button', { name: 'Save settings' })).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
  expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!).lives).toBe(3);
});

test('plays the configured gap and applies progression to the very next pair', async () => {
  mount({ startingGapCents: 20, progressionMode: 'custom', successReductionPercent: 25 });
  await start();
  expect(lower()).toBeDisabled();
  advance(2000);
  expect(lower()).toBeDisabled();
  expect(playedGap()).toBeCloseTo(20, 8);
  advance(1000);
  fireEvent.click(lower());
  expect(screen.getByText('Correct: 1/1')).toBeInTheDocument();
  // The display keeps the gap actually heard until the next pair starts.
  expect(screen.getByText('20 cents')).toBeInTheDocument();
  advance(1500);
  expect(screen.getByText('15 cents')).toBeInTheDocument();
  advance(3000);
  expect(playedGap()).toBeCloseTo(15, 8);
  fireEvent.click(screen.getByRole('button', { name: 'End practice' }));
  expect(screen.getByText(/Smallest gap answered correctly once: 20 cents/)).toBeInTheDocument();
});

test.each([1, 2, 5])('ends after %i mistakes and restarts with the saved gap and fresh lives', async lives => {
  mount({ startingGapCents: 10, lives, unlimitedLives: false, questionLimit: null });
  await start();
  for (let mistake = 0; mistake < lives; mistake++) {
    advance(3000);
    fireEvent.click(higher());
    expect(screen.getByText(`Lives: ${lives - mistake - 1}/${lives}`)).toBeInTheDocument();
    advance(1500);
  }
  expect(screen.getByText('Game Over!')).toBeInTheDocument();
  expect(screen.getByText(/No correct answers this session/)).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
  await start();
  expect(screen.getByText('10 cents')).toBeInTheDocument();
  expect(screen.getByText(`Lives: ${lives}/${lives}`)).toBeInTheDocument();
  expect(screen.getByText('Correct: 0/0')).toBeInTheDocument();
});

test('grades questions about the second pitch and preserves question and frequencies on replay', async () => {
  (Math.random as jest.Mock).mockReturnValue(0.75);
  mount({ pitchSelection: 'note' });
  await start();
  advance(3000);
  expect(screen.getByText('second pitch')).toBeInTheDocument();
  const original = playTone.mock.calls.map(call => call[0]);
  fireEvent.keyDown(window, { key: 'r' });
  fireEvent.keyDown(window, { key: 'r' });
  expect(higher()).toBeDisabled();
  advance(3000);
  expect(playTone.mock.calls.map(call => call[0])).toEqual([...original, ...original]);
  expect(screen.getByText('second pitch')).toBeInTheDocument();
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  fireEvent.keyDown(window, { key: 'ArrowUp' });
  expect(screen.getByText('Correct: 1/1')).toBeInTheDocument();
  expect(screen.getByText('Correct!')).toBeInTheDocument();
});

test('fixed practice applies manual gaps only to new pairs and records the session honestly', async () => {
  mount({ startingGapCents: 20, progressionMode: 'fixed', unlimitedLives: true, lives: 1, questionLimit: null });
  await start();
  advance(3000);
  const slider = screen.getByLabelText(/Next pair’s gap/);
  fireEvent.change(slider, { target: { value: '5.5' } });
  fireEvent.keyDown(slider, { key: 'ArrowUp' });
  expect(higher()).toBeEnabled();
  fireEvent.click(screen.getByRole('button', { name: /Replay Pitches/ }));
  advance(3000);
  expect(playedGap()).toBeCloseTo(20, 8);
  fireEvent.click(higher());
  advance(1500);
  expect(screen.getByText('5.5 cents')).toBeInTheDocument();
  advance(3000);
  expect(playedGap()).toBeCloseTo(5.5, 8);
  fireEvent.click(lower());
  advance(1500);
  expect(screen.getByText('5.5 cents')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'End practice' }));
  expect(screen.getByText('Practice complete')).toBeInTheDocument();
  expect(localStorage.getItem(SCORES_KEY)).toBeNull();
  expect(JSON.parse(localStorage.getItem(SESSIONS_KEY)!)[0].summary).toMatchObject({ answered: 2, correct: 1, typicalGap: 12.75, replays: 1, estimate: { status: 'unsupported' } });
});

test('ending practice cancels pending audio and feedback timers', async () => {
  mount();
  await start();
  fireEvent.click(screen.getByRole('button', { name: 'End practice' }));
  advance(10000);
  expect(playTone).not.toHaveBeenCalled();
  expect(screen.getByText('Practice complete')).toBeInTheDocument();
});

test('audio initialization can be retried after failure', async () => {
  initAudio.mockRejectedValueOnce(new Error('suspended'));
  mount();
  await start();
  expect(screen.getByRole('alert')).toHaveTextContent('Audio could not start');
  await start();
  advance(3000);
  expect(lower()).toBeEnabled();
});

test('unlimited lives retains adaptation and the question cap stops after the final answer', async () => {
  mount({ startingGapCents: 20, questionLimit: 2, unlimitedLives: true, lives: 1 });
  await start();
  advance(3000);
  fireEvent.click(higher());
  advance(1500);
  expect(screen.getByText('26 cents')).toBeInTheDocument();
  advance(3000);
  fireEvent.click(lower());
  advance(1500);
  expect(screen.getByText('Question limit reached.')).toBeInTheDocument();
  expect(screen.getByText('1 correct / 2 answered')).toBeInTheDocument();
  const record = JSON.parse(localStorage.getItem(SESSIONS_KEY)!)[0];
  expect(record).toMatchObject({ endReason: 'questions', settings: { targetCorrectPercent: 75, unlimitedLives: true }, summary: { answered: 2, accuracy: 50, typicalGap: 23 } });
  advance(10000);
  expect(playTone).toHaveBeenCalledTimes(4);
});

test('streaks survive replay, reset after errors and completed streaks, and reset on restart', async () => {
  mount({ startingGapCents: 26, progressionMode: 'streak2', questionLimit: null });
  await start();
  advance(3000);
  fireEvent.click(lower());
  advance(1500);
  expect(screen.getByText('Correct streak: 1/2')).toBeInTheDocument();
  expect(screen.getByText('26 cents')).toBeInTheDocument();
  advance(3000);
  fireEvent.click(screen.getByRole('button', { name: /Replay Pitches/ }));
  advance(3000);
  expect(screen.getByText('Correct streak: 1/2')).toBeInTheDocument();
  fireEvent.click(higher());
  advance(1500);
  expect(screen.getByText('Correct streak: 0/2')).toBeInTheDocument();
  for (let i = 0; i < 2; i++) { advance(3000); fireEvent.click(lower()); advance(1500); }
  expect(screen.getByText('26 cents')).toBeInTheDocument();
  expect(screen.getByText('Correct streak: 0/2')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'End practice' }));
  fireEvent.click(screen.getByRole('button', { name: 'Play Again' }));
  await start();
  expect(screen.getByText('Correct streak: 0/2')).toBeInTheDocument();
});

test('legacy settings remain custom until the recommended preset is selected', () => {
  localStorage.setItem(LEGACY_SETTINGS_KEY, JSON.stringify({ ...DEFAULT_SETTINGS, startingGapCents: 8, lives: 2, successReductionPercent: 12, instrument: 'flute' }));
  const oldScores = JSON.stringify({ medium: { score: 5, difficulty: 2 } });
  localStorage.setItem(SCORES_KEY, oldScores);
  render(<App />);
  expect(screen.getByText('Start at 8 cents')).toBeInTheDocument();
  expect(screen.getByText('Historical scores')).toBeInTheDocument();
  expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ progressionMode: 'custom', questionLimit: null, unlimitedLives: false, lives: 2 });
  fireEvent.click(screen.getByRole('button', { name: 'Use recommended practice' }));
  expect(JSON.parse(localStorage.getItem(SETTINGS_KEY)!)).toMatchObject({ progressionMode: 'target', targetCorrectPercent: 75, adjustmentPercent: 30, unlimitedLives: true, questionLimit: 50, startingGapCents: 8, instrument: 'flute' });
  expect(localStorage.getItem(SCORES_KEY)).toBe(oldScores);
});

test('ending during feedback saves exactly one session and cancels progression', async () => {
  mount({ questionLimit: 1 });
  await start(); advance(3000);
  fireEvent.click(lower());
  fireEvent.click(screen.getByRole('button', { name: 'End practice' }));
  advance(10000);
  expect(JSON.parse(localStorage.getItem(SESSIONS_KEY)!)).toHaveLength(1);
  expect(playTone).toHaveBeenCalledTimes(2);
});

test('history survives reload and separates sessions with different conditions', async () => {
  const app = mount({ startingGapCents: 20, questionLimit: 1 });
  await start(); advance(3000); fireEvent.click(lower()); advance(1500);
  app.unmount(); render(<App />);
  expect(screen.getByText('100% correct · 1 answer')).toBeInTheDocument();
  fireEvent.click(screen.getByRole('button', { name: 'Settings' }));
  fireEvent.change(screen.getByLabelText('Target success rate (%)'), { target: { value: '85' } });
  fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));
  expect(screen.getByText(/No sessions match these settings/)).toBeInTheDocument();
  fireEvent.click(screen.getByLabelText('Same settings only'));
  expect(screen.getByText('100% correct · 1 answer')).toBeInTheDocument();
});
