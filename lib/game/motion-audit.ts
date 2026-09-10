import * as THREE from 'three';
import { GameModel } from './model';
import type { GameScene } from './scene';
import { TOOLS } from './campaign-content';
import { TUNE } from './tuning';
import { TOOL_TREES } from './tool-trees';
import { TREE_GROWTH, growthPlan } from './tree-presentation';

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
        // Use a fresh, quiet claim. A saved call or a target above a small
        // claim must not turn this into an empty-space motion measurement.
        m.restart();
        m.campaign!.state.pending = [];
        m.campaign!.state.tools = TOOLS.map((t) => t.id);
        m.selectTool(tool.id);
        m.settings.toggle = true;
        m.pause(false);
        s.syncField();
        s.delivery.set(0);
        s.contents.position.set(0, 0, 0);
        s.turntable.home();
        const scale = m.field.profile!.scale * TUNE.worldScale;
        const center = new THREE.Vector3();
        s.automation = () => {
          center
            .set(0, 2.2 * scale, 0.65 * 1.32 * scale)
            .applyMatrix4(s.ice.matrixWorld)
            .project(s.camera);
          s.pointer.set(center.x, center.y);
          s.hasPointer = true;
        };
        s.audio.init();
        await wait(300);
        const before = m.field.remaining(),
          values: number[] = [];
        m.press();
        await wait(tool.id === 'thermal' ? 1000 : 700, () =>
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
      back();
      await wait(350);
      m.restart();
      m.campaign!.state.pending = [];
      m.money = m.earned = 2000;
      m.campaign!.state.grossEarned = m.campaign!.state.netEarned = 2000;
      m.emit();
      key('u');
      await wait(500);
      document
        .querySelector<HTMLButtonElement>('.tool-page-tabs button')
        ?.click();
      await wait(220);
      const id = 'HC-S1';
      const node = document.querySelector<HTMLButtonElement>(
        `[data-skill="${id}"]`,
      );
      if (!node || node.hidden)
        throw new Error('Fresh Chisel upgrade node is unavailable');
      const changes = growthPlan('hand', id, m.nodes.hand);
      const cost = TOOL_TREES.hand.find((n) => n.id === id)!.cost;
      key('Tab');
      node.focus();
      await wait(220);
      const buy = document.querySelector<HTMLButtonElement>(
        '.node-tooltip .tree-buy',
      );
      if (!buy || buy.disabled)
        throw new Error(
          'Chisel inspection did not expose an enabled Buy control',
        );
      const moneyBefore = m.money;
      const effectiveReduced =
        !!node.closest('.reduced-motion') ||
        matchMedia('(prefers-reduced-motion: reduce)').matches;
      const animationNames = new Set<string>();
      const firstReveal = new Map<string, number>();
      let min = Infinity,
        max = -Infinity,
        sampled = false,
        fittingObserved = false,
        childRevealAnimated = false,
        nextFrontierAnimated = false;
      buy.focus();
      const purchaseStarted = performance.now();
      buy.click();
      await wait(TREE_GROWTH.settleAt + 180, () => {
        const edge = document.querySelector('.map-current.purchase-travel');
        if (edge) {
          const style = getComputedStyle(edge);
          const value = parseFloat(style.strokeDashoffset);
          if (Number.isFinite(value)) {
            sampled = true;
            min = Math.min(min, value);
            max = Math.max(max, value);
          }
          animationNames.add(style.animationName);
        }
        fittingObserved ||= node.classList.contains('fitting');
        nextFrontierAnimated ||= !!document.querySelector(
          '.map-current.path-revealed',
        );
        for (const change of changes) {
          const child = document.querySelector<HTMLElement>(
            `[data-skill="${change.id}"]`,
          );
          if (!child) continue;
          if (change.child && child.classList.contains('child-revealed'))
            childRevealAnimated = true;
          if (
            child.classList.contains(change.to) &&
            !firstReveal.has(change.id)
          )
            firstReveal.set(change.id, performance.now() - purchaseStarted);
        }
      });
      const reveals = changes.map((change) => ({
        ...change,
        firstObservedMs: firstReveal.get(change.id) ?? null,
        finalStateMatches: !!document.querySelector(
          `[data-skill="${change.id}"].${change.to}`,
        ),
      }));
      result.fittedNode = id;
      result.fitted = Number(m.nodes.hand.includes(id));
      result.moneySpent = m.money < moneyBefore;
      result.expectedCost = cost;
      result.exactCostPaid = moneyBefore - m.money === cost;
      result.effectiveReduced = effectiveReduced;
      result.connectionTravel = {
        expected: !effectiveReduced,
        sampled,
        min: sampled ? min : null,
        max: sampled ? max : null,
        varied: sampled && max - min > 0.05,
        animationNames: [...animationNames],
      };
      result.fittingObserved = fittingObserved;
      result.childRevealAnimated = childRevealAnimated;
      result.nextFrontierAnimated = nextFrontierAnimated;
      result.childAwakened = reveals
        .filter((r) => r.child)
        .every((r) => r.finalStateMatches);
      result.reveals = reveals;
      result.growthSettled = !document.querySelector(
        '.map-node.fitting,.map-node.child-revealed,.map-node.tease-revealed,.map-current.purchase-travel,.map-current.path-revealed',
      );
      result.motionMatchesPreference = effectiveReduced
        ? !sampled &&
          !fittingObserved &&
          !childRevealAnimated &&
          !nextFrontierAnimated
        : sampled &&
          max - min > 0.05 &&
          fittingObserved &&
          childRevealAnimated &&
          nextFrontierAnimated;
      back();
      await wait(350);
    } else throw new Error('Unknown motion scenario');
    result.performance = s.stats();
    return result;
  } finally {
    s.automation = undefined;
    s.cancelInput();
    m.restart();
    m.restore(saved);
    m.onSave();
    m.emit();
  }
}
