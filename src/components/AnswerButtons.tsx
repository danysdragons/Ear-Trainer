import React from 'react';

interface AnswerButtonsProps {
  handleAnswer: (answer: 'higher' | 'lower') => void;
  disabled: boolean;
}

const AnswerButtons: React.FC<AnswerButtonsProps> = ({ handleAnswer, disabled }) => (
  <div className="grid grid-cols-2 gap-4">
    <button
      onClick={() => handleAnswer('lower')}
      disabled={disabled}
      className={`py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
        !disabled
          ? 'bg-purple-600 text-white hover:bg-purple-700 hover:scale-105'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
      aria-label="Lower (Down Arrow)"
    >
      ↓ Lower
    </button>

    <button
      onClick={() => handleAnswer('higher')}
      disabled={disabled}
      className={`py-4 px-6 rounded-lg font-bold text-lg transition-all duration-200 ${
        !disabled
          ? 'bg-blue-600 text-white hover:bg-blue-700 hover:scale-105'
          : 'bg-gray-200 text-gray-400 cursor-not-allowed'
      }`}
      aria-label="Higher (Up Arrow)"
    >
      ↑ Higher
    </button>
  </div>
);

export default AnswerButtons;
