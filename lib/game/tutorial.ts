import { IceField } from './ice';
import { TUNE, type Loot } from './tuning';
import { blockSpec } from './campaign-content';
import { TUTORIAL_SCRIPT as SCRIPT } from './authored-dialogue';

export const CONTINUOUS_COST = 25;
export const LESSONS = [
  {
    name: 'Arrival',
    lines: SCRIPT.slice(0, 5),
    task: '',
  },
  { name: 'First delivery', lines: [SCRIPT[5]], task: '' },
  { name: 'First contact', lines: [SCRIPT[5]], task: 'CHIP THE ICE' },
  { name: 'Contact confirmed', lines: [SCRIPT[6]], task: 'CHIP THE ICE' },
  {
    name: 'Discovery',
    lines: [SCRIPT[7], SCRIPT[8]],
    task: 'FREE THE COIN',
  },
  {
    name: 'Finish the claim',
    lines: [SCRIPT[8]],
    task: 'RECOVER THE SECOND COIN',
  },
  { name: 'The arrangement', lines: [SCRIPT[9], SCRIPT[10]], task: '' },
  { name: 'Your first upgrade', lines: [SCRIPT[10]], task: 'OPEN UPGRADES' },
  {
    name: 'Continuous work',
    lines: [SCRIPT[11]],
    task: 'BUY HOLD TO CHIP',
  },
  { name: 'Fitted', lines: [SCRIPT[12]], task: '' },
  {
    name: 'Return to work',
    lines: [SCRIPT[12]],
    task: 'BACK TO BENCH',
  },
  { name: 'Second delivery', lines: [SCRIPT[13]], task: '' },
  {
    name: 'Hold practice',
    lines: [SCRIPT[13], SCRIPT[14]],
    task: 'HOLD TO CHIP',
  },
  {
    name: 'Your workshop',
    lines: [SCRIPT[15], SCRIPT[16]],
    task: '',
  },
] as const;
export type TutorialSave = {
  revision: 2;
  legacyParcel?: boolean;
  mode: 'ringing' | 'dialogue' | 'task';
  step: number;
  line: number;
  block: 0 | 1 | 2;
  stage: 'lesson' | 'board' | 'post' | 'chapter' | 'done';
  elapsed: number;
  timeInStep: number;
  strikes: number;
  holdSeconds: number;
  firstImpact: boolean;
  continuous: boolean;
  boardStamped: boolean;
  history: string[];
  flags: string[];
  metrics: Record<string, number>;
};
export function freshTutorial(): TutorialSave {
  return {
    revision: 2,
    mode: 'ringing',
    step: 0,
    line: 0,
    block: 0,
    stage: 'lesson',
    elapsed: 0,
    timeInStep: 0,
    strikes: 0,
    holdSeconds: 0,
    firstImpact: false,
    continuous: false,
    boardStamped: false,
    history: [],
    flags: [],
    metrics: {},
  };
}
export const tutorialActive = (t?: TutorialSave) => !!t && t.stage !== 'done';
export const tutorialCanWork = (t: TutorialSave) =>
  t.stage === 'lesson' && t.mode === 'task' && [2, 4, 5, 12].includes(t.step);
