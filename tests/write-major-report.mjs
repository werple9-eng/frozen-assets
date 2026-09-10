import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash } from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { qualifySimulationSource } from './major-report-provenance.mjs';

// Read-only game audit. This compiles into its own directory and never reads a
// player's browser/localStorage save or mutates the simulation build.
const root = path.resolve(import.meta.dirname, '..');
process.chdir(root);
const argument = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? undefined : process.argv[i + 1];
};
const manifestPath =
  argument('--inputs') ?? 'qa-artifacts/major-report-inputs.json';
const read = (file, fallback = null) =>
  fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : fallback;
const hash = (file) =>
  fs.existsSync(file)
    ? createHash('sha256').update(fs.readFileSync(file)).digest('hex')
    : null;
const auditSourceFiles = () =>
  [
    ...['lib/game', 'app', 'components/game', 'tests']
      .flatMap(walk)
      .filter((file) => /\.(ts|tsx|css|mjs|py)$/.test(file)),
    'package.json',
    'package-lock.json',
    'tsconfig.json',
  ].sort((a, b) => a.localeCompare(b));
const sourceSnapshot = () =>
  Object.fromEntries(auditSourceFiles().map((file) => [file, hash(file)]));
const initialSourceHashes = sourceSnapshot();
const assertStableSources = (stage) => {
  const current = sourceSnapshot();
  const changed = [
    ...new Set([...Object.keys(initialSourceHashes), ...Object.keys(current)]),
  ].filter((file) => initialSourceHashes[file] !== current[file]);
  if (changed.length)
    throw new Error(
      `Report source changed ${stage}; rerun after edits finish:\n${changed.join('\n')}`,
    );
};
const manifest = read(manifestPath, {});
const out = 'qa-artifacts/major-report';
const build = 'qa-artifacts/major-report-build';
fs.mkdirSync(out, { recursive: true });
fs.mkdirSync(build, { recursive: true });
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
    build,
    'lib/game/campaign-content.ts',
    'lib/game/campaign-layout.ts',
    'lib/game/campaign.ts',
  ],
  { encoding: 'utf8' },
);
if (compiled.status !== 0)
  throw new Error(
    `Report source compilation failed:\n${compiled.stdout}\n${compiled.stderr}`,
  );
assertStableSources('during compilation');
fs.writeFileSync(`${build}/package.json`, '{"type":"commonjs"}\n');
const require = createRequire(import.meta.url);
const { BLOCKS, TOOLS, STORY } = require(
  path.join(root, build, 'lib/game/campaign-content.js'),
);
const { campaignField, campaignLoot } = require(
  path.join(root, build, 'lib/game/campaign-layout.js'),
);
const { surface } = require(path.join(root, build, 'lib/game/ice.js'));
const { Campaign } = require(path.join(root, build, 'lib/game/campaign.js'));
const baseline = read('qa-artifacts/major-baseline.json', {});
const foundation = read('qa-artifacts/major-foundation-browser.json', {});
const uiReview = read('qa-artifacts/major-ui-review-pass.json', {});
const num = (n, places = 1) =>
  Number.isFinite(n)
    ? Number(n.toFixed(places)).toLocaleString('en-US', {
        maximumFractionDigits: places,
      })
    : 'Pending';
const money = (n) => (Number.isFinite(n) ? `$${num(n, 0)}` : 'Pending');
const sum = (xs) => xs.reduce((a, b) => a + b, 0);
const md = (v) =>
  String(v ?? 'Pending')
    .replaceAll('|', '\\|')
    .replaceAll('\n', '<br>');
const table = (headers, rows) =>
  `| ${headers.join(' | ')} |\n| ${headers.map(() => '---').join(' | ')} |\n${rows.map((r) => `| ${r.map(md).join(' | ')} |`).join('\n')}\n`;
const csv = (file, rows) => {
  if (!rows.length) {
    fs.writeFileSync(`${out}/${file}`, '');
    return;
  }
  const keys = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const cell = (v) =>
    `"${(v === undefined || v === null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v)).replaceAll('"', '""')}"`;
  fs.writeFileSync(
    `${out}/${file}`,
    [
      keys.map(cell).join(','),
      ...rows.map((r) => keys.map((k) => cell(r[k])).join(',')),
    ].join('\n') + '\n',
  );
};
const normalizePolicy = (name) => name.replace(/-first$/, '');
const policyOrder = [
  'saver',
  'power',
  'speed',
  'control',
  'technique',
  'mixed',
  'cheapest',
  'inefficient',
  'upgrader',
];
// Every policy uses the shared simulator and launcher. A fingerprint that omits
// a required runtime file is incomplete even when its remaining hashes match.
const nonGameSimulationInputs = [
  'tests/simulate-major.mjs',
  'tests/run-major-policies.mjs',
  'tests/major-policy-value.mjs',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
];
const requiredSimulationSources = [
  ...walk('lib/game').filter((file) => file.endsWith('.ts')),
  ...nonGameSimulationInputs,
];
const ts = require('typescript');
const simulationProgram = ts.createProgram(
  ['lib/game/model.ts', 'lib/game/tutorial-qa.ts'],
  {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2022,
    moduleResolution: ts.ModuleResolutionKind.Node10,
    esModuleInterop: true,
    skipLibCheck: true,
  },
);
const actualCompiledRuntimeInputs = simulationProgram
  .getSourceFiles()
  .map((file) =>
    path.relative(root, path.resolve(file.fileName)).replaceAll('\\', '/'),
  )
  .filter((file) => file.startsWith('lib/game/') && file.endsWith('.ts'))
  .sort((a, b) => a.localeCompare(b));
