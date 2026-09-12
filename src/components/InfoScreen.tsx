import React from 'react';

const InfoScreen = ({ close }: { close: () => void }) => (
  <div className="space-y-4">
    <div className="bg-gray-50 rounded-lg p-4">
      <h3 className="font-bold mb-2">How to practice</h3>
      <ol className="list-decimal pl-5 space-y-2 text-sm">
        <li>Choose a starting gap, progression rule, and session length in Settings.</li>
        <li>Listen to two tones, then read which pitch the question asks about: first or second.</li>
        <li>Choose whether that pitch was higher or lower than the other. Lower is on the left; Higher is on the right.</li>
        <li>Target accuracy adjusts every answer. Streak rules narrow the gap after two or three consecutive correct answers and widen it after one mistake.</li>
      </ol>
      <p className="text-sm mt-3">100 cents is one semitone. Smaller gaps are harder. Unlimited lives keeps adaptive practice going; Fixed gap provides manual control regardless of your answers.</p>
    </div>
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
      <h3 className="font-bold">Why aim above chance?</h3>
      <p>Guessing gets about half the answers right. The recommended rule aims for 75% correct. Changing adjustment speed preserves that nominal target, but large steps, short sessions, or gap limits can affect the actual result.</p>
      <p>Results show accuracy and a typical practice gap. A single correct answer can be lucky. A threshold estimate needs enough settled responses and changes in difficulty direction; even then, it is an approximate practice statistic.</p>
    </div>
    <div className="bg-gray-50 rounded-lg p-4 text-sm space-y-2">
      <h3 className="font-bold">Which pitches will I hear?</h3>
      <p>Arbitrary pitches are not snapped to a note. Musical note reference places one tone on an equal-tempered note with A4 = 440 Hz and offsets the other. The reference randomly plays first or second.</p>
      <p>The question is chosen independently. Replay repeats the same tones and question without advancing the streak or question count.</p>
    </div>
    <div className="bg-gray-50 rounded-lg p-4 text-sm">
      <h3 className="font-bold mb-2">Keyboard controls</h3>
      <p>↑ Higher · ↓ Lower · R Replay</p>
      <p className="mt-2">Answer and replay controls become available after both tones finish.</p>
    </div>
    <button onClick={close} className="secondary-button w-full">Back to Game</button>
  </div>
);

export default InfoScreen;
