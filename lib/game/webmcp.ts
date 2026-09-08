import { TUNE } from './tuning';
import type { GameScene } from './scene';
import { GameModel, type Upgrade } from './model';
import { LEGACY_LEVELS } from './progression';
import { TOOLS } from './campaign-content';
import { BrowserSaveBackend } from './platform';
import { SLOT_KEY } from './save-slots';
import { motionAudit } from './motion-audit';
import {
  tutorialDebug,
  tutorialControl,
  tutorialAim,
  runTutorialSequence,
} from './tutorial-qa';
import { tutorialCanWork } from './tutorial';
import { contactAudit } from './contact-qa';
import { tutorialUIAudit } from './landline-ui-qa';
import { polishAudit } from './polish-qa';
import {
  TOOL_ORDER,
  TOOL_TREES,
  freshNodes,
  type MajorTool,
} from './tool-trees';
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
        lettersPlayed: s.audio.lettersPlayed,
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
    new URLSearchParams(location.search).get('qa') === '1' &&
    s.model instanceof GameModel
  ) {
    const m = s.model;
    add(
      'practice_tool_tree',
      'Isolated practice bench only: install a named tool-tree fixture for visual and purchase QA. Never writes player saves.',
      {
        type: 'object',
        properties: {
          tool: { type: 'string', enum: TOOL_ORDER },
          state: {
            type: 'string',
            enum: ['fresh', 'grown', 'available', 'ready', 'acquired'],
          },
        },
        required: ['tool', 'state'],
        additionalProperties: false,
      },
      ({
        tool,
        state,
      }: {
        tool: MajorTool;
        state: 'fresh' | 'grown' | 'available' | 'ready' | 'acquired';
      }) => {
        if (
          !TOOL_ORDER.includes(tool) ||
          !['fresh', 'grown', 'available', 'ready', 'acquired'].includes(state)
        )
          throw Error('Invalid tool fixture');
        s.automation = undefined;
        s.cancelInput();
        m.restart();
        const c = m.campaign!,
          index = TOOL_ORDER.indexOf(tool),
          def = TOOLS.find((t) => t.id === tool)!;
        const unowned = state === 'available' || state === 'ready';
        c.state.tools = TOOL_ORDER.slice(0, index + (unowned ? 0 : 1));
        if (!c.state.tools.length) c.state.tools = ['hand'];
        c.state.selected = unowned ? c.state.tools.at(-1)! : tool;
        m.revealedTools = TOOL_ORDER.slice(0, index + 1);
        m.toolNotices = m.revealedTools.flatMap((t) => [
          `available:${t}`,
          `ready:${t}`,
        ]);
        c.state.pending = [];
        c.state.call = undefined;
        m.nodes = freshNodes();
        if (state === 'grown')
          m.nodes[tool] = TOOL_TREES[tool]
            .filter((n) => n.rank <= 2 && n.branch !== 'technique')
            .map((n) => n.id);
        m.money =
          state === 'available'
            ? Math.floor(def.cost * 0.6)
            : Math.max(500, def.cost + 20000);
        m.earned = c.state.grossEarned = c.state.netEarned = m.money;
        if (state === 'acquired') m.toolNotice = { tool, kind: 'acquired' };
        m.fuel = m.capacity;
        m.emit();
        return read();
      },
    );
    let uiAuditResult: unknown = { status: 'not started' };
    add(
      'test_polish_interactions',
      'Isolated practice bench: audit the reported stuck Next label and repeated call, full-screen map and continuous zoom, actual pick impact timing, or safe gameplay camera bounds. Restores the practice checkpoint.',
      {
        type: 'object',
        properties: {
          scenario: {
            type: 'string',
            enum: ['calls', 'map', 'tools', 'camera', 'phone', 'tool-pages'],
          },
        },
        required: ['scenario'],
        additionalProperties: false,
      },
      ({
        scenario,
      }: {
        scenario: 'calls' | 'map' | 'tools' | 'camera' | 'phone' | 'tool-pages';
      }) => polishAudit(s, scenario),
    );
    add(
      'test_tutorial_ui',
      'Isolated practice bench: exercise actual letter audio, silent skip, message persistence, upgrade focus/purchase/return and controller first strike. Restores the practice checkpoint.',
      empty,
      () => {
        if ((uiAuditResult as { status?: string }).status === 'running')
          return uiAuditResult;
        uiAuditResult = { status: 'running' };
        void tutorialUIAudit(s)
          .then((result) => {
            uiAuditResult = { status: 'complete', ...result };
          })
          .catch((error) => {
            uiAuditResult = { status: 'error', message: String(error) };
          });
        return uiAuditResult;
      },
    );
    add(
      'inspect_ui_audit',
      'Read the result of the isolated live dialogue and navigation audit.',
      empty,
      () => uiAuditResult,
      true,
    );
    add(
      'test_tool_contacts',
      'Isolated practice bench: measure hand chisel and curved pick contact at eight camera-relative tray poses, including both tilt limits and top/side/near/far surfaces. Restores the practice checkpoint.',
      empty,
      () => contactAudit(s),
    );
    add(
      'inspect_tutorial',
      'Isolated tutorial checkpoint, queue, exposure, completion condition, timings and flags.',
      empty,
      () => tutorialDebug(m),
      true,
    );
    add(
      'test_tutorial_sequence',
      'Isolated deterministic full tutorial with optional reload at every checkpoint. No browser save changes.',
      {
        type: 'object',
        properties: { reload: { type: 'boolean' } },
        additionalProperties: false,
      },
      ({ reload }: { reload?: boolean }) => runTutorialSequence(reload),
      true,
    );
    add(
      'tutorial_control',
      'Isolated practice bench only: tutorial fixtures and live-surface chipping. Never operates on player saves.',
      {
        type: 'object',
        properties: {
          action: {
            type: 'string',
            enum: [
              'reset',
              'goto',
              'replay',
              'block1',
              'block2',
              'reward',
              'board',
              'stamp',
              'complete',
              'resetCompletion',
              'startWork',
              'stopWork',
            ],
          },
          step: { type: 'integer', minimum: 0, maximum: 13 },
        },
        required: ['action'],
        additionalProperties: false,
      },
      ({ action, step }: { action: string; step?: number }) => {
        s.automation = undefined;
        s.cancelInput();
        if (action === 'startWork') {
          s.automation = () => {
            if (!m.tutorial || !tutorialCanWork(m.tutorial) || m.paused) {
              m.stop();
              return;
            }
            const p = tutorialAim(m);
            if (!p) {
              m.stop();
              return;
            }
            s.scratch
              .set(p.x, p.y, p.z)
              .applyMatrix4(s.ice.matrixWorld)
              .project(s.camera);
            s.pointer.set(s.scratch.x, s.scratch.y);
            s.hasPointer = true;
            s.raycaster.setFromCamera(s.pointer, s.camera);
            if (!s.raycaster.intersectObject(s.ice, false).length) {
              // A carved column can project through a hole. Seek another visible
              // rim through actual rays instead of repeatedly striking empty air.
              const l = m.loot.find((x) => x.state === 'embedded')!;
              for (let i = 0; i < 12; i++) {
                const a = m.strikeSerial * 1.73 + (i * Math.PI) / 6;
                s.scratch
                  .set(
                    l.x + Math.sin(a) * l.w * 0.95,
                    l.y + l.h,
                    l.z + Math.cos(a) * l.d * 0.95,
                  )
                  .applyMatrix4(s.ice.matrixWorld)
                  .project(s.camera);
                s.pointer.set(s.scratch.x, s.scratch.y);
                s.raycaster.setFromCamera(s.pointer, s.camera);
                if (s.raycaster.intersectObject(s.ice, false).length) break;
              }
            }
            if (!m.firing && m.strikeClock <= 0) m.press();
          };
          return { running: true };
        }
        if (action === 'stopWork') return { running: false };
        return tutorialControl(m, action, step);
      },
    );
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
          const nextTool = m.campaign
            ? TOOLS.find(
                (t) =>
                  !m.campaign!.state.tools.includes(t.id) &&
                  t.block <= m.campaign!.state.block,
              )
            : undefined;
          if (purchases && nextTool) m.buyTool(nextTool.id);
          for (const key of ['heat', 'wide', 'residual', 'tank'] as Upgrade[]) {
            const cost = m.price(key);
            if (
              purchases &&
              cost !== null &&
              m.money >= cost + (nextTool?.cost ?? 0)
            )
              m.purchase(key);
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
                v = s.contents
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
        const strike = m.strikeSerial;
        down();
        await frame();
        result.pressResponds = m.firing || m.strikeSerial > strike;
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
      'test_motion_choreography',
      'Isolated practice bench: audit rapid menu interruption, seven tool motions, delivery transforms, material rewards or animated upgrade connections. Restores the practice recovery afterward. Never touches the player save.',
      {
        type: 'object',
        properties: {
          reduced: { type: 'boolean' },
          scenario: {
            type: 'string',
            enum: ['ui', 'delivery', 'tools', 'rewards', 'purchase', 'phone'],
          },
        },
        required: ['scenario'],
        additionalProperties: false,
      },
      ({ scenario, reduced }: { scenario: string; reduced?: boolean }) =>
        motionAudit(s, scenario, reduced),
    );
    add(
      'practice_campaign_ending',
      'Isolated practice bench only: clear the 32 campaign deliveries as a state-machine fixture, then show the real ending UI. This is not a duration or manual gameplay test.',
      empty,
      () => {
        s.automation = undefined;
        s.cancelInput();
        m.restart();
        let steps = 0;
        while (m.phase !== 'completed' && steps++ < 30000) {
          // This fixture skips earlier calls explicitly. Real calls are manual;
          // leave the final queue intact so the actual ending UI can be tested.
          if (m.phoneRinging) m.answerPhone();
          if (m.liveCall) m.advanceCall();
          m.field.values.fill(0);
          m.field.dirty = true;
          m.update(1 / 60, null);
          if (m.campaign?.state.complete) {
            // Put the receipt behind the remaining final calls without consuming
            // them during this fixture's synchronous settlement fast-forward.
            m.settlement = null;
            m.phase = 'completed';
          }
        }
        m.emit();
        return read();
      },
    );
    add(
      'test_controller_navigation',
      'Isolated practice bench: exercise the actual standard-gamepad input loop for phone, Upgrades focus, map pan/zoom, back and tool cycling. Restores the browser gamepad provider afterward.',
      empty,
      async () => {
        if (!['playing', 'completed'].includes(m.phase))
          throw Error('Close menus before testing');
        const ending = m.phase === 'completed';
        const descriptor = Object.getOwnPropertyDescriptor(
          navigator,
          'getGamepads',
        );
        const buttons = Array.from({ length: 17 }, () => ({
          pressed: false,
          touched: false,
          value: 0,
        }));
        const pad = {
          id: 'Standard mapping QA',
          index: 0,
          connected: true,
          mapping: 'standard',
          timestamp: 0,
          buttons,
          axes: [0, 0, 0, 0],
        };
        const frame = () =>
          new Promise<void>((resolve) =>
            requestAnimationFrame(() => resolve()),
          );
        const frames = async (n = 4) => {
          for (let i = 0; i < n; i++) await frame();
        };
        const press = async (i: number) => {
          buttons[i].pressed = true;
          buttons[i].value = 1;
          await frames();
          buttons[i].pressed = false;
          buttons[i].value = 0;
          await frames();
        };
        const result: Record<string, boolean> = {};
        const checkpoint = m.serialize();
        const originalSpeed = m.settings.textSpeed;
        try {
          Object.defineProperty(navigator, 'getGamepads', {
            configurable: true,
            value: () => [pad],
          });
          if (ending) {
            m.setSetting('textSpeed', 1);
            let sawCall = false;
            for (
              let i = 0;
              i < 100 &&
              (m.campaign?.state.call || m.campaign?.state.pending.length);
              i++
            ) {
              await frames(12);
              if (m.phoneRinging || m.liveCall) {
                sawCall = true;
                await press(0);
              }
            }
            result.finalMessage =
              sawCall && !!m.campaign?.state.read.includes('epilogue');
            await frames(40);
            await press(0);
            await frames(40);
            result.contracts =
              m.campaign?.state.contracts === true && m.phase === 'playing';
            return result;
          }
          // A fresh QA tab starts in induction. Exercise navigation on an
          // explicit campaign fixture, with no unread call consuming Confirm.
          m.restart();
          m.campaign!.openPhone();
          m.campaign!.unlock('grip');
          m.campaign!.unlock('pick');
          m.selectTool('hand');
          m.revealedTools = ['hand', 'pick'];
          m.campaign!.state.pending = [];
          m.pause(false);
          m.emit();
          await frames(40);
          await press(3);
          result.phone =
            m.phoneOffHook &&
            !!document.querySelector('.phone-dial,.live-dialogue');
          if (m.dialing) {
            result.dialFocus =
              document.activeElement?.getAttribute('aria-label') === 'Dial 7';
            await press(0);
            result.dialConfirm =
              document.querySelector('.phone-dial h2')?.textContent ===
              'NO ANSWER. TRY LATER.';
            const dialFocus = document.activeElement;
            await press(15);
            result.dialFocusMoves = document.activeElement !== dialFocus;
          }
          await press(1);
          await frames(40);
          result.backToBench = m.phase === 'playing';
          await press(2);
          await frames(40);
          result.upgrades = !!document.querySelector('.skill-screen');
          const beforeFocus = document.activeElement;
          await press(15);
          result.focusMoves = document.activeElement !== beforeFocus;
          await press(13);
          await frames(20);
          const root = document.querySelector<HTMLButtonElement>('.map-tool');
          root?.focus();
          await press(15);
          result.spatialNodeFocus =
            !!document.activeElement?.hasAttribute('data-skill');
          await press(5);
          await frames(25);
          result.bumperSwitchesPage =
            document
              .querySelector('[aria-label="Ice pick upgrades"]')
              ?.getAttribute('aria-pressed') === 'true';
          const map = document.querySelector<HTMLElement>('.tree-map'),
            beforePan = map?.style.transform;
          pad.axes[2] = 0.8;
          await frames(20);
          pad.axes[2] = 0;
          result.mapPans = map?.style.transform !== beforePan;
          const beforeZoom = map?.style.transform;
          buttons[6].pressed = true;
          pad.axes[3] = -0.8;
          await frames(20);
          buttons[6].pressed = false;
          pad.axes[3] = 0;
          result.mapZooms = map?.style.transform !== beforeZoom;
          await press(1);
          await frames(40);
          const previous = m.toolId;
          await press(4);
          result.toolCycles = m.toolId !== previous;
          return result;
        } finally {
          m.setSetting('textSpeed', originalSpeed);
          if (descriptor)
            Object.defineProperty(navigator, 'getGamepads', descriptor);
          else Reflect.deleteProperty(navigator, 'getGamepads');
          m.stop();
          if (!ending) {
            m.restore(checkpoint);
            m.pause(false);
            m.emit();
          }
        }
      },
    );
    add(
      'audit_saved_recovery',
      'Read-only compatibility check of all three local save slots and the legacy backup from the isolated practice bench. Does not write, reset, or play them.',
      empty,
      async () => {
        const audit = (raw: string | null) => {
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
                t.credited === loaded.loot[i]?.credited,
            ),
            ownedToolsPreserved:
              !old.campaign ||
              old.campaign.tools.every((tool: string) =>
                loaded.campaign?.state.tools.some((id) => id === tool),
              ),
            nodesPreserved:
              !old.nodes ||
              TOOL_ORDER.every((tool) =>
                (old.nodes[tool] ?? []).every((id: string) =>
                  loaded.nodes[tool].includes(id),
                ),
              ),
          };
        };
        const [legacy, catalog] = await Promise.all([
          new BrowserSaveBackend().load(),
          new BrowserSaveBackend(SLOT_KEY).load(),
        ]);
        const slots = catalog ? JSON.parse(catalog).slots : [];
        return {
          ...audit(legacy),
          slots: slots.map((slot: { raw: string | null }, i: number) => ({
            slot: i + 1,
            ...audit(slot.raw),
          })),
        };
      },
      true,
    );
    add(
      'practice_batch',
      'Practice bench only: load an authored batch for geometry and interaction QA. This isolated bench never reads or writes the player save.',
      {
        type: 'object',
        properties: {
          batch: { type: 'integer', minimum: 1, maximum: 32 },
          equipped: {
            type: 'boolean',
            description:
              'Fixture only: equip chapter tools and display earlier evidence for visual QA.',
          },
        },
        required: ['batch'],
        additionalProperties: false,
      },
      ({ batch, equipped = false }: { batch: number; equipped?: boolean }) => {
        if (!Number.isInteger(batch) || batch < 1 || batch > 32)
          throw Error('Invalid batch');
        s.automation = undefined;
        s.cancelInput();
        m.restart();
        for (let i = 1; i < batch; i++) m.nextBlock();
        if (equipped && m.campaign) {
          for (const t of TOOLS.filter((t) => t.block < batch))
            m.campaign.unlock(t.id);
          if (batch > 5) m.campaign.collect('tag');
          if (batch > 8) m.campaign.collect('ring');
          if (batch > 11) m.campaign.collect('hold');
          if (batch > 18) m.campaign.collect('log');
          if (batch > 25) m.campaign.collect('access');
        }
        m.emit();
        return read();
      },
    );
    add(
      'test_rotation_safeguards',
      'Practice bench only: exercise actual canvas right-drag, left input, UI pointer isolation, blur, tilt limits, transformed ray targeting, and unlimited hover audio.',
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
          const local = s.contents.worldToLocal(hit.point.clone());
          result.targetRoundTripError = s.contents
            .localToWorld(local)
            .distanceTo(hit.point);
          result.rotatedSurfaceHit = true;
        } else result.rotatedSurfaceHit = false;
        const played = s.audio.uiPlayed;
        for (let i = 0; i < 40; i++) s.audio.ui('hover');
        result.hoverBurstVoices = s.audio.uiPlayed - played;
        result.everyHoverPlayed = result.hoverBurstVoices === 40;
        const buttons = Array.from(
          document.querySelectorAll<HTMLButtonElement>('.hud-top nav button'),
        );
        if (buttons.length >= 2) {
          const before = s.audio.uiPlayed;
          for (let i = 0; i < 40; i++)
            buttons[i % 2].dispatchEvent(
              new PointerEvent('pointerover', {
                bubbles: true,
                relatedTarget: buttons[(i + 1) % 2],
              }),
            );
          result.everyPointerEntryPlayed = s.audio.uiPlayed - before === 40;
          const inside = s.audio.uiPlayed;
          buttons[0].dispatchEvent(
            new PointerEvent('pointerover', {
              bubbles: true,
              relatedTarget: buttons[0].firstElementChild,
            }),
          );
          result.insideMovementSilent = s.audio.uiPlayed === inside;
        }
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
