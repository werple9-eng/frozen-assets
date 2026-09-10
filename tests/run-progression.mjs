import { spawn } from 'node:child_process';
import {
  createWriteStream,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'node:fs';
const policies = [
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
mkdirSync('qa-artifacts', { recursive: true });
let cursor = 0;
async function worker() {
  while (cursor < policies.length) {
    const policy = policies[cursor++],
      log = createWriteStream(`qa-artifacts/sim-${policy}.log`);
    console.log(`Starting ${policy}`);
    const child = spawn(
      process.execPath,
      ['tests/simulate-upgrades.mjs', policy],
      { windowsHide: true },
    );
    child.stdout.pipe(log);
    child.stderr.pipe(log);
    await new Promise((resolve, reject) => {
      child.on('error', reject);
      child.on('exit', (code) =>
        code === 0 ? resolve() : reject(Error(`${policy}: exit ${code}`)),
      );
    });
    log.end();
    console.log(`Finished ${policy}`);
  }
}
await Promise.all([worker(), worker(), worker()]);
const runs = policies.map((p) =>
  JSON.parse(readFileSync(`qa-artifacts/upgrades-${p}.json`, 'utf8')),
);
writeFileSync(
  'qa-artifacts/progression-summary.json',
  JSON.stringify(
    runs.map(
      ({
        blocks: _blocks,
        events: _events,
        purchases: _purchases,
        ...summary
      }) => summary,
    ),
    null,
    2,
  ),
);
if (runs.some((r) => !r.completed)) throw Error('A campaign did not finish');
console.log(`All ${policies.length} campaigns completed.`);
