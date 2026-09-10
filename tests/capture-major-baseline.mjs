// Development snapshot only. Run against the frozen pre-overhaul compiled model.
// Never reads browser/localStorage saves and never modifies gameplay sources.
import { createRequire } from 'node:module';
import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { performance } from 'node:perf_hooks';
import { cpus, platform, release, arch } from 'node:os';
import * as THREE from 'three';
const require = createRequire(import.meta.url);
const frozen = 'qa-artifacts/major-baseline-source';
const { campaignField, campaignLoot } = require(
  `../${frozen}/compiled/lib/game/campaign-layout.js`,
);
const { BLOCKS, CHAPTERS, TOOLS, STORY } = require(
  `../${frozen}/compiled/lib/game/campaign-content.js`,
);
const { ALL_TOOL_NODES, TOOL_ORDER } = require(
  `../${frozen}/compiled/lib/game/tool-trees.js`,
);
const { TUNE } = require(`../${frozen}/compiled/lib/game/tuning.js`);
const { surface } = require(`../${frozen}/compiled/lib/game/ice.js`);
const round = (n) => +n.toFixed(3);
const quantile = (a, q) =>
  [...a].sort((x, y) => x - y)[
    Math.min(a.length - 1, Math.floor(a.length * q))
  ];
const stats = (a) => ({
  samples: a.length,
  p50: round(quantile(a, 0.5)),
  p95: round(quantile(a, 0.95)),
  max: round(Math.max(...a)),
  mean: round(a.reduce((s, n) => s + n, 0) / a.length),
});
const summary = JSON.parse(
  readFileSync(`${frozen}/progression-summary.json`, 'utf8'),
);
const sims = Object.fromEntries(
  summary.map((s) => [
    s.policy,
    JSON.parse(readFileSync(`${frozen}/upgrades-${s.policy}.json`, 'utf8')),
  ]),
);
const activePath = `${frozen}/active-mixed.json`;
const active = existsSync(activePath)
  ? JSON.parse(readFileSync(activePath, 'utf8'))
  : null;
