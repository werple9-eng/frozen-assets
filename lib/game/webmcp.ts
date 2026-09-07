import type { GameScene } from './scene';
import { GameModel, type Upgrade } from './model';
export function registerGameTools(s: GameScene, read: () => unknown) {
  const registry = (document as any).modelContext;
  if (!registry?.registerTool) return () => {};
  const life = new AbortController();
  const add = (
    name: string,
    description: string,
    inputSchema: object,
    execute: (input: any) => unknown,
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
      },
      autoplay: !!s.automation,
      aim: { ...s.aim },
      loot: s.model.loot.map((t) => {
        const p = s.lootMeshes.get(t.id)?.position.clone().project(s.camera),
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
    ({ mode }: any) => {
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
    ({ paused }: any) => {
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
      const m = s.model as any;
      if (m.refill) m.refill();
      else s.model.fuel = 75;
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
      async ({ x, y, seconds }: any) => {
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
        properties: { running: { type: 'boolean' } },
        required: ['running'],
        additionalProperties: false,
      },
      ({ running }: any) => {
        if (typeof running !== 'boolean')
          throw new Error('running must be boolean');
        m.stop();
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
            if (cost !== null && m.money >= cost) m.purchase(key);
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
              const cluster = m.round % 4 === 2 && p.y < 1.5 && p.y > 0.7;
              if (
                cluster ||
                (Math.abs(p.x - t.x) < t.w * 0.5 + 0.1 &&
                  Math.abs(p.z - t.z) < t.d * 0.5 + 0.1 &&
                  p.y < t.y + t.h * 0.5 + 0.1)
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
                v = s.scratch.set(p.x, p.y, p.z).project(s.camera);
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
          wasToggle = m.settings.toggle;
        const canvas = s.renderer.domElement,
          r = canvas.getBoundingClientRect();
        s.automation = undefined;
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
        m.emit();
        return result;
      },
    );
  return () => {
    s.automation = undefined;
    life.abort();
  };
}