const runs = {};
for (const [inputName, input] of Object.entries(manifest.policyRuns ?? {})) {
  const name = normalizePolicy(inputName);
  if (runs[name]) throw new Error(`Duplicate policy aliases for ${name}`);
  if (!policyOrder.includes(name)) policyOrder.push(name);
  const entry =
    typeof input === 'string'
      ? { file: input, stage: 'Unclassified', final: false }
      : input;
  const data = read(entry.file);
  if (!data) {
    runs[name] = { ...entry, missing: true };
    continue;
  }
  const hashes = Object.entries(data.source?.hashes ?? {});
  const missingHashes = requiredSimulationSources.filter(
    (file) => !data.source?.hashes?.[file],
  );
  const mismatched = hashes
    .filter(
      ([file, saved]) =>
        typeof saved !== 'string' ||
        !/^[a-f0-9]{64}$/.test(saved) ||
        hash(file) !== saved,
    )
    .map(([file]) => file);
  const qualificationFile =
    entry.qualification ?? manifest.provenanceQualification;
  const qualificationData = qualificationFile ? read(qualificationFile) : null;
  const qualification = qualificationData
    ? {
        file: qualificationFile,
        sha256: hash(qualificationFile),
        data: qualificationData,
        ...qualifySimulationSource({
          source: data.source,
          qualification: qualificationData,
          actualRuntimeInputs: actualCompiledRuntimeInputs,
          requiredSources: requiredSimulationSources,
          nonGameInputs: nonGameSimulationInputs,
          currentHashes: Object.fromEntries(
            [
              ...new Set([
                ...requiredSimulationSources,
                ...hashes.map(([file]) => file),
              ]),
            ].map((file) => [file, hash(file)]),
          ),
        }),
      }
    : null;
  const fullSourceMatches =
    missingHashes.length === 0 && mismatched.length === 0;
  const dataIssues = [];
  if (normalizePolicy(String(data.policy ?? '')) !== name)
    dataIssues.push(
      `Input policy ${data.policy ?? 'missing'} does not match ${inputName}`,
    );
  if (data.completed) {
    const actualDeliveries = new Set(
      (data.deliveries ?? []).map((d) => d.block),
    );
    const expectedPhases = BLOCKS.flatMap((b, block) =>
      b.ice.phases.map((_, phase) => `${block + 1}:${phase + 1}`),
    );
    const actualPhases = new Set(
      (data.phases ?? []).map((p) => `${p.block}:${p.phase}`),
    );
    if (
      data.deliveries?.length !== BLOCKS.length ||
      !BLOCKS.every((_, block) => actualDeliveries.has(block + 1))
    )
      dataIssues.push('Completed flag lacks full unique delivery coverage');
    if (
      data.phases?.length !== expectedPhases.length ||
      actualPhases.size !== expectedPhases.length ||
      !expectedPhases.every((p) => actualPhases.has(p))
    )
      dataIssues.push('Completed flag lacks full unique phase coverage');
    const integrityChecks = [
      'grossEqualsNetPlusFees',
      'campaignGrossEqualsBasePlusBonus',
      'walletMatchesPriorFundsPlusNetLessPurchases',
      'uniqueAwardIds',
      'uniqueDeliveries',
      'removalCountsBalance',
    ];
    if (
      !integrityChecks.every((key) => data.financialIntegrity?.[key] === true)
    )
      dataIssues.push('Financial/removal integrity is missing or failed');
    if (
      !Number.isFinite(data.campaignActiveMinutes) ||
      data.campaignActiveMinutes <= 0 ||
      !(data.deliveries ?? []).every(
        (d) => Number.isFinite(d.activeSeconds) && d.activeSeconds >= 0,
      )
    )
      dataIssues.push('Active timing measurements are missing or invalid');
  }
  runs[name] = {
    ...entry,
    data,
    mismatched,
    missingHashes,
    dataIssues,
    qualification,
    fullSourceMatches,
    verifiedSource:
      data.source?.status === 'ready' &&
      data.source?.compileInputsStable === true &&
      (fullSourceMatches || qualification?.accepted === true),
    sha256: hash(entry.file),
  };
}
const mixed = runs.mixed?.data;
const sourceLabel = (run) =>
  run.fullSourceMatches
    ? 'full source matches'
    : run.qualification?.accepted
      ? `simulation dependencies match; documented browser-QA differences: ${run.mismatched.join(', ')}`
      : [
          run.mismatched.length
            ? `${run.mismatched.length} source files changed or hashes invalid`
            : null,
          run.missingHashes.length
            ? `${run.missingHashes.length} required hashes missing`
            : null,
          run.qualification
            ? `qualification rejected: ${run.qualification.issues.join(', ')}`
            : null,
        ]
          .filter(Boolean)
          .join('; ');
const runLabel = (r) =>
  !r || r.missing
    ? 'Pending'
    : `${r.stage ?? 'Run'}; ${r.data.completed ? 'complete' : 'partial'}; ${sourceLabel(r)}${r.dataIssues.length ? `; data issues: ${r.dataIssues.join(', ')}` : ''}${r.final ? '; designated final' : '; intermediate'}`;
const rational = (
  manifest.rationalPolicies ?? policyOrder.filter((p) => p !== 'inefficient')
)
  .map((p) => ({ policy: normalizePolicy(p), run: runs[normalizePolicy(p)] }))
  .filter(
    (x) =>
      x.run?.data?.completed &&
      x.run.final &&
      x.run.verifiedSource &&
      !x.run.dataIssues.length,
  );
if (process.argv.includes('--verify-inputs-only')) {
  console.log(
    JSON.stringify(
      {
        eligiblePolicies: rational.map((r) => r.policy),
        runs: Object.fromEntries(
          Object.entries(runs).map(([name, r]) => [
            name,
            {
              status: runLabel(r),
              missingHashes: r.missingHashes,
              mismatched: r.mismatched,
              dataIssues: r.dataIssues,
              qualification: r.qualification
                ? {
                    file: r.qualification.file,
                    accepted: r.qualification.accepted,
                    issues: r.qualification.issues,
                  }
                : null,
            },
          ]),
        ),
      },
      null,
      2,
    ),
  );
  process.exit(0);
}
const deliveryRun = (data, n) =>
  data?.deliveries?.find((d) => d.block === n || d.delivery === n);
const phaseRun = (data, n, p) =>
  data?.phases?.find((d) => d.block === n && d.phase === p);