function bounds(points) {
  const min = { x: Infinity, y: Infinity, z: Infinity },
    max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const p of points)
    for (const axis of ['x', 'y', 'z']) {
      min[axis] = Math.min(min[axis], p[axis]);
      max[axis] = Math.max(max[axis], p[axis]);
    }
  return {
    min: Object.fromEntries(Object.entries(min).map(([k, v]) => [k, round(v)])),
    max: Object.fromEntries(Object.entries(max).map(([k, v]) => [k, round(v)])),
    dimensions: [
      round(max.x - min.x),
      round(max.y - min.y),
      round(max.z - min.z),
    ],
  };
}
function meshBounds(data) {
  const p = [];
  for (let i = 0; i < data.positions.length; i += 3)
    p.push({
      x: data.positions[i],
      y: data.positions[i + 1],
      z: data.positions[i + 2],
    });
  return bounds(p);
}
const deliveries = BLOCKS.map((b, i) => {
  const phases = Array.from({ length: b.phases }, (_, phase) => {
    const field = campaignField(i, phase),
      loot = campaignLoot(i, phase);
    const rawSolid = field.remaining();
    field.carveLoot(loot);
    const data = surface(field);
    return {
      phase: phase + 1,
      profile: field.profile.shape,
      scale: field.profile.scale,
      worldBounds: meshBounds(data),
      gridBounds: bounds(field.points),
      grid: [TUNE.nx, TUNE.ny, TUNE.nz],
      totalSamples: field.values.length,
      solidBeforePockets: rawSolid,
      solidSamples: field.remaining(),
      scalarSpacing: round(TUNE.step * TUNE.worldScale * b.scale),
      lootCount: loot.length,
      valuedLootCount: loot.filter((t) => !t.story).length,
      story: loot.filter((t) => t.story).map((t) => t.story),
      authoredGross: loot.reduce((s, t) => s + t.value, 0),
      triangles: data.positions.length / 9,
    };
  });
  return {
    delivery: i + 1,
    id: b.id,
    name: b.name,
    chapter: b.chapter,
    chapterName: CHAPTERS[b.chapter - 1].name,
    profile: b.profile,
    phases,
    phaseCount: b.phases,
    totalSamplesAcrossPhases: phases.reduce((s, p) => s + p.totalSamples, 0),
    solidAcrossPhases: phases.reduce((s, p) => s + p.solidSamples, 0),
    lootCount: phases.reduce((s, p) => s + p.lootCount, 0),
    authoredGross: phases.reduce((s, p) => s + p.authoredGross, 0),
    expectedActiveSeconds: null,
    expectedActiveReason:
      'The baseline has no authored per-delivery active-time target; historical documents refer to older layouts.',
    measuredMixedExperienceSeconds:
      sims.mixed.blocks.find((x) => x.block === i + 1)?.seconds ?? null,
    measuredMixedActiveSeconds: active?.benchByDelivery?.[i + 1] ?? null,
    measuredExperienceByPolicy: Object.fromEntries(
      Object.entries(sims).map(([k, s]) => [
        k,
        s.blocks.find((x) => x.block === i + 1)?.seconds ?? null,
      ]),
    ),
  };
});
function measure(label, index, phase = 0) {
  const field = campaignField(index, phase),
    loot = campaignLoot(index, phase);
  field.carveLoot(loot);
  const original = field.values.slice(),
    meshMs = [],
    connectivityMs = [],
    surfaceMs = [];
  let triangles = 0;
  for (let i = 0; i < 75; i++) {
    field.values.set(original);
    // Reproducible partial destruction: remove a narrow full-height central lane.
    // It forces the structural path to visit and detach, without random targeting.
    if (i % 2)
      field.points.forEach((p, j) => {
        if (
          Math.abs(p.x) < field.profile.scale * 0.32 &&
          p.y < field.profile.scale * 3
        )
          field.values[j] = 0;
      });
    let t = performance.now();
    const data = surface(field);
    const extraction = performance.now() - t;
    const g = new THREE.BufferGeometry();
    g.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(data.positions, 3),
    );
    g.setAttribute('color', new THREE.Float32BufferAttribute(data.colors, 3));
    g.computeVertexNormals();
    g.computeBoundingSphere();
    const rebuild = performance.now() - t;
    triangles = data.positions.length / 9;
    g.dispose();
    t = performance.now();
    field.detach();
    const connectivity = performance.now() - t;
    if (i >= 15) {
      surfaceMs.push(extraction);
      meshMs.push(rebuild);
      connectivityMs.push(connectivity);
    }
  }
  return {
    label,
    delivery: index + 1,
    phase: phase + 1,
    grid: [TUNE.nx, TUNE.ny, TUNE.nz],
    samples: field.values.length,
    chunkCount: 1,
    triangles,
    meshRebuildMs: stats(meshMs),
    surfaceExtractionMs: stats(surfaceMs),
    connectivityMs: stats(connectivityMs),
    frameTimeMs: { p50: null, p95: null, max: null },
    rendererMemory: { geometries: null, textures: null, programs: null },
    browserStatus:
      'Pending root-agent browser GPU and frame profiling. CPU-only measurements are not frame/GPU timings.',
  };
}
const largest = deliveries
  .flatMap((d) => d.phases.map((p) => ({ d, p })))
  .sort(
    (a, b) =>
      b.p.worldBounds.dimensions.reduce((v, n) => v * n, 1) -
      a.p.worldBounds.dimensions.reduce((v, n) => v * n, 1),
  )[0];
const previous = existsSync('qa-artifacts/major-baseline.json')
  ? JSON.parse(readFileSync('qa-artifacts/major-baseline.json', 'utf8'))
  : null;
const performanceResults =
  previous && !process.argv.includes('--reprofile')
    ? previous.performanceResults
    : [
        measure('EARLY', 0),
        measure('MID', 15),
        measure('CURRENT LARGEST', largest.d.delivery - 1, largest.p.phase - 1),
      ];
