import { spawn, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import {
  createWriteStream,
  mkdirSync,
  readdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
const all = [
  'saver',
  'upgrader',
  'mixed',
  'cheapest-first',
  'power-first',
  'speed-first',
  'control-first',
  'technique-first',
  'inefficient',
];
const requested = process.argv.includes('--all')
  ? ['mixed', ...all.filter((policy) => policy !== 'mixed')]
  : [
      process.argv.find((arg) => arg.startsWith('--policy='))?.split('=')[1] ??
        'mixed',
    ];
const through = process.argv.find((arg) => arg.startsWith('--through='));
const limit = process.argv.find((arg) => arg.startsWith('--max-minutes='));
const directory = 'qa-artifacts/major-sim-build';
mkdirSync(directory, { recursive: true });
function sourceFiles(root) {
  return readdirSync(root, { withFileTypes: true }).flatMap((entry) => {
    const path = `${root}/${entry.name}`;
    return entry.isDirectory()
      ? sourceFiles(path)
      : path.endsWith('.ts')
        ? [path]
        : [];
  });
}
function fingerprint() {
  const files = [
    ...sourceFiles('lib/game'),
    'tests/simulate-major.mjs',
    'tests/run-major-policies.mjs',
    'tests/major-policy-value.mjs',
    'package.json',
    'package-lock.json',
    'tsconfig.json',
  ].sort((a, b) => a.localeCompare(b));
  return Object.fromEntries(
    files.map((file) => [
      file,
      createHash('sha256').update(readFileSync(file)).digest('hex'),
    ]),
  );
}
if (!process.argv.includes('--skip-compile')) {
  const before = fingerprint();
  writeFileSync(
    `${directory}/build-info.json`,
    JSON.stringify({ status: 'compiling' }),
  );
  const compiled = spawnSync(
    process.execPath,
    [
      'node_modules/typescript/bin/tsc',
      '--module',
      'commonjs',
      '--target',
      'es2022',
      '--moduleResolution',
      'node',
      '--esModuleInterop',
      '--skipLibCheck',
      '--rootDir',
      '.',
      '--outDir',
      directory,
      'lib/game/model.ts',
      'lib/game/tutorial-qa.ts',
    ],
    { stdio: 'inherit', windowsHide: true },
  );
  if (compiled.status !== 0) process.exit(compiled.status ?? 1);
  writeFileSync(`${directory}/package.json`, '{"type":"commonjs"}');
  const hashes = fingerprint();
  if (JSON.stringify(before) !== JSON.stringify(hashes))
    throw Error(
      'Simulation inputs changed during compilation. Recompile a stable snapshot.',
    );
  writeFileSync(
    `${directory}/build-info.json`,
    JSON.stringify(
      {
        status: 'ready',
        builtAt: new Date().toISOString(),
        compileInputsStable: true,
        hashes,
      },
      null,
      2,
    ),
  );
}
const frozen = JSON.parse(readFileSync(`${directory}/build-info.json`, 'utf8'));
if (frozen.status !== 'ready' || !frozen.compileInputsStable)
  throw Error('No verified stable simulation build. Recompile before running.');
for (const script of [
  'tests/simulate-major.mjs',
  'tests/run-major-policies.mjs',
  'tests/major-policy-value.mjs',
]) {
  if (
    createHash('sha256').update(readFileSync(script)).digest('hex') !==
    frozen.hashes[script]
  )
    throw Error(
      `${script} changed after the frozen compile; recompile the cohort.`,
    );
}
for (const policy of requested) {
  if (!all.includes(policy)) throw Error(`Unknown policy ${policy}`);
  const log = createWriteStream(`qa-artifacts/major-sim-${policy}.log`);
  console.log(`Starting ${policy}${through ? ` ${through}` : ''}`);
  const child = spawn(
    process.execPath,
    [
      'tests/simulate-major.mjs',
      policy,
      ...(through ? [through] : []),
      ...(limit ? [limit] : []),
    ],
    { windowsHide: true },
  );
  child.stdout.pipe(log);
  child.stderr.pipe(log);
  child.stdout.on('data', (data) => {
    for (const line of data.toString().trim().split('\n'))
      if (
        line.includes('phase-end') ||
        line.includes('summary') ||
        line.includes('tutorial-complete')
      )
        console.log(line);
  });
  const code = await new Promise((resolve, reject) => {
    child.on('error', reject);
    child.on('close', resolve);
  });
  await new Promise((resolve) => log.end(resolve));
  if (code !== 0)
    throw Error(`${policy} failed; see qa-artifacts/major-sim-${policy}.log`);
}
if (requested.length > 1) {
  const runs = requested.map((policy) =>
    JSON.parse(readFileSync(`qa-artifacts/major-${policy}.json`, 'utf8')),
  );
  const mixed = runs.find((run) => run.policy === 'mixed');
  const jaccard = (a, b) => {
    const sa = new Set(a),
      sb = new Set(b);
    return (
      [...sa].filter((id) => sb.has(id)).length / new Set([...sa, ...sb]).size
    );
  };
  const summary = runs.map((run) => ({
    policy: run.policy,
    completed: run.completed,
    activeMinutes: run.campaignActiveMinutes,
    experienceMinutes: run.estimatedExperienceMinutes,
    money: run.money,
    gross: run.gross,
    net: run.net,
    nodeCount: run.nodeCount,
    conditionBonus: run.conditionBonus,
    valueWeightedBonusPercent: run.valueWeightedBonusPercent,
    meanItemBonusPercent: run.meanItemBonusPercent,
    averageCondition: run.averageCondition,
    midgameJaccardVsMixed: jaccard(run.midgame.nodes, mixed.midgame.nodes),
    endgameJaccardVsMixed: jaccard(run.nodes, mixed.nodes),
  }));
  writeFileSync(
    'qa-artifacts/major-policy-summary.json',
    JSON.stringify(summary, null, 2),
  );
  if (runs.some((run) => !run.completed))
    throw Error('At least one policy did not complete');
}
