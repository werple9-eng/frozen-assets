import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync } from 'node:fs';
import * as THREE from 'three';
const require = createRequire(import.meta.url),
  { GameModel } = require('../.test-build/lib/game/model.js'),
  { surface } = require('../.test-build/lib/game/ice.js'),
  { TOOLS, STORY } = require('../.test-build/lib/game/campaign-content.js'),
  {
    ALL_TOOL_NODES,
    nodeState,
    canonicalTool,
  } = require('../.test-build/lib/game/tool-trees.js');
const {
  tutorialMessage,
  tutorialCanWork,
} = require('../.test-build/lib/game/tutorial.js');
const { tutorialAim } = require('../.test-build/lib/game/tutorial-qa.js');
const policy = process.argv[2] ?? 'mixed',
  m = new GameModel(undefined, { tutorial: true }),
  blocks = [],
  events = [],
  purchases = [],
  choiceSnapshots = [],
  toolUsageSeconds = {},
  revealDetails = {},
  toolReveals = {},
  toolBuys = {};
const ray = new THREE.Raycaster(),
  mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
let clock = 0,
  start = 0,
  oldBlock = 0,
  aim = null,
  refresh = 0,
  decision = 0,
  lastPurchase = 0,
  maxGap = 0,
  charge = 0,
  reading = 0,
  unreachable = 0,
  maxUnreachable = 0,
  longestUnreachable = null;
