import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { performance } from 'node:perf_hooks';
import * as THREE from 'three';
import {
  expectedPremiumLoss,
  remainingPremium,
} from './major-policy-value.mjs';

const require = createRequire(import.meta.url);
const path = '../qa-artifacts/major-sim-build/lib/game/';
const { GameModel } = require(`${path}model.js`);
const { surface } = require(`${path}ice.js`);
const { TOOLS, STORY, BLOCKS } = require(`${path}campaign-content.js`);
const { ALL_TOOL_NODES, nodeState, canonicalTool } = require(
  `${path}tool-trees.js`,
);
const { carriedEffects } = require(`${path}tree-migration.js`);
const { toolAffinity } = require(`${path}tool-affinity.js`);
const { TOOL_FOOTPRINTS, THERMAL_FAN_DEPTH_SCALE } = require(
  `${path}tool-footprints.js`,
);
const { MATERIAL_DEFINITIONS } = require(`${path}ice-grid.js`);
const { TUNE } = require(`${path}tuning.js`);
const { HEAT, FAN_RADIUS } = require(`${path}progression.js`);
const { TOOL_FITTINGS } = require(`${path}tool-upgrades.js`);
const { conditionRisk, thermalConditionRisk, distanceToLoot } = require(
  `${path}condition.js`,
);
const { IMPACT_CONDITION_SCALE, BREAKER_CONDITION_RATE_CAP } = require(
  `${path}condition.js`,
);
const { tutorialMessage, tutorialCanWork } = require(`${path}tutorial.js`);
const { tutorialAim } = require(`${path}tutorial-qa.js`);
const policy = process.argv[2] ?? 'mixed';
const POLICIES = [
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
if (!POLICIES.includes(policy)) throw Error(`Unknown policy: ${policy}`);
const through = Number(
  process.argv.find((arg) => arg.startsWith('--through='))?.split('=')[1] ?? 32,
);
const maxSeconds =
  Number(
    process.argv
      .find((arg) => arg.startsWith('--max-minutes='))
      ?.split('=')[1] ?? 240,
  ) * 60;
if (!Number.isInteger(through) || through < 1 || through > 32)
  throw Error('--through must be an integer from 1 to 32');
if (!Number.isFinite(maxSeconds) || maxSeconds <= 0 || maxSeconds > 240 * 60)
  throw Error('--max-minutes must be positive and at most 240');
const dt = 0.05;
const assumptions = {
  readingWordsPerMinute: 180,
  minimumLineSeconds: 1.2,
  lineAcknowledgementSeconds: 0.4,
  pickupSeconds: 1.25,
  menuOpenSeconds: 2.5,
  microInspectionSeconds: 4,
  majorInspectionSeconds: 8,
  newToolInspectionSeconds: 8,
  notificationSeconds: 3,
  deliveryOrientationSeconds: 6,
  innerPhaseOrientationSeconds: 3,
  toolSelectionSeconds: 0.8,
  quarterTurnSeconds: 1.2,
  receiptInspectionSeconds: 4,
  evidenceInspectionSeconds: 8,
  policyBehavior: {
    aiming:
      'Power/Speed/Saver use direct nearest-support rays. Mixed, Technique and Control inspect visible nearby offsets beside exposed economic cargo with remaining grade premium. Each candidate is charged only the actual rounded grade premium its predicted contact can lose, never authored base money or an already-lost bonus. Loss is normalized by mean phase cargo value. Control considers more offsets and gives preservation greater weight.',
    toolObjective:
      'Power maximizes predicted useful ice throughput with zero monetary-risk penalty. Speed has a small premium-loss preference; Mixed balances useful work against remaining grade premium, and Control gives that premium greater weight. The predictor uses the current contact horizon and real discrete grade thresholds; it does not infer future tool use or force target completion times.',
    purchases:
      'Candidates must be the newest tool or account for at least15% of recent work since the newest tool acquisition. Cheapest considers any tool with fresh use. Rank by cost per marginal fitting effect weighted by fresh recent tool use. Focused policies reserve most spending for their primary branch, a secondary branch, and limited first-rank exploration; Mixed has no branch allocation. Purchases stop when all final cargo is free.',
    focusedSecondaryToPrimarySpend: 0.75,
    focusedExplorationToPrimarySpend: 0.25,
    limitation:
      'These are explicit player-behavior models, not globally optimal builds. They can deliberately retain funds when no affordable upgrade fits the current strategy.',
  },
  note: 'First-time overhead is an explicit estimate added to observed engine time; no artificial waiting is added to the game. Active work includes aim/strike cadence while a recoverable object remains embedded. Reading is 180 words/minute. No GPU performance claim is made by this headless simulation.',
};
const m = new GameModel(undefined, { tutorial: true });
const phases = [],
  deliveries = [],
  purchases = [],
  events = [],
  choices = [],
  switches = [],
  calls = [],
  awards = [];
const toolUsageSeconds = {},
  toolModeUsageSeconds = {},
  toolModeUsageByMinute = {},
  toolUsageByMinute = {},
  toolReveals = {},
  toolBuys = {},
  blockedOpportunities = [];
const time = {
  active: 0,
  reading: 0,
  menus: 0,
  inspection: 0,
  rotation: 0,
  settlement: 0,
  collection: 0,
  transition: 0,
  other: 0,
};
const wallStart = performance.now();
let clock = 0,
  tutorialSeconds = 0,
  tutorialActive = 0,
  campaignStart = 0,
  campaignStartAccount = null,
  currentPhase = null,
  currentDelivery = null;
let aim = null,
  refresh = 0,
  decision = 0,
  toolDecision = 0,
  yaw = 0,
  charge = 0,
  lastProgress = 0,
  lastMass = Infinity;
let blockedSeconds = 0,
  maxBlocked = 0,
  longestBlocked = null,
  lastPurchase = 0,
  maxPurchaseGap = 0,
  failure = null;
let midgame = null;
let toolUseSinceAcquisition = {};
const settledSeen = new Set(),
  inspectedEvidence = new Set();
const aimStats = {
  finishingChecks: 0,
  candidates: 0,
  offsetsSelected: 0,
  cargoOcclusionsRejected: 0,
  noUsefulOffset: 0,
  baselineRisk: 0,
  selectedRisk: 0,
};
let meshField = null,
  meshRevision = -1,
  meshBuilds = 0,
  raycasts = 0;
const mesh = new THREE.Mesh(
  new THREE.BufferGeometry(),
  new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
);
const ray = new THREE.Raycaster();
const rounded = (n) => Math.round(n * 100) / 100;
const ledger = () => ({
  gross: m.campaign.state.grossEarned,
  net: m.campaign.state.netEarned,
  fee: m.campaign.state.commissionPaid,
  money: m.money,
});
const nodeIds = () => Object.values(m.nodes).flat();
function addTime(kind, seconds) {
  if (!Number.isFinite(seconds) || seconds < 0)
    throw Error(`Invalid ${kind} time`);
  time[kind] += seconds;
  clock += seconds;
  if (currentPhase) currentPhase.time[kind] += seconds;
  if (!m.inTutorial && !midgame && clock >= 45 * 60)
    midgame = {
      seconds: rounded(clock),
      activeSeconds: rounded(time.active - tutorialActive),
      block: m.round + 1,
      nodes: nodeIds(),
      tools: [...m.campaign.state.tools],
    };
}
function readSeconds(text) {
  return (
    Math.max(
      assumptions.minimumLineSeconds,
      (text.trim().split(/\s+/).length / assumptions.readingWordsPerMinute) *
        60,
    ) + assumptions.lineAcknowledgementSeconds
  );
}
function tick(kind, hit = null) {
  const tool = canonicalTool(m.toolId);
  if (kind === 'active' && !m.inTutorial) {
    toolUsageSeconds[tool] = (toolUsageSeconds[tool] ?? 0) + dt;
    toolUseSinceAcquisition[tool] = (toolUseSinceAcquisition[tool] ?? 0) + dt;
    if (currentPhase)
      currentPhase.toolUsageSeconds[tool] =
        (currentPhase.toolUsageSeconds[tool] ?? 0) + dt;
    const minute = Math.floor((time.active - tutorialActive) / 60);
    const mode =
      tool === 'thermal'
        ? `${tool}:${m.mode}`
        : tool === 'breaker'
          ? `${tool}:${m.breakerBit}`
          : tool === 'sledge' && m.hasNode('SH-T1')
            ? `${tool}:charged`
            : tool;
    toolModeUsageSeconds[mode] = (toolModeUsageSeconds[mode] ?? 0) + dt;
    toolModeUsageByMinute[minute] ??= {};
    toolModeUsageByMinute[minute][mode] =
      (toolModeUsageByMinute[minute][mode] ?? 0) + dt;
    toolUsageByMinute[minute] ??= {};
    toolUsageByMinute[minute][tool] =
      (toolUsageByMinute[minute][tool] ?? 0) + dt;
  }
  m.update(dt, hit);
  addTime(kind, dt);
  refresh -= dt;
  decision -= dt;
  toolDecision -= dt;
}
function rebuildMesh() {
  if (meshField === m.field && meshRevision === m.field.revision) return;
  const data = surface(m.field);
  mesh.geometry.dispose();
  mesh.geometry = new THREE.BufferGeometry();
  mesh.geometry.setAttribute(
    'position',
    new THREE.Float32BufferAttribute(data.positions, 3),
  );
  mesh.geometry.computeBoundingSphere();
  mesh.updateMatrixWorld();
  meshField = m.field;
  meshRevision = m.field.revision;
  meshBuilds++;
}
function rayAt(target, angle = yaw, top = false, avoidCargo = false) {
  rebuildMesh();
  const direction = top
    ? new THREE.Vector3(0, -1, 0)
    : new THREE.Vector3(Math.sin(angle), -0.43, -Math.cos(angle)).normalize();
  ray.set(
    new THREE.Vector3(target.x, target.y, target.z).addScaledVector(
      direction,
      -100,
    ),
    direction,
  );
  raycasts++;
  const hit = ray.intersectObject(mesh, false)[0];
  if (hit && avoidCargo) {
    for (const t of m.loot) {
      if (t.state !== 'embedded' || t.story || (t.baseValue ?? t.value) <= 0)
        continue;
      const box = new THREE.Box3(
        new THREE.Vector3(t.x - t.w / 2, t.y - t.h / 2, t.z - t.d / 2),
        new THREE.Vector3(t.x + t.w / 2, t.y + t.h / 2, t.z + t.d / 2),
      );
      const cargoHit = ray.ray.intersectBox(box, new THREE.Vector3());
      if (
        cargoHit &&
        cargoHit.distanceTo(ray.ray.origin) < hit.distance - 1e-4
      ) {
        aimStats.cargoOcclusionsRejected++;
        return null;
      }
    }
  }
  return hit
    ? {
        x: hit.point.x,
        y: hit.point.y,
        z: hit.point.z,
        surfaceNormal: hit.face.normal.clone().normalize(),
      }
    : null;
}
function fanNormalAt(point) {
  const n = m.field.surfaceNormal(point);
  const length = Math.hypot(n.x, n.y, n.z);
  return length > 1e-6
    ? { x: n.x / length, y: n.y / length, z: n.z / length }
    : (point.surfaceNormal ?? { x: 0, y: 1, z: 0 });
}
function rotate() {
  m.stop();
  yaw = (yaw + Math.PI / 2) % (Math.PI * 2);
  aim = null;
  refresh = 0;
  addTime('rotation', assumptions.quarterTurnSeconds);
}
function chooseAim() {
  const embedded = m.loot.filter((t) => t.state === 'embedded');
  if (!embedded.length) return null;
  const target = embedded.reduce(
    (best, t) => (!best || t.y > best.y ? t : best),
    null,
  );
  let best = null,
    score = Infinity;
  for (let i = 0; i < m.field.values.length; i++) {
    if (m.field.values[i] <= 0.5) continue;
    const p = m.field.points[i];
    const distance = distanceToLoot(target, p);
    const nearSupport =
      p.y <= target.y + target.h / 2 &&
      Math.abs(p.x - target.x) < target.w / 2 + 0.6 &&
      Math.abs(p.z - target.z) < target.d / 2 + 0.6;
    const value =
      distance +
      Math.abs(p.y - (target.y - target.h / 2)) * 0.06 -
      (nearSupport ? 0.08 : 0);
    if (value < score) {
      score = value;
      best = p;
    }
  }
  if (!best) return null;
  let hit = rayAt(best);
  if (!hit) hit = rayAt(best, yaw, true);
  if (!hit) {
    rotate();
    hit = rayAt(best);
  }
  const care =
    policy === 'control-first'
      ? 0.45
      : policy === 'mixed'
        ? 0.12
        : policy === 'technique-first'
          ? 0.2
          : 0;
  if (hit && care > 0) hit = finishAim(best, hit, target, care);
  return hit;
}

function finishAim(targetPoint, baseline, target, care) {
  const f = m.fittings,
    thermal = m.thermal,
    tool = canonicalTool(m.toolId);
  const bit = m.toolId === 'breaker' ? m.breakerBit : 'standard';
  const radius = thermal
    ? m.radius
    : m.activeTool.radius *
      1.12 *
      Math.sqrt(
        f.area * (bit === 'precision' ? 0.75 : bit === 'wide' ? 1.35 : 1),
      );
  const economicCargo = m.loot.filter(
    (t) => !t.story && (t.baseValue ?? t.value) > 0,
  );
  const meanBase =
    economicCargo.reduce((sum, t) => sum + (t.baseValue ?? t.value), 0) /
    Math.max(1, economicCargo.length);
  const threatened = economicCargo.filter(
    (t) =>
      t.state === 'embedded' &&
      remainingPremium(t) > 0 &&
      (t.conditionActive || m.field.exposure(t).exposed >= 0.2) &&
      distanceToLoot(t, baseline) < radius * 1.7,
  );
  if (!threatened.length) return baseline;
  aimStats.finishingChecks++;
  const direction = new THREE.Vector3(
    Math.sin(yaw),
    -0.43,
    -Math.cos(yaw),
  ).normalize();
  const right = new THREE.Vector3(Math.cos(yaw), 0, Math.sin(yaw));
  const up = new THREE.Vector3().crossVectors(right, direction).normalize();
  const offsets =
    care >= 0.4
      ? [
          [0, 0],
          [-0.5, 0],
          [0.5, 0],
          [0, -0.5],
          [0, 0.5],
          [-1, 0],
          [1, 0],
          [0, -1],
          [0, 1],
          [-0.7, -0.7],
          [0.7, -0.7],
          [-0.7, 0.7],
          [0.7, 0.7],
        ]
      : [
          [0, 0],
          [-0.5, 0],
          [0.5, 0],
          [0, -0.5],
          [0, 0.5],
          [-0.7, -0.7],
          [0.7, -0.7],
        ];
  const force = thermal
    ? m.power
    : m.activeTool.force *
      1.3 *
      f.power *
      toolAffinity(m.field.profile?.shape, tool) *
      (m.toolId === 'sledge' && m.hasNode('SH-T1') ? f.charge : 1);
  const evaluate = (point) => {
    const normal = m.field.surfaceNormal(point),
      sideFace = Math.abs(normal.y) < 0.5;
    const fanNormal = fanNormalAt(point);
    const fanDepth =
      thermal && m.mode === 'wide' && !m.field.grid.legacy
        ? THERMAL_FAN_DEPTH_SCALE
        : 1;
    const depth =
      f.depth *
      (sideFace ? f.sideDepth : 1) *
      (bit === 'precision' ? 1.35 : bit === 'wide' ? 0.82 : 1);
    const rr = radius * radius;
    let useful = 0;
    for (let i = 0; i < m.field.values.length; i++) {
      const value = m.field.values[i];
      if (value <= 0.5) continue;
      const p = m.field.points[i],
        near = distanceToLoot(target, p);
      if (near > 0.6) continue;
      const dx = p.x - point.x,
        dy = p.y - point.y,
        dz = p.z - point.z;
      const along = dx * normal.x + dy * normal.y + dz * normal.z,
        d2 = dx * dx + dy * dy + dz * dz;
      const side = Math.max(0, d2 - along * along),
        fanAlong = dx * fanNormal.x + dy * fanNormal.y + dz * fanNormal.z,
        distance = thermal
          ? d2 + fanAlong * fanAlong * (1 / (fanDepth * fanDepth) - 1)
          : side + (along * along) / (depth * depth);
      if (distance >= rr) continue;
      const material = MATERIAL_DEFINITIONS[m.field.materialIds[i]];
      const loss = thermal
        ? force * (1 - distance / rr) * material.thermalConductivity * 0.3
        : (force *
            (1 - distance / rr) *
            (side < rr * 0.45 * 0.45 ? f.center : 1) *
            (value < 0.95 ? f.weak : 1)) /
          material.hardness;
      useful += Math.min(value - 0.5, loss) / (1 + near * near);
    }
    let risk = 0,
      expectedLoss = 0;
    for (const t of threatened) {
      const cargoRisk = thermal
        ? thermalConditionRisk(t, {
            point,
            radius,
            exposure: m.field.exposure(t).exposed,
          })
        : conditionRisk(t, {
            tool,
            point,
            radius,
            exposure: m.field.exposure(t).exposed,
          });
      const valueWeight = (t.baseValue ?? t.value) / meanBase;
      const loss = thermal
        ? cargoRisk * 3 * 0.3
        : tool === 'breaker'
          ? Math.min(12, IMPACT_CONDITION_SCALE * cargoRisk * 13) * 0.3
          : IMPACT_CONDITION_SCALE *
            cargoRisk *
            Math.min(1.5, force / (m.activeTool.force * 1.3));
      risk += cargoRisk * valueWeight;
      expectedLoss += (expectedPremiumLoss(t, loss) / meanBase) * 100;
    }
    return { point, useful, risk, score: useful / (1 + care * expectedLoss) };
  };
  const before = evaluate(baseline),
    candidates = [];
  let baselineVisible = false;
  for (const [a, b] of offsets) {
    const projected = new THREE.Vector3(
      targetPoint.x,
      targetPoint.y,
      targetPoint.z,
    )
      .addScaledVector(right, a * radius)
      .addScaledVector(up, b * radius);
    const point = rayAt(projected, yaw, false, true);
    aimStats.candidates++;
    if (!point) continue;
    if (a === 0 && b === 0) baselineVisible = true;
    const candidate = evaluate(point);
    if (candidate.useful > 1e-5 && candidate.useful >= before.useful * 0.2)
      candidates.push({ ...candidate, a, b });
  }
  candidates.sort((a, b) => b.score - a.score);
  const choice = candidates[0];
  if (!choice) {
    aimStats.noUsefulOffset++;
    if (!baselineVisible) {
      rotate();
      return rayAt(targetPoint, yaw, false, true);
    }
    return baseline;
  }
  if (
    !baselineVisible ||
    ((choice.a !== 0 || choice.b !== 0) && choice.score > before.score * 1.08)
  ) {
    aimStats.offsetsSelected++;
    aimStats.baselineRisk += before.risk;
    aimStats.selectedRisk += choice.risk;
    return choice.point;
  }
  return baseline;
}
function phaseStart() {
  const c = m.campaign,
    authored = c.block.ice?.phases[c.state.phase];
  currentPhase = {
    block: m.round + 1,
    phase: c.state.phase + 1,
    id: authored?.id ?? `${c.block.id}:${c.state.phase}`,
    field: m.field,
    profile: m.field.profile?.shape,
    dimensions: {
      width: m.field.grid.physicalWidth,
      height: m.field.grid.physicalHeight,
      depth: m.field.grid.physicalDepth,
    },
    grid: {
      nx: m.field.grid.nx,
      ny: m.field.grid.ny,
      nz: m.field.grid.nz,
      cellSize: m.field.grid.cellSize,
    },
    samples: m.field.values.length,
    totalSolidSamples: m.field.remaining(),
    initialDensityMass: m.field.values.reduce((s, v) => s + v, 0),
    targetActiveSeconds: authored?.targetActiveSeconds,
    idealTools: authored?.idealTools,
    started: clock,
    accountStart: ledger(),
    time: Object.fromEntries(Object.keys(time).map((k) => [k, 0])),
    toolUsageSeconds: {},
    purchaseStart: purchases.length,
    switchStart: switches.length,
    awardStart: awards.length,
  };
  if (!currentDelivery)
    currentDelivery = {
      block: m.round + 1,
      id: c.block.id,
      name: c.block.name,
      chapter: c.block.chapter,
      started: clock,
      accountStart: ledger(),
      phaseStart: phases.length,
      purchaseStart: purchases.length,
      awardStart: awards.length,
    };
  aim = null;
  refresh = 0;
  lastProgress = time.active;
  lastMass = m.field.values.reduce((s, v) => s + v, 0);
  addTime(
    'inspection',
    c.state.phase === 0
      ? assumptions.deliveryOrientationSeconds
      : assumptions.innerPhaseOrientationSeconds,
  );
  console.log(
    JSON.stringify({
      type: 'phase-start',
      policy,
      block: currentPhase.block,
      phase: currentPhase.phase,
      solid: currentPhase.totalSolidSamples,
      tool: m.toolId,
      money: m.money,
    }),
  );
}
function phaseEnd() {
  if (!currentPhase) return;
  const {
    field,
    accountStart,
    started,
    purchaseStart,
    switchStart,
    awardStart,
    ...phase
  } = currentPhase;
  const accountEnd = ledger(),
    localAwards = awards.slice(awardStart);
  phases.push({
    ...phase,
    seconds: rounded(clock - started),
    activeSeconds: rounded(phase.time.active),
    directSamplesRemoved: field.metrics.directSolidRemoved ?? null,
    detachedSamplesRemoved: field.metrics.detachedSolidRemoved ?? null,
    thermalSamplesRemoved: field.metrics.thermalSolidRemoved ?? null,
    densityRemoval: {
      direct: rounded(field.metrics.directRemoved),
      detached: rounded(field.metrics.detachedRemoved),
      thermal: rounded(field.metrics.thermalRemoved),
    },
    remainingSolidSamples: field.remaining(),
    removalCountBalance: Number.isInteger(field.metrics.directSolidRemoved)
      ? phase.totalSolidSamples -
        field.remaining() -
        field.metrics.directSolidRemoved -
        field.metrics.detachedSolidRemoved -
        field.metrics.thermalSolidRemoved
      : null,
    basePayout: localAwards.reduce((s, a) => s + a.base, 0),
    conditionBonus: localAwards.reduce((s, a) => s + a.bonus, 0),
    gross: accountEnd.gross - accountStart.gross,
    commission: accountEnd.fee - accountStart.fee,
    net: accountEnd.net - accountStart.net,
    moneyEntering: accountStart.money,
    moneyLeaving: accountEnd.money,
    purchases: purchases.slice(purchaseStart).map((p) => p.id),
    toolSwitches: switches.slice(switchStart),
    conditions: localAwards.filter((a) => !a.story).map((a) => a.condition),
    pristine: localAwards.filter((a) => a.grade === 'PRISTINE').length,
  });
  console.log(
    JSON.stringify({
      type: 'phase-end',
      policy,
      block: phase.block,
      phase: phase.phase,
      active: rounded(phase.time.active),
      gross: accountEnd.gross - accountStart.gross,
      remaining: field.remaining(),
    }),
  );
  currentPhase = null;
}
function deliveryEnd() {
  if (!currentDelivery) return;
  const {
    accountStart,
    started,
    phaseStart: at,
    purchaseStart,
    awardStart,
    ...delivery
  } = currentDelivery;
  const accountEnd = ledger(),
    list = phases.slice(at),
    ownAwards = awards.slice(awardStart).filter((a) => !a.story);
  deliveries.push({
    ...delivery,
    seconds: rounded(clock - started),
    activeSeconds: rounded(list.reduce((s, p) => s + p.activeSeconds, 0)),
    phases: list.length,
    time: Object.fromEntries(
      Object.keys(time).map((k) => [
        k,
        rounded(list.reduce((s, p) => s + p.time[k], 0)),
      ]),
    ),
    totalSolidSamples: list.reduce((s, p) => s + p.totalSolidSamples, 0),
    directSamplesRemoved: list.every((p) => p.directSamplesRemoved !== null)
      ? list.reduce((s, p) => s + p.directSamplesRemoved, 0)
      : null,
    detachedSamplesRemoved: list.every((p) => p.detachedSamplesRemoved !== null)
      ? list.reduce((s, p) => s + p.detachedSamplesRemoved, 0)
      : null,
    thermalSamplesRemoved: list.every((p) => p.thermalSamplesRemoved !== null)
      ? list.reduce((s, p) => s + p.thermalSamplesRemoved, 0)
      : null,
    basePayout: ownAwards.reduce((s, a) => s + a.base, 0),
    conditionBonus: ownAwards.reduce((s, a) => s + a.bonus, 0),
    gross: accountEnd.gross - accountStart.gross,
    commission: accountEnd.fee - accountStart.fee,
    net: accountEnd.net - accountStart.net,
    moneyEntering: accountStart.money,
    moneyLeaving: accountEnd.money,
    purchases: purchases.slice(purchaseStart),
    ownedNodes: nodeIds(),
    ownedTools: [...m.campaign.state.tools],
    averageCondition: ownAwards.length
      ? rounded(
          ownAwards.reduce((s, a) => s + a.condition, 0) / ownAwards.length,
        )
      : null,
    pristine: ownAwards.filter((a) => a.grade === 'PRISTINE').length,
    toolUsageSeconds: Object.fromEntries(
      TOOLS.filter((t) => t.id !== 'grip').map((t) => [
        t.id,
        rounded(list.reduce((s, p) => s + (p.toolUsageSeconds[t.id] ?? 0), 0)),
      ]),
    ),
  });
  currentDelivery = null;
  writeResults('running');
}
m.onCredit = (t) => {
  if (m.inTutorial) return;
  awards.push({
    id: t.id,
    kind: t.kind,
    name: t.name,
    block: m.round + 1,
    phase: m.campaign.state.phase + 1,
    base: t.baseValue ?? t.value,
    bonus: (t.finalValue ?? t.value) - (t.baseValue ?? t.value),
    grade: t.finalGrade,
    condition: t.finalCondition ?? 100,
    story: t.story,
    time: rounded(clock),
    tool: m.toolId,
  });
};
m.onImpact = (t) => {
  if (t.story && !inspectedEvidence.has(t.story) && !m.inTutorial) {
    inspectedEvidence.add(t.story);
    addTime('inspection', assumptions.evidenceInspectionSeconds);
  }
};
function chooseTool() {
  if (!aim) return;
  const c = m.campaign,
    field = m.field,
    normal = field.surfaceNormal(aim);
  const fanNormal = fanNormalAt(aim);
  const shape = field.profile?.shape,
    sideFace = Math.abs(normal.y) < 0.5;
  // Price only the remaining grade premium a contact can actually lose.
  // Weights express preference; Power deliberately values physical speed only.
  const qualities = {
    mixed: 0.2,
    'control-first': 0.5,
    'technique-first': 0.15,
    saver: 0.1,
    upgrader: 0.1,
    'power-first': 0,
    'speed-first': 0.015,
    'cheapest-first': 0.1,
    inefficient: 0.03,
  };
  const exposure = m.loot
    .filter((t) => t.state === 'embedded' && !t.story)
    .map((t) => ({ t, value: m.field.exposure(t).exposed }));
  const economicCargo = m.loot.filter(
    (loot) => !loot.story && (loot.baseValue ?? loot.value) > 0,
  );
  const meanBase =
    economicCargo.reduce(
      (sum, loot) => sum + (loot.baseValue ?? loot.value),
      0,
    ) / Math.max(1, economicCargo.length);
  const tools = TOOLS.filter(
    (t) => t.id !== 'grip' && c.state.tools.includes(t.id),
  );
  const candidates = tools.flatMap((t) => {
    const variants =
      t.id === 'thermal'
        ? ['precision', ...(m.hasFan ? ['wide'] : [])]
        : t.id === 'breaker'
          ? [
              'standard',
              ...(m.hasNode('PB-C3') ? ['precision'] : []),
              ...(m.hasNode('PB-C4') ? ['wide'] : []),
            ]
          : ['standard'];
    return variants.map((variant) => {
      const f = carriedEffects(m.nodes[t.id], m.treeCarry[t.id]),
        old = m.toolUpgrades[t.id];
      const affinity = toolAffinity(shape, t.id),
        thermal = t.id === 'thermal';
      const bit = t.id === 'breaker' ? variant : 'standard';
      const footprint = field.grid.legacy ? t.radius : TOOL_FOOTPRINTS[t.id];
      const radius = thermal
        ? footprint *
          (variant === 'wide'
            ? (TUNE.wideRadius / TUNE.radius) *
              FAN_RADIUS[old.wide] *
              Math.sqrt(f.area * f.wideArea)
            : Math.sqrt(f.area))
        : footprint *
          1.12 *
          (1 + old.wide * TOOL_FITTINGS[t.id].radius) *
          Math.sqrt(
            f.area * (bit === 'precision' ? 0.75 : bit === 'wide' ? 1.35 : 1),
          );
      const charged = t.id === 'sledge' && f.mechanics.has('charge');
      const visible =
        f.visible > 1 &&
        exposure.some(
          ({ t: loot, value }) =>
            value > 0.18 &&
            Math.hypot(loot.x - aim.x, loot.y - aim.y, loot.z - aim.z) <
              footprint + loot.w,
        );
      const force = thermal
        ? TUNE.heat *
          1.8 *
          HEAT[old.heat] *
          affinity *
          f.power *
          (variant === 'wide'
            ? old.wide >= 9 || m.hasNode('TH-C5')
              ? 0.8
              : old.wide >= 5
                ? 0.65
                : TUNE.widePower
            : f.focusPower)
        : t.force *
          1.3 *
          (1 + old.heat * TOOL_FITTINGS[t.id].force) *
          affinity *
          f.power *
          (visible ? f.visible : 1) *
          (1 + (f.thirdPower - 1) / 3) *
          (charged ? f.charge : 1) *
          (t.id === 'heavy' && sideFace ? Math.min(1, 0.8 * f.side) : 1) *
          (bit === 'wide' ? 0.82 : 1);
      const cadence = thermal
        ? 0
        : Math.max(
            {
              hand: 0.15,
              pick: 0.32,
              heavy: 0.46,
              sledge: 0.62,
              breaker: 0.065,
            }[t.id],
            (t.cadence * f.cycle) / (1 + old.tank * TOOL_FITTINGS[t.id].speed),
          ) + (charged ? 0.7 : 0);
      return {
        t,
        f,
        variant,
        bit,
        radius,
        force,
        cadence,
        affinity,
        thermal,
        fanDepth:
          thermal && variant === 'wide' && !field.grid.legacy
            ? THERMAL_FAN_DEPTH_SCALE
            : 1,
        center: f.center * (bit === 'precision' ? 1.35 : 1),
        depth:
          f.depth *
          (sideFace ? f.sideDepth : 1) *
          (bit === 'precision' ? 1.35 : bit === 'wide' ? 0.82 : 1),
      };
    });
  });
  const reach = Math.max(
    ...candidates.map((o) => o.radius * Math.max(1, o.depth)),
  );
  const local = [];
  for (let i = 0; i < field.values.length; i++) {
    const value = field.values[i];
    if (value <= 0.5) continue;
    const p = field.points[i],
      dx = p.x - aim.x,
      dy = p.y - aim.y,
      dz = p.z - aim.z;
    const d2 = dx * dx + dy * dy + dz * dz;
    if (d2 >= reach * reach) continue;
    const along = dx * normal.x + dy * normal.y + dz * normal.z;
    const q = field.coordinates(i);
    let neighbors = 0;
    field.forEachNeighbor6(q.x, q.y, q.z, (n) => {
      if (field.values[n] > 0.5) neighbors++;
    });
    local.push({
      value,
      d2,
      along,
      fanAlong: dx * fanNormal.x + dy * fanNormal.y + dz * fanNormal.z,
      side: Math.max(0, d2 - along * along),
      neighbors,
      material: MATERIAL_DEFINITIONS[field.materialIds[i]],
    });
  }
  const ranked = candidates
    .map((o) => {
      const { t, f, variant, radius, force, cadence, thermal } = o,
        rr = radius * radius;
      // A short lookahead caps predicted removal at the actual remaining
      // density. It cannot award work for air inside a large empty footprint.
      const horizon = Math.max(policy === 'inefficient' ? 0.5 : 0.3, cadence),
        contacts = thermal ? 1 : horizon / cadence;
      let useful = 0,
        affected = 0,
        hardness = 0,
        conductivity = 0;
      for (const p of local) {
        const distance = thermal
          ? p.d2 + p.fanAlong * p.fanAlong * (1 / (o.fanDepth * o.fanDepth) - 1)
          : p.side + (p.along * p.along) / (o.depth * o.depth);
        if (distance >= rr) continue;
        affected++;
        hardness += p.material.hardness;
        conductivity += p.material.thermalConductivity;
        const loss = thermal
          ? force *
            (1 - distance / rr) *
            p.material.thermalConductivity *
            horizon
          : ((force *
              (1 - distance / rr) *
              (p.side < rr * 0.45 * 0.45 ? o.center : 1) *
              (p.value < 0.95 ? f.weak : 1) *
              (p.neighbors <= 3 ? f.support / p.material.supportStrength : 1)) /
              p.material.hardness) *
            contacts;
        useful += Math.min(p.value - 0.5, loss);
      }
      const forceFactor = Math.min(
        1.5,
        Math.max(0.65, force / (t.force * 1.3)),
      );
      let risk = 0,
        lossPerSecond = 0,
        premiumLossDollars = 0;
      for (const { t: loot, value } of exposure) {
        if (remainingPremium(loot) <= 0) continue;
        const cargoRisk =
          t.id === 'thermal'
            ? thermalConditionRisk(loot, {
                point: aim,
                radius,
                exposure: value,
              })
            : conditionRisk(loot, {
                tool: t.id,
                point: aim,
                radius,
                exposure: value,
              });
        const rawRate = thermal
          ? Math.min(3, (force / 2.61) * 3) * cargoRisk
          : t.id === 'breaker'
            ? Math.min(
                BREAKER_CONDITION_RATE_CAP,
                IMPACT_CONDITION_SCALE * cargoRisk * forceFactor * 13,
              )
            : (IMPACT_CONDITION_SCALE * cargoRisk * forceFactor) / cadence;
        risk = Math.max(risk, cargoRisk);
        const predictedLoss = Math.min(
          loot.condition ?? 100,
          rawRate * horizon,
        );
        lossPerSecond += predictedLoss / horizon;
        premiumLossDollars += expectedPremiumLoss(loot, predictedLoss);
      }
      const premiumLossPerSecond =
        (100 * premiumLossDollars) / Math.max(1, meanBase) / horizon;
      const throughput = useful / horizon;
      return {
        id: t.id,
        variant,
        key: `${t.id}:${variant}`,
        score: throughput / (1 + qualities[policy] * premiumLossPerSecond),
        throughput,
        affected,
        lossPerSecond,
        premiumLossPerSecond,
        premiumDollarsPerSecond: premiumLossDollars / horizon,
        risk,
        affinity: o.affinity,
        hardness: affected ? hardness / affected : 1,
        conductivity: affected ? conductivity / affected : 1,
      };
    })
    .sort((a, b) => b.score - a.score);
  let choice = ranked[0];
  if (
    policy === 'inefficient' &&
    ranked.length > 1 &&
    Math.floor(time.active / 35) % 3 === 0
  )
    choice = ranked[1];
  const currentVariant =
    m.toolId === 'thermal'
      ? m.mode
      : m.toolId === 'breaker'
        ? m.breakerBit
        : 'standard';
  const currentKey = `${canonicalTool(m.toolId)}:${currentVariant}`;
  const current = ranked.find((t) => t.key === currentKey);
  if (
    choice &&
    choice.key !== currentKey &&
    (!current || choice.score > current.score * 1.18)
  ) {
    const from = m.toolId;
    const toolChanged = choice.id !== canonicalTool(m.toolId);
    if (!toolChanged || m.selectTool(choice.id)) {
      if (
        choice.id === 'thermal' &&
        m.mode !== choice.variant &&
        !m.selectMode(choice.variant)
      )
        throw Error(`Could not select owned thermal mode ${choice.variant}`);
      if (
        choice.id === 'breaker' &&
        m.breakerBit !== choice.variant &&
        !m.selectBreakerBit(choice.variant)
      )
        throw Error(`Could not select owned breaker bit ${choice.variant}`);
      switches.push({
        block: m.round + 1,
        phase: c.state.phase + 1,
        time: rounded(clock),
        activeSeconds: rounded(time.active - tutorialActive),
        from,
        to: choice.id,
        fromVariant: currentVariant,
        toVariant: choice.variant,
        reason:
          choice.premiumLossPerSecond > 0
            ? 'throughput-versus-exposed-cargo'
            : 'remaining-solid-work-and-material',
        risk: rounded(choice.risk),
        affinity: choice.affinity,
        usefulDensityPerSecond: rounded(choice.throughput),
        affectedSolidSamples: choice.affected,
        expectedConditionLossPerSecond: rounded(choice.lossPerSecond),
        expectedPremiumPercentPerSecond: rounded(choice.premiumLossPerSecond),
        expectedPremiumDollarsPerSecond: rounded(
          choice.premiumDollarsPerSecond,
        ),
        materialHardness: rounded(choice.hardness),
        thermalConductivity: rounded(choice.conductivity),
      });
      addTime('inspection', assumptions.toolSelectionSeconds);
      charge = 0;
    }
  }
}
function buy() {
  const c = m.campaign;
  if (
    m.round === BLOCKS.length - 1 &&
    c.state.phase === c.block.phases - 1 &&
    !m.loot.some((t) => t.state === 'embedded')
  )
    return;
  const next = TOOLS.find(
    (t) =>
      t.id !== 'grip' &&
      !c.state.tools.includes(t.id) &&
      m.revealedTools.includes(t.id),
  );
  if (next && m.money >= next.cost) {
    const before = m.money;
    if (m.buyTool(next.id)) {
      toolUseSinceAcquisition = {};
      const purchase = {
        kind: 'tool',
        id: next.id,
        time: rounded(clock),
        activeSeconds: rounded(time.active - tutorialActive),
        block: m.round + 1,
        cost: next.cost,
        before,
        after: m.money,
      };
      purchases.push(purchase);
      toolBuys[next.id] = {
        ...purchase,
        revealedAt: toolReveals[next.id]?.seconds,
        savingSeconds: rounded(
          clock - (toolReveals[next.id]?.seconds ?? clock),
        ),
        blocksSaving:
          m.round + 1 - (toolReveals[next.id]?.block ?? m.round + 1),
      };
      maxPurchaseGap = Math.max(maxPurchaseGap, time.active - lastPurchase);
      lastPurchase = time.active;
      addTime('menus', assumptions.menuOpenSeconds);
      addTime('inspection', assumptions.newToolInspectionSeconds);
      return;
    }
  }
  const reachable = ALL_TOOL_NODES.filter(
    (n) =>
      c.state.tools.some((t) => canonicalTool(t) === n.toolId) &&
      nodeState(n, m.nodes[n.toolId]) === 'available',
  );
  const affordable = reachable.filter((n) => n.cost <= m.money);
  if (!affordable.length && !(next && next.cost <= m.money)) {
    blockedSeconds += 1;
    if (blockedSeconds > maxBlocked) {
      maxBlocked = blockedSeconds;
      longestBlocked = {
        block: m.round + 1,
        phase: c.state.phase + 1,
        activeSeconds: rounded(time.active - tutorialActive),
        money: m.money,
        cheapestNode: Math.min(...reachable.map((n) => n.cost)),
        savingFor: next?.id,
      };
    }
  } else blockedSeconds = 0;
  if (
    [0, 4, 9, 16, 23, 27, 31].includes(m.round) &&
    !choices.some((s) => s.block === m.round + 1)
  )
    choices.push({
      block: m.round + 1,
      time: rounded(clock),
      activeSeconds: rounded(time.active - tutorialActive),
      money: m.money,
      tool: m.toolId,
      affordable: affordable.map((n) => ({
        id: n.id,
        branch: n.branch,
        cost: n.cost,
      })),
      savingFor: next?.id,
    });
  const branch = {
    'power-first': 'power',
    'speed-first': 'speed',
    'control-first': 'control',
    'technique-first': 'technique',
  }[policy];
  const latest = c.state.tools.filter((t) => t !== 'grip').at(-1);
  const minute = Math.floor((time.active - tutorialActive) / 60);
  const recent = Object.fromEntries(
    TOOLS.map((t) => [
      t.id,
      Math.min(
        toolUseSinceAcquisition[t.id] ?? 0,
        [minute, minute - 1, minute - 2].reduce(
          (sum, k) => sum + (toolUsageByMinute[k]?.[t.id] ?? 0),
          0,
        ),
      ),
    ]),
  );
  const recentTotal = Object.values(recent).reduce((sum, n) => sum + n, 0);
  const relevance = (tool) =>
    Math.max(
      tool === canonicalTool(latest) ? 0.5 : 0,
      recentTotal > 0
        ? recent[tool] / recentTotal
        : tool === canonicalTool(m.toolId)
          ? 1
          : 0,
    );
  const secondary = {
    power: 'speed',
    speed: 'power',
    control: 'technique',
    technique: 'control',
  }[branch];
  const spent = (tool, branches) =>
    purchases
      .filter(
        (p) =>
          p.kind === 'node' &&
          ALL_TOOL_NODES.find((n) => n.id === p.id)?.toolId === tool &&
          branches.includes(p.branch),
      )
      .reduce((sum, p) => sum + p.cost, 0);
  // Focused policies invest most money in their named branch, with a real
  // secondary branch budget. They can save instead of automatically buying
  // every cheap node in an obsolete tree. Mixed has no branch budget.
  const focused = (n) => {
    if (!branch || n.branch === branch) return true;
    const primarySpent = spent(n.toolId, [branch]);
    if (n.branch === secondary)
      return spent(n.toolId, [secondary]) + n.cost <= primarySpent * 0.75;
    const otherBranches = ['power', 'speed', 'control', 'technique'].filter(
      (b) => b !== branch && b !== secondary,
    );
    return (
      n.rank === 1 &&
      spent(n.toolId, otherBranches) + n.cost <= primarySpent * 0.25
    );
  };
  const marginal = (n) => {
    let benefit = 0;
    for (const [key, value] of Object.entries(n.effect)) {
      if (key === 'mechanic') {
        benefit += 0.18;
        continue;
      }
      if (key === 'afterheat') {
        benefit += 0.08;
        continue;
      }
      if (typeof value !== 'number') continue;
      benefit += Math.abs(Math.log(value)) * (key === 'area' ? 0.75 : 1);
    }
    return Math.max(0.03, benefit);
  };
  const working = reachable.filter(
    (n) =>
      (n.toolId === canonicalTool(latest) ||
        (toolUseSinceAcquisition[n.toolId] ?? 0) > 0) &&
      (policy === 'cheapest-first' ||
        (relevance(n.toolId) >= 0.15 && focused(n))),
  );
  const score = (n) =>
    n.id === 'HC-S1'
      ? -1e9
      : policy === 'cheapest-first'
        ? n.cost
        : (n.cost / (marginal(n) * Math.max(0.15, relevance(n.toolId)))) *
          (branch && n.branch === branch ? 0.4 : 1);
  working.sort((a, b) => score(a) - score(b));
  const candidates = branch
    ? working.slice(0, 1).filter((n) => n.cost <= m.money)
    : working.filter((n) => n.cost <= m.money);
  const selected = candidates.find((n) => {
    if (!next) return true;
    const fitted = purchases.filter(
      (p) => p.kind === 'node' && p.goal === next.id,
    ).length;
    if (policy === 'saver' || policy === 'inefficient')
      return m.money - n.cost >= next.cost;
    if (policy === 'upgrader' || policy === 'cheapest-first')
      return fitted < 3 && n.cost <= next.cost * 0.45;
    return (
      fitted < 2 &&
      n.cost <= next.cost * 0.4 &&
      m.money - n.cost >= next.cost * 0.15
    );
  });
  if (selected) {
    const before = m.money;
    if (m.purchaseNode(selected.id, clock * 1000)) {
      purchases.push({
        kind: 'node',
        id: selected.id,
        branch: selected.branch,
        major: selected.major,
        time: rounded(clock),
        activeSeconds: rounded(time.active - tutorialActive),
        block: m.round + 1,
        cost: selected.cost,
        before,
        after: m.money,
        goal: next?.id,
        recentToolRelevance: rounded(relevance(selected.toolId)),
        marginalEffectEstimate: rounded(marginal(selected)),
      });
      maxPurchaseGap = Math.max(maxPurchaseGap, time.active - lastPurchase);
      lastPurchase = time.active;
      addTime(
        'menus',
        assumptions.menuOpenSeconds +
          (selected.major
            ? assumptions.majorInspectionSeconds
            : assumptions.microInspectionSeconds),
      );
    }
  } else if (affordable.length) {
    const last = blockedOpportunities.at(-1);
    if (!last || last.block !== m.round + 1 || last.savingFor !== next?.id)
      blockedOpportunities.push({
        block: m.round + 1,
        time: rounded(clock),
        activeSeconds: rounded(time.active - tutorialActive),
        money: m.money,
        savingFor: next?.id,
        reason: next
          ? 'saving-for-visible-tool'
          : 'holding-funds-for-relevant-fittings',
        relevantCandidates: working.map((n) => n.id),
        affordable: affordable.map((n) => n.id),
      });
  }
}
function writeResults(status) {
  const campaignAwards = awards.filter((a) => !a.story),
    active = time.active - tutorialActive;
  let fingerprint = null;
  try {
    fingerprint = JSON.parse(
      readFileSync('qa-artifacts/major-sim-build/build-info.json', 'utf8'),
    );
  } catch {}
  const report = {
    policy,
    status,
    completed: m.phase === 'completed',
    stoppedAfterDelivery: through,
    source: fingerprint,
    wallSeconds: rounded((performance.now() - wallStart) / 1000),
    estimatedExperienceMinutes: rounded(clock / 60),
    campaignActiveMinutes: rounded(active / 60),
    tutorialMinutes: rounded(tutorialSeconds / 60),
    tutorialActiveMinutes: rounded(tutorialActive / 60),
    timeSeconds: Object.fromEntries(
      Object.entries(time).map(([k, v]) => [k, rounded(v)]),
    ),
    assumptions,
    targets: {
      campaignActiveMinutes: [45, 55],
      estimatedExperienceMinutes: [75, 95],
    },
    targetChecks: {
      active: active / 60 >= 45 && active / 60 <= 55,
      experience: clock / 60 >= 75 && clock / 60 <= 95,
    },
    financialIntegrity: campaignStartAccount
      ? {
          grossEqualsNetPlusFees:
            m.earned ===
            m.campaign.state.netEarned + m.campaign.state.commissionPaid,
          campaignGrossEqualsBasePlusBonus:
            m.earned - campaignStartAccount.gross ===
            campaignAwards.reduce((sum, a) => sum + a.base + a.bonus, 0),
          walletMatchesPriorFundsPlusNetLessPurchases:
            m.money ===
            campaignStartAccount.money +
              m.campaign.state.netEarned -
              campaignStartAccount.net -
              purchases
                .filter((p) => !p.tutorial)
                .reduce((sum, p) => sum + p.cost, 0),
          uniqueAwardIds:
            new Set(awards.map((a) => a.id)).size === awards.length,
          uniqueDeliveries:
            new Set(deliveries.map((d) => d.id)).size === deliveries.length,
          removalCountsBalance: phases.every(
            (p) => p.removalCountBalance === 0,
          ),
        }
      : null,
    authoredPhaseCount: BLOCKS.reduce((sum, b) => sum + b.phases, 0),
    campaignStartAccount,
    money: m.money,
    gross: m.earned,
    net: m.campaign.state.netEarned,
    commission: m.campaign.state.commissionPaid,
    basePayout: campaignAwards.reduce((s, a) => s + a.base, 0),
    conditionBonus: campaignAwards.reduce((s, a) => s + a.bonus, 0),
    valueWeightedBonusPercent: campaignAwards.some((a) => a.base > 0)
      ? rounded(
          (100 * campaignAwards.reduce((s, a) => s + a.bonus, 0)) /
            campaignAwards.reduce((s, a) => s + a.base, 0),
        )
      : null,
    meanItemBonusPercent: campaignAwards.some((a) => a.base > 0)
      ? rounded(
          campaignAwards
            .filter((a) => a.base > 0)
            .reduce((s, a) => s + (100 * a.bonus) / a.base, 0) /
            campaignAwards.filter((a) => a.base > 0).length,
        )
      : null,
    averageCondition: campaignAwards.length
      ? rounded(
          campaignAwards.reduce((s, a) => s + a.condition, 0) /
            campaignAwards.length,
        )
      : null,
    pristine: campaignAwards.filter((a) => a.grade === 'PRISTINE').length,
    nodes: nodeIds(),
    nodeCount: nodeIds().length,
    midgame: midgame ?? {
      seconds: rounded(clock),
      activeSeconds: rounded(active),
      block: m.round + 1,
      nodes: nodeIds(),
      tools: [...m.campaign.state.tools],
      reached45Minutes: false,
    },
    maxPurchaseGapActiveSeconds: rounded(
      Math.max(maxPurchaseGap, time.active - lastPurchase),
    ),
    maxNoAffordableOpportunitySeconds: maxBlocked,
    longestBlocked,
    deliveries,
    phases,
    toolReveals,
    toolBuys,
    toolUsageSeconds: Object.fromEntries(
      Object.entries(toolUsageSeconds).map(([k, v]) => [k, rounded(v)]),
    ),
    toolUsageByMinute,
    toolModeUsageSeconds: Object.fromEntries(
      Object.entries(toolModeUsageSeconds).map(([k, v]) => [k, rounded(v)]),
    ),
    toolModeUsageByMinute,
    aimStats,
    purchases,
    choices,
    blockedOpportunities,
    switches,
    calls,
    awards,
    events,
    meshBuilds,
    raycasts,
    current: {
      block: m.round + 1,
      phase: m.campaign.state.phase + 1,
      tool: m.toolId,
      solid: m.field.remaining(),
      embedded: m.loot
        .filter((t) => t.state === 'embedded')
        .map((t) => ({
          id: t.id,
          story: t.story,
          condition: t.condition,
          exposure: m.field.exposure(t),
        })),
      pending: m.campaign.state.pending,
      call: m.campaign.state.call,
      settlement: !!m.settlement,
    },
    failure,
  };
  mkdirSync('qa-artifacts', { recursive: true });
  writeFileSync(
    `qa-artifacts/major-${policy}.json`,
    JSON.stringify(report, null, 2),
  );
  return report;
}

try {
  while (m.inTutorial && clock < 900) {
    const t = m.tutorial,
      message = tutorialMessage(t);
    if (t.stage === 'board') {
      addTime('inspection', 4);
      m.stampTutorial();
      m.finishTutorialBoard();
    } else if (t.stage === 'chapter') {
      addTime('inspection', 2);
      m.finishTutorial();
    } else if (m.phoneRinging) {
      addTime('reading', assumptions.pickupSeconds);
      m.answerPhone();
    } else if (message && !message.waiting) {
      addTime('reading', readSeconds(message.text));
      m.advanceTutorial();
    } else if (t.step === 7) {
      addTime('menus', 2);
      m.tutorialMenu('skills');
    } else if (t.step === 8 && t.mode === 'task') {
      if (!m.buyContinuous()) throw Error('Tutorial purchase failed');
      purchases.push({
        kind: 'node',
        id: 'HC-S1',
        time: rounded(clock),
        activeSeconds: 0,
        block: 0,
        cost: 25,
        tutorial: true,
      });
    } else if (t.step === 10) {
      addTime('menus', 2);
      m.tutorialMenu(null);
    }
    const target = tutorialCanWork(m.tutorial) ? tutorialAim(m) : null;
    const hit = target ? rayAt(target, 0, true) : null;
    if (hit && !m.firing && m.strikeClock <= 0) m.press();
    tick(hit ? 'active' : 'other', hit);
  }
  if (m.inTutorial)
    throw Error('Tutorial did not finish within 15 modeled minutes');
  tutorialSeconds = clock;
  tutorialActive = time.active;
  campaignStart = clock;
  campaignStartAccount = ledger();
  lastPurchase = time.active;
  console.log(
    JSON.stringify({
      type: 'tutorial-complete',
      policy,
      seconds: rounded(tutorialSeconds),
      active: rounded(tutorialActive),
      money: m.money,
    }),
  );
  phaseStart();
  while (m.phase !== 'completed' && clock < maxSeconds) {
    const c = m.campaign;
    if (m.phase !== 'completing' && currentPhase?.field !== m.field) {
      phaseEnd();
      if (currentDelivery?.block !== m.round + 1) deliveryEnd();
      phaseStart();
    }
    if (m.settlement) {
      const id = c.block.id;
      if (!settledSeen.has(id)) {
        settledSeen.add(id);
        addTime('settlement', assumptions.receiptInspectionSeconds);
      }
      if (m.settlementTime > 0) {
        tick('settlement');
        continue;
      }
      phaseEnd();
      deliveryEnd();
      if (m.round + 1 >= through && through < 32) break;
      m.skipSettlement();
      if (m.phase !== 'completing') phaseStart();
      continue;
    }
    if (c.state.call || c.state.pending.length) {
      if (!c.state.call) c.deliver();
      const call = c.state.call;
      if (call) {
        if (m.phoneRinging) {
          addTime('reading', assumptions.pickupSeconds);
          m.answerPhone();
        }
        if (m.liveCall) {
          const event = STORY.find((e) => e.id === call.event),
            line = call.line,
            seconds = readSeconds(event.messages[line].text);
          addTime('reading', seconds);
          calls.push({
            event: event.id,
            line,
            seconds: rounded(seconds),
            time: rounded(clock),
            block: m.round + 1,
            phase: c.state.phase + 1,
          });
          if (!m.advanceCall())
            throw Error(`Call stalled at ${event.id}:${line}`);
          continue;
        }
      }
    }
    if (m.toolNotice) {
      const { tool, kind } = m.toolNotice;
      const event = {
        tool,
        kind,
        seconds: rounded(clock),
        activeSeconds: rounded(time.active - tutorialActive),
        block: m.round + 1,
        money: m.money,
      };
      events.push(event);
      if (kind === 'available') toolReveals[tool] = event;
      addTime('inspection', assumptions.notificationSeconds);
      m.dismissToolNotice();
      continue;
    }
    if (decision <= 0 && m.phase === 'playing') {
      decision = 1;
      buy();
      if (m.toolNotice) continue;
    }
    if (m.phase === 'playing') {
      if (refresh <= 0) {
        refresh = policy === 'inefficient' ? 0.5 : 0.3;
        aim = chooseAim();
        const mass = m.field.values.reduce((s, v) => s + v, 0);
        if (lastMass - mass > 0.005) {
          lastProgress = time.active;
          lastMass = mass;
        } else if (aim && time.active - lastProgress > 2) {
          rotate();
          lastProgress = time.active;
        }
      }
      if (toolDecision <= 0) {
        toolDecision = 1.25;
        chooseTool();
      }
      if (m.thermal && m.fuel <= 0.01) m.refill();
      if (aim && !m.firing) m.press();
      if (m.toolId === 'sledge' && m.hasNode('SH-T1') && m.firing) {
        charge += dt;
        if (charge >= 0.7) {
          m.release();
          charge = 0;
        }
      }
    }
    const active =
      m.phase === 'playing' &&
      !!aim &&
      m.loot.some((t) => t.state === 'embedded');
    tick(
      active
        ? 'active'
        : m.phase === 'transitioning'
          ? 'transition'
          : m.loot.some(
                (t) => t.state !== 'embedded' && t.state !== 'collected',
              )
            ? 'collection'
            : 'other',
      active ? aim : null,
    );
    if (clock - campaignStart > maxSeconds) break;
  }
  if (m.phase === 'completed') {
    phaseEnd();
    deliveryEnd();
  } else if (clock >= maxSeconds)
    failure = 'Simulation reached the 240-minute diagnostic cap';
} catch (error) {
  failure = error.stack ?? String(error);
}
const report = writeResults(
  failure ? 'failed' : m.phase === 'completed' ? 'completed' : 'partial',
);
console.log(
  JSON.stringify({
    type: 'summary',
    policy,
    status: report.status,
    activeMinutes: report.campaignActiveMinutes,
    experienceMinutes: report.estimatedExperienceMinutes,
    money: report.money,
    gross: report.gross,
    net: report.net,
    nodes: report.nodeCount,
    block: report.current.block,
    phase: report.current.phase,
    wallSeconds: report.wallSeconds,
    failure,
  }),
);
mesh.geometry.dispose();
mesh.material.dispose();
if (failure) process.exitCode = 1;