const sourceHashes = {};
function hashFolder(path, relative = '') {
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    const name = `${relative}${entry.name}`;
    if (entry.isDirectory()) hashFolder(`${path}/${entry.name}`, `${name}/`);
    else
      sourceHashes[name] = createHash('sha256')
        .update(readFileSync(`${path}/${entry.name}`))
        .digest('hex');
  }
}
hashFolder(`${frozen}/lib`, 'lib/');
hashFolder(`${frozen}/tests`, 'tests/');
const report = {
  capturedAt: new Date().toISOString(),
  baselineCommit: execFileSync('git', ['rev-parse', 'HEAD'], {
    encoding: 'utf8',
  }).trim(),
  branch: execFileSync('git', ['branch', '--show-current'], {
    encoding: 'utf8',
  }).trim(),
  dirtyStatusAtCapture: readFileSync(`${frozen}/status.txt`, 'utf8'),
  saveVersion: TUNE.saveVersion,
  campaignRevision: 1,
  layoutVersion: 2,
  treeRevision: 2,
  testResult: {
    passed: 95,
    failed: 0,
    command: 'npm test',
    log: 'qa-artifacts/major-baseline-tests.log',
  },
  buildResult: {
    passed: true,
    command: 'npm run build',
    log: 'qa-artifacts/major-baseline-build.log',
  },
  campaignDeliveries: BLOCKS.length,
  nodeCount: ALL_TOOL_NODES.length,
  toolCount: TOOL_ORDER?.length ?? 6,
  tools: TOOLS.filter((t) => t.id !== 'grip').map((t) => ({
    id: t.id,
    name: t.name,
    cost: t.cost,
    revealDelivery: t.block + 1,
    nodeCount: ALL_TOOL_NODES.filter((n) => n.toolId === t.id).length,
  })),
  legacyAlias: 'grip is Hold to Chip/hand, not a seventh physical tool',
  deliveries,
  policyResults: summary.map((s) => ({
    ...s,
    finalDeliveryExperienceSeconds:
      sims[s.policy].blocks.at(-1)?.seconds ?? null,
    finalDeliveryActiveSeconds:
      s.policy === 'mixed' ? (active?.benchByDelivery?.[32] ?? null) : null,
  })),
  performanceResults,
  sourceHashes,
  provenance: {
    sourceSnapshot: frozen,
    existingSimulationArtifacts:
      'Frozen verbatim from the current 103-node development pass; no pre-overhaul artifacts overwritten.',
    activeTiming: active
      ? 'Instrumented frozen simulator, same policy and model; excludes story/menu/settlement/pause and includes playing updates aimed at ice.'
      : 'Pending instrumented frozen mixed replay. Existing seconds include reading and decisions.',
    playerSaves: 'Not read or written.',
    expectedTimes: 'Absent in current source. Null is intentional, not zero.',
    cpuProfile:
      '75 iterations per field, first 15 warmups excluded; full surface rebuild with normals/bounds; alternates intact/central-lane-damaged geometry. No WebGL renderer.',
  },
  story: {
    events: STORY.filter((s) => !s.retired).length,
    ringOptional: true,
    finalCommission:
      'Campaign.rate returns 0 when block===31; narrative ordering is not authoritative.',
    issues: [
      'Story pockets use sample-center containment, not cell-volume intersection.',
      'IceField round===19 is final-size legacy special case, affecting delivery 20 (zero-based19). User calls this block 19; source exact index recorded.',
      'BLOCKS removes the last layer for index>=24.',
      'Every phase uses23x14x15=4830 samples, with spacing scaled by worldScale and delivery.scale.',
    ],
  },
};
report.capturedAt = previous?.capturedAt ?? report.capturedAt;
report.baselineCommit = previous?.baselineCommit ?? report.baselineCommit;
report.branch = previous?.branch ?? report.branch;
report.host = {
  node: process.version,
  os: platform(),
  release: release(),
  arch: arch(),
  cpu: cpus()[0]?.model,
  logicalCpus: cpus().length,
};
report.activeReplay = active
  ? {
      policy: 'mixed',
      activeIceSeconds: round(
        Object.values(active.benchByDelivery).reduce((s, n) => s + n, 0),
      ),
      contactSeconds: round(
        Object.values(active.activeByDelivery).reduce((s, n) => s + n, 0),
      ),
      finalDeliveryActiveSeconds: active.benchByDelivery[32],
      finalDeliveryContactSeconds: active.activeByDelivery[32],
      contactByPhase: active.activeByPhase,
      matchesOriginal:
        JSON.stringify(active.blocks) === JSON.stringify(sims.mixed.blocks) &&
        JSON.stringify(active.purchases) ===
          JSON.stringify(sims.mixed.purchases) &&
        active.money === sims.mixed.money,
      description:
        'Active ice seconds count playing updates while embedded rewards remain, including windup/cooldown/aim work. Contact seconds additionally require a held tool and a valid target. Both exclude tutorial, calls, menus, settlement, and post-release waiting.',
      artifact: `${frozen}/active-mixed.json`,
    }
  : null;
