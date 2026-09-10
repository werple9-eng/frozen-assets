import * as THREE from 'three';
import { IceField } from './ice';
import { GameModel } from './model';
import { GameScene } from './scene';
import { TOOL_ORDER, TOOL_TREES, type MajorTool } from './tool-trees';
import { type FieldSpec, type IceShape, type MaterialPreset } from './ice-grid';
import type { Loot } from './tuning';
import { blockSpec, STORY } from './campaign-content';
import { campaignField, campaignLoot } from './campaign-layout';
import { conditionGrade } from './condition';

const FIXTURES = {
  early: { width: 4.4, height: 2.6, depth: 2.4 },
  mid: { width: 7.9, height: 5, depth: 4.6 },
  late: { width: 11, height: 7, depth: 6.4 },
  vault: { width: 11.4, height: 7.2, depth: 6.6 },
};
export type VariableFieldFixture = {
  size?: keyof typeof FIXTURES;
  dimensions?: FieldSpec['dimensions'];
  profile?: IceShape;
  material?: MaterialPreset;
  tool?: MajorTool;
  developed?: boolean;
};
export type MajorFieldProfile = {
  seconds?: number;
  tool?: MajorTool;
  mode?: 'precision' | 'wide';
};
export type MajorDeliveryFixture = {
  delivery: number;
  phase?: number;
  tool?: MajorTool;
  developed?: boolean;
  funds?: number;
  quietCalls?: boolean;
};
export type MajorConditionFixture = {
  lootId?: string;
  score: number;
  /** Fraction of the real front/top shell to clear; no invisible exposure flag. */
  expose?: number;
};
const summary = (values: number[]) => {
  const sorted = values.filter(Number.isFinite).sort((a, b) => a - b);
  const quantile = (q: number) =>
    sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))] ?? 0;
  return {
    count: sorted.length,
    mean: sorted.reduce((a, b) => a + b, 0) / Math.max(1, sorted.length),
    p50: quantile(0.5),
    p95: quantile(0.95),
    max: sorted.at(-1) ?? 0,
  };
};
const solids = (field: IceField) =>
  field.values.reduce((n, value) => n + Number(value > 0.5), 0);
