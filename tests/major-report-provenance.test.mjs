import test from 'node:test';
import assert from 'node:assert/strict';
import { qualifySimulationSource } from './major-report-provenance.mjs';

const runtime = [
  'lib/game/model.ts',
  'lib/game/tutorial-qa.ts',
  'lib/game/ice.ts',
];
const scripts = ['tests/simulate-major.mjs', 'tests/major-policy-value.mjs'];
const oldHash = '1'.repeat(64),
  newHash = '2'.repeat(64);
function fixture() {
  const requiredSources = [...runtime, ...scripts, 'lib/game/webmcp.ts'];
  const hashes = Object.fromEntries(
    requiredSources.map((file) => [file, oldHash]),
  );
  const currentHashes = { ...hashes, 'lib/game/webmcp.ts': newHash };
  return {
    source: {
      status: 'ready',
      compileInputsStable: true,
      builtAt: 'frozen',
      hashes,
    },
    actualRuntimeInputs: runtime,
    requiredSources,
    nonGameInputs: scripts,
    currentHashes,
    qualification: {
      builtAt: 'frozen',
      entrypoints: runtime.slice(0, 2),
      compiledRuntimeInputs: runtime,
      compiledRuntimeUnchanged: true,
      currentDifferences: [
        {
          file: 'lib/game/webmcp.ts',
          frozenHash: oldHash,
          currentHash: newHash,
          inCompiledGameModelGraph: false,
        },
      ],
    },
  };
}

void test('a documented browser-QA-only difference qualifies unchanged actual runtime without modifying original hashes', () => {
  const input = fixture(),
    original = structuredClone(input.source);
  assert.equal(qualifySimulationSource(input).accepted, true);
  assert.deepEqual(input.source, original);
});

void test('runtime and simulator-helper edits cannot be exempted by qualification claims', () => {
  for (const file of ['lib/game/ice.ts', 'tests/major-policy-value.mjs']) {
    const input = fixture();
    input.currentHashes[file] = newHash;
    input.qualification.currentDifferences.push({
      file,
      frozenHash: oldHash,
      currentHash: newHash,
      inCompiledGameModelGraph: false,
    });
    const result = qualifySimulationSource(input);
    assert.equal(result.accepted, false);
    assert.ok(
      result.issues.includes('An actual simulation dependency changed'),
    );
  }
});

void test('stale build, stale browser hash, missing dependencies, and falsified graph are rejected', () => {
  for (const mutate of [
    (input) => {
      input.qualification.builtAt = 'another build';
    },
    (input) => {
      input.qualification.currentDifferences[0].currentHash = oldHash;
    },
    (input) => {
      delete input.source.hashes['lib/game/ice.ts'];
    },
    (input) => {
      input.qualification.compiledRuntimeInputs = runtime.slice(0, 2);
    },
  ]) {
    const input = fixture();
    mutate(input);
    assert.equal(qualifySimulationSource(input).accepted, false);
  }
});
