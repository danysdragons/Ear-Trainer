# Intonation Ear Trainer

A browser-based practice tool for hearing small pitch differences. Listen to two tones and decide whether the **first or second pitch**, as named in the question, is higher or lower than the other.

## Run locally

Install Node.js and npm, then run:

```sh
npm ci
npm start
```

Open http://localhost:3000. Audio starts after you click **Start Game**. A browser with Web Audio support is required.

```sh
npm run build                               # Static production files in build/
CI=true npm test -- --watchAll=false --runInBand
npx tsc --noEmit
```

## Deployment

Every push to `main` runs the test suite, creates a production build, and deploys it to [GitHub Pages](https://danysdragons.github.io/Ear-Trainer/) through `.github/workflows/deploy-pages.yml`. The repository's Pages source must be set to **GitHub Actions** once under **Settings → Pages**.

## Practice settings

Settings are saved on the current device. Open Settings, make changes, and select **Save settings**. Cancel discards edits; Restore defaults resets the form before saving.

| Setting | Options / behaviour |
| --- | --- |
| Starting pitch gap | 1–100 cents, in 0.1-cent steps. Every session starts at this gap. |
| Progression rule | Target accuracy, two or three consecutive correct, fixed gap, or advanced/custom percentages. |
| Target success rate | 60–90%, default 75%. Higher targets favour more successful answers. |
| Adjustment speed | 1–100% widening after a mistake, default 30%. Target and streak modes automatically calculate the matching reduction. |
| Unlimited lives | Enabled by default; adaptation still operates. Turn off to use 1–99 lives. |
| Question limit | Optional, 1–1000 answers; default 50. A session ends at the first enabled limit, or when you select End practice. Replays do not count. |
| Pitch selection | Arbitrary frequencies or a musical note reference. |
| Pitch register | Low (110–220 Hz), medium (330–660 Hz), high (660–1320 Hz), or changing (110–1320 Hz). Both tones stay within the selected range. |
| Sound | Sine, sawtooth, square, triangle, or synthesized piano, violin, and flute. These are synthesized timbres, not recorded instruments. |
| Background noise | None, white noise, or pink noise. |

100 cents is one semitone; smaller gaps are harder. **Lower is on the left; Higher is on the right.** The prompt randomly asks about either the first or second pitch. The arrow keys answer for that pitch; **R** replays the same pair and question. Answer and replay controls become available after both tones finish. Keyboard shortcuts do not interfere with inputs.

### Adaptive rules

The old default narrowed the gap by 23% after each success and widened it by 30% after each error. In log-gap space, this nominally targets only 50.10% correct, very close to the 50% guessing rate.

**Target accuracy (recommended):** for target probability `p` and error multiplier `u = 1 + adjustmentPercent / 100`, the success multiplier is `d = u ** (-(1-p)/p)`. Thus `p*log(d) + (1-p)*log(u) = 0`. At the defaults of 75% and +30%, each success reduces the gap by about 8.37%. Changing adjustment speed preserves the nominal target. Smaller steps are smoother but take longer to adapt.

**Two/three consecutive correct:** a complete streak reduces the gap by `1/u`; one error multiplies it by `u`. The counter resets after an error or a completed streak, including at a range boundary. These reciprocal steps give nominal targets of about 70.7% and 79.4%. Replays do not advance or reset the streak.

**Fixed gap:** neither successes nor errors alter the gap. A live slider changes the next new pair while replay retains the current pair. This replaces Sandbox, with lives and question limits now independently configurable.

**Advanced/custom:** choose the success reduction and error widening independently. The implied target is shown, with an explanation when it approaches or falls below chance. A 0% success reduction means only errors alter the gap; it is not fixed-gap practice.

These are nominal targets. Finite steps, gap boundaries, short sessions, and changing listener performance affect the achieved rate. They are established adaptive-testing ideas, not proof of an optimal learning success rate: [Levitt (1971)](https://bdml.stanford.edu/twiki/pub/Haptics/DetectionThreshold/psychoacoustics.pdf), [Kaernbach (1991)](https://pubmed.ncbi.nlm.nih.gov/2011460/).

### Results and history

Results lead with **accuracy and number of answers** and **typical practice gap**, the median of the most recent 20 answered pairs (or all answers for shorter sessions). A single-answer minimum is available in a disclosure with an explanation that it may reflect guessing.

An approximate practice threshold is reported only after sufficient settling, reversals, and evidence above chance. Otherwise the result explains why it is unavailable. Estimates use the nominal target of the chosen adaptive rule and explicitly flag recent encounters with the 1- or 100-cent boundaries. Fixed-gap and custom rules at/below chance or at 100% get no estimate. Replays on answered pairs are recorded and disclosed. These summaries are practice statistics, not validated hearing measurements.

The latest 30 completed sessions with at least one answer are saved, including settings, accuracy, typical gap, estimate status, timestamp, and stopping reason. The **Same settings only** filter compares effective progression parameters, starting gap, session limits, register, sound, noise, and pitch selection. All settings remain visible for each record; results are not ranked by the smallest gap.

Existing settings migrate to Advanced/custom with their percentages and lives preserved. Old Sandbox settings migrate to Fixed gap with unlimited lives and no question limit. **Use recommended practice** switches to 75% target, 30% error steps, unlimited lives, and 50 questions, while retaining starting gap and sound/pitch preferences. The settings form also provides **Use recommended adaptation (75%)**, which changes only the adaptive rule. Historical scores remain in their original storage key, displayed separately and never rewritten by new sessions.

For the exact estimate gates, reproducible simulation results, and limitations, see [Adaptive practice validation](docs/adaptation-validation.md). Run the simulations with:

```sh
node scripts/simulate-adaptation.cjs
```

## How pitches are selected

The original implementation chose an arbitrary first frequency uniformly in Hz within a register, then placed the second a precise interval above or below it. Neither frequency was deliberately snapped to a musical note.

The current implementation offers both approaches:

- **Arbitrary pitches:** choose a continuous random anchor frequency, then offset the other tone by the requested gap. Neither tone is snapped to a note grid.
- **Musical note reference:** choose a random note from twelve-tone equal temperament with A4 = 440 Hz, then offset the other tone. The tuned reference is independently randomized to the first or second position. At a gap of exactly 100 cents, both tones necessarily land on musical notes.

For a gap `c` in cents, the frequency ratio is `2 ** (c / 1200)`. A note with MIDI number `m` has frequency `440 * 2 ** ((m - 69) / 12)`. The offset may be above or below the anchor. Anchor selection is constrained so both frequencies stay within the register. Direction, presentation order, and the question target are independently randomized once per round; replay does not reroll them.

“Musical note” here means a frequency on the A440 equal-tempered grid, not the only musically valid pitch or tuning system. The violin timbre adds vibrato around its assigned frequency, so sine is the clearest choice for comparing steady reference frequencies.

### Teaching tradeoffs

Our recommendation is arbitrary pitches as the default for general relative-pitch discrimination, with note references as an option for practice around standard tuning. This is a design judgment, not a claim that either mode has been demonstrated to be universally superior.

Research on frequency-discrimination training shows that reference-frequency variability can affect learning and transfer differently across listeners: [Amitay, Hawkey & Moore (2005)](https://pubmed.ncbi.nlm.nih.gov/16134462/). It compares fixed and varying standards, not these exact two app modes. Both app modes vary their reference across rounds, and neither requires identifying note names or having absolute pitch. A smaller register can make practice more focused; note anchoring adds a conventional tuning reference without changing the basic higher/lower task.

## Code organization

- `src/App.tsx`: session state, round timing, keyboard controls, and screen navigation.
- `src/game.ts`: pitch-pair generation, answer grading, and adaptive rules.
- `src/session.ts`: session limits, descriptive statistics, estimate eligibility, and comparison keys.
- `src/simulation.ts`: deterministic synthetic listeners for validation.
- `src/audio.ts`: Web Audio synthesis, effects, background noise, and audio cleanup.
- `src/storage.ts`: validated settings migration, historical records, and bounded session history with graceful fallback when storage is unavailable.
- `src/components/`: settings, instructions, ready/play/results screens, and feedback controls.
- `src/constants.ts` / `src/types.ts`: defaults, ranges, options, and shared types.

React 19 and TypeScript, built with Create React App. Tailwind 3 is compiled locally from `src/index.css`; styling does not require a CDN. Lucide supplies interface icons. There is no backend or account system.

The tests cover exact cent gaps, register boundaries, note placement, both question targets, target tracking, streaks, session limits, fixed practice, replay, canceled playback, summary eligibility, migration/persistence, and audio initialization failures.

## License

[MIT](LICENSE.MD) · Copyright 2025 Michael Hamel
