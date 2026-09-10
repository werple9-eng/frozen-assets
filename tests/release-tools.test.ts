import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { GameModel } from '../lib/game/model';
import { campaignField, campaignLoot } from '../lib/game/campaign-layout';
import { STORY } from '../lib/game/campaign-content';
import { TOOL_ORDER, TOOL_TREES } from '../lib/game/tool-trees';
import { releaseCorpus } from '../lib/game/release-qa';

void test('all six tools remove final physical contact in every campaign phase, base and fully upgraded', () => {
  let cases = 0, frameChecks = 0;
  const failures: string[] = [];
  const started = performance.now();
  for (const { block, phase } of releaseCorpus().filter(p => p.block < 32))
    for (const tool of TOOL_ORDER)
      for (const grown of [false, true])
        for (const mode of tool === 'thermal' ? ['precision', 'wide'] as const : ['precision'] as const) {
          const m = new GameModel();
          m.campaign!.state.block = m.round = block;
          m.campaign!.state.phase = phase;
          m.campaign!.state.flags = STORY.filter(e => !e.retired).map(e => e.id);
          m.campaign!.state.pending = [];
          m.campaign!.state.tools = [...TOOL_ORDER];
          m.campaign!.state.selected = tool;
          m.revealedTools = [...TOOL_ORDER];
          m.toolNotices = TOOL_ORDER.flatMap(id => [`available:${id}`, `ready:${id}`]);
          if (grown) m.nodes[tool] = TOOL_TREES[tool].map(n => n.id);
          m.mode = mode;
          m.fuel = m.capacity;
          m.field = campaignField(block, phase, undefined, 3);
          const item = campaignLoot(block, phase, 3)[0];
          m.loot = [item];
          m.field.carveLoot(m.loot);
          // A real, grounded ice pillar touching this authored item. This
          // isolates the final-contact bug without pretending to play a parcel.
          const pillar: number[] = [];
          m.field.values.fill(0);
          m.field.points.forEach((p, i) => {
            const g = m.field.grid, c = m.field.coordinates(i);
            if (c.y > 0 && c.y < g.ny - 1 &&
                Math.hypot(p.x - item.x, p.z - item.z) < g.cellSize * 1.45 &&
                p.y <= item.y + item.h / 2 + g.cellSize) {
              m.field.values[i] = 1;
              pillar.push(i);
            }
          });
          m.field.revision++;
          m.field.markAllDirty();
          const label = `${item.id}:${tool}:${grown ? 'grown' : 'base'}:${mode}`;
          assert.equal(m.field.canRelease(item), false, `${label}: real initial contact`);
          const dt = cases % 2 ? 1 / 60 : 0.05;
          for (let frame = 0; frame < 1800 && item.state === 'embedded'; frame++) {
            let top = -1;
            for (const i of pillar)
              if (m.field.values[i] > 0.5 && (top < 0 || m.field.points[i].y > m.field.points[top].y)) top = i;
            const p = top >= 0 ? m.field.points[top] : null;
            const hit = p ? { ...p, y: p.y + m.field.grid.cellSize * 0.4 } : null;
            if (m.fuel <= 0 && m.phase !== 'refilling') m.refill();
            if (!m.firing && m.phase === 'playing') m.press();
            m.update(dt, hit);
            if (tool === 'sledge' && grown && m.chargeTime >= 0.65) m.release();
            frameChecks++;
            if (item.state === 'embedded' && m.field.canRelease(item)) {
              failures.push(`${label}: clear but still embedded at frame ${frame}`);
              break;
            }
          }
          if (!item.credited) failures.push(`${label}: no collection after 1800 frames`);
          if (m.strikeSerial === 0 && !m.thermal) failures.push(`${label}: no real tool strike`);
          m.stop();
          cases++;
        }
  mkdirSync('qa-artifacts', { recursive: true });
  writeFileSync('qa-artifacts/release-tool-stress.json', JSON.stringify({ passed: !failures.length,
    cases, frameChecks, seconds: (performance.now() - started) / 1000, failures }, null, 2));
  assert.deepEqual(failures, []);
});