const gpu = (scene: GameScene) => ({
  geometries: scene.renderer.info.memory.geometries,
  textures: scene.renderer.info.memory.textures,
  programs: scene.renderer.info.programs?.length ?? 0,
  triangles: scene.renderer.info.render.triangles,
  drawCalls: scene.renderer.info.render.calls,
});
const fieldInfo = (field: IceField) => ({
  profile: field.spec?.profile ?? field.profile?.shape ?? 'legacy',
  grid: field.grid,
  samples: field.values.length,
  solidSamples: solids(field),
  materialSolidSamples: field.materialCounts(),
  chunks: field.chunks.length,
  dirtyChunks: field.dirtyChunks.size,
});
function isolated(scene: GameScene, readOnly = false) {
  if (
    !['localhost', '127.0.0.1'].includes(location.hostname) ||
    new URLSearchParams(location.search).get('qa') !== '1' ||
    !(scene.model instanceof GameModel)
  )
    throw Error('This action requires the isolated ?qa=1 practice bench.');
  if (!readOnly && (scene.destroyed || scene.frameError))
    throw Error('The practice scene is not running. Reload the QA tab.');
  return scene.model;
}
function quiet(model: GameModel) {
  if (model.campaign) {
    model.campaign.state.pending = [];
    model.campaign.state.call = undefined;
  }
  model.toolNotice = null;
  model.dialing = false;
  model.settlement = null;
  model.settlementTime = 0;
}
function equip(model: GameModel, tool: MajorTool, developed = false) {
  if (!TOOL_ORDER.includes(tool) || !model.campaign)
    throw Error('Invalid QA tool.');
  model.campaign.state.tools = [...TOOL_ORDER];
  model.campaign.state.selected = tool;
  model.revealedTools = [...TOOL_ORDER];
  model.toolNotices = TOOL_ORDER.flatMap((id) => [
    `available:${id}`,
    `ready:${id}`,
  ]);
  if (developed)
    for (const id of TOOL_ORDER)
      model.nodes[id] = TOOL_TREES[id].map((node) => node.id);
  model.fuel = model.capacity;
}
function install(model: GameModel, input: VariableFieldFixture) {
  const dimensions = input.dimensions ?? FIXTURES[input.size ?? 'early'];
  if (
    !dimensions ||
    !Object.values(dimensions).every(
      (value) => Number.isFinite(value) && value >= 1 && value <= 16,
    )
  )
    throw Error('Fixture dimensions must be between 1 and 16 world units.');
  const shape =
    input.profile ??
    (input.size === 'early' || !input.size ? 'parcel' : 'archive');
  model.restart();
  equip(model, input.tool ?? 'breaker', input.developed);
  quiet(model);
  model.paused = false;
  model.field = new IceField(0, undefined, undefined, {
    dimensions,
    profile: shape,
    cellSize: 0.3,
    deliveryId: 'qa-variable-field',
    phaseId: `${input.size ?? 'custom'}-${shape}-${input.material ?? 'clear'}`,
    materials: [
      { material: input.material ?? 'clear', region: { kind: 'all' } },
    ],
  });
  // A physical demo coin keeps the normal model in its active recovery phase.
  // It is never a narrative object and this practice model has no player storage.
  const coin: Loot = {
    id: 'qa-field-coin',
    kind: 'coin',
    value: 1,
    name: 'QA sample coin',
    x: 0,
    y: 0.18 + dimensions.height * 0.27,
    z: -dimensions.depth * 0.18,
    w: 0.4,
    h: 0.12,
    d: 0.4,
    state: 'embedded',
    age: 0,
    vy: 0,
    credited: false,
  };
  model.loot = [coin];
  model.field.carveLoot(model.loot);
  // A fixture must never begin with interpenetration or free cargo.
  if (model.field.solidIntersectionCount(coin) || model.field.canRelease(coin))
    throw Error(
      'The chosen fixture cannot safely restrain its demo coin. Choose parcel/archive or larger dimensions.',
    );
  return model.field;
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    if (signal.aborted) return reject(Error('QA cancelled'));
    const cancel = () => {
      clearTimeout(timer);
      reject(Error('QA cancelled'));
    };
    const timer = setTimeout(() => {
      signal.removeEventListener('abort', cancel);
      resolve();
    }, ms);
    signal.addEventListener('abort', cancel, { once: true });
  });
}

// A temporary native listener audit. Only registrations made while constructing
// a test scene are attributed to that scene. The original methods are restored
// even when WebGL creation or teardown throws.
function listenerAudit() {
  type Callback = EventListenerOrEventListenerObject;
  type Entry = {
    target: EventTarget;
    type: string;
    original: Callback;
    actual: EventListener;
    capture: boolean;
    active: boolean;
    owner: number;
    signal?: AbortSignal;
  };
  const entries: Entry[] = [];
  // oxlint-disable-next-line typescript/unbound-method -- Native methods are called with .call(target) and restored afterward.
  const add = EventTarget.prototype.addEventListener;
  // oxlint-disable-next-line typescript/unbound-method -- Native methods are called with .call(target) and restored afterward.
  const remove = EventTarget.prototype.removeEventListener;
  let owner: number | null = null;
  EventTarget.prototype.addEventListener = function (type, listener, options) {
    if (owner === null || !listener)
      return add.call(this, type, listener, options);
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    const duplicate = entries.find(
      (entry) =>
        entry.active &&
        entry.target === this &&
        entry.type === type &&
        entry.original === listener &&
        entry.capture === capture,
    );
    if (duplicate) return;
    const entry: Entry = {
      target: this,
      type,
      original: listener,
      capture,
      owner,
      active: true,
      signal: typeof options === 'object' ? options.signal : undefined,
      actual: function (event) {
        if (typeof options === 'object' && options.once) entry.active = false;
        if (typeof listener === 'function') listener.call(this, event);
        else listener.handleEvent(event);
      },
    };
    entries.push(entry);
    add.call(this, type, entry.actual, options);
  };
  EventTarget.prototype.removeEventListener = function (
    type,
    listener,
    options,
  ) {
    const capture = typeof options === 'boolean' ? options : !!options?.capture;
    const entry = entries.find(
      (entry) =>
        entry.active &&
        entry.target === this &&
        entry.type === type &&
        entry.original === listener &&
        entry.capture === capture,
    );
    if (entry) {
      entry.active = false;
      remove.call(this, type, entry.actual, options);
    } else remove.call(this, type, listener, options);
  };
  return {
    collecting: (id: number | null) => {
      owner = id;
    },
    counts: (id: number) => ({
      added: entries.filter((entry) => entry.owner === id).length,
      remaining: entries
        .filter(
          (entry) =>
            entry.owner === id && entry.active && !entry.signal?.aborted,
        )
        .map((entry) => ({
          target: entry.target.constructor.name,
          event: entry.type,
        })),
    }),
    restore: () => {
      owner = null;
      for (const entry of entries) {
        if (entry.active)
          remove.call(entry.target, entry.type, entry.actual, entry.capture);
      }
      EventTarget.prototype.addEventListener = add;
      EventTarget.prototype.removeEventListener = remove;
    },
  };
}

