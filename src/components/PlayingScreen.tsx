import React from 'react';
import { Volume2 } from 'lucide-react';
import { QuestionTarget } from '../types';

interface PlayingScreenProps {
  currentPitchIndex: number;
  questionTarget: QuestionTarget;
  replayPitches: () => void;
  acceptingAnswers: boolean;
}

const PlayingScreen = ({ currentPitchIndex, questionTarget, replayPitches, acceptingAnswers }: PlayingScreenProps) => (
  <div className="flex flex-col mb-6 items-center">
    <p className="text-lg font-semibold text-center mb-4">Was the <strong className="text-indigo-700 underline">{questionTarget} pitch</strong> higher or lower than the other?</p>
    <div className="flex justify-between w-full mb-4" aria-hidden="true">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentPitchIndex > 0 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>1</div>
      <div className="flex-1 h-1 self-center mx-2 bg-gray-200"><div className={`h-1 bg-indigo-600 transition-all duration-500 ${currentPitchIndex > 1 ? 'w-full' : 'w-0'}`} /></div>
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${currentPitchIndex > 1 ? 'bg-indigo-600 text-white' : 'bg-gray-200'}`}>2</div>
    </div>
    <p className="text-gray-600 text-sm mb-3" role="status">{['Get ready…', 'Listening to first pitch…', 'Listening to second pitch…', 'Choose Higher or Lower.'][currentPitchIndex]}</p>
    {acceptingAnswers && <button onClick={replayPitches} className="flex items-center text-indigo-600 hover:text-indigo-800 text-sm"><Volume2 size={16} className="mr-1" />Replay Pitches (R)</button>}
  </div>
);

export default PlayingScreen;
