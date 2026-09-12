import React, { useState, useEffect, useCallback, useRef } from 'react';
import Header from './components/Header';
import ReadyScreen from './components/ReadyScreen';
import InfoScreen from './components/InfoScreen';
import SettingsScreen from './components/SettingsScreen';
import GameOverScreen from './components/GameOverScreen';
import PlayingScreen from './components/PlayingScreen';
import AnswerButtons from './components/AnswerButtons';
import AnimationOverlay from './components/AnimationOverlay';
import { AudioEngine } from './audio';
import { advanceDifficulty, correctAnswer, formatGap, generateRound, nominalTarget } from './game';
import { DEFAULT_SETTINGS, PROGRESSION_OPTIONS } from './constants';
import { sessionEnd, summarizeSession } from './session';
import { loadScores, loadSessions, loadSettings, MAX_SAVED_SESSIONS, save, SESSIONS_KEY, SETTINGS_KEY } from './storage';
import { Answer, EndReason, Round, SessionSummary, Settings, Trial } from './types';

type GameState = 'ready' | 'playing' | 'feedback' | 'gameOver' | 'settings' | 'info';

const App = () => {
  const [settings, setSettings] = useState(loadSettings);
  const [highScores] = useState(loadScores);
  const [sessions, setSessions] = useState(loadSessions);
  const [audio] = useState(() => new AudioEngine());
  const [gameState, setGameState] = useState<GameState>('ready');
  const [round, setRound] = useState<Round | null>(null);
  const [trials, setTrials] = useState<Trial[]>([]);
  const [streak, setStreak] = useState(0);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [endReason, setEndReason] = useState<EndReason>('manual');
  const sessionSaved = useRef(false);
  const roundReplays = useRef(0);
  const score = trials.filter(trial => trial.correct).length;
  const mistakes = trials.length - score;
  const [currentPitchIndex, setCurrentPitchIndex] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [animationType, setAnimationType] = useState('');
  const [showAnimation, setShowAnimation] = useState(false);
  const [starting, setStarting] = useState(false);
  const [audioError, setAudioError] = useState('');
  const [manualGap, setManualGap] = useState(settings.startingGapCents);
  const manualGapRef = useRef(settings.startingGapCents);
  const timers = useRef(new Set<ReturnType<typeof setTimeout>>());
  const generation = useRef(0);
  const canAnswer = useRef(false);
  const startingRef = useRef(false);

  const clearTimers = useCallback(() => {
    generation.current += 1;
    timers.current.forEach(clearTimeout);
    timers.current.clear();
    canAnswer.current = false;
  }, []);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer = setTimeout(() => {
      timers.current.delete(timer);
      callback();
    }, delay);
    timers.current.add(timer);
  }, []);

  useEffect(() => () => {
    clearTimers();
    audio.close();
  }, [audio, clearTimers]);

  useEffect(() => { save(SETTINGS_KEY, settings); }, [settings]);
  useEffect(() => { save(SESSIONS_KEY, sessions); }, [sessions]);

  const playPair = useCallback((pair: Round) => {
    clearTimers();
    setShowAnimation(false);
    setCurrentPitchIndex(0);
    schedule(() => {
      audio.playTone(pair.pitches[0], settings.instrument);
      setCurrentPitchIndex(1);
    }, 500);
    schedule(() => {
      audio.playTone(pair.pitches[1], settings.instrument);
      setCurrentPitchIndex(2);
    }, 2000);
    // Do not accept answers or replay until the second one-second tone has ended.
    schedule(() => {
      setCurrentPitchIndex(3);
      canAnswer.current = true;
    }, 3000);
  }, [audio, clearTimers, schedule, settings.instrument]);

  const startRound = useCallback((gap: number) => {
    const pair = generateRound(settings, gap);
    setRound(pair);
    roundReplays.current = 0;
    setFeedback('');
    setGameState('playing');
    playPair(pair);
  }, [settings, playPair]);

  const startGame = async () => {
    if (startingRef.current) return;
    clearTimers();
    const token = generation.current;
    startingRef.current = true;
    setStarting(true);
    setAudioError('');
    try {
      await audio.init();
      if (token !== generation.current) return;
      audio.stop();
      audio.startNoise(settings.backgroundNoise);
      setTrials([]);
      setStreak(0);
      setSummary(null);
      sessionSaved.current = false;
      setManualGap(settings.startingGapCents);
      manualGapRef.current = settings.startingGapCents;
      setStarting(false);
      startRound(settings.startingGapCents);
    } catch {
      if (token === generation.current) setAudioError('Audio could not start. Please try Start Game again in a browser with Web Audio support.');
    } finally {
      startingRef.current = false;
      if (token === generation.current) setStarting(false);
    }
  };

  const finishSession = useCallback((answeredTrials: Trial[], reason: EndReason = 'manual') => {
    if (sessionSaved.current) return;
    sessionSaved.current = true;
    clearTimers();
    audio.stop();
    setShowAnimation(false);
    setFeedback('');
    const result = summarizeSession(answeredTrials, settings);
    setSummary(result);
    setEndReason(reason);
    setGameState('gameOver');
    if (result.answered > 0) {
      const record = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        completedAt: new Date().toISOString(),
        settings: { ...settings }, summary: result, endReason: reason,
      };
      setSessions(previous => [record, ...previous].slice(0, MAX_SAVED_SESSIONS));
    }
  }, [audio, clearTimers, settings]);

  const handleAnswer = useCallback((answer: Answer) => {
    if (!round || gameState !== 'playing' || !canAnswer.current) return;
    canAnswer.current = false;
    const correct = answer === correctAnswer(round);
    const answeredTrials = [...trials, { gapCents: round.gapCents, correct, replays: roundReplays.current }];
    const following = advanceDifficulty(round.gapCents, correct, streak, settings);
    setTrials(answeredTrials);
    setStreak(following.streak);
    setFeedback(correct ? 'Correct!' : `The ${round.questionTarget} pitch was ${correctAnswer(round)}.`);
    setGameState('feedback');
    setAnimationType(correct ? 'correct' : 'incorrect');
    setShowAnimation(true);
    audio.playEffect(correct ? 'correct' : 'incorrect');
    schedule(() => setShowAnimation(false), 1000);
    const reason = sessionEnd(settings, answeredTrials.length, mistakes + (correct ? 0 : 1));
    if (reason) {
      schedule(() => {
        finishSession(answeredTrials, reason);
        if (reason === 'lives') audio.playEffect('gameOver');
      }, 1500);
    } else {
      // Carry the computed gap into the timer, including completed streak state.
      schedule(() => startRound(settings.progressionMode === 'fixed' ? manualGapRef.current : following.gap), 1500);
    }
  }, [round, gameState, trials, streak, mistakes, settings, audio, schedule, finishSession, startRound]);

  const replayPitches = useCallback(() => {
    if (round && gameState === 'playing' && canAnswer.current) {
      roundReplays.current += 1;
      playPair(round);
    }
  }, [round, gameState, playPair]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (event.repeat || (target instanceof Element && target.closest('input, select, textarea, [contenteditable="true"]'))) return;
      if (!canAnswer.current || gameState !== 'playing') return;
      if (['ArrowUp', 'ArrowDown', 'r', 'R'].includes(event.key)) event.preventDefault();
      if (event.key === 'ArrowUp') handleAnswer('higher');
      else if (event.key === 'ArrowDown') handleAnswer('lower');
      else if (event.key.toLowerCase() === 'r') replayPitches();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gameState, handleAnswer, replayPitches]);

  const navigate = (screen: GameState) => {
    clearTimers();
    audio.stop();
    setStarting(false);
    setAudioError('');
    setFeedback('');
    setShowAnimation(false);
    setGameState(screen);
  };
  const saveSettings = (updated: Settings) => {
    setSettings(updated);
    navigate('ready');
  };
  const useRecommended = () => saveSettings({
    ...settings, progressionMode: 'target', targetCorrectPercent: 75, adjustmentPercent: 30,
    unlimitedLives: true, questionLimit: DEFAULT_SETTINGS.questionLimit,
  });
  const target = nominalTarget(settings);
  const isActive = gameState === 'playing' || gameState === 'feedback';
  const acceptingAnswers = gameState === 'playing' && currentPitchIndex === 3;

  return (
    <main className="flex flex-col items-center justify-center min-h-screen bg-gray-100 p-4">
      <h1 className="text-3xl font-bold mb-6 text-indigo-700 text-center">Intonation Ear Trainer</h1>
      <AnimationOverlay show={showAnimation} type={animationType} />
      <div className="bg-white rounded-lg shadow-lg p-6 w-full max-w-md">
        <Header gameState={starting ? 'starting' : gameState} openInfo={() => navigate('info')} openSettings={() => navigate('settings')} />
        {audioError && <p role="alert" className="text-red-700 mb-4">{audioError}</p>}
        {isActive && round && (
          <>
            <div className="mb-5 text-center">
              <div className="flex justify-between mb-3"><p className="text-lg">Correct: {score}/{trials.length}</p><p className="text-lg">{settings.unlimitedLives ? 'Unlimited lives' : `Lives: ${Math.max(0, settings.lives - mistakes)}/${settings.lives}`}</p></div>
              <div className="bg-gray-100 rounded-lg p-3"><p className="text-sm text-gray-600">Current pitch gap</p><p className="text-xl font-semibold">{formatGap(round.gapCents)} cents</p><p className="text-xs text-gray-500 mt-1"><span className="capitalize">{settings.gameMode}</span> register · {settings.pitchSelection === 'note' ? 'Musical note reference' : 'Arbitrary pitches'}</p></div>
            </div>
            <p className="text-sm text-center text-gray-600 mb-3">{PROGRESSION_OPTIONS[settings.progressionMode]}{target === null ? '' : ` · nominal ${formatGap(target)}% correct`}</p>
            {settings.progressionMode.startsWith('streak') && <p className="text-sm text-center mb-3">Correct streak: {streak}/{settings.progressionMode === 'streak2' ? 2 : 3}</p>}
            {settings.questionLimit !== null && <p className="text-sm text-center text-gray-600 mb-3">Answered: {trials.length}/{settings.questionLimit}</p>}
            <PlayingScreen currentPitchIndex={currentPitchIndex} questionTarget={round.questionTarget} replayPitches={replayPitches} acceptingAnswers={acceptingAnswers} />
            <p role="status" className={`min-h-[1.75rem] text-center font-semibold mb-3 ${animationType === 'correct' ? 'text-green-700' : 'text-red-700'}`}>{feedback}</p>
            <AnswerButtons handleAnswer={handleAnswer} disabled={!acceptingAnswers} />
            {settings.progressionMode === 'fixed' && <div className="mt-5"><label htmlFor="manualGap" className="text-sm">Next pair’s gap: {formatGap(manualGap)} cents</label><input id="manualGap" type="range" min="1" max="100" step="0.1" value={manualGap} onChange={event => { const value = Number(event.target.value); setManualGap(value); manualGapRef.current = value; }} className="w-full accent-indigo-600" /><p className="text-xs text-gray-500">Applies after your next answer. Replay keeps the current pair.</p></div>}
            <button onClick={() => finishSession(trials)} className="w-full text-sm text-gray-600 underline mt-5">End practice</button>
          </>
        )}
        {gameState === 'ready' && <ReadyScreen startGame={startGame} openSettings={() => navigate('settings')} settings={settings} highScores={highScores} sessions={sessions} useRecommended={useRecommended} starting={starting} />}
        {gameState === 'settings' && <SettingsScreen settings={settings} onSave={saveSettings} close={() => navigate('ready')} />}
        {gameState === 'info' && <InfoScreen close={() => navigate('ready')} />}
        {gameState === 'gameOver' && summary && <GameOverScreen summary={summary} settings={settings} endReason={endReason} startNewGame={() => navigate('ready')} openSettings={() => navigate('settings')} />}
      </div>
      <p className="mt-6 text-sm text-gray-500 text-center">Small differences. Careful listening.</p>
    </main>
  );
};

export default App;
