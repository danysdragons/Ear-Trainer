// Use the installed TypeScript compiler so the simulation exercises the actual app rules.
const fs = require('fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const code = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText;
  module._compile(code, filename);
};
const { DEFAULT_SETTINGS } = require('../src/constants.ts');
const { simulateListener } = require('../src/simulation.ts');
const { nominalTarget } = require('../src/game.ts');
const mean = values => values.reduce((a, b) => a + b, 0) / values.length;
const rows = [];
for (const mode of ['target', 'streak2', 'streak3']) {
  for (const speed of [10, 30, 60]) {
    for (const questions of [50, 200]) {
      const accuracies = [], signedErrors = [], absoluteErrors = [];
      let offered = 0;
      for (const start of [1, 20, 100]) {
        for (const slope of [3, 6]) {
          for (let seed = 1; seed <= 100; seed++) {
            const settings = { ...DEFAULT_SETTINGS, progressionMode: mode, adjustmentPercent: speed, startingGapCents: start };
            const result = simulateListener(settings, questions, seed, slope);
            const settled = result.trials.slice(20);
            accuracies.push(settled.filter(t => t.correct).length / settled.length * 100);
            if (result.summary.estimate.gap !== null) {
              offered++;
              const relative = (result.summary.estimate.gap / result.trueThreshold - 1) * 100;
              signedErrors.push(relative);
              absoluteErrors.push(Math.abs(relative));
            }
          }
        }
      }
      rows.push({ rule: mode, speed, questions, target: nominalTarget({ ...DEFAULT_SETTINGS, progressionMode: mode }).toFixed(1),
        accuracy: mean(accuracies).toFixed(1), estimates: `${offered}/600`,
        bias: offered ? mean(signedErrors).toFixed(1) : 'n/a', error: offered ? mean(absoluteErrors).toFixed(1) : 'n/a' });
    }
  }
}
console.log('| Rule | Error step % | Questions | Nominal target % | Accuracy after first 20 % | Estimates shown | Mean bias % | Mean absolute error % |');
console.log('| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |');
for (const row of rows) console.log(`| ${row.rule} | ${row.speed} | ${row.questions} | ${row.target} | ${row.accuracy} | ${row.estimates} | ${row.bias} | ${row.error} |`);
let chanceEstimates = 0;
for (let seed = 1; seed <= 1000; seed++) {
  if (simulateListener(DEFAULT_SETTINGS, 200, seed, 4, true).summary.estimate.gap !== null) chanceEstimates++;
}
console.log(`\nChance-only listeners: ${chanceEstimates}/1000 sessions offered an estimate (200 answers, default rule).`);