export function createMajorQA(scene: GameScene, signal: AbortSignal) {
  let running = false;
  let lastProfile: unknown = null;
  let lastFixture: unknown = null;
  let lifetime: {
    status: string;
    completed: number;
    requested: number;
    result?: unknown;
    error?: string;
  } = { status: 'not started', completed: 0, requested: 20 };
  const telemetry = () => {
    const model = isolated(scene, true),
      field = model.field;
    const saved = model.serialize(),
      parsed = JSON.parse(saved) as Record<string, unknown>;
    const encoded = parsed.field as Record<string, unknown> | undefined;
    let fingerprint = 2166136261;
    for (const value of field.values) {
      fingerprint ^= Math.round(value * 255);
      fingerprint = Math.imul(fingerprint, 16777619);
    }
    return {
      snapshot: model.snapshot(),
      performance: scene.stats(),
      field: {
        ...fieldInfo(field),
        identity: model.fieldIdentity,
        revision: field.revision,
        metrics: { ...field.metrics },
        fingerprint: (fingerprint >>> 0).toString(16),
      },
      save: {
        bytes: new TextEncoder().encode(saved).length,
        version: parsed.version,
        layoutVersion: model.campaign?.state.layoutVersion,
        encoded: encoded
          ? Object.fromEntries(
              Object.entries(encoded).map(([key, value]) => [
                key,
                typeof value === 'string' && value.length > 128
                  ? { characters: value.length }
                  : Array.isArray(value) && value.length > 32
                    ? { length: value.length }
                    : value,
              ]),
            )
          : null,
        diagnostics: [...model.saveDiagnostics],
      },
      loot: model.loot.map((t) => ({
        id: t.id,
        name: t.name,
        story: t.story,
        kind: t.kind,
        value: t.value,
        state: t.state,
        credited: t.credited,
        position: { x: t.x, y: t.y, z: t.z },
        bounds: { w: t.w, h: t.h, d: t.d },
        exposure: field.exposure(t),
        solidIntersections: field.solidIntersectionCount(t),
        canRelease:
          field.profile?.releaseMode === 'surfaceExposure'
            ? null
            : field.canRelease(t, model.contactSamples?.(t)),
        condition: t.condition,
        conditionActive: t.conditionActive,
        conditionLocked: t.conditionLocked,
        finalCondition: t.finalCondition,
        finalGrade: t.finalGrade,
        finalValue: t.finalValue,
      })),
    };
  };
  const practiceMajorDelivery = (input: MajorDeliveryFixture) => {
    const model = isolated(scene),
      phase = input.phase ?? 0;
    if (running) throw Error('A major QA measurement is already running.');
    if (
      !Number.isInteger(input.delivery) ||
      input.delivery < 1 ||
      input.delivery > 32
    )
      throw Error('Use authored delivery 1–32.');
    const block = blockSpec(input.delivery - 1, 3);
    if (!Number.isInteger(phase) || phase < 0 || phase >= block.phases)
      throw Error(
        `This delivery has ${block.phases} phases, indexed from zero.`,
      );
    if (
      input.funds !== undefined &&
      (!Number.isFinite(input.funds) ||
        input.funds < 0 ||
        input.funds > 10000000)
    )
      throw Error('QA funds must be 0–10,000,000.');
    scene.automation = undefined;
    scene.cancelInput();
    model.restart();
    const campaign = model.campaign!;
    campaign.state.block = input.delivery - 1;
    campaign.state.phase = phase;
    campaign.state.layoutVersion = 3;
    campaign.state.commission = campaign.state.blockRate =
      input.delivery >= 19 ? 8 : 12;
    // Author a known practice checkpoint. Suppression flags are separate from
    // read history, and are never evidence of actual campaign completion.
    campaign.state.objects = Array.from(
      { length: input.delivery - 1 },
      (_, i) => blockSpec(i, 3).object,
    ).filter((id): id is NonNullable<typeof id> => !!id);
    const prior = STORY.filter(
      (event) =>
        !event.retired &&
        event.at !== undefined &&
        event.at < input.delivery - 1,
    );
    campaign.state.read = prior.map((event) => event.id);
    campaign.state.history = [...campaign.state.read];
    campaign.state.flags =
      input.quietCalls === false
        ? [...campaign.state.read]
        : STORY.filter((event) => !event.retired).map((event) => event.id);
    campaign.state.storyEffects = prior.flatMap((event) =>
      event.readEffect?.flag ? [event.readEffect.flag] : [],
    );
    model.round = input.delivery - 1;
    model.money = Math.round(input.funds ?? 100000);
    model.earned = 0;
    equip(
      model,
      input.tool ??
        (input.delivery < 3
          ? 'hand'
          : input.delivery < 12
            ? 'pick'
            : input.delivery < 22
              ? 'heavy'
              : 'breaker'),
      input.developed,
    );
    quiet(model);
    model.conditionCue = null;
    model.conditionRisk = 0;
    model.field = campaignField(model.round, phase, undefined, 3);
    model.loot = campaignLoot(model.round, phase, 3);
    model.field.carveLoot(model.loot);
    model.paused = false;
    if (input.quietCalls === false) {
      campaign.trigger('BLOCK_START');
      if (model.round === 31 && phase > 0)
        campaign.trigger('FINAL_LAYER_OPENED');
    }
    scene.syncField();
    model.emit();
    lastFixture = {
      kind: 'authored-delivery',
      delivery: input.delivery,
      phase,
      tool: model.toolId,
      developed: !!input.developed,
      quietCalls: input.quietCalls !== false,
      syntheticFunds: model.money,
      authored: block.ice?.phases[phase],
    };
    return { fixture: lastFixture, ...telemetry() };
  };
  const setCondition = (input: MajorConditionFixture) => {
    const model = isolated(scene),
      field = model.field;
    if (running) throw Error('A major QA measurement is already running.');
    if (!model.qualityEnabled)
      throw Error(
        'Condition review requires an authored variable-field delivery outside induction.',
      );
    if (!Number.isFinite(input.score) || input.score < 0 || input.score > 100)
      throw Error('Condition score must be 0–100.');
    if (
      input.expose !== undefined &&
      (!Number.isFinite(input.expose) || input.expose < 0 || input.expose > 1)
    )
      throw Error('Exposure fixture fraction must be 0–1.');
    const item = input.lootId
      ? model.loot.find((t) => t.id === input.lootId)
      : model.loot.find((t) => !t.story && t.state === 'embedded');
    if (!item || item.story || item.state !== 'embedded')
      throw Error('Choose an embedded economic item, never story evidence.');
    scene.cancelInput();
    item.condition = input.score;
    item.conditionActive = true;
    item.conditionLocked = false;
    delete item.finalCondition;
    delete item.finalGrade;
    delete item.finalValue;
    let removed = 0;
    if (input.expose !== undefined) {
      const margin = field.grid.cellSize * 1.8;
      const shell = field.points
        .map((p, index) => ({ p, index }))
        .filter(
          ({ p }) =>
            Math.abs(p.x - item.x) < item.w / 2 + margin &&
            Math.abs(p.z - item.z) < item.d / 2 + margin &&
            p.y - item.y > -item.h / 2 &&
            p.y - item.y < item.h / 2 + margin &&
            (p.y - item.y > item.h / 2 || p.z - item.z > item.d / 2),
        )
        .sort((a, b) => b.p.z - a.p.z || b.p.y - a.p.y);
      for (const { index } of shell.slice(
        0,
        Math.ceil(shell.length * input.expose),
      )) {
        removed += Number(field.values[index] > 0.5);
        field.values[index] = 0;
        field.warmth[index] = 0;
      }
      field.revision++;
      field.markAllDirty();
      scene.syncField();
    }
    model.conditionCue = {
      id: item.id,
      grade: conditionGrade(input.score),
      x: item.x,
      y: item.y + item.h,
      z: item.z,
      until: model.playTime + 1.8,
    };
    model.emit();
    return {
      fixture: 'condition-and-physical-exposure',
      requestedShellFraction: input.expose,
      removedSolidSamples: removed,
      ...telemetry(),
    };
  };
  const practiceCall = (id: string) => {
    const model = isolated(scene),
      campaign = model.campaign!,
      event = STORY.find((e) => e.id === id && !e.retired);
    if (running) throw Error('A major QA measurement is already running.');
    if (!event) throw Error('Unknown active story event.');
    if (event.at !== undefined && event.at !== campaign.state.block)
      throw Error(`Load delivery ${event.at + 1} before this call fixture.`);
    if (event.atPhase !== undefined && campaign.state.phase < event.atPhase)
      throw Error(`This call requires phase ${event.atPhase}.`);
    scene.cancelInput();
    quiet(model);
    campaign.state.read = campaign.state.read.filter((read) => read !== id);
    for (const read of event.requiresRead ?? [])
      if (!campaign.state.read.includes(read)) campaign.state.read.push(read);
    const object =
      event.object ??
      (event.trigger === 'FINAL_LEDGER_RECOVERED' ? 'ledger' : undefined);
    if (object && !campaign.state.objects.includes(object))
      campaign.state.objects.push(object);
    if (!campaign.state.flags.includes(id)) campaign.state.flags.push(id);
    if (!campaign.state.history.includes(id)) campaign.state.history.push(id);
    campaign.state.call = { event: id, line: 0, status: 'ringing' };
    model.emit();
    return {
      fixture: 'call-preview',
      event: id,
      syntheticPrerequisites: event.requiresRead ?? [],
      syntheticObject: object,
      ...telemetry(),
    };
  };
  const completeCall = (expectedEvent?: string) => {
    const model = isolated(scene),
      campaign = model.campaign!,
      call = campaign.state.call;
    if (running) throw Error('A major QA measurement is already running.');
    if (!call) throw Error('No active or ringing practice call.');
    if (expectedEvent && expectedEvent !== call.event)
      throw Error('The current call does not match expectedEvent.');
    const id = call.event,
      event = STORY.find((e) => e.id === id)!;
    const before = {
      commission: campaign.state.commission,
      blockFee: campaign.state.blockFee,
      money: model.money,
    };
    for (let i = 0; i <= event.messages.length; i++) {
      const current = campaign.state.call;
      if (!current || current.event !== id) break;
      if (current.status === 'ringing') model.answerPhone();
      if (!model.advanceCall(`${id}:${current.line}`)) break;
    }
    return {
      event: id,
      completed: campaign.state.read.includes(id),
      before,
      ...telemetry(),
    };
  };
  const practiceVariableField = (input: VariableFieldFixture) => {
    const model = isolated(scene);
    if (running) throw Error('A major QA measurement is already running.');
    scene.automation = undefined;
    scene.cancelInput();
    const field = install(model, input);
    scene.syncField();
    model.emit();
    return {
      fixture: true,
      ...fieldInfo(field),
      tool: model.toolId,
      developed: !!input.developed,
      loot: model.loot.map((t) => ({
        id: t.id,
        solidIntersections: field.solidIntersectionCount(t),
        initiallyReleased: field.canRelease(t),
      })),
    };
  };

  const profileField = async (input: MajorFieldProfile) => {
    const model = isolated(scene),
      duration = input.seconds ?? 8;
    if (running) throw Error('A major QA measurement is already running.');
    if (duration < 6 || duration > 10 || !Number.isFinite(duration))
      throw Error('Profile duration must be 6–10 seconds.');
    if (document.hidden)
      throw Error(
        'Show this QA browser tab before measuring real frame pacing.',
      );
    if (model.paused || model.phase !== 'playing')
      throw Error(
        'Close menus and resume the practice bench before profiling.',
      );
    if (input.tool && !model.campaign?.state.tools.includes(input.tool))
      throw Error('Load an equipped QA fixture before selecting this tool.');
    running = true;
    const previousAutomation = scene.automation,
      previousTool = model.toolId,
      previousMode = model.mode;
    const field = model.field,
      initial = fieldInfo(field),
      initialMetrics = { ...field.metrics },
      frameTimes: number[] = [],
      workTimes: number[] = [],
      meshTimes: number[] = [],
      connectivityTimes: number[] = [],
      point = new THREE.Vector3(),
      aim = new THREE.Vector2(),
      gpuPeak = gpu(scene);
    let start = 0,
      priorFrame = 0,
      nextAim = 0,
      lastMesh = scene.meshTimings.at(-1) ?? -1,
      lastConnectivity = field.metrics.lastConnectivityMs,
      nextPress = 0,
      targetAttempts = 0,
      validTargets = 0,
      framesOnIce = 0,
      interrupted = '',
      lastSolid = initial.solidSamples,
      lastScalarSum = field.values.reduce((a, b) => a + b, 0),
      dirtyPeak = field.dirtyChunks.size;
    const initialScalarSum = lastScalarSum;
    const selectAim = (elapsed: number) => {
      const grid = field.grid,
        loot = model.loot.filter((t) => t.state === 'embedded'),
        sector = Math.floor(elapsed / 0.24),
        candidates = [] as THREE.Vector3[];
      if (loot.length > 1) {
        const target = loot[sector % loot.length];
        candidates.push(new THREE.Vector3(target.x, target.y, target.z));
      }
      for (let n = 0; n < 12; n++) {
        const i = sector + n;
        candidates.push(
          new THREE.Vector3(
            Math.sin(i * 2.399963) * grid.physicalWidth * 0.41,
            0.18 + grid.physicalHeight * (0.4 + ((i * 7) % 11) / 22),
            Math.cos(i * 1.618) * grid.physicalDepth * 0.42,
          ),
        );
      }
      for (const candidate of candidates) {
        point.copy(candidate);
        scene.contents.localToWorld(point).project(scene.camera);
        if (Math.abs(point.x) > 0.95 || Math.abs(point.y) > 0.95) continue;
        aim.set(point.x, point.y);
        scene.raycaster.setFromCamera(aim, scene.camera);
        targetAttempts++;
        if (scene.raycaster.intersectObject(scene.ice, true).length) {
          scene.pointer.copy(aim);
          scene.hasPointer = true;
          validTargets++;
          return;
        }
      }
      scene.hasPointer = false;
    };
    try {
      scene.cancelInput();
      if (input.tool) model.selectTool(input.tool);
      if (input.mode && !model.selectMode(input.mode))
        throw Error('Requested nozzle/bit mode is not owned.');
      scene.automation = () => {
        const now = performance.now();
        if (!start) start = now;
        const elapsed = (now - start) / 1000;
        const work = scene.renderTimes.at(-1);
        if (priorFrame) {
          frameTimes.push(scene.last - priorFrame);
          if (work !== undefined) workTimes.push(work);
        }
        priorFrame = scene.last;
        const mesh = scene.meshTimings.at(-1);
        if (mesh !== undefined && mesh !== lastMesh) {
          meshTimes.push(mesh);
          lastMesh = mesh;
        }
        const connectivity = field.metrics.lastConnectivityMs;
        if (connectivity !== lastConnectivity) {
          connectivityTimes.push(connectivity);
          lastConnectivity = connectivity;
        }
        const currentGpu = gpu(scene);
        for (const key of Object.keys(gpuPeak) as (keyof typeof gpuPeak)[])
          gpuPeak[key] = Math.max(gpuPeak[key], currentGpu[key]);
        dirtyPeak = Math.max(dirtyPeak, field.dirtyChunks.size);
        if (scene.renderer.domElement.dataset.contact === 'ice') framesOnIce++;
        if (
          model.field !== field ||
          model.phase !== 'playing' ||
          model.settlement ||
          model.phoneRinging ||
          model.liveCall ||
          model.paused
        ) {
          interrupted ||=
            model.field !== field
              ? 'field changed'
              : model.phase !== 'playing'
                ? model.phase
                : 'recovery/menu/story paused interaction';
          model.stop();
          return;
        }
        if (elapsed >= nextAim) {
          selectAim(elapsed);
          nextAim = elapsed + 0.24;
        }
        if (
          model.toolId === 'sledge' &&
          model.fittings.mechanics.has('charge')
        ) {
          if (model.chargeTime >= 0.64) {
            model.release();
            nextPress = elapsed + 0.15;
          } else if (!model.firing && elapsed >= nextPress) model.press();
        } else if (
          model.toolId === 'hand' &&
          !model.nodes.hand.includes('HC-S1')
        ) {
          if (elapsed >= nextPress) {
            model.stop();
            model.press();
            nextPress = elapsed + 0.28;
          }
        } else if (!model.firing) model.press();
        if (model.thermal && model.fuel < model.capacity * 0.05) model.refill();
      };
      await wait(duration * 1000, signal);
      model.stop();
      lastSolid = solids(field);
      lastScalarSum = field.values.reduce((a, b) => a + b, 0);
      lastProfile = {
        method:
          'Fresh real RAF window with normal tool input and live surface raycasts. No historic rolling frame window.',
        durationSeconds: start ? (performance.now() - start) / 1000 : 0,
        requestedSeconds: duration,
        tool: model.toolId,
        initial,
        remainingSolidSamples: lastSolid,
        removedSolidSamples: initial.solidSamples - lastSolid,
        removedScalarEquivalent: initialScalarSum - lastScalarSum,
        removal: {
          direct: field.metrics.directRemoved - initialMetrics.directRemoved,
          detach:
            field.metrics.detachedRemoved - initialMetrics.detachedRemoved,
          thermal: field.metrics.thermalRemoved - initialMetrics.thermalRemoved,
        },
        frameMs: summary(frameTimes),
        workMs: summary(workTimes),
        meshMs: summary(meshTimes),
        connectivityMs: summary(connectivityTimes),
        targetAttempts,
        validTargets,
        framesOnIce,
        gpuPeak,
        gpuAfter: gpu(scene),
        dirtyChunksPeak: dirtyPeak,
        dirtyChunksAfter: field.dirtyChunks.size,
        noFrameError: !scene.frameError,
        frameError: scene.frameError,
        visible: !document.hidden,
        interrupted: interrupted || null,
        valid:
          !scene.frameError &&
          !document.hidden &&
          !interrupted &&
          validTargets > 0 &&
          frameTimes.length >= duration * 30 &&
          initialScalarSum > lastScalarSum,
      };
      return lastProfile;
    } finally {
      model.stop();
      scene.automation = previousAutomation;
      if (model.campaign?.state.tools.includes(previousTool))
        model.selectTool(previousTool);
      model.selectMode(previousMode);
      model.emit();
      running = false;
    }
  };

  const startLifetime = (iterations = 20) => {
    const model = isolated(scene);
    if (running) throw Error('A major QA measurement is already running.');
    if (!Number.isInteger(iterations) || iterations < 1 || iterations > 20)
      throw Error('Use 1–20 lifecycle iterations; acceptance requires 20.');
    if (document.hidden)
      throw Error(
        'Show the QA browser tab for live renderer lifecycle testing.',
      );
    running = true;
    lifetime = { status: 'running', requested: iterations, completed: 0 };
    void (async () => {
      const previousAutomation = scene.automation,
        previousPaused = model.paused,
        parentBefore = gpu(scene),
        audit = listenerAudit(),
        rows: unknown[] = [],
        liveGeometry: number[] = [],
        liveTextures: number[] = [],
        errors: string[] = [];
      let current: GameScene | undefined, host: HTMLElement | undefined;
      const errorListener = (event: ErrorEvent) => errors.push(event.message);
      window.addEventListener('error', errorListener);
      try {
        scene.cancelInput();
        scene.automation = undefined;
        model.paused = true;
        cancelAnimationFrame(scene.animation);
        for (let i = 0; i < iterations; i++) {
          if (signal.aborted) throw Error('QA cancelled');
          host = document.createElement('div');
          host.dataset.majorQa = 'scene-lifetime';
          host.style.cssText =
            'position:fixed;inset:0;z-index:9999;pointer-events:none;background:#17201b';
          document.body.appendChild(host);
          const sample = new GameModel();
          const size = (['early', 'mid', 'late', 'vault'] as const)[i % 4];
          install(sample, { size, tool: 'breaker' });
          sample.paused = true;
          audit.collecting(i);
          const created = performance.now();
          current = new GameScene(host, sample);
          audit.collecting(null);
          const beforeWarm = gpu(current);
          const deadline = performance.now() + 4000;
          while (
            (current.renderTimes.length < 12 ||
              sample.field.dirtyChunks.size > 0) &&
            !current.frameError &&
            performance.now() < deadline
          )
            await wait(40, signal);
          // Exercise the additional geometry owned by a physical phase peel.
          // Half the scenes are disposed during it; half after it has drained.
          const outer = sample.field.spec!;
          sample.field = new IceField(0, undefined, sample.field.profile, {
            ...outer,
            phaseId: 'lifetime-inner',
            dimensions: {
              width: outer.dimensions.width * 0.76,
              height: outer.dimensions.height * 0.7,
              depth: outer.dimensions.depth * 0.74,
            },
          });
          sample.loot = [];
          current.syncField();
          const shellsCreated = current.phaseShells.length;
          await wait(40, signal);
          if (i % 2) {
            const drainedBy = performance.now() + 4000;
            while (
              (current.phaseShells.length > 0 ||
                sample.field.dirtyChunks.size > 0) &&
              !current.frameError &&
              performance.now() < drainedBy
            )
              await wait(40, signal);
          }
          const shellsBeforeDispose = current.phaseShells.length;
          const live = gpu(current),
            rendered = current.renderTimes.length;
          liveGeometry.push(live.geometries);
          liveTextures.push(live.textures);
          const frameError = current.frameError;
          current.dispose();
          const last = current.last,
            frame = current.animation,
            renders = current.renderTimes.length;
          await wait(70, signal);
          const listeners = audit.counts(i);
          const after = gpu(current),
            rafStopped =
              current.last === last &&
              current.animation === frame &&
              current.renderTimes.length === renders,
            contextLost = current.renderer.getContext().isContextLost(),
            canvasRemoved = !current.renderer.domElement.isConnected;
          rows.push({
            iteration: i + 1,
            fixture: size,
            shellsCreated,
            shellsBeforeDispose,
            shellsAfterDispose: current.phaseShells.length,
            elapsedMs: performance.now() - created,
            beforeWarm,
            live,
            afterDispose: after,
            renderedFrames: rendered,
            frameError,
            listeners,
            rafStopped,
            contextLost,
            canvasRemoved,
            released: { ...current.resources.counts },
            pass:
              rendered >= 12 &&
              !frameError &&
              !listeners.remaining.length &&
              shellsCreated > 0 &&
              (i % 2 ? shellsBeforeDispose === 0 : shellsBeforeDispose > 0) &&
              current.phaseShells.length === 0 &&
              rafStopped &&
              contextLost &&
              canvasRemoved,
          });
          current = undefined;
          host.remove();
          host = undefined;
          lifetime.completed = i + 1;
        }
        // The four field sizes have different mesh counts; compare like-for-like
        // scenes after warmup, not a misleading monotonic pooled total.
        const bounded = (values: number[]) =>
          [0, 1, 2, 3].every((size) => {
            const group = values.filter((_, i) => i >= 4 && i % 4 === size);
            return (
              !group.length || Math.max(...group) - Math.min(...group) <= 2
            );
          });
        lifetime = {
          ...lifetime,
          status: 'complete',
          result: {
            iterations,
            parentBefore,
            parentAfter: gpu(scene),
            rows,
            geometryBoundedAfterWarmup: bounded(liveGeometry),
            texturesBoundedAfterWarmup: bounded(liveTextures),
            errors,
            pass:
              iterations === 20 &&
              rows.every((row) => (row as { pass: boolean }).pass) &&
              bounded(liveGeometry) &&
              bounded(liveTextures) &&
              !errors.length,
          },
        };
      } catch (error) {
        lifetime = {
          ...lifetime,
          status: 'failed',
          error: String(error),
          result: { rows, errors },
        };
      } finally {
        audit.collecting(null);
        current?.dispose();
        host?.remove();
        audit.restore();
        window.removeEventListener('error', errorListener);
        model.paused = previousPaused;
        scene.automation = previousAutomation;
        if (!scene.destroyed && !scene.frameError) {
          scene.last = 0;
          scene.animation = requestAnimationFrame(scene.frame);
          model.emit();
        }
        running = false;
      }
    })();
    return {
      ...lifetime,
      note: 'Use inspect_major_qa for progress and the complete 20-scene report.',
    };
  };
  return {
    practiceVariableField,
    practiceMajorDelivery,
    setCondition,
    practiceCall,
    completeCall,
    profileField,
    startLifetime,
    inspect: () => ({
      busy: running,
      lifetime,
      lastProfile,
      lastFixture,
      ...telemetry(),
    }),
  };
}