const chapters = new Map();
const phases = [];
const deliveries = BLOCKS.map((b, index) => {
  const physical = b.ice.phases.map((p, phase) => {
    const field = campaignField(index, phase),
      loot = campaignLoot(index, phase);
    const before = field.remaining();
    field.carveLoot(loot);
    const solid = field.remaining(),
      materials = field.materialCounts();
    const start = performance.now(),
      mesh = surface(field),
      meshBuildMs = performance.now() - start;
    const triangles = mesh.positions.length / 9;
    const measurement = phaseRun(mixed, index + 1, phase + 1);
    const row = {
      delivery: index + 1,
      chapter: b.chapter,
      phase: phase + 1,
      id: p.id,
      name: p.name,
      profile: p.profile,
      width: p.dimensions.width,
      height: p.dimensions.height,
      depth: p.dimensions.depth,
      grid: [field.grid.nx, field.grid.ny, field.grid.nz],
      samples: field.values.length,
      cellSize: field.grid.cellSize,
      solidBeforePockets: before,
      solid,
      materials,
      materialPercent: Object.fromEntries(
        Object.entries(materials).map(([k, v]) => [k, (v / solid) * 100]),
      ),
      chunks: field.chunks.length,
      triangles,
      extractionCpuMs: meshBuildMs,
      typedArrayBytes: field.values.length * 14,
      pointNumericPayloadBytes: field.points.length * 24,
      targetSolid: p.targetSolidSamples,
      solidBudgetPass:
        solid >= p.targetSolidSamples.min * 0.88 &&
        solid <= p.targetSolidSamples.max * 1.12,
      targetActiveSeconds: p.targetActiveSeconds,
      mixedActiveSeconds: measurement?.activeSeconds ?? null,
      mixedAverageCondition: measurement?.conditions?.length
        ? sum(measurement.conditions) / measurement.conditions.length
        : null,
      idealTools: p.idealTools,
      gross: sum(loot.map((t) => t.value)),
      cargo: loot.length,
      story: loot.filter((t) => t.story).map((t) => t.story),
      solidIntersections: sum(loot.map((t) => field.solidIntersectionCount(t))),
      initiallyFree: loot.filter((t) => field.canRelease(t)).map((t) => t.id),
      initiallyExposed: loot
        .filter((t) => field.exposure(t).exposed > 0)
        .map((t) => t.id),
      layoutHash: field.grid.layoutHash,
    };
    phases.push(row);
    return row;
  });
  const c = new Campaign();
  c.state.blockRate = index === 31 ? 0 : index >= 17 ? 8 : 12;
  let exactNet = 0;
  for (let p = 0; p < b.phases; p++)
    for (const t of campaignLoot(index, p))
      if (!t.story) exactNet += c.credit(t.value, t.id);
  const chapter = chapters.get(b.chapter) ?? {
    chapter: b.chapter,
    targetMinSeconds: 0,
    targetMaxSeconds: 0,
    solidAcrossPhases: 0,
  };
  chapter.targetMinSeconds += b.targetActiveSeconds.min;
  chapter.targetMaxSeconds += b.targetActiveSeconds.max;
  chapter.solidAcrossPhases += sum(physical.map((p) => p.solid));
  chapters.set(b.chapter, chapter);
  const rationalTimes = rational
    .map(({ policy, run }) => ({
      policy,
      seconds: deliveryRun(run.data, index + 1)?.activeSeconds,
    }))
    .filter((t) => Number.isFinite(t.seconds));
  const fastest = rationalTimes.sort((a, b) => a.seconds - b.seconds)[0];
  return {
    delivery: index + 1,
    chapter: b.chapter,
    id: b.id,
    name: b.name,
    profile: b.profile,
    phaseCount: b.phases,
    dimensions: physical[0] && [
      physical[0].width,
      physical[0].height,
      physical[0].depth,
    ],
    grid: physical[0].grid,
    totalSamplesFirstPhase: physical[0].samples,
    totalSamplesAcrossPhases: sum(physical.map((p) => p.samples)),
    solidFirstPhase: physical[0].solid,
    solidAcrossPhases: sum(physical.map((p) => p.solid)),
    materialsFirstPhase: physical[0].materialPercent,
    baseNet: b.baseNet,
    baseGross: b.baseGross,
    exactNet,
    targetActiveSeconds: b.targetActiveSeconds,
    mixed: deliveryRun(mixed, index + 1) ?? null,
    fastestRationalSeconds: fastest?.seconds ?? null,
    fastestRationalPolicy: fastest?.policy ?? null,
    idealTools: physical.map((p) => p.idealTools),
    story: b.object ?? null,
    baseline:
      baseline.deliveries?.find((d) => d.delivery === index + 1) ?? null,
  };
});
const jaccard = (a, b) => {
  if (!Array.isArray(a) || !Array.isArray(b)) return null;
  const x = new Set(a),
    y = new Set(b),
    union = new Set([...x, ...y]);
  return union.size ? [...x].filter((id) => y.has(id)).length / union.size : 1;
};
const policyRows = policyOrder.map((name) => {
  const r = runs[name],
    d = r?.data;
  return {
    policy: name,
    status: runLabel(r),
    experienceMinutes: d?.estimatedExperienceMinutes ?? null,
    activeMinutes: d?.campaignActiveMinutes ?? null,
    money: d?.money ?? null,
    gross: d?.gross ?? null,
    net: d?.net ?? null,
    commission: d?.commission ?? null,
    basePayout: d?.basePayout ?? null,
    conditionBonus: d?.conditionBonus ?? null,
    conditionBonusPercent: d?.basePayout
      ? (d.conditionBonus / d.basePayout) * 100
      : null,
    averageCondition: d?.averageCondition ?? null,
    pristine: d?.pristine ?? null,
    nodes: d?.nodeCount ?? null,
    tools: d?.toolBuys ? Object.keys(d.toolBuys) : null,
    midgameJaccardVsMixed: jaccard(d?.midgame?.nodes, mixed?.midgame?.nodes),
    midgameDelivery: d?.midgame?.block ?? null,
    sourceMatches: r?.verifiedSource ?? false,
    maxPurchaseGapActiveSeconds: d?.maxPurchaseGapActiveSeconds ?? null,
    maxNoAffordableOpportunitySeconds:
      d?.maxNoAffordableOpportunitySeconds ?? null,
  };
});
const rationalNames = (
  manifest.rationalPolicies ?? policyOrder.filter((p) => p !== 'inefficient')
).map(normalizePolicy);
const eligibleRationalRows = policyRows.filter((row) =>
  rational.some((run) => run.policy === row.policy),
);
const comparisonReady = eligibleRationalRows.length === rationalNames.length;
const spread = (values) =>
  values.length && values.every((value) => Number.isFinite(value) && value > 0)
    ? ((Math.max(...values) - Math.min(...values)) / Math.min(...values)) * 100
    : null;
const policyComparison = {
  ready: comparisonReady,
  eligiblePolicies: eligibleRationalRows.map((row) => row.policy),
  expectedPolicies: rationalNames,
  experienceSpreadPercent: comparisonReady
    ? spread(eligibleRationalRows.map((row) => row.experienceMinutes))
    : null,
  activeSpreadPercent: comparisonReady
    ? spread(eligibleRationalRows.map((row) => row.activeMinutes))
    : null,
  earnedNetPerExperienceMinuteSpreadPercent: comparisonReady
    ? spread(eligibleRationalRows.map((row) => row.net / row.experienceMinutes))
    : null,
  endingWalletSpreadPercent: comparisonReady
    ? spread(eligibleRationalRows.map((row) => row.money))
    : null,
  dominanceCandidates: comparisonReady
    ? eligibleRationalRows
        .filter((row) =>
          eligibleRationalRows.every(
            (other) =>
              other.policy === row.policy ||
              (row.experienceMinutes < other.experienceMinutes * 0.8 &&
                row.money > other.money * 1.15),
          ),
        )
        .map((row) => row.policy)
    : null,
};
const observedTargetRows = [
  ['Mixed active minutes', mixed?.campaignActiveMinutes, 45, 55],
  [
    'Mixed modeled experience minutes',
    mixed?.estimatedExperienceMinutes,
    75,
    95,
  ],
  [
    'Rational modeled-time spread %',
    policyComparison.experienceSpreadPercent,
    8,
    20,
  ],
  [
    'Rational earned-net / modeled-minute spread %',
    policyComparison.earnedNetPerExperienceMinuteSpreadPercent,
    10,
    15,
  ],
  [
    'Rational ending-wallet spread %',
    policyComparison.endingWalletSpreadPercent,
    5,
    15,
  ],
  [
    'Power Condition bonus / base %',
    policyRows.find((row) => row.policy === 'power')?.conditionBonusPercent,
    5,
    9,
  ],
  [
    'Mixed Condition bonus / base %',
    policyRows.find((row) => row.policy === 'mixed')?.conditionBonusPercent,
    8,
    13,
  ],
  [
    'Control Condition bonus / base %',
    policyRows.find((row) => row.policy === 'control')?.conditionBonusPercent,
    12,
    18,
  ],
  [
    'Mixed Vault active seconds',
    deliveryRun(mixed, 32)?.activeSeconds,
    330,
    420,
  ],
  [
    'Mixed Ledger-cradle active seconds',
    phaseRun(mixed, 32, 5)?.activeSeconds,
    60,
    90,
  ],
].map(([measure, value, min, max]) => ({
  measure,
  value: Number.isFinite(value) ? value : null,
  min,
  max,
  result: !Number.isFinite(value)
    ? 'Pending'
    : value >= min && value <= max
      ? 'Within target'
      : 'Outside target',
}));
const purchases = Object.entries(runs).flatMap(([policy, r]) =>
  TOOLS.filter((t) => t.id !== 'hand' && t.id !== 'grip').map((tool) => {
    const b = r.data?.toolBuys?.[tool.id],
      reveal = r.data?.toolReveals?.[tool.id];
    const nodesAtPurchase = b
      ? (r.data.purchases
          ?.filter((p) => p.kind === 'node' && p.time <= (b.time ?? b.seconds))
          .map((p) => p.id) ?? [])
      : null;
    return {
      policy,
      tool: tool.id,
      name: tool.name,
      authoredRevealDelivery: tool.block + 1,
      currentPrice: tool.cost,
      observedRevealDelivery: reveal?.block ?? null,
      paidPrice: b?.cost ?? null,
      purchaseDelivery: b?.block ?? null,
      purchaseExperienceMinute: b ? (b.time ?? b.seconds) / 60 : null,
      purchaseActiveMinute:
        b?.activeSeconds !== undefined ? b.activeSeconds / 60 : null,
      moneyBefore: b?.before ?? null,
      moneyAfter: b?.after ?? null,
      nodesAtPurchase,
      status: runLabel(r),
    };
  }),
);
const flatPurchases = Object.entries(runs).flatMap(([policy, r]) =>
  (r.data?.purchases ?? []).map((p) => ({ policy, ...p })),
);
const awards = Object.entries(runs).flatMap(([policy, r]) =>
  (r.data?.awards ?? []).map((a) => ({ policy, ...a })),
);
const storyObserved = [];
for (const call of mixed?.calls ?? [])
  if (!storyObserved.some((c) => c.event === call.event))
    storyObserved.push(call);
