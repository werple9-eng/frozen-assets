import type { GameScene } from './scene';
import { GameModel } from './model';
import { forceTutorialStep } from './tutorial-qa';
import { LESSONS } from './tutorial';
import { letterSchedule } from './motion';

// Runs only on the local, isolated practice bench through its declared WebMCP tool.
export async function tutorialUIAudit(s: GameScene) {
  if (!new URLSearchParams(location.search).has('qa'))
    throw Error('Use the isolated ?qa=1 bench');
  const m = s.model as GameModel,
    saved = m.serialize(),
    result: Record<string, unknown> = {};
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const click = (selector: string) =>
    document.querySelector<HTMLButtonElement>(selector)?.click();
  const key = (key: string) =>
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
  const next = async () => {
    click('.tony-continue');
    await wait(90);
  };
  const close = async () => {
    click('[role="dialog"] .bench-return');
    await wait(650);
  };
  const buttonBounds = async (selector: string) => {
    const failures: string[] = [];
    for (const b of document.querySelectorAll<HTMLButtonElement>(selector)) {
      if (b.disabled) continue;
      const r = b.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      b.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          clientX: r.x + r.width / 2,
          clientY: r.y + r.height / 2,
        }),
      );
      await wait(160);
      for (const glyph of b.querySelectorAll('.kinetic-letter')) {
        const g = glyph.getBoundingClientRect();
        if (
          g.left < r.left - 1 ||
          g.right > r.right + 1 ||
          g.top < r.top - 1 ||
          g.bottom > r.bottom + 1
        ) {
          failures.push(b.textContent?.trim() ?? 'button');
          break;
        }
      }
      b.dispatchEvent(
        new PointerEvent('pointerout', {
          bubbles: true,
          relatedTarget: document.body,
        }),
      );
    }
    return failures;
  };
  const bounds = () => {
    const card = document
      .querySelector('.live-dialogue')
      ?.getBoundingClientRect();
    if (!card) return false;
    return (
      Array.from(
        document.querySelectorAll('.live-dialogue .spoken-glyph'),
      ).every((el) => {
        const r = el.getBoundingClientRect();
        return (
          r.left >= card.left - 1 &&
          r.right <= card.right + 1 &&
          r.top >= card.top - 1 &&
          r.bottom <= card.bottom + 1
        );
      }) &&
      card.left >= 0 &&
      card.right <= innerWidth &&
      card.bottom <= innerHeight
    );
  };
  try {
    s.automation = undefined;
    s.cancelInput();
    await close();
    forceTutorialStep(m, 0);
    m.pause(false);
    m.emit();
    await wait(450);
    result.ringingEmptyTray =
      m.phoneRinging && !m.phoneOffHook && m.loot.length === 0;
    s.onOpenPhone();
    await wait(400);
    result.physicalPickup = m.phoneOffHook && s.workshop.handset.position.y > 1;
    const id = m.tutorial!.line;
    await wait(1100);
    result.playerPaced = m.tutorial!.line === id;
    result.singleLivePanel =
      document.querySelectorAll('.live-dialogue').length === 1;

    m.setSetting('textSpeed', 0.5);
    m.setSetting('dialogueSounds', true);
    await next();
    await wait(120);
    const before = s.audio.lettersPlayed;
    forceTutorialStep(m, 1);
    m.pause(false);
    m.emit();
    await wait(180);
    const height =
      document.querySelector<HTMLElement>('.tony-text')!.offsetHeight;
    const text = LESSONS[1].lines[0];
    await wait((letterSchedule(text, 120, 50).at(-1)?.at ?? 0) + 650);
    result.letterSounds = s.audio.lettersPlayed - before;
    result.expectedLetters = Array.from(text).filter((c) =>
      /[\p{L}\p{N}]/u.test(c),
    ).length;
    result.stableLineLayout =
      Math.abs(
        height -
          document.querySelector<HTMLElement>('.tony-text')!.offsetHeight,
      ) < 0.1;
    result.noAutoAdvance = m.tutorial!.step === 1;

    const variants = [];
    for (const speed of [0, 0.5, 0.8, 1])
      for (const large of [false, true]) {
        m.setSetting('textSpeed', speed);
        m.setSetting('largeUI', large);
        m.setSetting('reducedMotion', large);
        forceTutorialStep(m, 0);
        m.answerPhone();
        m.tutorialStep(0, 2, 'dialogue');
        m.pause(false);
        m.emit();
        await wait(180);
        const h =
          document.querySelector<HTMLElement>('.tony-text')!.offsetHeight;
        const beforeSkip = s.audio.lettersPlayed;
        if (speed < 1) await next();
        await wait(380);
        variants.push({
          speed,
          large,
          inBounds: bounds(),
          stable:
            Math.abs(
              h -
                document.querySelector<HTMLElement>('.tony-text')!.offsetHeight,
            ) < 0.1,
          silentSkip: s.audio.lettersPlayed - beforeSkip === 0,
          line: m.tutorial!.line,
        });
      }
    result.typography = variants;
    m.setSetting('largeUI', false);
    m.setSetting('reducedMotion', false);
    m.setSetting('textSpeed', 1);
    forceTutorialStep(m, 7);
    m.pause(false);
    m.emit();
    await wait(200);
    const up = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.hud-top button'),
    ).find((b) => b.textContent?.includes('Upgrades'));
    up?.click();
    await wait(750);
    result.directUpgrades =
      !!document.querySelector('.skill-screen') &&
      !document.querySelector('.pause-screen');
    result.noSettingsInUpgrades = !document.querySelector(
      '.skill-screen nav[aria-label="Station menus"]',
    );
    await next();
    await wait(100);
    const node = document.querySelector<HTMLButtonElement>('.continuous-node');
    result.purchaseFocused = document.activeElement === node;
    result.purchaseFocusElement = document.activeElement?.outerHTML.slice(
      0,
      240,
    );
    node?.click();
    await wait(500);
    result.purchased =
      m.tutorial!.continuous &&
      m.nodes.hand.includes('HC-S1') &&
      m.money === 37;
    result.cannotLeaveAcknowledgement =
      document.querySelector<HTMLButtonElement>(
        '.skill-screen .bench-return',
      )?.disabled;
    await next();
    await wait(100);
    result.returnFocused =
      document.activeElement?.classList.contains('bench-return');
    result.upgradeButtonBounds = await buttonBounds('.skill-screen button');
    await close();
    result.secondParcel =
      m.tutorial!.block === 2 && m.tutorial!.step === 11 && m.loot.length === 6;
    await next();
    key('o');
    await wait(600);
    result.directSettings = !!document.querySelector('.settings-screen');
    result.fourTextSpeeds =
      document.querySelectorAll('.text-speed-options button').length === 4;
    await close();
    key('f');
    await wait(600);
    result.archiveSeparate =
      !!document.querySelector('.phone-screen') &&
      !document.querySelector('.live-dialogue');
    const screen = document.querySelector('.phone-screen');
    result.archiveNoOverflow =
      !!screen && screen.scrollWidth <= screen.clientWidth + 1;
    result.archiveButtonBounds = await buttonBounds('.phone-screen button');
    await close();
    m.restart();
    m.campaign!.deliver();
    m.answerPhone();
    m.emit();
    await wait(350);
    const call = m.liveCall?.id;
    await wait(1400);
    result.campaignCallPersists = !!call && m.liveCall?.id === call;
    await next();
    result.campaignNext = m.liveCall?.id !== call;
    result.pass =
      [
        'ringingEmptyTray',
        'physicalPickup',
        'playerPaced',
        'singleLivePanel',
        'stableLineLayout',
        'noAutoAdvance',
        'directUpgrades',
        'noSettingsInUpgrades',
        'purchaseFocused',
        'purchased',
        'cannotLeaveAcknowledgement',
        'returnFocused',
        'secondParcel',
        'directSettings',
        'fourTextSpeeds',
        'archiveSeparate',
        'archiveNoOverflow',
        'campaignCallPersists',
        'campaignNext',
      ].every((k) => result[k] === true) &&
      result.letterSounds === result.expectedLetters &&
      variants.every(
        (v) => v.inBounds && v.stable && v.silentSkip && v.line === 2,
      ) &&
      (result.upgradeButtonBounds as string[]).length === 0 &&
      (result.archiveButtonBounds as string[]).length === 0;
    return result;
  } finally {
    if (m.tutorial) m.tutorial.mode = 'task';
    await close();
    s.cancelInput();
    m.restore(saved);
    m.pause(false);
    m.emit();
  }
}