const direction = new THREE.Vector3(0, -0.45, -1).normalize();
// These are explicitly modeled reading and decision times, never gameplay timers.
// Every destruction action raycasts the generated surface and uses GameModel.update.
while (m.inTutorial && clock < 900) {
  const t = m.tutorial,
    message = tutorialMessage(t);
  if (t.stage === 'board') {
    clock += 4;
    m.stampTutorial();
    m.finishTutorialBoard();
  } else if (t.stage === 'chapter') {
    clock += 2;
    m.finishTutorial();
  } else if (m.phoneRinging) {
    clock += 1.5;
    m.answerPhone();
  } else if (message && !message.waiting) {
    const seconds = Math.max(1.2, message.text.length / 20);
    clock += seconds;
    reading += seconds;
    m.advanceTutorial();
  } else if (t.step === 7) {
    clock += 2;
    m.tutorialMenu('skills');
  } else if (t.step === 8 && t.mode === 'task') {
    if (!m.buyContinuous()) throw Error('Tutorial purchase failed');
    purchases.push({ kind: 'node', id: 'HC-S1', time: clock, cost: 25 });
    lastPurchase = clock;
  } else if (t.step === 10) {
    clock += 2;
    m.tutorialMenu(null);
  }
  const target = tutorialCanWork(m.tutorial) ? tutorialAim(m) : null;
  let hit = null;
  if (target) {
    const data = surface(m.field);
    mesh.geometry.dispose();
    mesh.geometry = new THREE.BufferGeometry();
    mesh.geometry.setAttribute(
      'position',
      new THREE.Float32BufferAttribute(data.positions, 3),
    );
    mesh.updateMatrixWorld();
    ray.set(
      new THREE.Vector3(target.x, 100, target.z),
      new THREE.Vector3(0, -1, 0),
    );
    hit = ray.intersectObject(mesh)[0]?.point ?? null;
  }
  if (hit && !m.firing && m.strikeClock <= 0) m.press();
  m.update(0.05, hit);
  clock += 0.05;
}
if (m.inTutorial) throw Error('Tutorial simulation did not finish');
const tutorialSeconds = clock;
start = clock;
while (m.phase !== 'completed' && clock < 150 * 60) {
  const c = m.campaign;
  if (m.settlement) { if (m.settlementTime > 0) { m.update(.05,null); clock += .05; } else m.skipSettlement(); continue; }
  if (m.round !== oldBlock) {
    blocks.push({
      block: oldBlock + 1,
      seconds: Math.round(clock - start),
      tool: m.toolId,
      money: m.money,
      net: c.state.netEarned,
      nodes: Object.values(m.nodes).flat().length,
    });
    console.log(JSON.stringify({ policy, ...blocks.at(-1) }));
    oldBlock = m.round;
    start = clock;
    aim = null;
    refresh = 0;
  }
  if (c.state.call || c.state.pending.length) {
    if (!c.state.call) c.deliver();
    const call = c.state.call;
    if (call) {
      m.answerPhone();
      const event = STORY.find((e) => e.id === call.event),
        seconds =
          Math.max(1.2, event.messages[call.line].text.length / 20) + 0.4;
      clock += seconds;
      reading += seconds;
      m.advanceCall();
      continue;
    }
  }
  if (m.toolNotice) {
    const { tool, kind } = m.toolNotice;
    events.push({ tool, kind, seconds: Math.round(clock), money: m.money });
    if (kind === 'available') {
      toolReveals[tool] = clock;
      revealDetails[tool] = {
        seconds: Math.round(clock),
        money: m.money,
        block: m.round + 1,
      };
    }
    clock += 3;
    m.dismissToolNotice();
  }
  if (decision <= 0) {
    decision = 1;
    const next = TOOLS.find(
      (t) =>
        t.id !== 'grip' &&
        !c.state.tools.includes(t.id) &&
        m.revealedTools.includes(t.id),
    );
    if (next && m.money >= next.cost) {
      const before = m.money;
      if (m.buyTool(next.id)) {
        // Acquiring useful equipment ends a dead interval even when spending
        // leaves too little cash for its first fitting on the same decision.
        unreachable = 0;
        toolBuys[next.id] = {
          seconds: Math.round(clock),
          available: Math.round(toolReveals[next.id] ?? clock),
          saving: Math.round(clock - (toolReveals[next.id] ?? clock)),
          before,
          after: m.money,
          block: m.round + 1,
          blocksSaving:
            m.round + 1 - (revealDetails[next.id]?.block ?? m.round + 1),
          moneyAtReveal: revealDetails[next.id]?.money,
          nodes: Object.values(m.nodes).flat().length,
        };
        purchases.push({
          kind: 'tool',
          id: next.id,
          time: clock,
          cost: next.cost,
        });
        maxGap = Math.max(maxGap, clock - lastPurchase);
        lastPurchase = clock;
        clock += 2;
      }
    }
    const reachable = ALL_TOOL_NODES.filter(
      (n) =>
        c.state.tools.some((t) => canonicalTool(t) === n.toolId) &&
        nodeState(n, m.nodes[n.toolId]) === 'available',
    );
    if (
      reachable.some((n) => n.cost <= m.money) ||
      (next && next.cost <= m.money)
    )
      unreachable = 0;
    else {
      unreachable += decision;
      if (unreachable > maxUnreachable) {
        maxUnreachable = unreachable;
        longestUnreachable = {
          block: m.round + 1,
          tool: m.toolId,
          seconds: Math.round(clock),
          money: m.money,
          cheapestNode: Math.min(...reachable.map((n) => n.cost)),
        };
      }
    }
    const preferred = {
      'power-first': 'power',
      'speed-first': 'speed',
      'control-first': 'control',
      'technique-first': 'technique',
    }[policy];
    const sortValue = (n) => {
      if (n.id === 'HC-S1') return -1e8;
      if (policy === 'cheapest-first') return n.cost;
      const active = n.toolId === canonicalTool(m.toolId);
      const branch = preferred ? (n.branch === preferred ? 0.35 : 1) : 1;
      return n.cost * branch * (active ? 0.65 : 1.4) * (n.major ? 0.92 : 1);
    };
    reachable.sort((a, b) => sortValue(a) - sortValue(b));
    if (
      [0, 4, 9, 16, 23, 27, 31].includes(m.round) &&
      !choiceSnapshots.some((s) => s.block === m.round + 1)
    ) {
      choiceSnapshots.push({
        block: m.round + 1,
        seconds: Math.round(clock),
        money: m.money,
        tool: m.toolId,
        affordable: reachable
          .filter((n) => n.cost <= m.money)
          .map((n) => ({
            id: n.id,
            name: n.name,
            branch: n.branch,
            cost: n.cost,
          })),
        savingFor: next?.id,
      });
    }
    // Branch-first players save for a preferred fitting, instead of silently
    // becoming cheapest-first whenever that fitting costs more than their wallet.
    // Normal players fit equipment they still use. The explicit cheapest-first
    // collector remains free to buy every inexpensive retired-tool node.
    const working = reachable.filter(n => policy === 'cheapest-first' || n.toolId === canonicalTool(m.toolId) || n.toolId === canonicalTool(c.state.tools.at(-1)));
    const available = preferred
      ? working.slice(0, 1).filter((n) => n.cost <= m.money)
      : working.filter((n) => n.cost <= m.money);
    const pick = available.find((n) => {
      const reserve = next ? next.cost : 0;
      if (policy === 'saver' || policy === 'inefficient')
        return m.money - n.cost >= reserve;
      const fittedWhileSaving = purchases.filter(
        (p) => p.kind === 'node' && p.goal === next?.id,
      ).length;
      if (policy === 'upgrader' || policy === 'cheapest-first')
        return !next || (fittedWhileSaving < 2 && n.cost < reserve * 0.5);
      return (
        !next ||
        (fittedWhileSaving < 1 &&
          n.cost <= reserve * 0.5 &&
          m.money - n.cost >= reserve * 0.2)
      );
    });
    if (pick && m.purchaseNode(pick.id, clock * 1000)) {
      purchases.push({
        kind: 'node',
        id: pick.id,
        time: clock,
        cost: pick.cost,
        goal: next?.id,
      });
      maxGap = Math.max(maxGap, clock - lastPurchase);
      lastPurchase = clock;
      clock += 1.2;
    }
  }
  if (m.toolNotice) continue;
  const shape = m.field.profile?.shape;
  const latest = c.state.tools.filter((t) => t !== 'grip').at(-1);
  const preferred =
    shape === 'wings' && c.state.tools.includes('sledge')
      ? 'sledge'
      : shape === 'seam' && c.state.tools.includes('heavy')
        ? 'heavy'
        : shape === 'archive' && c.state.tools.includes('breaker')
          ? 'breaker'
          : latest;
  if (policy !== 'inefficient' && preferred !== m.toolId)
    m.selectTool(preferred);
  const heatMode = shape === 'slab' ? 'wide' : 'precision';
  if (m.thermal && m.hasFan && m.mode !== heatMode) m.selectMode(heatMode);
  const bit = shape === 'slab' && m.hasNode('PB-C4') ? 'wide' : 'precision';
  if (m.toolId === 'breaker' && m.hasNode('PB-C3') && m.breakerBit !== bit)
    m.selectBreakerBit(bit);
  if (m.thermal && m.fuel <= 0.01) m.refill();
  if (refresh <= 0 && m.phase === 'playing') {
    refresh = policy === 'inefficient' ? 0.45 : 0.3;
    const t = m.loot.find((t) => t.state === 'embedded' && t.story !== 'ring');
    if (t) {
      let best = null,
        score = -Infinity;
      for (let i = 0; i < m.field.values.length; i++) {
        if (m.field.values[i] <= 0.5) continue;
        const p = m.field.points[i],
          support =
            p.y < t.y + t.h * 0.5 &&
            Math.abs(p.x - t.x) < t.w * 0.6 + 0.3 &&
            Math.abs(p.z - t.z) < t.d * 0.6 + 0.3;
        const value = support
          ? 100 + p.y
          : p.y - Math.hypot(p.x - t.x, p.y - t.y, p.z - t.z) * 3;
        if (value > score) {
          best = p;
          score = value;
        }
      }
      if (best) {
        const data = surface(m.field);
        mesh.geometry.dispose();
        mesh.geometry = new THREE.BufferGeometry();
        mesh.geometry.setAttribute(
          'position',
          new THREE.Float32BufferAttribute(data.positions, 3),
        );
        mesh.updateMatrixWorld();
        const target = new THREE.Vector3(best.x, best.y, best.z);
        ray.set(target.clone().addScaledVector(direction, -100), direction);
        aim = ray.intersectObject(mesh)[0]?.point ?? null;
      }
    } else aim = null;
  }
  if (!m.firing && aim) m.press();
  if (m.toolId === 'sledge' && m.hasNode('SH-T1')) {
    charge += 0.05;
    if (charge >= 0.7) {
      m.release();
      charge = 0;
    }
  }
  toolUsageSeconds[m.toolId] = (toolUsageSeconds[m.toolId] ?? 0) + 0.05;
  m.update(0.05, aim);
  clock += 0.05;
  refresh -= 0.05;
  decision -= 0.05;
}
blocks.push({
  block: oldBlock + 1,
  seconds: Math.round(clock - start),
  tool: m.toolId,
  money: m.money,
});
const result = {
  policy,
  completed: m.phase === 'completed',
  minutes: +(clock / 60).toFixed(2),
  tutorialMinutes: +(tutorialSeconds / 60).toFixed(2),
  readingMinutes: +(reading / 60).toFixed(2),
  nodes: Object.values(m.nodes).flat().length,
  money: m.money,
  gross: m.earned,
  net: m.campaign.state.netEarned,
  maxPurchaseGap: Math.round(maxGap),
  maxUnreachableSeconds: Math.round(maxUnreachable),
  longestUnreachable,
  toolReveals,
  toolBuys,
  blocks,
  events,
  purchases,
  revealDetails,
  choiceSnapshots,
  toolUsageSeconds: Object.fromEntries(
    Object.entries(toolUsageSeconds).map(([k, v]) => [k, Math.round(v)]),
  ),
  purchasedBranches: Object.fromEntries(
    ['power', 'speed', 'control', 'technique'].map((branch) => [
      branch,
      ALL_TOOL_NODES.filter(
        (n) => n.branch === branch && m.nodes[n.toolId].includes(n.id),
      ).length,
    ]),
  ),
  averageUpgradeIntervalSeconds: (() => {
    const times = purchases.filter((p) => p.kind === 'node').map((p) => p.time);
    return Math.round(
      (times.at(-1) - times[0]) / Math.max(1, times.length - 1),
    );
  })(),
};
mkdirSync('qa-artifacts', { recursive: true });
writeFileSync(
  `qa-artifacts/upgrades-${policy}.json`,
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    ...result,
    blocks: undefined,
    events: undefined,
    purchases: undefined,
  }),
);