writeFileSync(
  'qa-artifacts/major-baseline.json',
  JSON.stringify(report, null, 2),
);
const fmt = (v) =>
  v == null
    ? 'Not authored / pending'
    : Array.isArray(v)
      ? v.map((n) => (typeof n === 'number' ? n.toFixed(2) : n)).join(' × ')
      : String(v);
let md = `# Frozen Assets — development baseline before major progression overhaul\n\nCaptured ${report.capturedAt}. This records the current dirty local workspace, not GitHub. Source, compiled model, status, diff, and previous simulation artifacts are frozen in ignored \`${frozen}\`. No player save was read or changed.\n\n## Snapshot\n\n- Branch: \`${report.branch}\`; commit: \`${report.baselineCommit}\`.\n- Save version ${report.saveVersion}; campaign revision 1; layout version 2; tree revision2.\n- ${report.testResult.passed} tests pass; build passes. Logs: \`${report.testResult.log}\`, \`${report.buildResult.log}\`.\n- ${report.campaignDeliveries} deliveries, ${report.nodeCount} nodes, six physical tools. Hold to Chip/grip is a hand/chisel alias.\n- The working tree already contains the 103-node overhaul, semantic tree migration, tool art, full-screen delivery payoff, and input fixes. Preserve these changes.\n\n## Current tools\n\n| Tool | Price | Reveal delivery | Nodes |\n|---|---:|---:|---:|\n`;
for (const t of report.tools)
  md += `|${t.name}|$${t.cost}|${t.revealDelivery}|${t.nodeCount}|\n`;
md += `\n## Campaign fields and payouts\n\nSizes are actual generated isosurface AABBs after loot pockets, in world units (width × height × depth). Each row represents one physical phase. All phases use the same 23 × 14 × 15 topology. Meaningful solid threshold is >0.5. Full scalar-array bounds and uncarved counts are included in the JSON. Payout is authored gross, before Tony's commission; total net is measured per policy below.\n\nThe existing source has no authored active-clear target per delivery. The expected-time column explicitly records that absence; adopting the new brief's timings as the old baseline would fabricate a comparison. Mixed experience seconds include modeled reading, decisions and settlement. Active seconds below come from the separate instrumented frozen-model replay.\n\n| Delivery / name | Ch. | Phase/profile | World dimensions | Grid | Samples | Solid | Loot | Gross | Expected active s | Mixed active s / delivery | Mixed experience s / delivery |\n|---|---:|---|---|---|---:|---:|---:|---:|---|---:|---:|\n`;
for (const d of deliveries)
  for (const p of d.phases)
    md += `|${d.delivery}. ${d.name}|${d.chapter}|${p.phase}/${d.phaseCount} ${p.profile}|${fmt(p.worldBounds.dimensions)}|23×14×15|${p.totalSamples}|${p.solidSamples}|${p.lootCount}|$${p.authoredGross}|Not authored|${p.phase === 1 ? fmt(d.measuredMixedActiveSeconds) : '—'}|${p.phase === 1 ? d.measuredMixedExperienceSeconds : '—'}|\n`;
md += `\n## Policy baseline\n\nThese are the preserved current 103-node simulator results. They use real model updates and raycast the generated mesh, with modeled reading/decision overhead. They are not measured human playthroughs. The old policy runner does not capture per-delivery active time, so only the mixed replay below adds that metric.\n\n| Policy | Campaign min | Net earned | Final money | Nodes | Final delivery experience s | Final delivery active s |\n|---|---:|---:|---:|---:|---:|---:|\n`;
for (const s of report.policyResults)
  md += `|${s.policy}|${s.minutes}|$${s.net}|$${s.money}|${s.nodes}|${s.finalDeliveryExperienceSeconds}|${fmt(s.finalDeliveryActiveSeconds)}|\n`;
md += `\n### Tool purchases by policy\n\n| Policy | Tool | Delivery | Minute | Money before | Money after | Nodes |\n|---|---|---:|---:|---:|---:|---:|\n`;
for (const s of report.policyResults)
  for (const [id, t] of Object.entries(s.toolBuys))
    md += `|${s.policy}|${id}|${t.block}|${(t.seconds / 60).toFixed(2)}|$${t.before}|$${t.after}|${t.nodes}|\n`;
