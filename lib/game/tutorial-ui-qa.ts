import type { GameScene } from './scene';
import { GameModel } from './model';
import { forceTutorialStep, tutorialControl } from './tutorial-qa';

export async function tutorialUIAudit(s: GameScene) {
  const m = s.model as GameModel,
    saved = m.serialize(),
    result: Record<string, unknown> = {};
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const key = (key: string) =>
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
  const close = () =>
    document
      .querySelector<HTMLButtonElement>('[role="dialog"] .bench-return')
      ?.click();
  s.automation = undefined;
  s.cancelInput();
  close();
  await wait(650);
  try {
    const before = s.audio.lettersPlayed;
    forceTutorialStep(m, 2);
    m.pause(false);
    m.emit();
    await wait(2100);
    result.liveLetterSounds = s.audio.lettersPlayed - before;
    result.liveExpected = 11; // Click(5) the(3) ice(3); spaces and period are silent.
    result.instructionPersists = m.tutorial?.step === 2;
    const skipBefore = s.audio.lettersPlayed;
    tutorialControl(m, 'replay');
    await wait(80);
    document.querySelector<HTMLButtonElement>('.tony-text-action')?.click();
    await wait(1100);
    result.skippedLetterSounds = s.audio.lettersPlayed - skipBefore;
    result.skipDoesNotAdvance = m.tutorial?.step === 2;
    m.setSetting('dialogueSounds', false);
    const quiet = s.audio.lettersPlayed;
    tutorialControl(m, 'replay');
    await wait(1900);
    result.disabledLetterSounds = s.audio.lettersPlayed - quiet;
    m.setSetting('dialogueSounds', true);
    forceTutorialStep(m, 7);
    key('u');
    await wait(900);
    const node = document.querySelector<HTMLButtonElement>('[data-skill="HC-S1"]');
    result.firstUpgradeFocused = document.activeElement === node;
    node?.click();
    await wait(1000);
    result.purchased = m.tutorial?.continuous && m.money === 34;
    document.querySelector<HTMLButtonElement>('.tony-continue')?.click();
    await wait(300);
    result.returnFocused =
      document.activeElement?.classList.contains('bench-return');
    close();
    await wait(650);
    result.singleLivePanel =
      document.querySelectorAll('.tony-panel').length === 1;
    result.secondBlock = m.tutorial?.step === 11 && m.tutorial?.block === 2;
    // Exercise A / Cross through the actual app gamepad poller, including release.
    forceTutorialStep(m, 2);
    m.pause(false);
    m.emit();
    await wait(650);
    const p = m.field.points.find(
      (p, i) => m.field.values[i] > 0.5 && p.x > -0.1 && p.x < 0.1 && p.y > 0.5,
    )!;
    s.scratch
      .set(p.x, p.y + 0.1, p.z)
      .applyMatrix4(s.ice.matrixWorld)
      .project(s.camera);
    s.pointer.set(s.scratch.x, s.scratch.y);
    s.hasPointer = true;
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
      id: 'Tutorial QA controller',
      index: 0,
      connected: true,
      mapping: 'standard',
      timestamp: 0,
      buttons,
      axes: [0, 0, 0, 0],
    };
    try {
      Object.defineProperty(navigator, 'getGamepads', {
        configurable: true,
        value: () => [pad],
      });
      const strikes = m.strikeSerial;
      await wait(60);
      buttons[0].pressed = true;
      buttons[0].value = 1;
      await wait(180);
      result.controllerChips = m.strikeSerial > strikes;
      buttons[0].pressed = false;
      buttons[0].value = 0;
      await wait(100);
      result.controllerReleaseStops = !m.firing;
    } finally {
      if (descriptor)
        Object.defineProperty(navigator, 'getGamepads', descriptor);
      else Reflect.deleteProperty(navigator, 'getGamepads');
    }
    result.pass =
      result.liveLetterSounds === 11 &&
      Number(result.skippedLetterSounds) < 5 &&
      result.disabledLetterSounds === 0 &&
      [
        'instructionPersists',
        'skipDoesNotAdvance',
        'firstUpgradeFocused',
        'purchased',
        'returnFocused',
        'singleLivePanel',
        'secondBlock',
        'controllerChips',
        'controllerReleaseStops',
      ].every((k) => result[k] === true);
    return result;
  } finally {
    close();
    await wait(500);
    s.cancelInput();
    m.restore(saved);
    m.pause(false);
    m.emit();
  }
}
