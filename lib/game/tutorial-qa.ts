import { GameModel } from './model';
import {
  LESSONS,
  tutorialMessage,
  tutorialCanWork,
  tutorialTask,
  CONTINUOUS_COST,
} from './tutorial';
import type { Vec3 } from './tuning';

export function tutorialDebug(m: GameModel) {
  const t = m.tutorial;
  return {
    step: t?.step,
    name: t ? LESSONS[t.step].name : null,
    timeInStep: t?.timeInStep,
    completionCondition: t
      ? tutorialTask(t) ||
        (t.stage === 'board' ? 'stamp and return' : 'read and continue')
      : null,
    currentMessage: t ? tutorialMessage(t) : null,
    queuedMessages: t ? LESSONS[t.step].lines.slice(t.line + 1) : [],
    profile: m.field.profile,
    exposure: m.loot.map((l) => ({
      id: l.id,
      ...m.field.exposure(l),
      state: l.state,
    })),
    flags: t?.flags,
    tutorial: t,
    money: m.money,
    commission: m.campaign?.state.commissionPaid,
  };
}
// A top-down, visible-surface probe. It never edits the field or aims inside it.
export function tutorialAim(m: GameModel): Vec3 | null {
  const loot = m.loot.find((t) => t.state === 'embedded');
  if (!loot) return null;
  const angle = m.strikeSerial * 1.73;
  const x = loot.x + Math.sin(angle) * loot.w * 0.65,
    z = loot.z + Math.cos(angle) * loot.d * 0.65;
  let best: Vec3 | null = null,
    distance = Infinity;
  const pitch = m.field.profile!.scale * 0.522;
  // Select a grid column near the target, then its topmost remaining sample.
  for (let i = 0; i < m.field.points.length; i++) {
    if (m.field.values[i] <= 0.5) continue;
    const p = m.field.points[i],
      d = (p.x - x) ** 2 + (p.z - z) ** 2;
    if (
      d < distance - 1e-7 ||
      (Math.abs(d - distance) < 1e-7 && p.y > (best?.y ?? -Infinity))
    ) {
      best = p;
      distance = d;
    }
  }
  return best ? { x: best.x, y: best.y + pitch * 0.3, z: best.z } : null;
}
export function runTutorialSequence(reload = false) {
  let m = new GameModel(undefined, { tutorial: true }),
    last = '',
    firstStrikeReload = false,
    firstRewardReload = false;
  const checkpoints: Record<string, unknown>[] = [];
  const saveCheckpoint = (name: string) => {
    const raw = m.serialize(),
      n = new GameModel(raw);
    if (n.saveStatus === 'invalid') throw Error(`Invalid reload at ${name}`);
    if (
      n.money !== m.money ||
      n.earned !== m.earned ||
      n.campaign!.state.commissionPaid !== m.campaign!.state.commissionPaid
    )
      throw Error(`Accounting changed at ${name}`);
    checkpoints.push({
      name,
      step: m.tutorial?.step,
      money: m.money,
      strikes: m.tutorial?.strikes,
    });
    if (reload) m = n;
  };
  for (let frame = 0; frame < 30000; frame++) {
    const t = m.tutorial!;
    const key = `${t.step}:${t.line}:${t.stage}:${t.mode}`;
    if (key !== last) {
      saveCheckpoint(key);
      last = key;
    }
    if (t.stage === 'done')
      return {
        completed: true,
        checkpoints,
        strikes: t.strikes,
        holdSeconds: t.holdSeconds,
        interactionSeconds: t.elapsed,
        money: m.money,
        gross: m.earned,
        commission: m.campaign!.state.commissionPaid,
        metrics: t.metrics,
      };
    if (t.stage === 'board') {
      m.stampTutorial();
      saveCheckpoint('after stamp');
      m.finishTutorialBoard();
    } else if (t.stage === 'chapter') m.finishTutorial();
    else if (m.phoneRinging) m.answerPhone();
    else if (m.settlement) m.skipSettlement();
    else if (tutorialMessage(t)) m.advanceTutorial();
    else if (t.step === 7) m.tutorialMenu('skills');
    else if (t.step === 8) {
      if (!m.buyContinuous()) throw Error('First purchase rejected');
    } else if (t.step === 10) m.tutorialMenu(null);
    const hit = tutorialCanWork(m.tutorial!) ? tutorialAim(m) : null;
    if (hit && !m.firing && m.strikeClock <= 0) m.press();
    m.update(0.05, hit);
    if (m.tutorial!.strikes === 1 && !firstStrikeReload) {
      firstStrikeReload = true;
      saveCheckpoint('first strike');
    }
    if (m.recovered === 1 && !firstRewardReload) {
      firstRewardReload = true;
      saveCheckpoint('first reward in flight');
    }
  }
  throw Error(`Tutorial deadlock: ${JSON.stringify(tutorialDebug(m))}`);
}
let fixtureSerial = 0;
export function forceTutorialStep(m: GameModel, step: number) {
  if (!Number.isInteger(step) || step < 0 || step > 13)
    throw Error('Expected step 0–13');
  m.startTutorial();
  const t = m.tutorial!;
  t.metrics.fixture = ++fixtureSerial;
  m.loadTutorialBlock(step >= 11 ? 2 : step ? 1 : 0);
  if (step >= 6) {
    // QA grants a completed first claim through the real exactly-once ledger.
    const savedBlock = t.block;
    m.loadTutorialBlock(1);
    m.loot.forEach((l) => {
      m.credit(l);
      l.state = 'collected';
    });
    if (savedBlock === 2) m.loadTutorialBlock(2);
  }
  t.firstImpact = step >= 4;
  if (step >= 9) {
    t.continuous = true;
    m.money -= CONTINUOUS_COST;
    m.campaign!.unlock('grip');
  }
  if (step === 13) t.stage = 'board';
  m.tutorialStep(step);
  if (step === 0) t.mode = 'ringing';
  if (step === 13) t.stage = 'board';
  if (step === 6) {
    const c = m.campaign!;
    m.settlement = {
      gross: c.state.blockGross,
      fee: c.state.blockFee,
      net: c.state.blockGross - c.state.blockFee,
      rate: 12,
      name: 'Your first recovery',
    };
  }
  m.onSave();
  m.emit();
  return tutorialDebug(m);
}

