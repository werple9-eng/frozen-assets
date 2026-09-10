import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, readdirSync } from 'node:fs';
const testFiles = readdirSync('tests')
  .filter((name) => name.endsWith('.test.ts'))
  .sort();
const moduleTests = readdirSync('tests')
  .filter((name) => name.endsWith('.test.mjs'))
  .sort();
const compile = spawnSync(
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
    '--outDir',
    '.test-build',
    ...testFiles.map((name) => `tests/${name}`),
  ],
  { stdio: 'inherit' },
);
if (compile.status !== 0) process.exit(compile.status ?? 1);
mkdirSync('.test-build', { recursive: true });
writeFileSync('.test-build/package.json', '{"type":"commonjs"}');
const result = spawnSync(
  process.execPath,
  [
    '--test',
    ...testFiles.map(
      (name) => `.test-build/tests/${name.replace(/\.ts$/, '.js')}`,
    ),
    ...moduleTests.map((name) => `tests/${name}`),
  ],
  { stdio: 'inherit' },
);
process.exit(result.status ?? 1);
