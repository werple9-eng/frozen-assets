import { TUNE } from './tuning';
import type { GameScene } from './scene';
import { GameModel, type Upgrade } from './model';
import { LEGACY_LEVELS } from './progression';
export function registerGameTools(s: GameScene, read: () => unknown) {
  const registry = (
    document as Document & {
      modelContext?: {
        registerTool: (
          definition: object,
          options: { signal: AbortSignal },
        ) => unknown;
      };
    }
  ).modelContext;
  if (!registry?.registerTool) return () => {};
  const life = new AbortController();
  const add = <T extends object = Record<string, never>>(
    name: string,
    description: string,
    inputSchema: object,
    execute: (input: T) => unknown,
    readOnlyHint = false,
  ) => {
    try {
      Promise.resolve(
        registry.registerTool(
          {
            name,
            description,
            inputSchema,
            execute,
            annotations: { readOnlyHint, untrustedContentHint: false },
          },
          { signal: life.signal },
        ),
      ).catch(() => {});
    } catch {}
  };
  const empty = { type: 'object', properties: {}, additionalProperties: false };
  add(
    'recovery_status',
    'Read game state, current recoveries, and frame timing.',
    empty,
    () => ({
      state: read(),
      performance: s.stats(),
      audio: {
        state: s.audio.ctx?.state,
        active: s.audio.active,
        voices: s.audio.voices,
        gain: s.audio.master?.gain.value,
        uiPlayed: s.audio.uiPlayed,
        uiSuppressed: s.audio.uiSuppressed,
      },
      autoplay: !!s.automation,
      aim: { x: s.aim.x, y: s.aim.y, z: s.aim.z },
      loot: s.model.loot.map((t) => {
        const p = s.lootMeshes
            .get(t.id)
            ?.getWorldPosition(s.scratch)
            .clone()
            .project(s.camera),
          r = s.host.getBoundingClientRect();
        return {
          id: t.id,
          kind: t.kind,
          state: t.state,
          credited: t.credited,
          screen: p
            ? {
                x: r.left + ((p.x + 1) * r.width) / 2,
                y: r.top + ((1 - p.y) * r.height) / 2,
              }
            : null,
        };
      }),
    }),
    true,
  );
  add(
    'select_nozzle',
    'Select an owned nozzle. Precision concentrates heat; fan covers a broader area.',
    {
      type: 'object',
      properties: { mode: { type: 'string', enum: ['precision', 'wide'] } },
      required: ['mode'],
      additionalProperties: false,
    },
    ({ mode }: { mode: string }) => {
      if (!(s.model instanceof GameModel) || !s.model.selectMode(mode))
        throw new Error('Nozzle unavailable or invalid');
      return read();
    },
  );
  add(
    'pause_recovery',
    'Pause or resume the game. Resuming always requires fresh firing input.',
    {
      type: 'object',
      properties: { paused: { type: 'boolean' } },
      required: ['paused'],
      additionalProperties: false,
    },
    ({ paused }: { paused: boolean }) => {
      if (typeof paused !== 'boolean')
        throw new Error('paused must be boolean');
      s.model.paused = paused;
      s.model.stop();
      s.model.emit();
      return read();
    },
  );
  add(
    'refill_torch',
    'Stop firing and refill the current torch for free, preserving the ice.',
    empty,
    () => {
      s.model.stop();
      if (!(s.model instanceof GameModel)) throw Error('Refill unavailable');
      s.model.refill();
      s.model.emit();
      return read();
    },
  );
  // Local QA only. Drives the actual surface ray and real frame loop; never grants rewards.
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    add(
      'test_melt_at',
      'Local developer playtest: hold the torch at a viewport pixel for up to 12 seconds using the running game loop.',
      {
        type: 'object',
        properties: {
          x: { type: 'number' },
          y: { type: 'number' },
          seconds: { type: 'number', minimum: 0.02, maximum: 12 },
        },
        required: ['x', 'y', 'seconds'],
        additionalProperties: false,
      },
      async ({ x, y, seconds }: { x: number; y: number; seconds: number }) => {
        if (
          !Number.isFinite(x) ||
          !Number.isFinite(y) ||
          !Number.isFinite(seconds) ||
          seconds < 0.02 ||
          seconds > 12
        )
          throw new Error('Invalid melt duration or coordinates');
        const r = s.host.getBoundingClientRect();
        if (x < r.left || x > r.right || y < r.top || y > r.bottom)
          throw new Error('Point is outside the recovery surface');
        s.pointer.set(
          ((x - r.left) / r.width) * 2 - 1,
          (-(y - r.top) / r.height) * 2 + 1,
        );
        s.hasPointer = true;
        s.audio.init();
        s.model.stop();
        s.model.press();
        await new Promise<void>((resolve) => {
          const start = performance.now();
          const tick = () => {
            if (performance.now() - start >= seconds * 1000) {
              s.model.stop();
              resolve();
            } else requestAnimationFrame(tick);
          };
          requestAnimationFrame(tick);
        });
        s.model.emit();
        return read();
      },
    );
  if (
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1') &&
    s.model instanceof GameModel
  ) {
    const m = s.model;
    let targetTime = 0;
    add(
      'run_recovery_playtest',
      'Local QA only: start or stop a deterministic surface-aiming player. It uses normal heat, free refills, and purchases from earned money. It cannot grant money or skip blocks.',
      {
        type: 'object',
        properties: {
          running: { type: 'boolean' },
          purchases: {
            type: 'boolean',
            description:
              'Defaults to true. Disable to check purchases manually.',
          },
        },
        required: ['running'],
        additionalProperties: false,
      },
      ({
        running,
        purchases = true,
      }: {
        running: boolean;
        purchases?: boolean;
      }) => {
        if (typeof running !== 'boolean')
          throw new Error('running must be boolean');
        m.stop();
        s.setRotateMode(false);
        s.audio.init();
        if (!running) {
          s.automation = undefined;
          return read();
        }
        s.automation = () => {
          if (m.phase === 'completed') {
            s.automation = undefined;
            m.stop();
            return;
          }
          if (m.phase !== 'playing') return;
          if (m.fuel <= 0.01) {
            m.refill();
            return;
          }
          const now = performance.now();
          for (const key of ['heat', 'wide', 'residual', 'tank'] as Upgrade[]) {
            const cost = m.price(key);
            if (purchases && cost !== null && m.money >= cost) m.purchase(key);
          }
          if (now - targetTime > 120) {
            targetTime = now;
            const t = m.loot.find((t) => t.state === 'embedded');
            if (!t) {
              m.stop();
              return;
            }
            let best = -1,
              bestScore = -Infinity;
            for (let i = 0; i < m.field.values.length; i++) {
              if (m.field.values[i] <= 0.5) continue;
              const p = m.field.points[i];
              const cluster =
                m.round % 4 === 2 &&
                p.y < 1.5 * TUNE.worldScale &&
                p.y > 0.7 * TUNE.worldScale;
              if (
                cluster ||
                (Math.abs(p.x - t.x) < t.w * 0.5 + 0.1 * TUNE.worldScale &&
                  Math.abs(p.z - t.z) < t.d * 0.5 + 0.1 * TUNE.worldScale &&
                  p.y < t.y + t.h * 0.5 + 0.1 * TUNE.worldScale)
              ) {
                const score = cluster ? 100 - p.y : p.y + p.z * 0.25;
                if (score > bestScore) {
                  best = i;
                  bestScore = score;
                }
              }
            }
            if (best >= 0) {
              const p = m.field.points[best],
                v = s.assembly
                  .localToWorld(s.scratch.set(p.x, p.y, p.z))
                  .project(s.camera);
              s.pointer.set(v.x, v.y);
              s.hasPointer = true;
            }
          }
          if (!m.firing) m.press();
        };
        return read();
      },
    );
  }
  if (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
    add(
      'test_input_safeguards',
      'Local QA: dispatch input events through the canvas and window handlers, and verify release, focus-loss, and pointer-cancel stop firing.',
      empty,
      async () => {
        if (!(s.model instanceof GameModel) || s.model.phase !== 'playing')
          throw new Error('Resume gameplay before testing');
        const m = s.model,
          wasToggle = m.settings.toggle,
          wasRotate = s.rotateMode;
        const canvas = s.renderer.domElement,
          r = canvas.getBoundingClientRect();
        s.automation = undefined;
        s.setRotateMode(false);
        m.settings.toggle = false;
        m.stop();
        const down = () =>
          canvas.dispatchEvent(
            new PointerEvent('pointerdown', {
              button: 0,
              clientX: r.left + r.width / 2,
              clientY: r.top + r.height / 2,
              bubbles: true,
            }),
          );
        const frame = () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        const result: Record<string, boolean | number> = {};
        const start = performance.now();
        down();
        await frame();
        result.pressResponds = m.firing;
        result.firstFrameMs = performance.now() - start;
        window.dispatchEvent(new PointerEvent('pointerup', { button: 0 }));
        result.releaseStops = !m.firing;
        down();
        window.dispatchEvent(new FocusEvent('blur'));
        result.blurStops = !m.firing;
        window.dispatchEvent(new FocusEvent('focus'));
        result.focusDoesNotResume = !m.firing;
        down();
        window.dispatchEvent(new PointerEvent('pointercancel'));
        result.cancelStops = !m.firing;
        down();
        m.pause(true);
        result.pauseStops = !m.firing;
        m.pause(false);
        result.resumeDoesNotFire = !m.firing;
        m.settings.toggle = wasToggle;
        s.setRotateMode(wasRotate);
        m.emit();
        return result;
      },
    );
  if (
    ['localhost', '127.0.0.1'].includes(location.hostname) &&
    new URLSearchParams(location.search).get('qa') === '1' &&
    s.model instanceof GameModel
  ) {
    const m = s.model;
    add(
      'audit_saved_recovery',
      'Read-only compatibility check of the regular local save from the isolated practice bench; does not write, reset, or play that save.',
      empty,
      () => {
        const raw = localStorage.getItem('frozen-assets-v3');
        if (!raw) return { found: false };
        const old = JSON.parse(raw),
          loaded = new GameModel(raw);
        return {
          found: true,
          version: old.version,
          round: old.round,
          money: old.money,
          recovered: old.recovered,
          valid: loaded.saveStatus !== 'invalid',
          balancePreserved: loaded.money === old.money,
          progressionPreserved:
            loaded.round === old.round && loaded.recovered === old.recovered,
          upgradesPreserved: (Object.keys(LEGACY_LEVELS) as Upgrade[]).every(
            (key) =>
              loaded.upgrades[key] ===
              (old.progression === 2
                ? old.upgrades[key]
                : LEGACY_LEVELS[key][old.upgrades[key]]),
          ),
          migratedLevels: loaded.upgrades,
          thawPreserved: old.ice.every(
            (v: number, i: number) =>
              Math.abs(v - loaded.field.values[i]) < 0.000001,
          ),
          creditsPreserved: old.loot.every(
            (t: { credited: boolean }, i: number) =>
              t.credited === loaded.loot[i].credited,
          ),
        };
      },
      true,
    );
    add(
      'practice_batch',
      'Practice bench only: load an authored batch for geometry and interaction QA. This isolated bench never reads or writes the player save.',
      {
        type: 'object',
        properties: { batch: { type: 'integer', minimum: 1, maximum: 20 } },
        required: ['batch'],
        additionalProperties: false,
      },
      ({ batch }: { batch: number }) => {
        if (!Number.isInteger(batch) || batch < 1 || batch > 20)
          throw Error('Invalid batch');
        s.automation = undefined;
        s.cancelInput();
        m.restart();
        for (let i = 1; i < batch; i++) m.nextBlock();
        m.emit();
        return read();
      },
    );
    add(
      'test_rotation_safeguards',
      'Practice bench only: exercise actual canvas right-drag, left input, UI pointer isolation, blur, tilt limits, transformed ray targeting, and UI sound cooldown.',
      empty,
      async () => {
        if (m.phase !== 'playing') throw Error('Close menus before testing');
        const c = s.renderer.domElement,
          r = c.getBoundingClientRect(),
          result: Record<string, unknown> = {},
          rot = s.turntable;
        s.automation = undefined;
        s.setRotateMode(false);
        const toggle = m.settings.toggle;
        m.settings.toggle = false;
        const event = (name: string, button: number, x: number, y: number) =>
          new PointerEvent(name, {
            button,
            buttons: name === 'pointerup' ? 0 : button === 2 ? 2 : 1,
            pointerId: 71,
            clientX: r.left + x,
            clientY: r.top + y,
            bubbles: true,
          });
        const frame = () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        const before = {
          fuel: m.fuel,
          money: m.money,
          ice: Array.from(m.field.values),
          yaw: rot.yaw,
        };
        c.dispatchEvent(
          event('pointerdown', 2, r.width * 0.45, r.height * 0.46),
        );
        c.dispatchEvent(
          event('pointermove', 2, r.width * 0.45 + 220, r.height * 0.46 + 34),
        );
        result.dragStartsWithoutFiring = rot.dragging && !m.firing;
        result.springDoesNotTeleport =
          rot.yaw === before.yaw && rot.targetYaw !== rot.yaw;
        for (let i = 0; i < 20; i++) await frame();
        window.dispatchEvent(
          event('pointerup', 2, r.width * 0.45 + 220, r.height * 0.46 + 34),
        );
        result.releaseHasMomentum =
          Math.abs(rot.velocity) > 0.01 && !rot.dragging;
        for (let i = 0; i < 100; i++) await frame();
        result.rotationPreservesFuel = m.fuel === before.fuel;
        result.rotationPreservesMoney = m.money === before.money;
        result.rotationPreservesIce = before.ice.every(
          (v, i) => v === m.field.values[i],
        );
        c.dispatchEvent(
          event('pointerdown', 0, r.width * 0.5, r.height * 0.45),
        );
        result.leftPressFires = m.firing;
        c.dispatchEvent(
          event('pointermove', 0, r.width * 0.5 + 25, r.height * 0.45),
        );
        result.leftDragDoesNotRotate =
          rot.targetYaw === rot.yaw && !rot.dragging;
        window.dispatchEvent(
          event('pointerup', 0, r.width * 0.5 + 25, r.height * 0.45),
        );
        result.leftReleaseStops = !m.firing;
        const button = document.querySelector('.hud-top nav button')!,
          position = rot.targetYaw;
        button.dispatchEvent(event('pointerdown', 0, 40, 35));
        button.dispatchEvent(event('pointermove', 0, 170, 40));
        window.dispatchEvent(event('pointerup', 0, 170, 40));
        result.uiDragDoesNotRotate =
          rot.targetYaw === position && !rot.dragging && !m.firing;
        // An empty point on the canvas uses the primary button for inspection.
        const fuelBeforeTray = m.fuel;
        c.dispatchEvent(
          event('pointerdown', 0, r.width * 0.08, r.height * 0.55),
        );
        result.primaryEmptyStartsRotation =
          rot.dragging && s.gesture === 'rotate' && !m.firing;
        c.dispatchEvent(
          event('pointermove', 0, r.width * 0.08 + 90, r.height * 0.55),
        );
        for (let i = 0; i < 12; i++) await frame();
        result.primaryTrayUsesNoFuel = m.fuel === fuelBeforeTray;
        window.dispatchEvent(
          event('pointerup', 0, r.width * 0.08 + 90, r.height * 0.55),
        );
        result.primaryTrayReleaseDoesNotFire = !m.firing && !rot.dragging;
        c.dispatchEvent(
          event('pointerdown', 0, r.width * 0.08, r.height * 0.55),
        );
        const buttonRect = button.getBoundingClientRect();
        c.dispatchEvent(
          event(
            'pointermove',
            0,
            buttonRect.x - r.x + 8,
            buttonRect.y - r.y + 8,
          ),
        );
        result.dragIntoUICancels =
          !rot.dragging && !m.firing && s.gesture === 'idle';
        window.dispatchEvent(event('pointerup', 0, 10, 10));
        rot.begin();
        rot.move(0, 100000);
        rot.end(false);
        for (let i = 0; i < 60; i++) await frame();
        result.tiltIsBounded =
          Math.abs(rot.tilt) <= TUNE.rotationTiltLimit &&
          Math.abs(rot.targetTilt) <= TUNE.rotationTiltLimit;
        c.dispatchEvent(event('pointerdown', 2, 300, 300));
        window.dispatchEvent(new FocusEvent('blur'));
        result.blurCancelsRotation =
          !rot.dragging &&
          !m.firing &&
          rot.velocity === 0 &&
          s.gesture === 'idle';
        s.pointer.set(0, 0);
        s.assembly.updateMatrixWorld(true);
        s.raycaster.setFromCamera(s.pointer, s.camera);
        const hit = s.raycaster.intersectObject(s.ice, false)[0];
        if (hit) {
          const local = s.assembly.worldToLocal(hit.point.clone());
          result.targetRoundTripError = s.assembly
            .localToWorld(local)
            .distanceTo(hit.point);
          result.rotatedSurfaceHit = true;
        } else result.rotatedSurfaceHit = false;
        const played = s.audio.uiPlayed;
        for (let i = 0; i < 40; i++) s.audio.ui('hover');
        result.hoverBurstVoices = s.audio.uiPlayed - played;
        result.voiceBound = s.audio.voices <= TUNE.audioVoices;
        m.settings.toggle = toggle;
        s.cancelInput();
        m.emit();
        return result;
      },
    );
  }
  return () => {
    s.automation = undefined;
    life.abort();
  };
}