const authoredStory = STORY.filter((e) => !e.retired).map((e) => ({
  id: e.id,
  chapter: e.chapter,
  trigger: e.trigger,
  delivery: e.at === undefined ? null : e.at + 1,
  phase: e.atPhase === undefined ? null : e.atPhase + 1,
  object: e.object ?? null,
  speakers: [...new Set(e.messages.map((m) => m.speaker))],
  requiresRead: e.requiresRead ?? [],
  effect: e.readEffect ?? e.effect ?? null,
  lines: e.messages.length,
  observedOrder: storyObserved.findIndex((c) => c.event === e.id) + 1 || null,
}));
function walk(directory) {
  if (!fs.existsSync(directory)) return [];
  return fs
    .readdirSync(directory, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory()
        ? walk(`${directory}/${e.name}`)
        : [`${directory}/${e.name}`],
    );
}
assertStableSources('during geometry and policy verification');
const relevant = Object.keys(initialSourceHashes);
const sourceHashes = initialSourceHashes;
const changed = relevant.filter(
  (f) => sourceHashes[f] !== baseline.sourceHashes?.[f],
);
const largest = phases.reduce((a, b) => (a.samples > b.samples ? a : b));
const targetMin = sum(deliveries.map((d) => d.targetActiveSeconds.min)),
  targetMax = sum(deliveries.map((d) => d.targetActiveSeconds.max));
const generatedAt = new Date().toISOString();
const data = {
  generatedAt,
  status: manifest.status ?? 'Draft',
  sourceHashes,
  requiredSimulationSources,
  actualCompiledRuntimeInputs,
  nonGameSimulationInputs,
  manifest,
  deliveries,
  phases,
  chapters: [...chapters.values()],
  policyRows,
  policyComparison,
  observedTargetRows,
  purchases,
  flatPurchases,
  awards,
  authoredStory,
  storyObserved,
  largest,
  targetMin,
  targetMax,
  baselineSummary: {
    capturedAt: baseline.capturedAt,
    saveVersion: baseline.saveVersion,
    mixedActiveSeconds: baseline.activeReplay?.activeIceSeconds,
    mixedExperienceMinutes: baseline.policyResults?.find(
      (p) => p.policy === 'mixed',
    )?.minutes,
    policyResults: baseline.policyResults?.map((p) => ({
      policy: p.policy,
      minutes: p.minutes,
      money: p.money,
      nodes: p.nodes,
    })),
  },
  runs: Object.fromEntries(
    Object.entries(runs).map(([name, r]) => [
      name,
      {
        file: r.file,
        stage: r.stage,
        final: r.final,
        status: runLabel(r),
        sha256: r.sha256,
        mismatched: r.mismatched,
        missingHashes: r.missingHashes,
        dataIssues: r.dataIssues,
        qualification: r.qualification,
        fullSourceMatches: r.fullSourceMatches,
        verifiedSimulationSource: r.verifiedSource,
        assumptions: r.data?.assumptions,
        source: r.data?.source,
        deliveries: r.data?.deliveries ?? [],
      },
    ]),
  ),
  foundation,
  uiReview,
  changedFiles: changed,
};
fs.writeFileSync(`${out}/data.json`, JSON.stringify(data, null, 2) + '\n');
csv(
  'deliveries.csv',
  deliveries.map(({ baseline: _b, mixed: m, ...d }) => ({
    ...d,
    mixedActiveSeconds: m?.activeSeconds,
    mixedNet: m?.net,
  })),
);
csv('phases.csv', phases);
csv('policies.csv', policyRows);
csv('tool-purchases.csv', purchases);
csv('all-purchases.csv', flatPurchases);
csv('condition-awards.csv', awards);
csv('story-order.csv', authoredStory);
const python =
  argument('--python') ??
  process.env.PYTHON ??
  path.join(
    os.homedir(),
    '.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe',
  );
const plotted = spawnSync(
  fs.existsSync(python)
    ? python
    : process.platform === 'win32'
      ? 'python'
      : 'python3',
  ['tests/plot-major-report.py', `${out}/data.json`, out],
  { encoding: 'utf8' },
);
if (plotted.status !== 0)
  throw new Error(
    `Matplotlib charts failed; supply --python with a Python containing matplotlib.\n${plotted.stdout}\n${plotted.stderr}`,
  );
const materialText = (m) =>
  Object.entries(m)
    .filter(([, v]) => v > 0.01)
    .map(([k, v]) => `${k} ${num(v)}%`)
    .join('; ');
