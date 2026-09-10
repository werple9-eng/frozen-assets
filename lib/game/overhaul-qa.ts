import type { GameScene } from './scene';
import { GameModel } from './model';
// Only called by the ?qa=1 practice bench. No storage operations.
export async function overhaulUIAudit(scene: GameScene) {
  const m = scene.model as GameModel,
    saved = m.serialize();
  const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));
  const click = (q: string) =>
    document.querySelector<HTMLButtonElement>(q)?.click();
  const key = (key: string) =>
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
  const failures: unknown[] = [];
  let checked = 0;
  const inspectLabels = (stage: string) => {
    for (const button of document.querySelectorAll<HTMLButtonElement>(
      '.tactile',
    )) {
      if (
        !button.getClientRects().length ||
        !button.querySelector('.kinetic-letter')
      )
        continue;
      const r = button.getBoundingClientRect(),
        f = button.querySelector('.tactile-face')!.getBoundingClientRect();
      const bounds = {
        left: Math.min(r.left, f.left),
        right: Math.max(r.right, f.right),
        top: Math.min(r.top, f.top),
        bottom: Math.max(r.bottom, f.bottom),
      };
      for (const glyph of button.querySelectorAll('.kinetic-letter')) {
        const g = glyph.getBoundingClientRect();
        checked++;
        if (
          g.left < bounds.left - 2 ||
          g.right > bounds.right + 2 ||
          g.top < bounds.top - 2 ||
          g.bottom > bounds.bottom + 2
        ) {
          if (failures.length < 20)
            failures.push({
              stage,
              label: button.textContent?.trim(),
              letter: glyph.textContent,
              bounds,
              glyph: {
                left: g.left,
                right: g.right,
                top: g.top,
                bottom: g.bottom,
              },
            });
        }
      }
    }
  };
  const exercise = async (stage: string) => {
    inspectLabels(stage + ':idle');
    const buttons = Array.from(
      document.querySelectorAll<HTMLButtonElement>('.tactile'),
    ).filter((b) => b.getClientRects().length);
    for (const button of buttons) {
      const r = button.getBoundingClientRect();
      button.dispatchEvent(
        new PointerEvent('pointerover', {
          bubbles: true,
          pointerType: 'mouse',
          clientX: r.right - 4,
          clientY: r.top + 3,
        }),
      );
      button.dispatchEvent(
        new PointerEvent('pointermove', {
          bubbles: true,
          clientX: r.right - 4,
          clientY: r.top + 3,
        }),
      );
    }
    await wait(240);
    inspectLabels(stage + ':hover');
    for (const b of buttons)
      b.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType: 'mouse',
        }),
      );
    await wait(100);
    inspectLabels(stage + ':pressed');
    for (const b of buttons) {
      b.dispatchEvent(
        new PointerEvent('pointerup', { bubbles: true, pointerType: 'mouse' }),
      );
      b.dispatchEvent(
        new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }),
      );
    }
    await wait(500);
    inspectLabels(stage + ':settled');
  };
  try {
    click('[role="dialog"] .bench-return');
    await wait(450);
    m.restart();
    m.campaign!.state.pending = [];
    m.money =
      m.earned =
      m.campaign!.state.grossEarned =
      m.campaign!.state.netEarned =
        250;
    m.emit();
    await wait(250);
    for (const large of [false, true]) {
      m.setSetting('largeUI', large);
      m.setSetting('textSpeed', 1);
      m.emit();
      await exercise(`bench:${large}`);
      click('[aria-label="Pause bench"]');
      await wait(500);
      await exercise(`pause:${large}`);
      click('.pause-menu .save-back');
      await wait(500);
      await exercise(`save:${large}`);
      click('.save-screen .save-back');
      await wait(500);
      click('[role="dialog"] .bench-return');
      await wait(500);
    }
    m.setSetting('largeUI', false);
    m.emit();
    key('u');
    await wait(600);
    const hand = !!document.querySelector('[data-skill="HC-S1"]');
    const distant = Array.from(
      document.querySelectorAll('.map-node.hidden'),
    ).every((n) => getComputedStyle(n).display === 'none');
    const node = document.querySelector<HTMLButtonElement>(
      '[data-skill="HC-P1"]',
    )!;
    node.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }),
    );
    await wait(200);
    const hoverOpened = !!document.querySelector('.node-tooltip:not(.closing)');
    node.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }),
    );
    await wait(170);
    const hoverClosed = !document.querySelector('.node-tooltip');
    // A dispatched pointer event bypasses native hit testing, so separately
    // inspect the computed CSS during the node-to-panel grace period. This
    // is still a page-event audit, not a physical mouse trajectory test.
    node.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }),
    );
    await wait(170);
    const gap = document.querySelector<HTMLElement>('.tree-viewport')!;
    node.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: gap,
      }),
    );
    await wait(32);
    const gracePanel = document.querySelector<HTMLElement>('.node-tooltip');
    const panelGraceHitTestable =
      !!gracePanel?.classList.contains('closing') &&
      getComputedStyle(gracePanel).pointerEvents !== 'none';
    // React derives enter from the matching out event when relatedTarget is
    // already inside its managed tree. A lone pointerover is intentionally
    // ignored, so dispatch both halves of this native boundary sequence.
    if (gracePanel)
      gap.dispatchEvent(
        new PointerEvent('pointerout', {
          bubbles: true,
          pointerType: 'mouse',
          relatedTarget: gracePanel,
        }),
      );
    gracePanel?.dispatchEvent(
      new PointerEvent('pointerover', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: gap,
      }),
    );
    await wait(170);
    const panelEntryCancelsClose = !!document.querySelector(
      '.node-tooltip:not(.closing)',
    );
    gracePanel?.dispatchEvent(
      new PointerEvent('pointerout', {
        bubbles: true,
        pointerType: 'mouse',
        relatedTarget: gap,
      }),
    );
    await wait(170);
    const panelLeaveCloses = !document.querySelector('.node-tooltip');
    key('Tab');
    node.focus();
    await wait(220);
    const focusOpened = !!document.querySelector('.node-tooltip');
    node.blur();
    await wait(170);
    const blurClosed = !document.querySelector('.node-tooltip');
    const tap = (button: HTMLElement, pointerType: string) => {
      button.dispatchEvent(
        new PointerEvent('pointerdown', {
          bubbles: true,
          pointerType,
          button: 0,
        }),
      );
      button.dispatchEvent(
        new PointerEvent('pointerup', {
          bubbles: true,
          pointerType,
          button: 0,
        }),
      );
      button.dispatchEvent(
        new MouseEvent('click', { bubbles: true, detail: 1 }),
      );
    };
    const beforeTouch = m.money;
    tap(node, 'touch');
    await wait(220);
    const touchInspects =
      !!document.querySelector('.node-tooltip') &&
      m.money === beforeTouch &&
      !m.nodes.hand.includes('HC-P1');
    document.querySelector<HTMLElement>('.tree-viewport')!.click();
    await wait(170);
    const emptyTapCloses = !document.querySelector('.node-tooltip');
    tap(node, 'touch');
    await wait(200);
    click('.node-tooltip .tree-buy');
    await wait(500);
    const explicitTouchPurchase =
      m.nodes.hand.includes('HC-P1') && m.money < beforeTouch;
    const mouseNode = document.querySelector<HTMLElement>(
      '[data-skill="HC-C1"]',
    )!;
    mouseNode.dispatchEvent(
      new PointerEvent('pointerover', { bubbles: true, pointerType: 'mouse' }),
    );
    tap(mouseNode, 'mouse');
    await wait(200);
    mouseNode.dispatchEvent(
      new PointerEvent('pointerout', { bubbles: true, pointerType: 'mouse' }),
    );
    await wait(170);
    const mousePurchaseDoesNotPin =
      m.nodes.hand.includes('HC-C1') &&
      !document.querySelector('.node-tooltip');
    // These exercise the missing lifecycle paths from the previous audit:
    // .click() has detail=0 even when no keyboard focus exists; a disabled
    // purchase control may lose focus without delivering a React blur; and
    // native mouse movement can follow keyboard inspection on the same node.
    const regressionNode = document.querySelector<HTMLButtonElement>(
      '[data-skill="HC-C1"]',
    )!;
    regressionNode.blur();
    regressionNode.click();
    await wait(170);
    const unfocusedClickDoesNotPin = !document.querySelector('.node-tooltip');
    key('Tab');
    regressionNode.focus();
    await wait(200);
    const keyboardInspectionOpens = !!document.querySelector('.node-tooltip');
    document.body.dispatchEvent(
      new PointerEvent('pointermove', {
        bubbles: true,
        pointerType: 'mouse',
        clientX: 8,
        clientY: 8,
      }),
    );
    await wait(170);
    const mouseTakesOverKeyboard = !document.querySelector('.node-tooltip');
    regressionNode.blur();
    key('Tab');
    regressionNode.focus();
    await wait(200);
    // Window focus loss does not blur document.activeElement in every browser.
    window.dispatchEvent(new Event('blur'));
    await wait(170);
    const windowBlurCloses = !document.querySelector('.node-tooltip');
    regressionNode.blur();
    const purchaseNode = document.querySelector<HTMLButtonElement>(
      '[data-skill="HC-P2"]',
    )!;
    m.money = Math.max(5000, m.money);
    m.emit();
    key('Tab');
    purchaseNode.focus();
    await wait(200);
    const buyControl = document.querySelector<HTMLButtonElement>(
      '.node-tooltip .tree-buy',
    );
    buyControl?.focus();
    buyControl?.click();
    await wait(220);
    const disabledBuyDoesNotPin =
      m.nodes.hand.includes('HC-P2') &&
      !document.querySelector('.node-tooltip');
    await exercise('map');
    return {
      viewport: [innerWidth, innerHeight],
      checked,
      failures,
      hand,
      distant,
      hoverOpened,
      hoverClosed,
      panelGraceHitTestable,
      panelEntryCancelsClose,
      panelLeaveCloses,
      focusOpened,
      blurClosed,
      touchInspects,
      emptyTapCloses,
      explicitTouchPurchase,
      mousePurchaseDoesNotPin,
      unfocusedClickDoesNotPin,
      keyboardInspectionOpens,
      mouseTakesOverKeyboard,
      windowBlurCloses,
      disabledBuyDoesNotPin,
    };
  } finally {
    click('[role="dialog"] .bench-return');
    await wait(500);
    m.restore(saved);
    m.pause(false);
    m.emit();
  }
}