export function tutorialControl(m: GameModel, action: string, step?: number) {
  if (action === 'reset' || action === 'resetCompletion')
    forceTutorialStep(m, action === 'reset' ? 0 : 13);
  else if (action === 'goto') forceTutorialStep(m, step ?? 0);
  else if (action === 'block1' || action === 'block2')
    forceTutorialStep(m, action === 'block1' ? 2 : 12);
  else if (action === 'board') forceTutorialStep(m, 13);
  else if (action === 'stamp') m.stampTutorial();
  else if (action === 'replay') {
    if (m.tutorial) {
      m.tutorial.metrics.replay = (m.tutorial.metrics.replay ?? 0) + 1;
      m.tutorialStep(m.tutorial.step, m.tutorial.line);
    }
  } else if (action === 'reward') {
    if (!m.inTutorial || m.tutorial?.block !== 1) forceTutorialStep(m, 4);
    const l = m.loot.find((x) => x.state === 'embedded');
    if (l) {
      m.field.points.forEach((p, i) => {
        if (Math.abs(p.x - l.x) < l.w && Math.abs(p.z - l.z) < l.d)
          m.field.values[i] = 0;
      });
      m.field.dirty = true;
      m.field.revision++;
      // Normal connectivity/credit/impact path runs on the following frame.
    }
  } else if (action === 'complete') {
    forceTutorialStep(m, 13);
    m.stampTutorial();
    m.finishTutorialBoard();
    m.answerPhone();
    m.advanceTutorial();
    m.advanceTutorial();
    m.finishTutorial();
  } else throw Error('Unknown tutorial control');
  m.stop();
  m.onSave();
  m.emit();
  return tutorialDebug(m);
}