const dimensions = (d) => d.map((n) => num(n, 2)).join('×');
const mdPath = (p) => `[${p}](${p.replaceAll(' ', '%20')})`;
const v = manifest.verification ?? {};
const sections = [];
const add = (heading, body) => sections.push(`## ${heading}\n\n${body}\n`);
const first = `# Frozen Assets — major progression overhaul QA\n\n**${manifest.status ?? 'DRAFT — final checks pending'}**\n\nGenerated ${generatedAt}. Geometry is freshly compiled from the current local workspace; historical simulation and browser data retain their own provenance. This report does not publish the game or read player saves.\n`;
add(
  'Summary',
  `Fresh audit: ${deliveries.length} deliveries, ${phases.length} physical phases, constant 0.30-world-unit cells, ${num(Math.min(...phases.map((p) => p.samples)), 0)}–${num(largest.samples, 0)} samples per phase. ${phases.filter((p) => p.solidBudgetPass).length}/${phases.length} authored phase budgets pass the stated ±12% tolerance; ${sum(phases.map((p) => p.solidIntersections))} cargo/solid intersections and ${sum(phases.map((p) => p.initiallyFree.length))} initially free cargo items were measured; ${sum(phases.map((p) => p.initiallyExposed.length))} cargo items have initial exterior exposure.\n\n${mixed ? `Selected Mixed run: **${num(mixed.campaignActiveMinutes, 2)} active minutes**, **${num(mixed.estimatedExperienceMinutes, 2)} modeled experience minutes**. ${runLabel(runs.mixed)}. This is measured engine interaction plus explicitly estimated first-time overhead, not a measured human playthrough.` : 'Final Mixed simulation is pending.'}\n\nTarget conflict: exact authored delivery bands add to **${num(targetMin / 60, 2)}–${num(targetMax / 60, 2)} active minutes**, while the overall brief asks for 45–55. The implementation decision is to prioritize the overall measured Mixed 45–55-minute active target and 75–95-minute modeled first-play target; individual delivery bands remain authored intent, with deviations reported rather than hidden by timers or HP multipliers.\n\nRe-run with \`node tests/write-major-report.mjs\`. Edit ${mdPath(manifestPath)} to select final policy files and enter verification/review facts. Do not edit generated tables manually.`,
);
add(
  'Measurement provenance',
  table(
    ['Policy', 'Input', 'Stage / source status'],
    policyOrder.map((p) => [
      p.toUpperCase(),
      runs[p]?.file ? mdPath(runs[p].file) : 'Pending',
      runLabel(runs[p]),
    ]),
  ) +
    '\nAll nine policies use the shared simulator, launcher and premium-value helper. Each selected run is checked separately. A run is eligible for the fastest-rational column only when complete, explicitly marked final, integrity checks pass, the original compilation was stable, and all required hashes are present. Full-source matching is preferred. A documented exception is accepted only for overhaul-qa.ts, webmcp.ts or motion-audit.ts when an independently resolved TypeScript graph proves they are outside the model/tutorial simulation, every actual runtime/helper/script/dependency/config hash is still identical, and the qualification records the exact original and current differing hashes. These rows explicitly say simulation dependencies match while browser-QA source differs; the frozen hashes are never rewritten. That column is an observed per-delivery lower envelope, not a single optimal campaign strategy. Missing policies stay Pending. Stored source hashes, qualification evidence, required coverage, assumptions and portable data are in ' +
    mdPath(`${out}/data.json`) +
    '.\n\n' +
    (mixed?.assumptions
      ? `Selected Mixed overhead assumptions: reading ${mixed.assumptions.readingWordsPerMinute} words/minute, at least ${mixed.assumptions.minimumLineSeconds} seconds per line, ${mixed.assumptions.lineAcknowledgementSeconds} seconds per acknowledgement and ${mixed.assumptions.pickupSeconds} seconds per pickup. Menu opening adds ${mixed.assumptions.menuOpenSeconds} seconds; micro/major inspection ${mixed.assumptions.microInspectionSeconds}/${mixed.assumptions.majorInspectionSeconds} seconds; tool selection ${mixed.assumptions.toolSelectionSeconds} seconds; quarter-turn ${mixed.assumptions.quarterTurnSeconds} seconds; receipt/evidence inspection ${mixed.assumptions.receiptInspectionSeconds}/${mixed.assumptions.evidenceInspectionSeconds} seconds. Delivery/inner-phase orientation adds ${mixed.assumptions.deliveryOrientationSeconds}/${mixed.assumptions.innerPhaseOrientationSeconds} seconds. These are modeling assumptions, not delays inserted into gameplay.\n\nAiming policy: ${mixed.assumptions.policyBehavior?.aiming ?? 'See recorded run.'}\n\nTool choice: ${mixed.assumptions.policyBehavior?.toolObjective ?? 'See recorded run.'}\n\nPurchase policy: ${mixed.assumptions.policyBehavior?.purchases ?? 'See recorded run.'} Complete assumptions and each policy’s inputs remain in the portable JSON.`
      : 'Simulation assumptions pending.'),
);
add(
  'Files changed',
  `Compared by SHA-256 against the frozen pre-overhaul snapshot, not against a clean Git checkout. “Absent from snapshot” does not prove a file was newly created in this update.\n\n${table(
    ['Path', 'Baseline relation'],
    changed.map((f) => [
      mdPath(f),
      baseline.sourceHashes?.[f]
        ? 'Content changed'
        : 'Absent from frozen hash inventory',
    ]),
  )}`,
);
add(
  'Bugs fixed',
  [
    'D19 authored Tower generation is independent of the legacy final-round shortcut; explicit historical layouts preserve old coordinates only for migration.',
    'Physical evidence pockets carve the authoritative field; visible local restraints and release use that same field. Local release is checked on each edited revision while global connectivity is throttled.',
    'Late deliveries retain authored phase counts; the blanket late-game phase deletion is removed.',
    'Scene-owned geometry, textures, listeners, canvas, context and RAF have explicit teardown; chunk replacement disposes obsolete owned geometry.',
    'Legacy campaign saves enter the new field format. Safe world-space cuts transfer; unsafe mappings restart only current physical ice while preserving account state and canonical paid identities.',
    'Exact authored net payouts account for floor-rounded commission. Optional contract bonuses require valid measurements and cannot reduce base payouts.',
    'Introductory material lessons use a thin D5 divider and small D8 anchors; later archives retain full ribs.',
    'Vault cargo is tied to its physical structure: dense center-seam targets, alternating archive/service compartments, real front ice, separate custody cases and a lower rear Ledger compartment. Existing reward IDs, counts and each base value are preserved.',
    'Wide Thermal Fan now uses an oblate brush aligned to the ice surface. Its lateral spread no longer implies spherical penetration; Precision, legacy/tutorial tools and delayed echoes retain their established behavior.',
    'Condition checks after mechanical excavation include objects exposed and released by the same impact. Sealed cargo still requires real exterior exposure before collateral damage can activate.',
    'Save quantization maps an exact density of 0.5 toward air, preserving the strict visible-solid threshold through repeated reloads instead of recreating a cut support.',
    'Obsolete Ledger exposure advice is retired after recovery, evidence inspection is saved, institutional callers have a distinct incoming signal, and completed legacy saves can reach their missing epilogue and contracts without replaying fees.',
    'UI receipt/tag spacing fixes are recorded in the isolated browser review. Final full-game hover, motion and audio acceptance remains separately tracked.',
  ]
    .map((x) => `- ${x}`)
    .join('\n'),
);
add(
  'Ice architecture',
  `Every phase owns its dimensions, profile,0.30 cell size, layout hash, material regions and sample arrays. Empty boundary samples isolate the generated surface. Safe six-neighbor traversal does not wrap between rows. Materials independently affect hardness, fracture ease, support strength and thermal conductivity. World-space cargo fits inside actual small cavities.\n\nLargest authored field: D${largest.delivery}/P${largest.phase}, ${largest.grid.join('×')} =${num(largest.samples, 0)} samples; ${num(largest.typedArrayBytes / 1024, 1)}KiB for density, warmth, material IDs, visited marks and connectivity queue. Point numeric payload is another ${num(largest.pointNumericPayloadBytes / 1024, 1)}KiB before JS object/array overhead. These are buffer calculations, not a measured process-memory total. Mesh and GPU storage are additional.`,
);
add(
  'Chunk architecture',
  `Extraction divides scalar cells into 8×8×8 chunks with shared boundary samples. Edited samples dirty every extraction chunk that depends on them. Impact/distance priority and a cooperative 2.5 ms rebuild budget amortize large meshes; one indivisible chunk can exceed the budget. Root raycasts delegate to chunk meshes. Full extraction remains available for headless validation.\n\nThe fresh largest field has ${largest.chunks} chunks and ${num(largest.triangles, 0)} initial triangles. Appendix CPU extraction timings are one headless full-surface call per phase, not frame times or GPU measurements.`,
);
add(
  'Save migration',
  `Save v5 records compact byte-quantized RLE/base64 density plus dimensions, cell size, delivery/phase identity, layout hash and checksum. Invalid field data falls back only to current ice after valid account state is restored. Exact density 0.5 encodes to 127/255 (air), so a saved cut cannot become solid again at the strict isosurface boundary.\n\nCampaign v3/v4 and compact historical-layout saves reconstruct the original 4,830-coordinate field, then resample removed ice in world space if profile, bounds and coverage are compatible. Unsafe geometry or density triggers an explicit diagnostic and repacks canonical old cargo for the active phase. Canonical IDs and base values avoid re-paying previously credited cargo. A validated legacyCargo marker expires when that physical cargo array is replaced. Missing mandatory evidence is appended once; the old Ledger phase maps to the new final cradle. Repeated save/reload quantization is idempotent. Vault-only cargo revisions leave unrelated active-field hashes unchanged and preserve every existing Vault reward allocation.\n\nFocused coverage: ${mdPath('tests/major-migration.test.ts')}, ${mdPath('tests/major-save.test.ts')}, ${mdPath('tests/field-save.test.ts')}, ${mdPath('tests/vault-layout.test.ts')}.`,
);
add(
  'Baseline comparison',
  table(
    ['Measure', 'Frozen baseline', 'Current geometry / selected Mixed'],
    [
      [
        'Save / layout',
        `${baseline.saveVersion} / ${baseline.layoutVersion}`,
        '5 / 3',
      ],
      [
        'Grid',
        '23×14×15 =4,830 every phase',
        `Variable; largest ${largest.grid.join('×')} =${num(largest.samples, 0)}`,
      ],
      [
        'Physical phases',
        sum((baseline.deliveries ?? []).map((d) => d.phaseCount)),
        phases.length,
      ],
      [
        'Mixed active minutes',
        num(baseline.activeReplay?.activeIceSeconds / 60, 2),
        num(mixed?.campaignActiveMinutes, 2),
      ],
      [
        'Mixed modeled experience minutes',
        num(
          baseline.policyResults?.find((p) => p.policy === 'mixed')?.minutes,
          2,
        ),
        num(mixed?.estimatedExperienceMinutes, 2),
      ],
      [
        'Validation',
        `${baseline.testResult?.passed ?? '?'} baseline tests; build ${baseline.buildResult?.passed ? 'passed' : 'unknown'}`,
        v.finalTests?.summary ??
          (v.finalTests
            ? `${v.finalTests.passed} passed / ${v.finalTests.failed} failed; ${v.finalTests.log ?? 'recorded suite'}`
            : 'Final suite pending'),
      ],
    ],
  ) +
    '\nTiming comparability is limited by changed targeting, authored geometry, tool behavior, Condition and explicit first-time overhead. The frozen baseline active replay counts playing/aim/cadence while cargo remains embedded. Charts expose both records; they do not assert a controlled human A/B test.\n\n![Physical volume by delivery](qa-artifacts/major-report/physical-volume.svg)',
);
add(
  'Campaign table',
  `Dimensions, grid, sample count and material percentages describe the **first physical phase**; solid also shows the sum across all phases. The appendix contains every phase. “Mixed” is the selected run above, even if stale; authored and measured values are distinct.\n\n${table(
    [
      '# / chapter / name',
      'Profile',
      'Dimensions',
      'Grid',
      'Samples',
      'Solid first / all',
      'Materials %',
      'Phases',
      'Base net',
      'Mixed active s',
      'Fastest rational s',
      'Ideal tools by phase',
      'Story',
    ],
    deliveries.map((d) => [
      `${d.delivery} / ${d.chapter} / ${d.name}`,
      d.profile,
      dimensions(d.dimensions),
      d.grid.join('×'),
      num(d.totalSamplesFirstPhase, 0),
      `${num(d.solidFirstPhase, 0)} / ${num(d.solidAcrossPhases, 0)}`,
      materialText(d.materialsFirstPhase),
      d.phaseCount,
      money(d.baseNet),
      num(d.mixed?.activeSeconds),
      d.fastestRationalSeconds === null
        ? 'Pending'
        : `${num(d.fastestRationalSeconds)} (${d.fastestRationalPolicy})`,
      d.idealTools.map((t) => t.join('/')).join(' → '),
      d.story ?? '—',
    ]),
  )}\n![Active ice duration](qa-artifacts/major-report/active-time.svg)`,
);
add(
  'Economy table and tool purchase timings',
  `Current prices are authored content; paid prices and purchase timings come from the selected Mixed run. Differences are retained to expose stale measurements. Experience minute includes explicit overhead; active minute excludes it. Nodes are reconstructed from purchase events at or before the tool purchase.\n\n${table(
    [
      'Tool',
      'Reveal D',
      'Current price',
      'Observed reveal D',
      'Purchase D',
      'Experience min / active min',
      'Paid price',
      'Before / after',
      'Nodes owned',
    ],
    TOOLS.filter((t) => !['hand', 'grip'].includes(t.id)).map((t) => {
      const p = purchases.find((p) => p.policy === 'mixed' && p.tool === t.id);
      return [
        t.name,
        t.block + 1,
        money(t.cost),
        p?.observedRevealDelivery ?? 'Pending',
        p?.purchaseDelivery ?? 'Pending',
        `${num(p?.purchaseExperienceMinute, 2)} / ${num(p?.purchaseActiveMinute, 2)}`,
        money(p?.paidPrice),
        `${money(p?.moneyBefore)} / ${money(p?.moneyAfter)}`,
        p?.nodesAtPurchase?.length ?? 'Pending',
      ];
    }),
  )}\nEvery current base pool was run through Campaign.credit with the authored 12%/8% schedule and final 0% expectation: ${deliveries.filter((d) => d.exactNet === d.baseNet).length}/32 net targets match exactly. Final 0% in actual play is granted by the recovered Ledger call, not by this arithmetic audit.\n\n![Major tool purchase timings](qa-artifacts/major-report/tool-purchases.svg)\n\n![Funds by delivery](qa-artifacts/major-report/money.svg)`,
);
add(
  'Tool identity in the final chapter',
  'These are authored tool roles. Actual policy usage is recorded above; human comparative feel remains unmeasured.\n\n' +
    table(
      ['Tool', 'Why use it late in the campaign?'],
      [
        [
          'Chisel',
          'Finish fine extraction around valuable exposed cargo with the lowest collateral impact.',
        ],
        [
          'Ice pick',
          'Work quickly and precisely across general ice and broad slab faces.',
        ],
        [
          'Heavy pick',
          'Penetrate deep dense seams and load-bearing connections.',
        ],
        [
          'Sledgehammer',
          'Break brittle wings and shared supports with broad controlled fracture.',
        ],
        [
          'Powered breaker',
          'Sustain clearing through reinforced archive ribs and layered compartments.',
        ],
        [
          'Thermal tool',
          'Exploit service-ice conductivity and controlled extraction, while protecting heat-sensitive paper.',
        ],
      ],
    ),
);
add(
  'Policy results',
  table(
    [
      'Policy',
      'Campaign modeled min',
      'Active min',
      'Final money',
      'Condition bonus / base',
      'Nodes',
      'Major tools purchased',
      'Midgame Jaccard vs Mixed',
      'State',
    ],
    policyRows.map((p) => [
      p.policy.toUpperCase(),
      num(p.experienceMinutes, 2),
      num(p.activeMinutes, 2),
      money(p.money),
      Number.isFinite(p.conditionBonusPercent)
        ? `${num(p.conditionBonusPercent, 2)}%`
        : 'Pending',
      p.nodes ?? 'Pending',
      p.tools?.join(', ') ?? 'Pending',
      num(p.midgameJaccardVsMixed, 3),
      p.status,
    ]),
  ) +
    '\nJaccard compares each run’s recorded midgame node set with Mixed; snapshot delivery is included in the CSV. Different midgame definitions would invalidate direct comparison. A low score alone does not establish balanced strategy diversity.\n\n' +
    table(
      ['Measured target', 'Observed', 'Requested band', 'Result'],
      observedTargetRows.map((row) => [
        row.measure,
        num(row.value, 2),
        `${row.min}–${row.max}`,
        row.result,
      ]),
    ) +
    `\nSpread is (maximum−minimum)/minimum across the ${eligibleRationalRows.length}/${rationalNames.length} eligible rational-policy runs; the inefficient strategy is excluded. Earned net per modeled minute uses cumulative earnings after commission, before equipment spending. Ending wallet is unspent money after purchases and can diverge substantially when policies buy different builds. Dominance test (>20% faster and >15% richer than every other rational strategy): ${policyComparison.dominanceCandidates === null ? 'Pending' : policyComparison.dominanceCandidates.length ? policyComparison.dominanceCandidates.join(', ') : 'no qualifying strategy in this measured cohort'}. This does not prove global optimality.\n\n` +
    table(
      [
        'Policy',
        'Longest active purchase gap s',
        'Longest no-affordable-opportunity s',
      ],
      policyRows.map((p) => [
        p.policy.toUpperCase(),
        num(p.maxPurchaseGapActiveSeconds),
        num(p.maxNoAffordableOpportunitySeconds),
      ]),
    ),
);
add(
  'Condition results',
  `Condition adds a bonus; authored base value is never reduced. Grade bands are Pristine≥90, Clean≥75, Fair≥55, Recovered below55, with 20%/12%/5%/0% bonuses. Story evidence has no quality-based loss.\n\n${table(
    [
      'Policy',
      'Mean condition',
      'Pristine count',
      'Base payout',
      'Condition bonus',
      'Bonus / base',
    ],
    policyRows.map((p) => [
      p.policy.toUpperCase(),
      num(p.averageCondition, 2),
      p.pristine ?? 'Pending',
      money(p.basePayout),
      money(p.conditionBonus),
      Number.isFinite(p.conditionBonusPercent)
        ? `${num(p.conditionBonusPercent, 2)}%`
        : 'Pending',
    ]),
  )}\n![Condition distributions](qa-artifacts/major-report/condition.svg)`,
);
add(
  'Performance results',
  `Campaign work-window measurements are recorded separately from initial geometry. Grid/chunk/triangle counts below are freshly generated headless counts; they are not browser draw calls or live geometry allocations.\n\n${table(
    [
      'Test',
      'Grid',
      'Samples',
      'Chunks',
      'Initial triangles',
      'Frame p50 ms',
      'p95 ms',
      'Worst ms',
      'Mesh ms',
      'Connectivity ms',
      'Geometry count',
    ],
    ['EARLY', 'MID', 'LATE', 'VAULT'].map((name, i) => {
      const phase = phases.find(
          (p) => p.delivery === [1, 15, 31, 32][i] && p.phase === 1,
        ),
        r = (manifest.performanceRows ?? []).find((p) => p.test === name);
      return [
        name,
        phase.grid.join('×'),
        num(phase.samples, 0),
        phase.chunks,
        num(phase.triangles, 0),
        num(r?.p50, 2),
        num(r?.p95, 2),
        num(r?.worst, 2),
        num(r?.meshMs, 2),
        num(r?.connectivityMs, 2),
        r?.geometryCount ?? 'Pending',
      ];
    }),
  )}\nRecorded foundation fixtures, before final gameplay calibration:\n\n${table(
    [
      'Fixture',
      'Samples/chunks',
      'Tool / duration',
      'Solid removed',
      'p50/p95/max ms',
      'Mesh mean/p95 ms',
      'Connectivity mean/p95 ms',
      'Dirty after',
    ],
    ['small', 'large'].map((k) => {
      const r = foundation[k] ?? {};
      return [
        k,
        `${num(r.samples, 0)} / ${r.chunks ?? '?'}`,
        `${r.tool ?? '?'} / ${num(r.seconds, 2)}s`,
        num(r.removedSolidSamples, 0),
        `${num(r.frameP50, 2)} / ${num(r.frameP95, 2)} / ${num(r.frameMax, 2)}`,
        `${num(r.meshMean, 2)} / ${num(r.meshP95, 2)}`,
        `${num(r.connectivityMean, 2)} / ${num(r.connectivityP95, 2)}`,
        r.dirtyChunksAfter ?? 'Pending',
      ];
    }),
  )}\nFoundation lifecycle: ${foundation.lifetime?.passed ?? 0}/${foundation.lifetime?.iterations ?? 0} recorded scene replacements passed, with parent geometry/textures ${JSON.stringify(foundation.lifetime?.parentBefore)} →${JSON.stringify(foundation.lifetime?.parentAfter)}. ${foundation.limits ?? ''}\n\nMethod: ${foundation.method ?? 'Pending'}. ${mdPath('qa-artifacts/major-foundation-browser.json')}.`,
);
add(
  'Story event order',
  `Authored triggers/prerequisites are shown separately from observed first-call order in selected Mixed. Retired historical lines are excluded. Blank observed order means that run did not record the event; it does not establish a missing event bug by itself.\n\n${table(
    [
      'Event',
      'Ch. / D / P',
      'Speaker',
      'Trigger / evidence',
      'Read prerequisites',
      'Effect',
      'Observed order',
    ],
    authoredStory.map((e) => [
      e.id,
      `${e.chapter} / ${e.delivery ?? '—'} / ${e.phase ?? '—'}`,
      e.speakers.join('/'),
      `${e.trigger}${e.object ? ' / ' + e.object : ''}`,
      e.requiresRead.join(', ') || '—',
      e.effect ? JSON.stringify(e.effect) : '—',
      e.observedOrder ?? 'Unrecorded',
    ]),
  )}`,
);
add(
  'Six required review passes',
  (manifest.reviews ?? [])
    .map(
      (r) =>
        `### ${r.number}. ${r.name}\n\n**${r.status}**\n\nFinding: ${r.findings}\n\nChange: ${r.fixes}\n\nEvidence: ${r.evidence}\n\nRemaining: ${r.pending || 'None recorded.'}\n`,
    )
    .join('\n'),
);
add(
  'Game feel and visual evidence',
  `Isolated UI review: ${uiReview.method ?? 'Pending'}. ${uiReview.receipt?.length ?? 0} receipt viewport cases and ${uiReview.tag?.length ?? 0} custody-tag cases were recorded. This harness does not verify scene occlusion, tool art or material readability behind the UI.\n\n${table(
    ['Required screenshot', 'Evidence'],
    [
      'D1 Parcel',
      'D7 Seam',
      'D8 Wings',
      'D15 Archive',
      'D22 Service Archive',
      'D31 compound',
      'Vault P1',
      'Vault P3',
      'Vault P5',
    ].map((name) => [
      name,
      (manifest.screenshots ?? []).find((s) => s.name === name)?.file ??
        ((manifest.screenshots ?? []).find((s) => s.name === name)?.observed
          ? 'Observed in inline browser capture; no standalone image file'
          : 'Pending'),
    ]),
  )}\n\n${(manifest.screenshots ?? [])
    .filter((s) => s.file)
    .map((s) => `![${s.name}](${s.file})`)
    .join('\n\n')}`,
);
add(
  'Known limitations',
  [
    'This document is generated from recorded evidence. Pending rows are not passing checks.',
    `Selected Mixed provenance: ${runLabel(runs.mixed)}. The original run fingerprints and any permitted browser-QA differences remain visible. Ineligible historical runs are never used for the fastest-rational calculation.`,
    '45–55 active minutes conflicts with the exact 56.3–63.2-minute sum of authored delivery bands. The overall measured target takes priority; human 75–95-minute acceptance still requires an actual playthrough.',
    'Headless replay is deterministic aiming/purchasing behavior plus documented overhead assumptions. It cannot verify human exploration, usability, sound quality, GPU performance or strategy optimality.',
    'Foundation frame metrics come from one fast desktop/browser/viewport and engineering fixtures. Final EARLY/MID/LATE/VAULT browser stress is separate.',
    'The cooperative mesh budget may be exceeded by one chunk. Typed-buffer memory omits JS objects, surfaces, driver buffers and textures.',
    'Legacy fallback may restart the current ice arrangement when world-space mapping is unsafe; prior money, tools, nodes, story and paid identities remain.',
    ...(uiReview.limitations ?? []),
    ...(manifest.additionalLimitations ?? []),
  ]
    .map((x) => `- ${x}`)
    .join('\n'),
);
add(
  'Test results',
  table(
    ['Check', 'Evidence/status'],
    [
      [
        'Frozen baseline',
        `${baseline.testResult?.passed ?? '?'} passed; ${baseline.testResult?.failed ?? '?'} failed; build ${baseline.buildResult?.passed ? 'passed' : 'unrecorded'}`,
      ],
      ['Intermediate focused review', v.focusedReview ?? 'Pending'],
      [
        'Final full suite',
        v.finalTests ? JSON.stringify(v.finalTests) : 'Pending',
      ],
      ['Final build', v.finalBuild ? JSON.stringify(v.finalBuild) : 'Pending'],
      ['TypeScript', v.finalTypes ? JSON.stringify(v.finalTypes) : 'Pending'],
      ['Final lint', v.finalLint ? JSON.stringify(v.finalLint) : 'Pending'],
      [
        'Final full-game browser',
        v.finalBrowser
          ? `${v.finalBrowser.sceneLifetime?.passed ?? 'Unrecorded'} scene lifetimes passed; ${v.finalBrowser.tooltip?.expandedPageEventFlagsPassed ?? 'Unrecorded'} tooltip flags and ${v.finalBrowser.tooltip?.labelsChecked ?? 'Unrecorded'} labels checked, ${v.finalBrowser.tooltip?.labelFailures ?? 'unrecorded'} label failures. Normal/reduced-motion purchases, native phone acknowledgements, receipt and contract state fixtures are recorded in the review ledger. Player-save audit was read-only. All methods, exact state fields and limitations are preserved in portable data.json; these targeted checks are not a human full campaign.`
          : 'Pending',
      ],
      [
        'Human playthrough',
        v.humanPlaythrough
          ? JSON.stringify(v.humanPlaythrough)
          : 'Not performed',
      ],
      [
        'Audio listening',
        v.audioListening ? JSON.stringify(v.audioListening) : 'Not performed',
      ],
    ],
  ) +
    '\nFresh report-generation checks only: source compilation succeeded; ' +
    `${phases.filter((p) => p.solidBudgetPass).length}/${phases.length} phase budget checks; ${deliveries.filter((d) => d.exactNet === d.baseNet).length}/32 exact base-net arithmetic checks; ${sum(phases.map((p) => p.solidIntersections))} cargo intersections; ${sum(phases.map((p) => p.initiallyFree.length))} initially free cargo; ${sum(phases.map((p) => p.initiallyExposed.length))} initially exposed cargo. These are not a replacement for npm test or browser play.`,
);
add(
  'All-phase appendix',
  table(
    [
      'D / P / phase',
      'Profile / dimensions',
      'Grid / samples',
      'Solid before → carved',
      'Material %',
      'Chunks / triangles',
      'Budget range / pass',
      'Target active s',
      'Mixed active s',
      'Gross',
      'Ideal / evidence',
    ],
    phases.map((p) => [
      `${p.delivery}/${p.phase} ${p.name}`,
      `${p.profile} ${dimensions([p.width, p.height, p.depth])}`,
      `${p.grid.join('×')} / ${num(p.samples, 0)}`,
      `${num(p.solidBeforePockets, 0)} → ${num(p.solid, 0)}`,
      materialText(p.materialPercent),
      `${p.chunks} / ${num(p.triangles, 0)}`,
      `${p.targetSolid.min}–${p.targetSolid.max} / ${p.solidBudgetPass ? 'pass' : 'FAIL'}`,
      `${num(p.targetActiveSeconds.min)}–${num(p.targetActiveSeconds.max)}`,
      num(p.mixedActiveSeconds),
      money(p.gross),
      `${p.idealTools.join('/')} / ${p.story.join(',') || '—'}`,
    ]),
  ),
);
add(
  'Portable artifacts and regeneration',
  [
    'data.json',
    'deliveries.csv',
    'phases.csv',
    'policies.csv',
    'tool-purchases.csv',
    'all-purchases.csv',
    'condition-awards.csv',
    'story-order.csv',
    'physical-volume.svg',
    'active-time.svg',
    'money.svg',
    'tool-purchases.svg',
    'condition.svg',
  ]
    .map((f) => `- ${mdPath(`${out}/${f}`)}`)
    .join('\n') +
    '\n\nRun `node tests/write-major-report.mjs --inputs qa-artifacts/major-report-inputs.json`. Optional `--python PATH` selects a Python with Matplotlib. If needed, install the plotting dependency with `python -m pip install --target qa-artifacts/major-report-python -r tests/major-report-requirements.txt`; the plotting script reads that local package folder. Simulator policy names such as `power-first` normalize to the required POWER row; optional UPGRADER runs become an additional row. The generator recompiles current geometry into an isolated folder, reads explicit recorded runs, recomputes source freshness, writes portable data and standard Matplotlib SVG/PNG figures, and regenerates this Markdown. It does not launch gameplay or mark pending tests complete.',
);
assertStableSources('while rendering charts and Markdown');
fs.writeFileSync(
  'QA-MAJOR-PROGRESSION-OVERHAUL.md',
  first + '\n' + sections.join('\n'),
);
console.log(
  JSON.stringify(
    {
      report: 'QA-MAJOR-PROGRESSION-OVERHAUL.md',
      data: `${out}/data.json`,
      deliveries: deliveries.length,
      phases: phases.length,
      phaseBudgetPass: phases.filter((p) => p.solidBudgetPass).length,
      policyRuns: Object.keys(runs),
      status: manifest.status,
    },
    null,
    2,
  ),
);
