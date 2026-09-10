// Replays the frozen baseline model to obtain active-time metrics missing from
// its original production simulator. Original policy artifacts remain unchanged.
import { readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const folder = 'qa-artifacts/major-baseline-source';
let code = readFileSync(`${folder}/tests/simulate-upgrades.mjs`, 'utf8');
code = code.replaceAll('../.test-build/', './compiled/');
code = code.replace(
  "const policy = process.argv[2] ?? 'mixed',",
  "const activeByDelivery = {}, activeByPhase = {}, benchByDelivery = {};\nconst policy = process.argv[2] ?? 'mixed',",
);
const mark =
  '  toolUsageSeconds[m.toolId] = (toolUsageSeconds[m.toolId] ?? 0) + 0.05;';
if (!code.includes(mark))
  throw Error(
    'Frozen simulator changed; review instrumentation before running.',
  );
code = code.replace(
  mark,
  `  const deliveryKey = m.round + 1, phaseKey = deliveryKey + ':' + (m.campaign.state.phase + 1);
  if (m.phase === 'playing' && !m.settlement && !m.campaign.state.call && m.loot.some(t => t.state === 'embedded')) {
    benchByDelivery[deliveryKey] = (benchByDelivery[deliveryKey] ?? 0) + .05;
    if (aim && m.firing) {
      activeByDelivery[deliveryKey] = (activeByDelivery[deliveryKey] ?? 0) + .05;
      activeByPhase[phaseKey] = (activeByPhase[phaseKey] ?? 0) + .05;
    }
  }
${mark}`,
);
code = code.replace(
  'const result = {',
  `const result = {
  activeByDelivery: Object.fromEntries(Object.entries(activeByDelivery).map(([k,v]) => [k,+v.toFixed(2)])),
  activeByPhase: Object.fromEntries(Object.entries(activeByPhase).map(([k,v]) => [k,+v.toFixed(2)])),
  benchByDelivery: Object.fromEntries(Object.entries(benchByDelivery).map(([k,v]) => [k,+v.toFixed(2)])),`,
);
code = code.replace(
  '`qa-artifacts/upgrades-${policy}.json`',
  `'${folder}/active-mixed.json'`,
);
writeFileSync(`${folder}/active-replay.mjs`, code);
const child = spawn(
  process.execPath,
  [`${folder}/active-replay.mjs`, 'mixed'],
  { stdio: 'inherit' },
);
child.on('exit', (code) => (process.exitCode = code ?? 1));
