import * as THREE from 'three';
import type { GameScene } from './scene';
import { GameModel } from './model';
import { ALL_TOOL_NODES } from './tool-trees';

// Declared, isolated practice-bench audit. Uses live DOM input and the running
// scene, and restores the checkpoint even when an assertion or animation fails.
export async function polishAudit(
  s: GameScene,
  scenario:
    | 'calls'
    | 'map'
    | 'tools'
    | 'camera'
    | 'phone'
    | 'tool-pages'
    | 'growth',
) {
  if (new URLSearchParams(location.search).get('qa') !== '1')
    throw Error('Practice bench required');
  const m = s.model as GameModel,
    saved = m.serialize(),
    result: Record<string, unknown> = { scenario };
  const wait = (ms: number, inspect?: () => void) =>
    new Promise<void>((resolve) => {
      const start = performance.now();
      const tick = () => {
        inspect?.();
        if (performance.now() - start >= ms) resolve();
        else requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    });
  const click = (selector: string) =>
    document.querySelector<HTMLButtonElement>(selector)?.click();
  const key = (key: string) =>
    document.body.dispatchEvent(
      new KeyboardEvent('keydown', { key, bubbles: true }),
    );
  const close = async () => {
    click('[role="dialog"] .bench-return');
    await wait(700);
  };
  try {
    s.automation = undefined;
    s.cancelInput();
    await close();
    m.restart();
    m.campaign!.state.pending = [];
    m.pause(false);
    m.emit();
    await wait(850);
    if (scenario === 'growth') {
      m.campaign!.unlock('pick');
      m.campaign!.state.pending = [];
      m.selectTool('pick');
      m.money = m.earned = 10000;
      m.emit();
      key('u');
      await wait(600);
      const element = (id: string) =>
        document.querySelector<HTMLButtonElement>(`[data-skill="${id}"]`)!;
      const samples: {
        ms: number;
        child: string;
        path: number;
        scale: string;
      }[] = [];
      const before = m.money,
        start = performance.now();
      click('[data-skill="IP-P1"]');
      await wait(1000, () => {
        const path = document.querySelector('.purchase-travel');
        samples.push({
          ms: Math.round(performance.now() - start),
          child: element('IP-P2').className,
          path: path ? parseFloat(getComputedStyle(path).strokeDashoffset) : -1,
          scale: getComputedStyle(
            element('IP-P2').querySelector('.node-arrival')!,
          ).scale,
        });
      });
      result.delayedChild =
        samples.some((p) => p.ms < 300 && p.child.includes('locked')) &&
        samples.some((p) => p.ms > 380 && p.child.includes('child-revealed'));
      result.travelingPath = samples.some(
        (p) => p.path > 0.05 && p.path < 0.95,
      );
      result.childSpring =
        new Set(
          samples
            .filter((p) => p.child.includes('child-revealed'))
            .map((p) => p.scale),
        ).size > 3;
      result.exactCharge =
        before - m.money === ALL_TOOL_NODES.find((n) => n.id === 'IP-P1')!.cost;
      result.samples = samples.filter((_, i) => i % 4 === 0);
      // Rapid purchases on independent branches must complete both timelines.
      click('[data-skill="IP-S1"]');
      await wait(160);
      click('[data-skill="IP-C1"]');
      await wait(1250);
      result.concurrentDetails = {
        nodes: [...m.nodes.pick],
        active: [...document.querySelectorAll('.fitting,.child-revealed')].map(
          (e) => e.getAttribute('data-skill'),
        ),
      };
      result.concurrentGrowth =
        m.nodes.pick.includes('IP-S1') &&
        m.nodes.pick.includes('IP-C1') &&
        !document.querySelector('.fitting,.child-revealed');
      // One-shot acquisition effects must never replay on reopening.
      await close();
      key('u');
      await wait(650);
      result.noReplay = !document.querySelector(
        '.purchase-travel,.fitting,.child-revealed',
      );
      await close();
      m.setSetting('reducedMotion', true);
      key('u');
      await wait(500);
      click('[data-skill="IP-T1"]');
      await wait(200);
      result.reducedMotion =
        m.nodes.pick.includes('IP-T1') &&
        !document.querySelector('.purchase-travel,.fitting,.child-revealed');
      result.pass =
        result.delayedChild &&
        result.travelingPath &&
        result.childSpring &&
        result.exactCharge &&
        result.concurrentGrowth &&
        result.noReplay &&
        result.reducedMotion;
    } else if (scenario === 'tool-pages') {
      m.campaign!.unlock('grip');
      m.campaign!.unlock('pick');
      m.campaign!.state.pending = [];
      m.selectTool('pick');
      m.money = m.earned = 2500;
      m.emit();
      key('u');
      await wait(800);
      click('[aria-label="Hand chisel upgrades"]');
      await wait(300);
      click('[data-skill="HC-P1"]');
      await wait(350);
      result.otherToolPurchase =
        m.nodes.hand.includes('HC-P1') &&
        !m.nodes.pick.includes('IP-P1') &&
        m.toolId === 'pick';
      const viewport = document.querySelector<HTMLElement>('.tree-viewport')!;
      const bounds = viewport.getBoundingClientRect();
      viewport.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -180,
          clientX: bounds.width * 0.5,
          clientY: bounds.height * 0.45,
        }),
      );
      await wait(800);
      const zoom = () =>
        Number(document.querySelector<HTMLElement>('.tree-map')?.dataset.zoom);
      const handZoom = zoom();
      click('[aria-label="Ice pick upgrades"]');
      await wait(350);
      result.separateView = Math.abs(zoom() - handZoom) > 0.01;
      click('[data-skill="IP-P1"]');
      await wait(350);
      result.separatePurchases =
        m.nodes.hand.includes('HC-P1') &&
        m.nodes.pick.includes('IP-P1') &&
        m.money ===
          2500 -
            ALL_TOOL_NODES.find((n) => n.id === 'HC-P1')!.cost -
            ALL_TOOL_NODES.find((n) => n.id === 'IP-P1')!.cost;
      click('[aria-label="Hand chisel upgrades"]');
      await wait(350);
      result.viewRemembered = Math.abs(zoom() - handZoom) < 0.005;
      const locked = [
        ...document.querySelectorAll<HTMLButtonElement>(
          '.tool-page-tabs button[aria-disabled="true"]',
        ),
      ];
      result.lockedNames =
        locked.length === 4 &&
        locked.every((button) => button.textContent?.trim() === '?');
      result.pass =
        result.otherToolPurchase &&
        result.separateView &&
        result.separatePurchases &&
        result.viewRemembered &&
        result.lockedNames;
    } else if (scenario === 'calls') {
      const c = m.campaign!;
      c.state.flags.push('ch1.more');
      c.state.history.push('ch1.more');
      c.state.call = { event: 'ch1.more', line: 0, status: 'ringing' };
      m.setSetting('textSpeed', 0.5);
      m.answerPhone();
      await wait(250);
      click('.tony-continue');
      await wait(750);
      result.focusedNext =
        document.activeElement?.classList.contains('tony-continue');
      result.settledLetters = [
        ...document.querySelectorAll<HTMLElement>(
          '.tony-continue .kinetic-letter',
        ),
      ].every(
        (e) =>
          !e.style.transform ||
          e.style.transform === 'none' ||
          new DOMMatrix(getComputedStyle(e).transform).m42 === 0,
      );
      result.firstLine = m.liveCall?.id;
      click('.tony-continue');
      await wait(80);
      result.secondLine = m.liveCall?.id;
      click('.tony-continue');
      await wait(80);
      click('.tony-continue');
      await wait(1400);
      result.closed = !m.liveCall && !m.phoneRinging;
      result.readOnce =
        c.state.read.filter((id) => id === 'ch1.more').length === 1;
      result.noRepeat = !c.state.pending.includes('ch1.more');
      result.pass =
        result.focusedNext &&
        result.settledLetters &&
        result.firstLine === 'ch1.more:0' &&
        result.secondLine === 'ch1.more:1' &&
        result.closed &&
        result.readOnce &&
        result.noRepeat;
    } else if (scenario === 'map') {
      key('u');
      await wait(800);
      const v = document.querySelector<HTMLElement>('.tree-viewport')!,
        map = document.querySelector<HTMLElement>('.tree-map')!;
      const r = v.getBoundingClientRect();
      result.fullscreen =
        r.width >= innerWidth - 1 && r.height >= innerHeight - 1;
      result.pointerReachable =
        getComputedStyle(v).pointerEvents !== 'none' &&
        !!document
          .elementFromPoint(r.width * 0.55, r.height * 0.45)
          ?.closest('.tree-viewport');
      result.noExtraNavigation = !document.querySelector(
        '.skill-screen nav:not(.tool-page-tabs)',
      );
      result.noZoomButtons = ![
        ...document.querySelectorAll('.skill-screen button'),
      ].some((b) =>
        /Zoom in|Zoom out/.test(b.getAttribute('aria-label') ?? ''),
      );
      const scale = () => Number(map.dataset.zoom),
        start = scale(),
        samples: number[] = [];
      v.dispatchEvent(
        new WheelEvent('wheel', {
          bubbles: true,
          cancelable: true,
          deltaY: -160,
          clientX: r.width * 0.4,
          clientY: r.height * 0.45,
        }),
      );
      await wait(600, () => samples.push(scale()));
      result.smoothZoom =
        new Set(samples.map((n) => n.toFixed(3))).size > 5 && scale() > start;
      const slider = document.querySelector<HTMLElement>(
        '[aria-label="Upgrades zoom"]',
      )!;
      result.sliderSynchronized =
        Math.abs(
          Number(slider.getAttribute('aria-valuenow')) -
            (100 * (Number(map.dataset.targetZoom) - 0.42)) / (1.65 - 0.42),
        ) < 1;
      slider.dispatchEvent(
        new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
      );
      await wait(650);
      const end = scale();
      await close();
      key('u');
      await wait(800);
      result.viewRemembered =
        Math.abs(
          Number(
            document.querySelector<HTMLElement>('.tree-map')?.dataset.zoom,
          ) - end,
        ) < 0.01;
      result.pass =
        result.fullscreen &&
        result.pointerReachable &&
        result.noExtraNavigation &&
        result.noZoomButtons &&
        result.smoothZoom &&
        result.sliderSynchronized &&
        result.viewRemembered;
    } else if (scenario === 'tools') {
      m.campaign!.unlock('pick');
      m.campaign!.state.pending = [];
      m.selectTool('pick');
      const point = new THREE.Vector3();
      s.automation = () => {
        point.set(0, 3, 0).applyMatrix4(s.ice.matrixWorld).project(s.camera);
        s.pointer.set(point.x, point.y);
        s.hasPointer = true;
      };
      await wait(1000);
      s.raycaster.setFromCamera(s.pointer, s.camera);
      const hit = s.raycaster.intersectObject(s.ice, false)[0];
      if (!hit) throw Error('Contact fixture missed ice');
      const initial = m.strikeSerial,
        start = performance.now();
      let impactAt = 0,
        cycleAt = 0,
        maxLift = 0,
        maxJump = 0;
      const previous = s.workshop.hand.position.clone();
      m.press();
      m.release();
      await wait(750, () => {
        if (m.strikeSerial > initial && !impactAt)
          impactAt = performance.now() - start;
        if (impactAt && !m.strike.active && !cycleAt)
          cycleAt = performance.now() - start;
        maxLift = Math.max(
          maxLift,
          s.workshop.hand.position.distanceTo(s.toolFollow.displayPosition),
        );
        maxJump = Math.max(
          maxJump,
          s.toolFollow.displayPosition.distanceTo(previous),
        );
        previous.copy(s.toolFollow.displayPosition);
      });
      result.impactMs = Math.round(impactAt);
      result.cycleMs = Math.round(cycleAt);
      result.anticipationLift = +maxLift.toFixed(3);
      result.oneImpact = m.strikeSerial - initial === 1;
      result.maxFollowStep = +maxJump.toFixed(3);
      result.pass =
        impactAt >= 180 &&
        impactAt < 270 &&
        cycleAt >= 495 &&
        cycleAt < 590 &&
        maxLift > 0.2 &&
        result.oneImpact;
    } else if (scenario === 'phone') {
      s.pointer.set(0.8, -0.8);
      s.hasPointer = true;
      m.campaign!.state.pending = ['ch1.intro'];
      m.campaign!.deliver();
      m.emit();
      let peak = 0,
        focus = 0;
      await wait(1500, () => {
        const p = s.workshop.phone.getWorldPosition(new THREE.Vector3()),
          base = p.clone();
        base.y -=
          (s.workshop.phone.position.y - 3.375) * s.workshop.group.scale.y;
        peak = Math.max(
          peak,
          (Math.abs(p.project(s.camera).y - base.project(s.camera).y) *
            s.host.clientHeight) /
            2,
        );
        focus = Math.max(
          focus,
          Number(
            s.host.parentElement?.style.getPropertyValue(
              '--phone-focus-opacity',
            ),
          ),
        );
      });
      result.liftPixels = +peak.toFixed(2);
      result.focusOpacity = focus;
      s.automation = () => {
        const p = s.workshop.phone
          .getWorldPosition(new THREE.Vector3())
          .project(s.camera);
        s.pointer.set(p.x, p.y);
        s.hasPointer = true;
      };
      await wait(400);
      result.hoverReleasedFocus =
        s.host.parentElement?.style.getPropertyValue(
          '--phone-focus-opacity',
        ) === '0';
      s.onOpenPhone();
      await wait(600);
      result.pickedUp = m.phoneOffHook && s.workshop.handset.position.y > 1;
      result.pass =
        peak >= 3 &&
        peak <= 13 &&
        focus > 0 &&
        focus <= 0.15 &&
        result.hoverReleasedFocus &&
        result.pickedUp;
    } else {
      const widths = [];
      for (const z of [0, 0.5, 1]) {
        m.setSetting('gameplayZoom', z);
        await wait(850);
        s.ice.updateMatrixWorld(true);
        const bounds = s.ice.userData.deliveryBounds as THREE.Box3;
        const corners = [];
        for (const x of [bounds.min.x, bounds.max.x])
          for (const y of [bounds.min.y, bounds.max.y])
            for (const z of [bounds.min.z, bounds.max.z])
              corners.push(
                new THREE.Vector3(x, y, z)
                  .applyMatrix4(s.ice.matrixWorld)
                  .project(s.camera),
              );
        widths.push({
          zoom: z,
          width:
            (Math.max(...corners.map((p) => p.x)) -
              Math.min(...corners.map((p) => p.x))) /
            2,
          height:
            (Math.max(...corners.map((p) => p.y)) -
              Math.min(...corners.map((p) => p.y))) /
            2,
          finite: corners.every(
            (p) =>
              Number.isFinite(p.x) &&
              Number.isFinite(p.y) &&
              p.z > -1 &&
              p.z < 1,
          ),
        });
      }
      result.views = widths;
      result.pass =
        widths.every((v) => v.finite && v.width <= 0.9 && v.height <= 0.9) &&
        widths[2].width > widths[0].width;
    }
    return result;
  } finally {
    await close();
    s.automation = undefined;
    s.cancelInput();
    m.restore(saved);
    m.pause(false);
    m.emit();
    s.turntable.home();
  }
}