export function tutorialTask(t: TutorialSave) {
  if (t.mode === 'ringing') return 'PICK UP THE PHONE';
  if (t.mode !== 'task' || t.stage !== 'lesson') return '';
  return LESSONS[t.step].task;
}
export function tutorialMessage(t: TutorialSave) {
  if (['board', 'chapter', 'done'].includes(t.stage) || t.mode !== 'dialogue')
    return null;
  const lesson = LESSONS[t.step];
  return {
    id: `${t.step}:${t.line}:${t.metrics.replay ?? 0}:${t.metrics.run ?? 0}:${t.metrics.fixture ?? 0}`,
    text: lesson.lines[t.line] ?? lesson.lines[0],
    task: '',
    waiting: false,
  };
}
export function tutorialHistory(t?: TutorialSave) {
  return (
    t?.history
      .map((id) => {
        const [step, line] = id.split(':').map(Number);
        return {
          id: `tutorial:${id}`,
          text: LESSONS[step]?.lines[line] ?? '',
          speaker: 'tony',
        };
      })
      .filter((x) => x.text) ?? []
  );
}
export function validateTutorial(raw: unknown): TutorialSave | undefined {
  if (raw === undefined) return undefined; // Existing recoveries skip the new opening.
  let t = structuredClone(raw) as TutorialSave;
  if (t && (t.revision as number) === 1) {
    // Keep the earned claim and lesson, upgrading only its presentation checkpoint.
    t = {
      ...t,
      revision: 2,
      legacyParcel: t.block === 2,
      mode:
        [2, 5, 7, 10, 12].includes(t.step) || (t.step === 4 && !t.firstImpact)
          ? 'task'
          : 'dialogue',
      line: 0,
      history: [],
    };
    if (t.step === 0 || t.stage === 'post') t.mode = 'ringing';
  }
  if (
    !t ||
    t.revision !== 2 ||
    !['ringing', 'dialogue', 'task'].includes(t.mode) ||
    !Number.isInteger(t.step) ||
    t.step < 0 ||
    t.step > 13 ||
    !Number.isInteger(t.line) ||
    t.line < 0 ||
    t.line >= LESSONS[t.step].lines.length ||
    ![0, 1, 2].includes(t.block) ||
    !['lesson', 'board', 'post', 'chapter', 'done'].includes(t.stage) ||
    ['elapsed', 'timeInStep', 'strikes', 'holdSeconds'].some(
      (k) =>
        !Number.isFinite(t[k as keyof TutorialSave]) ||
        Number(t[k as keyof TutorialSave]) < 0,
    ) ||
    ['firstImpact', 'continuous', 'boardStamped'].some(
      (k) => typeof t[k as keyof TutorialSave] !== 'boolean',
    ) ||
    !Array.isArray(t.history) ||
    t.history.some(
      (id) =>
        typeof id !== 'string' ||
        !/^\d+:\d+$/.test(id) ||
        !tutorialHistory({ history: [id] } as TutorialSave).length,
    ) ||
    !Array.isArray(t.flags) ||
    t.flags.some((x) => typeof x !== 'string') ||
    !t.metrics ||
    Object.values(t.metrics).some((x) => !Number.isFinite(x) || x < 0)
  )
    throw Error('Invalid tutorial checkpoint');
  if (
    (t.step >= 8 && !t.firstImpact) ||
    (t.step >= 9 && !t.continuous) ||
    (['post', 'chapter', 'done'].includes(t.stage) && !t.boardStamped) ||
    (t.stage !== 'lesson' && t.step !== 13) ||
    (t.stage === 'lesson' &&
      t.block !== (t.step === 0 ? 0 : t.step >= 11 ? 2 : 1)) ||
    (['board', 'post', 'chapter'].includes(t.stage) && t.block !== 2)
  )
    throw Error('Inconsistent tutorial');
  return structuredClone(t);
}

// Same grid topology, mesher and physical contact release as the main game.
// The legacy profile flag selects a snug carve instead of a spacious air pocket.
// Linear footprint ratios are 45% and 68% of Chapter 1's first normal parcel.
export function tutorialField(
  block: 0 | 1 | 2,
  saved?: number[],
  legacy = false,
) {
  const scale = blockSpec(0).scale * (block === 2 ? 0.68 : 0.45);
  const field = new IceField(0, undefined, {
    scale,
    shape: block === 2 && !legacy ? 'parcel' : 'slab',
    releaseMode: 'surfaceExposure',
  });
  if (!block) field.values.fill(0);
  else {
    // A low, rounded parcel, with the upper surface gently uneven.
    field.points.forEach((p, i) => {
      const x = p.x / (TUNE.worldScale * scale),
        z = p.z / (TUNE.worldScale * scale);
      const y = (p.y - 0.18) / (TUNE.worldScale * scale);
      const edge = Math.min(
        1.9 - Math.abs(x),
        1.22 - Math.abs(z),
        (block === 2 && !legacy ? 1.9 : 1.26) +
          0.045 * Math.sin(x * 5 + z * 2) -
          y,
      );
      field.values[i] = Math.min(
        field.values[i],
        Math.max(0, Math.min(1, edge / 0.16)),
      );
    });
  }
  if (saved) field.values.set(saved);
  return field;
}
export function tutorialLoot(block: 0 | 1 | 2, legacy = false): Loot[] {
  if (!block) return [];
  const s = blockSpec(0).scale * (block === 2 ? 0.68 : 0.45) * TUNE.worldScale;
  const practice = block === 2 && !legacy;
  const positions = practice ? [-1.2, 0, 1.2, -1.2, 0, 1.2] : [-0.83, 0.77];
  return positions.map((x, i) => ({
    id: `tutorial-${block}-${i}`,
    kind: block === 2 && i === 1 ? 'cash' : 'coin',
    value: block === 2 && i === 1 ? 70 : i > 1 ? 10 : 35,
    name: i ? 'Second claim' : 'Your first coin',
    x: x * s,
    y: 0.18 + (practice ? 0.68 + (i % 3) * 0.08 : i ? 0.64 : 0.92) * s,
    z: (practice ? (i < 3 ? 0.64 : -0.64) : i ? -0.2 : 0.47) * s,
    w: (practice ? 0.46 : 0.63) * s,
    h: (block === 2 && i === 1 ? 0.22 : 0.16) * s,
    d: (practice ? 0.44 : 0.57) * s,
    state: 'embedded',
    age: 0,
    vy: 0,
    credited: false,
  }));
}