md += `\n## Performance baseline\n\nHeadless CPU profile: 75 iterations per representative field, first 15 discarded; alternates intact geometry and a deterministic removed central lane. Mesh rebuild includes the current whole-field surface extraction, Three.js BufferGeometry allocation, normals and bounds. Every temporary geometry is disposed. Connectivity is the actual global detach method. These numbers do not substitute for browser frame/GPU profiling.\n\n| Field | Delivery / phase | Grid | Samples | Triangles (intact) | Full mesh mean / p95 ms | Connectivity mean / p95 ms | Frame p50/p95/max | Renderer geometries/textures/programs |\n|---|---|---|---:|---:|---|---|---|---|\n`;
for (const p of performanceResults)
  md += `|${p.label}|${p.delivery}/${p.phase}|${p.grid.join('×')}|${p.samples}|${p.triangles}|${p.meshRebuildMs.mean}/${p.meshRebuildMs.p95}|${p.connectivityMs.mean}/${p.connectivityMs.p95}|Pending browser profile|Pending browser profile|\n`;
md += `\n## Baseline findings and limits\n\n- All fields have 4,830 scalar samples. World spacing increases from ${(TUNE.step * TUNE.worldScale * BLOCKS[0].scale).toFixed(3)} at delivery 1 to ${(TUNE.step * TUNE.worldScale * BLOCKS[31].scale).toFixed(3)} at delivery 32. Physical scale currently increases sample separation rather than field detail.\n- Surface extraction always rebuilds one full field; there are no extraction chunks.\n- Loot pockets use center-point containment. Small evidence may intersect represented ice cells despite an apparently empty sample-center pocket.\n- The legacy final special case is \`round === TUNE.finalRound - 1\`, with finalRound 20: zero-based round 19 (delivery 20). This is the exact off-by-one/index context behind the brief's block 19 concern.\n- Current layout removes a final layer with \`if (i >=24) layers.pop()\`. The final delivery remains three phases.\n- The Ring is optional; final zero commission is selected by delivery index. Current queued story/call infrastructure should be retained while these policies change.\n- Save v4 stores decimal float arrays, validated against the fixed field length.\n- Historical QA documents contain results from older layouts; the frozen JSON and DELIVERY-PASS.md are the current 103-node baseline.\n- Browser frame times, renderer memory/program counts, and heavy-interaction profiling are intentionally pending the root agent's browser pass. No GPU, frame pacing, human-play or subjective audio success is inferred from these CPU/simulator measurements.\n\nMachine-readable data, exact phase bounds, per-policy delivery times, and source SHA-256 hashes: \`qa-artifacts/major-baseline.json\`.\n`;
if (report.activeReplay)
  md += `\n## Instrumented mixed replay\n\nThe unchanged frozen mixed simulator reproduced the original delivery times, purchases and final ledger exactly: **${active.minutes} minutes**, **${active.nodes} nodes**, **$${active.money}** remaining. Active ice work is **${(report.activeReplay.activeIceSeconds / 60).toFixed(2)} minutes** (${report.activeReplay.activeIceSeconds}s), not the new specification's desired45–55 minutes. Final delivery is **${report.activeReplay.finalDeliveryActiveSeconds}s active**, versus ${sims.mixed.blocks.at(-1).seconds}s including modeled calls/transitions.\n\nActive ice counts playing model updates while embedded rewards remain, including legitimate windup/recovery/aim work. It excludes tutorial, calls, menu decisions, settlement and post-release collection waiting. A separate stricter held-tool/contact metric totals ${report.activeReplay.contactSeconds}s and is available per phase in the JSON.\n\nHardware: ${report.host.cpu}; ${report.host.logicalCpus} logical CPUs; ${report.host.os} ${report.host.release}, ${report.host.arch}; Node ${report.host.node}. These CPU timings were captured on the current development machine and remain subject to OS/background load.\n`;
writeFileSync('QA-MAJOR-PROGRESSION-BASELINE.md', md);
console.log(
  JSON.stringify(
    {
      deliveries: deliveries.length,
      phases: deliveries.reduce((n, d) => n + d.phaseCount, 0),
      nodes: report.nodeCount,
      policies: summary.length,
      performance: performanceResults,
      activeAvailable: !!active,
    },
    null,
    2,
  ),
);
