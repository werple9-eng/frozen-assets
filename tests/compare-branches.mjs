import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
const require = createRequire(import.meta.url);
const { GameModel } = require('../.test-build/lib/game/model.js'),
  { surface } = require('../.test-build/lib/game/ice.js'),
  {
    campaignField,
    campaignLoot,
  } = require('../.test-build/lib/game/campaign-layout.js'),
  { TOOLS } = require('../.test-build/lib/game/campaign-content.js'),
  {
    TOOL_TREES,
    TOOL_ORDER,
    NODE_BUDGET,
    MECHANIC_NODE,
  } = require('../.test-build/lib/game/tool-trees.js');
const branches = ['power', 'speed', 'control', 'technique'],
  policies = ['power', 'speed', 'control', 'technique'],
  results = [];
for (const tool of TOOL_ORDER) {
  const paths = branches.map((b) =>
      TOOL_TREES[tool].filter((n) => n.branch === b),
    ),
    combinations = [];
  function choose(i, nodes) {
    if (i === 4) {
      combinations.push({ nodes, cost: nodes.reduce((s, n) => s + n.cost, 0) });
      return;
    }
    for (let k = 0; k <= paths[i].length; k++)
      choose(i + 1, [...nodes, ...paths[i].slice(0, k)]);
  }
  choose(0, []);
  const budget = NODE_BUDGET[tool] * 3;
  const costs = [...new Set(combinations.map((c) => c.cost))]
    .filter((c) => c <= budget && c > budget * 0.6)
    .sort((a, b) => b - a);
  const score = (c, policy) =>
    c.nodes.reduce(
      (s, n) => s + (n.branch === policy ? 10 : 1) + n.rank * 0.02,
      0,
    );
  let choices, spent;
  for (const cost of costs) {
    const matches = combinations.filter((c) => c.cost === cost),
      picks = [];
    // Equal-price ties can otherwise choose the same loadout for two priorities.
    // Keep each policy's maximum preferred-branch investment; use distinct ties.
    for (const p of policies) {
      const ranked = [...matches].sort((a, b) => score(b, p) - score(a, p));
      const maxPreferred = Math.max(
        ...ranked.map((c) => c.nodes.filter((n) => n.branch === p).length),
      );
      const choice = ranked.find(
        (c) =>
          c.nodes.filter((n) => n.branch === p).length === maxPreferred &&
          !picks.some(
            (q) =>
              q.nodes.map((n) => n.id).join() ===
              c.nodes.map((n) => n.id).join(),
          ),
      );
      if (choice) picks.push(choice);
    }
    if (
      new Set(picks.map((c) => c.nodes.map((n) => n.id).join())).size ===
      policies.length
    ) {
      choices = picks;
      spent = cost;
      break;
    }
  }
  if (!choices)
    throw Error(`No distinct equal-cost branch choices for ${tool}`);
  const block = Math.min(30, TOOLS.find((t) => t.id === tool).block + 2);
  for (let pi = 0; pi < policies.length; pi++)
    for (const phase of [0, 1]) {
      const m = new GameModel(),
        c = m.campaign;
      m.round = c.state.block = block;
      c.state.phase = phase;
      c.state.pending = [];
      c.state.tools = [...new Set(['hand', tool])];
      c.state.selected = tool;
      m.field = campaignField(block, phase);
      m.loot = campaignLoot(block, phase);
      m.field.carveLoot(m.loot);
      m.nodes[tool] = choices[pi].nodes.map((n) => n.id);
      if (tool === 'breaker' && m.hasNode(MECHANIC_NODE.precisionBit))
        m.selectBreakerBit('precision');
      m.fuel = m.capacity;
      const ray = new THREE.Raycaster(),
        mesh = new THREE.Mesh(
          new THREE.BufferGeometry(),
          new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
        ),
        direction = new THREE.Vector3(0, -0.45, -1).normalize();
      let time = 0,
        refresh = 0,
        aim = null,
        charge = 0;
      while (
        time < 900 &&
        m.loot.some((t) => t.state === 'embedded' && t.story !== 'ring')
      ) {
        c.state.pending = [];
        c.state.call = undefined;
        if (m.thermal && m.fuel < 0.01) m.refill();
        const heatMode =
          m.field.profile.shape === 'slab' ? 'wide' : 'precision';
        if (m.thermal && m.hasFan && m.mode !== heatMode)
          m.selectMode(heatMode);
        if (refresh <= 0) {
          refresh = 0.3;
          const t = m.loot.find(
            (t) => t.state === 'embedded' && t.story !== 'ring',
          );
          let best = null,
            score = -Infinity;
          for (let i = 0; i < m.field.values.length; i++) {
            if (m.field.values[i] <= 0.5) continue;
            const p = m.field.points[i],
              support =
                p.y < t.y + t.h * 0.5 &&
                Math.abs(p.x - t.x) < t.w * 0.6 + 0.3 &&
                Math.abs(p.z - t.z) < t.d * 0.6 + 0.3,
              value = support
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
        }
        if (!m.firing && aim) m.press();
        if (tool === 'sledge' && m.hasNode('SH-T1')) {
          charge += 0.05;
          if (charge >= 0.7) {
            m.release();
            charge = 0;
          }
        }
        m.update(0.05, aim);
        time += 0.05;
        refresh -= 0.05;
      }
      mesh.geometry.dispose();
      mesh.material.dispose();
      results.push({
        tool,
        policy: policies[pi],
        spent,
        nodes: m.nodes[tool],
        block: block + 1,
        phase,
        seconds: +time.toFixed(2),
        completed: time < 900,
      });
    }
  console.log(`Compared ${tool} at exactly $${spent} per branch strategy`);
}
const totals = policies.map((policy) => ({
  policy,
  seconds: results
    .filter((r) => r.policy === policy)
    .reduce((s, r) => s + r.seconds, 0),
  spent: results
    .filter((r) => r.policy === policy)
    .reduce((s, r) => s + r.spent, 0),
}));
writeFileSync(
  'qa-artifacts/branch-comparison.json',
  JSON.stringify({ results, totals }, null, 2),
);
console.log(JSON.stringify(totals));
