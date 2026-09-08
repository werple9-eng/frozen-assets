import * as THREE from 'three';
import { GameModel } from './model';
import type { GameScene } from './scene';
import { TOOLS } from './campaign-content';

// Registered only on the isolated localhost ?qa=1 bench. Uses the same DOM
// handlers, running render loop and model physics as the player controls.
export async function motionAudit(
  s: GameScene,
  scenario: string,
  reduced?: boolean,
) {
  if (
    !['localhost', '127.0.0.1'].includes(location.hostname) ||
    new URLSearchParams(location.search).get('qa') !== '1'
  )
    throw new Error('Practice bench required');
  const m = s.model as GameModel,
    saved = m.serialize();
  const result: Record<string, unknown> = { scenario, reduced };
  if (reduced !== undefined) m.setSetting('reducedMotion', reduced);
  s.automation = undefined;
  s.cancelInput();
  m.pause(false);
  m.emit();
  const wait = (duration: number, inspect?: () => void) =>
    new Promise<void>((resolve) => {
      const start = performance.now();
      let frame = 0,
        done = false;
      const finish = () => {
        if (done) return;
        done = true;
        cancelAnimationFrame(frame);
        resolve();
      };
      const timer = setTimeout(finish, duration + 40);
      const sample = () => {
        if (done) return;
        inspect?.();
        if (performance.now() - start >= duration) {
          clearTimeout(timer);
          finish();
        } else frame = requestAnimationFrame(sample);
      };
      frame = requestAnimationFrame(sample);
    });
  const key = (key: string) =>
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
  const back = () => {
    const screens = Array.from(
      document.querySelectorAll<HTMLElement>(
        '[role="dialog"]:not([data-ending-style])',
      ),
    );
    screens.at(-1)?.querySelector<HTMLButtonElement>('.bench-return')?.click();
  };
  try {
    await wait(300);
    if (scenario === 'ui') {
      let maxInteractive = 0;
      for (let i = 0; i < (reduced ? 6 : 14); i++) {
        key('f');
        await wait(32);
        maxInteractive = Math.max(
          maxInteractive,
          document.querySelectorAll('[role="dialog"]:not([data-ending-style])')
            .length,
        );
        back();
        await wait(28);
        key('u');
        await wait(32);
        back();
        await wait(32);
        key('o');
        await wait(32);
        back();
        await wait(24);
      }
      await wait(1000);
      result.dialogsRemaining =
        document.querySelectorAll('[role="dialog"]').length;
      result.maxInteractiveDialogs = maxInteractive;
      result.playing = m.phase === 'playing';
      result.firing = m.firing;
      result.finiteTransforms = Array.from(
        document.querySelectorAll<HTMLElement>('.tactile-face'),
      ).every((el) => !/NaN|Infinity/.test(el.style.transform));
      result.liveGlyphs = document.querySelectorAll('.spoken-glyph').length;
    } else if (scenario === 'phone') {
      m.restart();
      m.campaign?.trigger('GAME_START');
      m.campaign?.deliver();
      s.onOpenPhone();
      m.emit();
      let glyphs = 0,
        visible = false;
      await wait(1800, () => {
        glyphs = Math.max(
          glyphs,
          document.querySelectorAll('.tony-panel .spoken-glyph').length,
        );
        visible ||= !!document.querySelector('.tony-panel');
      });
      result.notificationVisible = visible;
      result.animatedGlyphs = glyphs;
      result.phoneOrigin = {
        x: document.documentElement.style.getPropertyValue('--phone-x'),
        y: document.documentElement.style.getPropertyValue('--phone-y'),
      };
      result.text = document.querySelector('.tony-panel')?.textContent;
    } else if (scenario === 'delivery') {
      s.deliver();
      let highest = 0,
        lowestScale = 1,
        error = 0;
      const sample = new THREE.Vector3(1.2, 2, 0.3),
        world = new THREE.Vector3();
      await wait(1500, () => {
        highest = Math.max(highest, s.contents.position.y);
        lowestScale = Math.min(lowestScale, s.contents.scale.y);
        world.copy(sample);
        s.contents.localToWorld(world);
        s.contents.worldToLocal(world);
        error = Math.max(error, sample.distanceTo(world));
      });
      result.highest = highest;
      result.squash = lowestScale;
      result.settled = Math.abs(s.delivery.value) < 0.002;
      result.targetRoundTripError = error;
      result.pooledParticles = s.particlePool.length;
    } else if (scenario === 'tools') {
      const poses: Record<string, unknown> = {};
      for (const tool of TOOLS) {
        m.restore(saved);
        m.campaign!.state.tools = TOOLS.map((t) => t.id);
        m.selectTool(tool.id);
        m.settings.toggle = true;
        m.pause(false);
        s.syncField();
        s.delivery.set(0);
        s.contents.position.set(0, 0, 0);
        s.turntable.home();
        s.hasPointer = true;
        const center = s.contents
          .localToWorld(new THREE.Vector3(0, 2.2, 0))
          .project(s.camera);
        s.pointer.set(center.x, center.y);
        s.audio.init();
        await wait(80);
        const before = m.field.remaining(),
          values: number[] = [];
        m.press();
        await wait(tool.id === 'thermal' ? 650 : 450, () =>
          values.push(s.workshop.hand.rotation.x),
        );
        m.stop();
        await wait(220);
        poses[tool.id] = {
          removed: before - m.field.remaining(),
          range: Math.max(...values) - Math.min(...values),
          stopped: !m.firing,
          flameTail: s.flameFlow.value,
        };
      }
      result.tools = poses;
    } else if (scenario === 'rewards') {
      m.restart();
      m.loot = Array.from({ length: 3 }, (_, i) => ({
        ...m.loot[0],
        id: `motion-${i}`,
        kind: (['coin', 'cash', 'gold'] as const)[i],
        value: [35, 120, 800][i],
        x: (i - 1) * 2.5,
        y: 3 + i * 0.6,
        z: 1,
        credited: false,
        state: 'embedded' as const,
      }));
      s.oldField = undefined;
      s.syncField();
      s.delivery.set(0);
      m.field.values.fill(0);
      m.field.dirty = true;
      const states = new Set<string>();
      let peakParticles = 0,
        popups = 0;
      await wait(1350, () => {
        m.loot.forEach((t) => states.add(t.state));
        peakParticles = Math.max(peakParticles, s.particles.length);
        popups = Math.max(
          popups,
          document.querySelectorAll('.reward-impact').length,
        );
      });
      result.states = [...states];
      result.impactPopups = popups;
      result.peakParticles = peakParticles;
      result.creditedOnce = m.recovered === 3;
    } else if (scenario === 'purchase') {
      m.restart();
      m.money = m.earned = 2000;
      m.campaign!.state.grossEarned = m.campaign!.state.netEarned = 2000;
      key('u');
      await wait(800);
      document
        .querySelector<HTMLButtonElement>('[data-skill="heat-1"]')
        ?.click();
      let min = 1,
        max = 0,
        sampled = false;
      await wait(1100, () => {
        const edge = document.querySelector('.map-current.waking');
        if (!edge) return;
        const value = parseFloat(getComputedStyle(edge).strokeDashoffset);
        sampled = true;
        min = Math.min(min, value);
        max = Math.max(max, value);
      });
      result.fitted = m.upgrades.heat;
      result.moneySpent = m.money < 2000;
      result.connectionTravel = { sampled, min, max };
      result.childAwakened = !!document.querySelector('.map-node.awakened');
      back();
      await wait(350);
    } else throw new Error('Unknown motion scenario');
    result.performance = s.stats();
    return result;
  } finally {
    s.cancelInput();
    m.restart();
    m.restore(saved);
    m.onSave();
    m.emit();
  }
}
