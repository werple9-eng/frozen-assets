import { createRequire } from 'node:module';
import { writeFileSync } from 'node:fs';
import * as THREE from 'three';
const require = createRequire(import.meta.url);
const { GameModel } = require('../.test-build/lib/game/model.js');
const { surface } = require('../.test-build/lib/game/ice.js');
const { TOOLS } = require('../.test-build/lib/game/campaign-content.js');
const toolkit = process.argv.includes('--toolkit');
const m = new GameModel(),
  runs = [],
  unlocks = [];
const knownTools = new Set(['hand']);
let oldBlock = 0,
  start = 0,
  aim = null,
  refresh = 0,
  clock = 0;
const ray = new THREE.Raycaster(),
  mesh = new THREE.Mesh(
    new THREE.BufferGeometry(),
    new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }),
  );
const direction = new THREE.Vector3(0, -0.55, -1).normalize();
while (m.phase !== 'completed' && clock < 180 * 60) {
  const c = m.campaign;
  if (m.round !== oldBlock) {
    runs.push({
      block: oldBlock + 1,
      seconds: Math.round(clock - start),
      tool: c.state.selected,
      money: m.money,
    });
    console.log(JSON.stringify(runs.at(-1)));
    oldBlock = m.round;
    start = clock;
    aim = null;
    refresh = 0;
  }
  const next = TOOLS.find(
    (t) => !c.state.tools.includes(t.id) && t.block <= c.state.block,
  );
  if (next) m.buyTool(next.id);
  for (const id of c.state.tools)
    if (!knownTools.has(id)) {
      knownTools.add(id);
      unlocks.push({ id, seconds: Math.round(clock), block: m.round + 1 });
    }
  if (toolkit) {
    const shape = m.field.profile?.shape;
    const preferred =
      shape === 'wings'
        ? 'sledge'
        : shape === 'archive'
          ? 'breaker'
          : shape === 'seam'
            ? 'heavy'
            : c.state.tools.at(-1);
    if (c.state.tools.includes(preferred) && m.toolId !== preferred)
      m.selectTool(preferred);
    if (m.thermal && m.upgrades.wide) m.selectMode('wide');
  }
  for (const key of ['heat', 'tank', 'wide', 'residual']) {
    const cost = m.price(key);
    if (cost !== null && m.money >= cost + (next?.cost ?? 0))
      m.purchase(key, clock * 1000);
  }
  if (m.thermal && m.fuel <= 0.01) m.refill();
  if (refresh <= 0 && m.phase === 'playing') {
    refresh = 0.3;
    const t = m.loot.find((t) => t.state === 'embedded' && t.story !== 'ring');
    if (t) {
      // Aim beneath the next reward, then intersect the actual rendered surface.
      // Never call melt at an interior cell or bypass release restraints.
      let best = null,
        score = -Infinity;
      for (let i = 0; i < m.field.values.length; i++) {
        if (m.field.values[i] <= 0.5) continue;
        const p = m.field.points[i];
        const support =
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
  m.update(0.05, aim);
  clock += 0.05;
  refresh -= 0.05;
}
runs.push({
  block: oldBlock + 1,
  seconds: Math.round(clock - start),
  tool: m.toolId,
  money: m.money,
});
const result = {
  completed: m.phase === 'completed',
  policy: toolkit ? 'matched tools and fan' : 'newest tool, precision',
  seconds: Math.round(clock),
  gross: m.earned,
  net: m.campaign.state.netEarned,
  runs,
  unlocks,
};
writeFileSync(
  `qa-artifacts/campaign-simulation${toolkit ? '-toolkit' : ''}.json`,
  JSON.stringify(result, null, 2),
);
console.log(
  JSON.stringify({
    completed: result.completed,
    minutes: clock / 60,
    gross: m.earned,
  }),
);
