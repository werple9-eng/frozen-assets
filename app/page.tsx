'use client';
import { DeliveryComplete } from '@/components/game/delivery-complete';
import {
  ConditionCue,
  type ConditionCueData,
} from '@/components/game/condition-cue';
import { CustodyTag, type HandlingTag } from '@/components/game/custody-tag';
import './campaign.css';
import './motion.css';
import './first-time.css';
import './landline.css';
import './polish.css';
import { PhoneDial } from '@/components/game/phone-dial';
import { TonyPanel } from '@/components/game/tony-panel';
import { IncomingCall } from '@/components/game/incoming-call';
import { MenuHeader } from '@/components/game/menu-header';
import { TutorialBoard } from '@/components/game/tutorial-board';
import { TutorialDebug } from '@/components/game/tutorial-debug';
import { MECHANIC_NODE } from '@/lib/game/tool-trees';
import { MUG_LINES, nextMugLine } from '@/lib/game/mug';
import { GRAPHICS, GRAPHICS_LEVELS } from '@/lib/game/graphics';
import {
  AmbientThought,
  type Thought,
} from '@/components/game/ambient-thought';
import { tutorialControl } from '@/lib/game/tutorial-qa';
import { tutorialCanWork, tutorialMessage } from '@/lib/game/tutorial';
import { SpringNumber, Presence, Milestone } from '@/components/game/motion';
import { SaveMenu } from '@/components/game/save-menu';
import { SaveSlots, SLOT_KEY, type SaveSlot } from '@/lib/game/save-slots';
import { TOOLS, type ToolId } from '@/lib/game/campaign-content';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameScene } from '@/lib/game/scene';
import { GameModel, SAVE_KEY, type Settings } from '@/lib/game/model';
import { TactileButton, DotCursor } from '@/components/game/tactile';
import { SkillTree, type ToolMapViews } from '@/components/game/upgrade-map';
import { ToolSelector, ToolGlyph } from '@/components/game/tool-selector';
import { ToolDisplay } from '@/components/game/tool-display';
import { ZoomSlider } from '@/components/game/zoom-slider';
import { registerGameTools } from '@/lib/game/webmcp';
import {
  BrowserSaveBackend,
  MemorySaveBackend,
  SaveService,
  ActionInput,
  KEY_ACTIONS,
  type GameAction,
} from '@/lib/game/platform';
import { Phone } from '@/components/game/phone';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogFooter,
} from '@/components/ui/alert-dialog';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { Progress } from '@/components/ui/progress';
type Menu =
  | 'saves'
  | 'skills'
  | 'settings'
  | 'pause'
  | 'phone'
  | 'tools'
  | null;
type Reward = { id: number; value: number; x: number; y: number };
const initial = new GameModel().snapshot();
const TREE_VIEW_KEY = 'frozen-assets-tool-map-views-v2';
const dollars = (n: number) => `$${n.toLocaleString()}`;
export default function Home() {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<GameScene | null>(null),
    game = useRef<GameModel | null>(null);
  const [s, setS] = useState(initial),
    [menu, setMenu] = useState<Menu>(null),
    [restart, setRestart] = useState(false),
    [failure, setFailure] = useState(''),
    [rotate, setRotate] = useState(false),
    [rotated, setRotated] = useState(false),
    [rewards, setRewards] = useState<Reward[]>([]),
    [moneyPulse, setMoneyPulse] = useState(0),
    [testing, setTesting] = useState(false);
  const menuRef = useRef<Menu>(null),
    rewardId = useRef(0);
  const [thought, setThought] = useState<Thought | null>(null);
  const mugHistory = useRef<number[]>([]);
  const [treeView, setTreeView] = useState<ToolMapViews>({});
  const [requestedTool, setRequestedTool] = useState<ToolId | undefined>();
  const menuAction = useRef<(menu: Menu) => void>(() => {});
  const repository = useRef<SaveSlots | null>(null),
    activeSlot = useRef<number | null>(null);
  const [slots, setSlots] = useState<SaveSlot[]>(
    Array.from({ length: 3 }, () => ({ raw: null, updated: 0 })),
  );
  const [slotIndex, setSlotIndex] = useState(0),
    [started, setStarted] = useState(false);
  const [milestone, setMilestone] = useState<{
    label: string;
    title: string;
    kind: 'chapter' | 'tool' | 'delivery';
    id: number;
  } | null>(null);
  const previousMilestone = useRef({ chapter: 0, tools: '', round: -1 });
  const upgradeFocus =
    menu === 'skills' && s.tutorial?.mode === 'task'
      ? s.tutorial.step === 8
        ? '[data-skill="HC-S1"]'
        : '.skill-screen .bench-return'
      : null;
  useEffect(() => {
    if (!upgradeFocus) return;
    const frame = requestAnimationFrame(() =>
      document
        .querySelector<HTMLButtonElement>(upgradeFocus)
        ?.focus({ preventScroll: true }),
    );
    return () => cancelAnimationFrame(frame);
  }, [upgradeFocus]);
  useEffect(() => {
    if (s.tutorial?.stage !== 'chapter' || menu) return;
    const timer = setTimeout(() => game.current?.finishTutorial(), 2900);
    return () => clearTimeout(timer);
  }, [s.tutorial?.stage, menu]);
  useEffect(() => {
    const chapter = s.campaign?.chapter ?? 1,
      tools = s.campaign?.tools.join(':') ?? '';
    const previous = previousMilestone.current;
    previousMilestone.current = { chapter, tools, round: s.round };
    if (
      !previous.chapter ||
      !started ||
      (s.tutorial && s.tutorial.stage !== 'done')
    )
      return;
    const added = s.campaign?.tools.find(
      (id) => !previous.tools.split(':').includes(id),
    );
    if (chapter !== previous.chapter) {
      setMilestone({
        id: Date.now(),
        label: added ? 'PLACED IN YOUR WORKSHOP' : `CHAPTER ${chapter}`,
        title: added
          ? TOOLS.find((t) => t.id === added)!.name
          : (s.campaign?.chapterName ?? 'Recovery'),
        kind: added ? 'tool' : 'chapter',
      });
    }
  }, [
    s.campaign?.chapter,
    s.campaign?.tools,
    s.campaign?.chapterName,
    s.round,
    started,
    s.tutorial,
  ]);
  useEffect(() => {
    if (!milestone) return;
    const timeout = setTimeout(() => setMilestone(null), 3100);
    return () => clearTimeout(timeout);
  }, [milestone]);
  useEffect(() => {
    if (menu !== 'skills' || ![9, 10].includes(s.tutorial?.step ?? -1)) return;
    // Let the dialog finish repairing focus after the previous message unmounts.
    const focus = setTimeout(
      () =>
        document
          .querySelector<HTMLElement>(
            s.tutorial?.step === 9
              ? '.skill-screen .tony-continue'
              : '.skill-screen .bench-return',
          )
          ?.focus(),
      80,
    );
    return () => clearTimeout(focus);
  }, [menu, s.tutorial?.step]);
  useEffect(() => {
    let disposed = false,
      cleanup = () => {};
    const qa =
      ['localhost', '127.0.0.1'].includes(location.hostname) &&
      new URLSearchParams(location.search).get('qa') === '1';
    const storage = new SaveService(
      qa ? new MemorySaveBackend() : new BrowserSaveBackend(SAVE_KEY),
    );
    const boot = async () => {
      if (!qa) {
        try {
          const view = JSON.parse(
            localStorage.getItem(TREE_VIEW_KEY) ?? 'null',
          );
          if (view && typeof view === 'object') {
            const views: ToolMapViews = {};
            for (const { id } of TOOLS) {
              const v = view[id];
              if (
                v &&
                [v.x, v.y, v.zoom].every(Number.isFinite) &&
                Math.abs(v.x) < 10000 &&
                Math.abs(v.y) < 10000 &&
                v.zoom >= 0.42 &&
                v.zoom <= 1.65
              )
                views[id] = v;
            }
            setTreeView(views);
          }
        } catch {
          /* View preferences never block a recovery save. */
        }
      }
      let raw: string | null = null;
      try {
        const saves = new SaveSlots(
          new SaveService(
            qa ? new MemorySaveBackend() : new BrowserSaveBackend(SLOT_KEY),
          ),
          storage,
        );
        const catalog = await saves.load();
        repository.current = saves;
        raw = catalog.slots[catalog.active].raw;
        if (!disposed) {
          setSlots([...catalog.slots]);
          setSlotIndex(catalog.active);
        }
      } catch {
        if (!disposed)
          setFailure(
            'The save files could not be read. Your original recovery is preserved. Reload to try again.',
          );
      }
      if (disposed) return;
      const m = new GameModel(raw, { tutorial: !raw });
      game.current = m;
      const save = () => {
        if (activeSlot.current === null || !repository.current) return;
        void repository.current.put(activeSlot.current, m.serialize()).then(
          () => {
            m.saveStatus = 'saved';
          },
          () => {
            m.saveStatus = 'unavailable';
            m.emit();
          },
        );
      };
      m.onSave = save;
      menuRef.current = 'saves';
      setMenu('saves');
      m.pause(true);
      let engine: GameScene;
      try {
        engine = new GameScene(host.current!, m);
        scene.current = engine;
      } catch {
        // Renderer initialization is an external system; report its failure to the player.
        // eslint-disable-next-line react/react-compiler
        setFailure(
          'The 3D renderer could not start. Enable browser hardware acceleration and reload.',
        );
        return;
      }
      m.onSound = (kind, intensity) => engine.audio.sound(kind, intensity);
      m.onBurst = (point, count, fragment) =>
        engine.burst(point, count, fragment);
      m.onImpact = (t) => {
        engine.impact(t);
        if (t.story) return;
        const g = engine.lootMeshes.get(t.id);
        if (!g) return;
        const p = engine.contents
            .localToWorld(engine.scratch.set(t.x, t.y, t.z))
            .project(engine.camera),
          r = host.current!.getBoundingClientRect(),
          id = ++rewardId.current,
          x = Math.max(
            80,
            Math.min(r.width - 80, r.left + ((p.x + 1) * r.width) / 2),
          ),
          impactY = r.top + ((1 - p.y) * r.height) / 2;
        // Capture scalar coordinates now: the renderer reuses its scratch vector
        // before React necessarily executes this state updater.
        setRewards((prev) => {
          let y = impactY;
          // Resolve nearby impact labels into local vertical lanes, never a HUD queue.
          while (
            prev.some(
              (old) => Math.abs(old.x - x) < 140 && Math.abs(old.y - y) < 48,
            )
          )
            y -= 52;
          return [
            ...prev.slice(-15),
            {
              id,
              value: t.value,
              x,
              y,
            },
          ];
        });
        setMoneyPulse(id);
      };
      engine.onViewChange = () => {
        setRotate(engine.rotateMode);
        setRotated(engine.turntable.demonstrated);
      };
      const phone = () => {
        engine.messageBusy = false;
        engine.cancelInput();
        engine.phoneOrigin();
        engine.audio.init();
        m.answerPhone();
      };
      const files = () => {
        engine.cancelInput();
        menuRef.current = 'phone';
        setMenu('phone');
        m.pause(true);
      };
      engine.onOpenPhone = phone;
      engine.onOpenFiles = files;
      engine.filesOpenRef = menuRef;
      engine.onMugClick = () => {
        const index = nextMugLine(mugHistory.current);
        mugHistory.current = [index, ...mugHistory.current].slice(0, 2);
        engine.audio.init();
        engine.audio.sound('mug', 1);
        setThought({ id: Date.now(), text: MUG_LINES[index] });
      };
      engine.onDialKey = (key) =>
        window.dispatchEvent(
          new CustomEvent('recovery:dial-key', { detail: key }),
        );
      m.onTutorial = () => {
        engine.phoneOrigin();
      };
      m.onPhone = () => {
        engine.phoneOrigin();
        m.emit();
      };
      m.onChange = () => {
        setTesting(qa);
        engine.audio.masterVolume = m.settings.master;
        engine.audio.effects = m.settings.effects;
        engine.audio.muted = m.settings.muted;
        engine.audio.volume();
        if (m.phase === 'paused' && !menuRef.current) {
          menuRef.current = 'pause';
          setMenu('pause');
        } else if (
          m.phase !== 'paused' &&
          m.phase !== 'completed' &&
          menuRef.current
        ) {
          menuRef.current = null;
          setMenu(null);
        }
        setS(m.snapshot());
      };
      const unregister = registerGameTools(engine, () => m.snapshot());
      const keys = (e: KeyboardEvent) => {
        if (
          e.defaultPrevented ||
          e.repeat ||
          (e.target as HTMLElement)?.closest('input,[role="slider"]')
        )
          return;
        if (m.dialing && (e.key === 'Escape' || /^[0-9*#]$/.test(e.key))) {
          e.preventDefault();
          if (e.key === 'Escape') m.hangUp();
          else {
            engine.onDialKey(e.key);
          }
          return;
        }
        if (
          e.key === 'Escape' &&
          (e.target as HTMLElement)?.closest(
            '[role="dialog"],[role="alertdialog"]',
          )
        )
          return;
        if (
          e.key === 'Escape' &&
          m.phase !== 'paused' &&
          m.phase !== 'completed'
        ) {
          e.preventDefault();
          e.stopPropagation();
          engine.cancelInput();
          menuRef.current = 'pause';
          setMenu('pause');
          m.pause(true);
        }
        if (m.phase === 'playing' && e.key.toLowerCase() === 'o') {
          e.preventDefault();
          engine.cancelInput();
          menuRef.current = 'settings';
          setMenu('settings');
          m.pause(true);
          return;
        }
        if (m.phase === 'playing') {
          if (e.key.toLowerCase() === 'm') {
            e.preventDefault();
            engine.room.tapMug();
            engine.onMugClick();
            return;
          }
          if (e.key.toLowerCase() === 'f') {
            e.preventDefault();
            files();
            return;
          }
          if (m.phoneRinging && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            phone();
            return;
          }
          const a = KEY_ACTIONS[e.key] || KEY_ACTIONS[e.key.toLowerCase()];
          if (a === 'OPEN_PHONE') {
            e.preventDefault();
            phone();
            return;
          }
          if (a === 'TOOL_NEXT') m.cycleTool(1);
          if (a === 'TOOL_PREVIOUS') m.cycleTool(-1);
          if (e.key.toLowerCase() === 'r') {
            engine.audio.init();
            m.refill();
          }
          if (e.key === '1') m.selectMode('precision');
          if (e.key === '2') m.selectMode('wide');
          if (e.key.toLowerCase() === 'u') {
            if (m.inTutorial && m.tutorial!.step < 7) return;
            menuAction.current('skills');
          }
        }
      };
      const loseFocus = () => {
          engine.cancelInput();
          save();
        },
        hide = () => {
          if (document.hidden) loseFocus();
        };
      const hover = (e: PointerEvent) => {
        const b = (e.target as HTMLElement)?.closest('button,[role="switch"]');
        if (
          b &&
          !b.contains(e.relatedTarget as Node) &&
          !(b as HTMLButtonElement).disabled
        )
          engine.audio.ui('hover');
      };
      const press = (e: PointerEvent) => {
        if ((e.target as HTMLElement)?.closest('button,[role="switch"]')) {
          engine.audio.init();
          engine.audio.ui('press');
        }
      };
      window.addEventListener('keydown', keys, true);
      window.addEventListener('blur', loseFocus);
      window.addEventListener('pagehide', loseFocus);
      document.addEventListener('visibilitychange', hide);
      document.addEventListener('pointerover', hover);
      document.addEventListener('pointerdown', press);
      const input = new ActionInput();
      let padFrame = 0,
        focusClock = 0,
        previousPadTime = 0;
      const dispatch = (a: GameAction, down: boolean) => {
        if (m.toolNotice) {
          if (down && a === 'CONFIRM')
            (document.activeElement as HTMLElement)?.click();
          if (down && (a === 'BACK' || a === 'PAUSE')) m.dismissToolNotice();
          return;
        }
        if (a === 'PRIMARY_ACTION') {
          if (down && !m.paused) {
            engine.hasPointer = true;
            m.press();
          } else if (!m.toggle) m.release();
          return;
        }
        if (a === 'CONFIRM' && !down && !menuRef.current && !m.toggle)
          m.release();
        if (a === 'ROTATE') {
          if (down) m.stop();
          return;
        }
        if (!down) return;
        if (a === 'SECONDARY_ACTION') {
          if (m.thermal && !m.paused) m.refill();
          return;
        }
        if (a === 'OPEN_PHONE') {
          phone();
          return;
        }
        if (a === 'TOOL_NEXT') {
          if (menuRef.current === 'skills') {
            window.dispatchEvent(
              new CustomEvent('recovery:tree-tool', {
                detail: { direction: 1 },
              }),
            );
            return;
          }
          m.cycleTool(1);
          return;
        }
        if (a === 'TOOL_PREVIOUS') {
          if (menuRef.current === 'skills') {
            window.dispatchEvent(
              new CustomEvent('recovery:tree-tool', {
                detail: { direction: -1 },
              }),
            );
            return;
          }
          m.cycleTool(-1);
          return;
        }
        if (a === 'OPEN_UPGRADES') {
          if (m.phase === 'completed') return;
          menuAction.current('skills');
          return;
        }
        if (a === 'BACK' || a === 'PAUSE') {
          if (m.dialing) {
            m.hangUp();
            return;
          }
          if (menuRef.current === 'saves' && activeSlot.current === null)
            return;
          if (m.phase === 'completed' && !menuRef.current) return;
          engine.cancelInput();
          menuAction.current(menuRef.current ? null : 'pause');
          return;
        }
        if (a === 'CONFIRM') {
          if (m.dialing) {
            (document.activeElement as HTMLElement)?.click();
            return;
          }
          if (m.settlement && !menuRef.current) {
            m.skipSettlement();
            return;
          }
          if (m.phoneRinging && !menuRef.current) {
            phone();
            return;
          }
          if (m.liveCall && !menuRef.current) {
            window.dispatchEvent(new Event('recovery:dialogue-confirm'));
            return;
          }
          if (m.tutorial?.stage === 'board') {
            document
              .querySelector<HTMLButtonElement>('.board-continue')
              ?.click();
            return;
          }
          if (m.inTutorial && !menuRef.current) {
            if (tutorialCanWork(m.tutorial!) && !tutorialMessage(m.tutorial!))
              m.press();
            else window.dispatchEvent(new Event('recovery:dialogue-confirm'));
            return;
          }
          if (m.settlement) m.skipSettlement();
          else if (menuRef.current || m.paused)
            (document.activeElement as HTMLElement)?.click();
          else m.press();
        }
      };
      const pollPad = (now: number) => {
        const dt = previousPadTime
          ? Math.min(0.05, (now - previousPadTime) / 1000)
          : 0;
        previousPadTime = now;
        const pad = navigator.getGamepads?.()[0];
        if (pad && document.hasFocus()) {
          for (const e of input.sample(pad.buttons)) dispatch(e.action, e.down);
          if (m.paused) {
            const sx = Math.abs(pad.axes[2] ?? 0) > 0.16 ? pad.axes[2] : 0,
              sy = Math.abs(pad.axes[3] ?? 0) > 0.16 ? pad.axes[3] : 0;
            if (menuRef.current === 'skills' && (sx || sy))
              window.dispatchEvent(
                new CustomEvent('recovery:map-action', {
                  detail: pad.buttons[6]?.pressed
                    ? { zoom: -sy * dt * 0.5 }
                    : { x: sx * dt * 650, y: sy * dt * 650 },
                }),
              );
            if (menuRef.current === 'phone' && sy) {
              const log =
                document.querySelector<HTMLElement>('.message-history');
              if (log) log.scrollTop += sy * dt * 650;
            }
          }
          if (!m.paused && !m.dialing) {
            const dx = Math.abs(pad.axes[0]) > 0.16 ? pad.axes[0] : 0,
              dy = Math.abs(pad.axes[1]) > 0.16 ? pad.axes[1] : 0;
            if (dx || dy) {
              engine.hasPointer = true;
              engine.pointer.x = Math.max(
                -0.96,
                Math.min(0.96, engine.pointer.x + dx * dt * 1.1),
              );
              engine.pointer.y = Math.max(
                -0.96,
                Math.min(0.96, engine.pointer.y - dy * dt * 1.1),
              );
            }
            if (Math.abs(pad.axes[2] ?? 0) > 0.16) {
              m.stop();
              engine.turntable.targetYaw += (pad.axes[2] ?? 0) * dt * 2.1;
            }
          } else if (now - focusClock > 180) {
            const direction =
              pad.buttons[13]?.pressed ||
              pad.buttons[15]?.pressed ||
              (menuRef.current === 'skills' &&
                ((pad.axes[0] ?? 0) > 0.5 || (pad.axes[1] ?? 0) > 0.5))
                ? 1
                : pad.buttons[12]?.pressed ||
                    pad.buttons[14]?.pressed ||
                    (menuRef.current === 'skills' &&
                      ((pad.axes[0] ?? 0) < -0.5 || (pad.axes[1] ?? 0) < -0.5))
                  ? -1
                  : 0;
            if (direction) {
              const focused = document.activeElement as HTMLElement | null;
              if (
                menuRef.current === 'skills' &&
                !m.inTutorial &&
                focused?.matches('[data-skill]')
              ) {
                const key =
                  pad.buttons[12]?.pressed || (pad.axes[1] ?? 0) < -0.5
                    ? 'ArrowUp'
                    : pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.5
                      ? 'ArrowDown'
                      : direction > 0
                        ? 'ArrowRight'
                        : 'ArrowLeft';
                focused.dispatchEvent(
                  new KeyboardEvent('keydown', { key, bubbles: true }),
                );
                focusClock = now;
                padFrame = requestAnimationFrame(pollPad);
                return;
              }
              if (
                menuRef.current === 'skills' &&
                !m.inTutorial &&
                (pad.buttons[13]?.pressed || (pad.axes[1] ?? 0) > 0.5)
              ) {
                document
                  .querySelector<HTMLButtonElement>(
                    '.tree-map [data-skill="root"]',
                  )
                  ?.focus();
                focusClock = now;
                padFrame = requestAnimationFrame(pollPad);
                return;
              }
              if (
                focused?.getAttribute('role') === 'slider' &&
                (pad.buttons[14]?.pressed || pad.buttons[15]?.pressed)
              ) {
                focused.dispatchEvent(
                  new KeyboardEvent('keydown', {
                    key: direction > 0 ? 'ArrowRight' : 'ArrowLeft',
                    bubbles: true,
                  }),
                );
                focusClock = now;
                padFrame = requestAnimationFrame(pollPad);
                return;
              }
              const els = Array.from(
                document.querySelectorAll<HTMLElement>(
                  '[role="dialog"] button:not(:disabled),[role="dialog"] [role="slider"],[role="dialog"] [role="switch"],.phone-dial button',
                ),
              ).filter((el) => {
                const r = el.getBoundingClientRect();
                return r.width > 0 && r.height > 0;
              });
              const index = els.indexOf(document.activeElement as HTMLElement);
              els[(index + direction + els.length) % els.length]?.focus();
              focusClock = now;
            }
          }
        } else if (input.previous.size) {
          input.reset();
          m.stop();
        }
        padFrame = requestAnimationFrame(pollPad);
      };
      padFrame = requestAnimationFrame(pollPad);
      m.emit();
      cleanup = () => {
        cancelAnimationFrame(padFrame);
        save();
        unregister();
        window.removeEventListener('keydown', keys, true);
        window.removeEventListener('blur', loseFocus);
        window.removeEventListener('pagehide', loseFocus);
        document.removeEventListener('visibilitychange', hide);
        document.removeEventListener('pointerover', hover);
        document.removeEventListener('pointerdown', press);
        engine.dispose();
      };
    };
    void boot();
    return () => {
      disposed = true;
      cleanup();
    };
  }, []);
  const action = (fn: (m: GameModel) => void) => {
    const m = game.current;
    if (m) {
      scene.current?.audio.init();
      fn(m);
      m.emit();
    }
  };
  const setting = <K extends keyof Settings>(key: K, value: Settings[K]) =>
    action((m) => m.setSetting(key, value));
  const openMenu = (next: Menu, tool?: ToolId) => {
    const t = game.current?.tutorial;
    if (next === 'skills' && t && t.stage !== 'done' && t.step < 7) return;
    if (
      next === null &&
      menuRef.current === 'skills' &&
      t?.step === 9 &&
      t.mode === 'dialogue'
    )
      return;
    if (next === null && activeSlot.current === null) next = 'saves';
    if (next === 'saves' && repository.current) {
      game.current?.onSave();
      setSlots([...repository.current.data.slots]);
    }
    if (next === 'phone') scene.current?.phoneOrigin();
    if (next === 'skills') setRequestedTool(tool);
    scene.current?.cancelInput();
    scene.current?.audio.ui(next ? 'open' : 'close');
    menuRef.current = next;
    setMenu(next);
    action((m) => {
      m.pause(!!next);
      m.tutorialMenu(next);
    });
  };
  const reset = () => {
    setRestart(false);
    menuRef.current = null;
    setMenu(null);
    setRewards([]);
    action((m) => {
      scene.current?.cancelInput();
      scene.current?.clearParticles();
      scene.current?.turntable.home();
      m.startTutorial();
      scene.current?.enterWorkshop();
    });
  };
  useEffect(() => {
    menuAction.current = openMenu;
  });
  const fuel = Math.max(0, (s.fuel / s.capacity) * 100),
    busy = s.phase !== 'playing' || !!s.settlement;
  const navigation = (active: Menu = null) => (
    <header className="hud-top" data-hud>
      <TactileButton
        className="station-mark"
        aria-label="Pause bench"
        onClick={() => openMenu('pause')}
      >
        <span className="machine-mark">F/A</span>
        <div>
          <h1>FROZEN ASSETS</h1>
        </div>
      </TactileButton>
      {active !== 'skills' && (
        <nav aria-label="Station menus" data-active={active || 'bench'}>
          <TactileButton
            className={
              s.tutorial?.step === 7 && s.tutorial.stage !== 'done'
                ? 'tutorial-upgrades-target'
                : undefined
            }
            disabled={
              !!s.tutorial && s.tutorial.stage !== 'done' && s.tutorial.step < 7
            }
            onClick={() => openMenu('skills')}
          >
            Upgrades <kbd>U</kbd>
          </TactileButton>
          <TactileButton
            disabled={!!s.tutorial && s.tutorial.stage !== 'done'}
            aria-current={active === 'tools' ? 'page' : undefined}
            onClick={() => openMenu(active === 'tools' ? null : 'tools')}
          >
            Tools
          </TactileButton>
          <TactileButton
            aria-current={active === 'settings' ? 'page' : undefined}
            onClick={() => openMenu(active === 'settings' ? null : 'settings')}
          >
            Settings <kbd>O</kbd>
          </TactileButton>
          <i className="nav-marker" />
        </nav>
      )}
      <div className="balance" data-pulse={moneyPulse}>
        <span>RECOVERED FUNDS</span>
        <strong aria-label={`Available funds: ${s.money} dollars`}>
          <SpringNumber value={menu ? s.money : s.visibleMoney} />
        </strong>
      </div>
    </header>
  );
  const comfortClass = `${s.settings.largeUI ? 'large-ui' : ''} ${s.settings.reducedMotion ? 'reduced-motion' : ''}`;
  const teaching = !!s.tutorial && s.tutorial.stage !== 'done';
  const recoveryCondition = s as typeof s & {
    conditionCue?: ConditionCueData | null;
    conditionRisk?: number;
    handlingTag?: HandlingTag | null;
  };
  const guide =
    teaching && s.tutorial?.message && !s.settlement ? (
      <TonyPanel
        line={s.tutorial.message}
        speed={s.settings.textSpeed}
        sounds={s.settings.dialogueSounds}
        sound={(c) => scene.current?.audio.letter(c)}
        advance={() =>
          action((m) => {
            m.advanceTutorial();
          })
        }
      />
    ) : null;
  return (
    <main
      data-menu={menu || 'bench'}
      data-tutorial={teaching ? s.tutorial?.step : undefined}
      data-tutorial-stage={teaching ? s.tutorial?.stage : undefined}
      className={`game-shell ${comfortClass} ${rotate ? 'rotation-mode' : ''} ${!menu && !teaching && (recoveryCondition.conditionRisk ?? 0) > 0.05 ? 'condition-risk' : ''}`}
    >
      <div className="scene" ref={host} />
      <div className="phone-focus" aria-hidden="true" />
      {failure && (
        <div className="render-error" role="alert">
          {failure}
          <TactileButton onClick={() => location.reload()}>
            Reload
          </TactileButton>
        </div>
      )}
      {!menu && (!teaching || s.tutorial!.step > 0) && navigation()}
      {!menu && (!teaching || s.tutorial!.step > 1) && (
        <ZoomSlider
          label="Gameplay zoom"
          value={s.settings.gameplayZoom}
          onChange={(v) => setting('gameplayZoom', v)}
        />
      )}
      {milestone && <Milestone key={milestone.id} {...milestone} />}
      {!menu &&
        (teaching
          ? guide
          : s.liveCall && (
              <TonyPanel
                line={s.liveCall}
                speed={s.settings.textSpeed}
                sounds={s.settings.dialogueSounds}
                sound={(c) => scene.current?.audio.letter(c)}
                advance={() =>
                  action((m) => {
                    m.advanceCall(s.liveCall?.id);
                  })
                }
              />
            ))}
      {!menu && s.phone.ringing && (
        <IncomingCall
          call={s.campaign?.call}
          tutorial={teaching}
          onAnswer={() => action((m) => m.answerPhone())}
        />
      )}
      {!menu && teaching && s.tutorial?.task && !s.phone.ringing && (
        <aside className="current-task" data-hud>
          <small>CURRENT TASK</small>
          <strong>{s.tutorial.task}</strong>
        </aside>
      )}
      {!menu && s.phone.dialing && (
        <PhoneDial
          dial={(key) => {
            scene.current?.audio.dial(key);
            return game.current?.dialTony(key) ?? false;
          }}
          hangUp={() => action((m) => m.hangUp())}
        />
      )}
      {!menu && s.tutorial?.stage === 'board' && (
        <TutorialBoard
          key={`${slotIndex}:${s.tutorial.metrics.step13}:${s.tutorial.metrics.fixture ?? 0}`}
          stamped={s.tutorial.boardStamped}
          reduced={s.settings.reducedMotion}
          stamp={() =>
            action((m) => {
              m.stampTutorial();
            })
          }
          finish={() => action((m) => m.finishTutorialBoard())}
          sound={(c) => scene.current?.audio.letter(c, 2.1)}
        />
      )}
      {!menu && s.tutorial?.stage === 'chapter' && (
        <Milestone label="CHAPTER 1" title="SMALL CHANGE" kind="chapter" />
      )}
      <Dialog
        open={menu === 'saves'}
        onOpenChange={(open) => {
          if (!open && activeSlot.current !== null) openMenu(null);
        }}
      >
        <DialogContent
          className={`station-screen save-screen ${comfortClass}`}
          unstyled
          showCloseButton={false}
        >
          <header className="save-heading">
            <small>THE BELLWETHER RECOVERY WORKSHOP</small>
            <DialogTitle>
              FROZEN
              <br />
              <em>ASSETS</em>
              <span>®</span>
            </DialogTitle>
            <DialogDescription>
              The bank froze your assets. Literally.
            </DialogDescription>
          </header>
          {failure && (
            <p className="save-error" role="alert">
              {failure}
            </p>
          )}
          <SaveMenu
            restore={async (index) => {
              if (!repository.current) return;
              await repository.current.restore(index);
              setSlots([...repository.current.data.slots]);
            }}
            slots={slots}
            active={slotIndex}
            returnToGame={started ? () => openMenu(null) : undefined}
            launch={(index) => {
              const m = game.current,
                saved = repository.current?.data.slots[index].raw;
              if (!m || !repository.current) return;
              if (saved && new GameModel(saved).saveStatus === 'invalid') {
                setFailure(
                  'This recovery file could not be read. Choose another file; the original is preserved.',
                );
                return;
              }
              scene.current?.audio.init();
              scene.current?.cancelInput();
              scene.current?.clearParticles();
              scene.current?.turntable.home();
              activeSlot.current = null;
              if (scene.current) scene.current.messageBusy = false;
              m.restart();
              if (saved) m.restore(saved);
              else m.startTutorial();
              activeSlot.current = index;
              setSlotIndex(index);
              setStarted(true);
              setRewards([]);
              setFailure('');
              const resumeUpgrade =
                m.inTutorial && m.tutorial!.step >= 8 && m.tutorial!.step <= 10;
              menuRef.current = resumeUpgrade ? 'skills' : null;
              setMenu(resumeUpgrade ? 'skills' : null);
              m.pause(resumeUpgrade);
              m.onSave();
              m.emit();
              scene.current?.enterWorkshop();
              if (!m.inTutorial) scene.current?.deliver();
            }}
            remove={async (index) => {
              if (!repository.current) return;
              await repository.current.clear(index);
              if (activeSlot.current === index) {
                activeSlot.current = null;
                setStarted(false);
              }
              setSlots([...repository.current.data.slots]);
            }}
          />
        </DialogContent>
      </Dialog>
      <DotCursor />
      {!menu && s.campaign && !teaching && (
        <>
          <div className="campaign-caption">
            {s.campaign.legacyBlock
              ? 'IMPORTED WORKSHOP'
              : s.campaign.contracts
                ? 'RECOVERY CONTRACTS'
                : `CHAPTER ${s.campaign.chapter} · ${s.campaign.chapterName.toUpperCase()}`}
          </div>
        </>
      )}
      {!s.campaign && s.round === 0 && (
        <p className="premise">
          The bank froze your assets. <em>Literally.</em>
        </p>
      )}
      <AmbientThought thought={thought} onDone={() => setThought(null)} />
      <output className="recovery-message" key={s.message}>
        {s.message}
      </output>
      <div className="control-rail">
        {s.thermal ? (
          <div className="fuel-unit" data-hud>
            <div className="fuel-title">
              <span>FUEL</span>
              <b>{Math.ceil(fuel)}%</b>
            </div>
            <Progress
              value={fuel}
              aria-label="Fuel remaining"
              className={`fuel-progress ${fuel < 15 ? 'low' : ''}`}
            />
            <TactileButton
              disabled={busy}
              className={fuel === 0 ? 'empty' : ''}
              onClick={() => action((m) => m.refill())}
            >
              {s.phase === 'refilling' ? 'Refilling…' : 'Refill'}{' '}
              <small>FREE</small>
              <kbd>R</kbd>
            </TactileButton>
          </div>
        ) : (
          <div className="hand-tool-control" data-hud>
            <TactileButton
              disabled={teaching}
              onClick={() => openMenu('tools')}
              aria-label={`Change tool: ${s.campaign?.toolName}`}
            >
              <ToolGlyph id={s.campaign?.selected ?? 'hand'} />
              <span>
                {s.campaign?.selected === 'grip'
                  ? 'Hand chisel'
                  : s.campaign?.toolName}
              </span>
            </TactileButton>
          </div>
        )}
        <Presence
          show={!rotated && !teaching && !recoveryCondition.handlingTag}
          className="interaction-hint"
        >
          <strong>
            {s.thermal
              ? 'Hold on ice to melt.'
              : s.campaign?.selected === 'hand' &&
                  !s.nodes.hand.includes('HC-S1') &&
                  !s.settings.toggle
                ? 'Click on ice to chip.'
                : 'Hold on ice to work.'}
          </strong>
          <span>
            {rotated
              ? 'Good. Every side is yours.'
              : 'Drag the tray to turn it.'}
          </span>
        </Presence>
        <div className="tool-controls" data-hud>
          {s.campaign?.selected === 'breaker' &&
            s.nodes.breaker.includes(MECHANIC_NODE.precisionBit) && (
              <fieldset className="nozzle-switch" aria-label="Breaker bit">
                {(['standard', 'precision', 'wide'] as const)
                  .filter(
                    (bit) =>
                      bit !== 'wide' ||
                      s.nodes.breaker.includes(MECHANIC_NODE.wideBit),
                  )
                  .map((bit) => (
                    <TactileButton
                      key={bit}
                      aria-pressed={s.breakerBit === bit}
                      onClick={() => action((m) => m.selectBreakerBit(bit))}
                    >
                      {bit === 'standard'
                        ? 'Standard bit'
                        : bit === 'precision'
                          ? 'Narrow bit'
                          : 'Wide bit'}
                    </TactileButton>
                  ))}
              </fieldset>
            )}
          {s.thermal && s.hasFan && (
            <fieldset className="nozzle-switch" aria-label="Nozzle mode">
              <TactileButton
                aria-pressed={s.mode === 'precision'}
                disabled={busy}
                onClick={() => action((m) => m.selectMode('precision'))}
              >
                Precision <kbd>1</kbd>
              </TactileButton>
              <TactileButton
                aria-pressed={s.mode === 'wide'}
                disabled={busy}
                onClick={() => action((m) => m.selectMode('wide'))}
              >
                Fan <kbd>2</kbd>
              </TactileButton>
            </fieldset>
          )}
          {rotated && (
            <TactileButton
              className="center-tray"
              disabled={busy}
              onClick={() => {
                scene.current?.cancelInput();
                scene.current?.turntable.home();
              }}
            >
              Center tray <kbd>C</kbd>
            </TactileButton>
          )}
        </div>
      </div>
      {testing && (
        <>
          <span className="test-indicator">
            PRACTICE BENCH · SAVE UNTOUCHED
          </span>
          <TutorialDebug
            state={s}
            slot={slotIndex}
            run={(command, step) =>
              action((m) => {
                scene.current?.cancelInput();
                tutorialControl(m, command, step);
              })
            }
          />
        </>
      )}
      {!menu && !teaching && recoveryCondition.conditionCue && (
        <ConditionCue
          key={`${recoveryCondition.conditionCue.id}-${recoveryCondition.conditionCue.grade}-${recoveryCondition.conditionCue.until}`}
          cue={recoveryCondition.conditionCue}
          getScene={() => scene.current}
        />
      )}
      {!menu &&
        !teaching &&
        !s.liveCall &&
        !s.phone.ringing &&
        !s.settlement &&
        recoveryCondition.handlingTag && (
          <CustodyTag tag={recoveryCondition.handlingTag} />
        )}
      {rewards.map((r) => (
        <div
          key={r.id}
          className={`reward-impact ${r.value >= 380 ? 'valuable' : ''}`}
          style={
            { '--from-x': `${r.x}px`, '--from-y': `${r.y}px` } as CSSProperties
          }
          onAnimationEnd={(e) => {
            if (e.target === e.currentTarget)
              setRewards((prev) => prev.filter((x) => x.id !== r.id));
          }}
        >
          <span>
            {Array.from(`+${dollars(r.value)}`).map((c, i) => (
              <b key={i} style={{ animationDelay: `${i * 28}ms` }}>
                {c}
              </b>
            ))}
          </span>
          <i />
        </div>
      ))}
      {s.settlement && !menu && (
        <DeliveryComplete
          settlement={s.settlement}
          remaining={s.settlementTime}
          money={s.money}
          nodes={s.nodes}
          owned={s.campaign?.tools ?? []}
          revealed={s.revealedTools}
          advance={() => action((m) => m.skipSettlement())}
          sound={() => scene.current?.audio.sound('delivery')}
        />
      )}
      <Dialog
        open={menu === 'phone'}
        onOpenChange={(open) => {
          if (!open && menuRef.current === 'phone') openMenu(null);
        }}
      >
        <DialogContent
          className={`station-screen phone-screen ${comfortClass}`}
          unstyled
          showCloseButton={false}
        >
          <header className="phone-header">
            <div>
              <small>WORKSHOP ARCHIVE</small>
              <DialogTitle>Recovery Files</DialogTitle>
              <DialogDescription>
                Past calls. Papers worth keeping.
              </DialogDescription>
            </div>
          </header>
          {s.campaign && (
            <Phone
              state={s.campaign}
              tutorial={s.tutorial ?? undefined}
              onInspect={(id) =>
                action((m) => {
                  if (m.campaign?.inspectEvidence(id)) m.onSave();
                })
              }
            />
          )}
          <TactileButton
            className="bench-return"
            onClick={() => openMenu(null)}
          >
            Back to the bench
          </TactileButton>
        </DialogContent>
      </Dialog>
      <Dialog
        open={s.phase === 'paused' && menu === 'skills' && !restart}
        onOpenChange={(open) => {
          if (!open && menuRef.current === 'skills') openMenu(null);
        }}
      >
        <DialogContent
          className={`station-screen skill-screen ${comfortClass}`}
          data-tutorial={teaching ? s.tutorial?.step : undefined}
          onFocus={(event) => {
            // The dialog's focus guard restores focus to its container after
            // Tony's button unmounts; hand that restoration to the next task.
            if (event.target === event.currentTarget && upgradeFocus)
              event.currentTarget
                .querySelector<HTMLButtonElement>(upgradeFocus)
                ?.focus({ preventScroll: true });
          }}
          initialFocus={() =>
            teaching
              ? document.querySelector<HTMLElement>(
                  '.tony-continue,[data-skill="HC-S1"],.skill-screen .bench-return',
                )
              : true
          }
          unstyled
          showCloseButton={false}
        >
          <section className="skill-plate">
            <MenuHeader screen="Upgrades" subtitle="" />
            <SkillTree
              key={requestedTool}
              requestedTool={teaching ? 'hand' : requestedTool}
              savedViews={treeView}
              remember={(tool, view) => {
                setTreeView((previous) => {
                  const views = { ...previous, [tool]: view };
                  if (!testing) {
                    try {
                      localStorage.setItem(
                        TREE_VIEW_KEY,
                        JSON.stringify(views),
                      );
                    } catch {
                      /* Keep the session view. */
                    }
                  }
                  return views;
                });
              }}
              equipment={
                s.campaign
                  ? {
                      block: s.campaign.block,
                      owned: s.campaign.tools,
                      revealed: s.revealedTools,
                      selected: s.campaign.selected,
                      buy: (id) => game.current?.buyTool(id) ?? false,
                      equip: (id) => game.current?.selectTool(id) ?? false,
                    }
                  : undefined
              }
              nodes={s.nodes}
              money={s.money}
              canPurchase={
                teaching
                  ? s.tutorial?.step === 8 && s.tutorial.mode === 'task'
                  : s.canPurchase
              }
              purchase={(id) => {
                const m = game.current;
                if (!m) return false;
                scene.current?.audio.init();
                const ok = m.purchaseNode(id, Date.now());
                m.emit();
                return ok;
              }}
            />
            {menu === 'skills' && guide}
            <footer className="screen-footer">
              <TactileButton
                className="bench-return"
                disabled={
                  teaching &&
                  s.tutorial?.step === 9 &&
                  s.tutorial.mode === 'dialogue'
                }
                onClick={() => openMenu(null)}
              >
                Back to the bench <kbd>ESC</kbd>
              </TactileButton>
            </footer>
          </section>
        </DialogContent>
      </Dialog>
      <Dialog
        open={menu === 'tools' && !restart}
        onOpenChange={(open) => {
          if (!open && menuRef.current === 'tools') openMenu(null);
        }}
      >
        <DialogContent
          className={`tools-popover ${comfortClass}`}
          showCloseButton={false}
        >
          <DialogTitle>Tools</DialogTitle>
          <DialogDescription>
            Choose what feels right for this block.
          </DialogDescription>
          {s.campaign && (
            <ToolSelector
              block={s.campaign.block}
              owned={s.campaign.tools}
              selected={s.campaign.selected}
              revealed={s.revealedTools}
              inspect={(id) => openMenu('skills', id)}
              select={(id) =>
                action((m) => {
                  if (m.selectTool(id)) scene.current?.audio.ui('select');
                })
              }
            />
          )}
          <TactileButton
            className="bench-return"
            onClick={() => openMenu(null)}
          >
            Back to the bench
          </TactileButton>
        </DialogContent>
      </Dialog>
      <Dialog
        open={s.phase === 'paused' && menu === 'settings' && !restart}
        onOpenChange={(open) => {
          if (!open && menuRef.current === 'settings') openMenu(null);
        }}
      >
        <DialogContent
          className={`station-screen settings-screen ${comfortClass}`}
          unstyled
          showCloseButton={false}
        >
          {navigation('settings')}
          <section className="settings-drawer">
            <MenuHeader
              screen="Settings"
              subtitle="Make this workshop yours."
            />
            <div className="settings-grid">
              <div className="setting-row graphics-setting">
                <label id="graphics-label">
                  Graphics <span>{GRAPHICS[s.settings.graphics].label}</span>
                </label>
                <Slider
                  aria-labelledby="graphics-label"
                  aria-describedby="graphics-description"
                  min={0}
                  max={3}
                  step={1}
                  value={[GRAPHICS_LEVELS.indexOf(s.settings.graphics)]}
                  aria-valuetext={GRAPHICS[s.settings.graphics].label}
                  onValueChange={(value) =>
                    setting(
                      'graphics',
                      GRAPHICS_LEVELS[Array.isArray(value) ? value[0] : value],
                    )
                  }
                />
                <div className="graphics-stops">
                  {GRAPHICS_LEVELS.map((quality) => (
                    <button
                      key={quality}
                      type="button"
                      aria-pressed={s.settings.graphics === quality}
                      onClick={() => setting('graphics', quality)}
                    >
                      {GRAPHICS[quality].label}
                    </button>
                  ))}
                </div>
                <p id="graphics-description">
                  {GRAPHICS[s.settings.graphics].description}
                </p>
              </div>
              {(
                [
                  'master',
                  'effects',
                  'rotationSensitivity',
                  'textSpeed',
                ] as const
              ).map((key) => (
                <div className="setting-row" key={key}>
                  <label id={`${key}-label`}>
                    {key === 'master'
                      ? 'Master volume'
                      : key === 'effects'
                        ? 'Sound effects'
                        : key === 'textSpeed'
                          ? 'Text speed'
                          : 'Tray sensitivity'}
                    <span>
                      {key === 'rotationSensitivity'
                        ? `${(0.5 + s.settings[key]).toFixed(2)}×`
                        : key === 'textSpeed'
                          ? s.settings[key] >= 0.99
                            ? 'Instant'
                            : s.settings[key] < 0.25
                              ? 'Slow'
                              : s.settings[key] < 0.75
                                ? 'Normal'
                                : 'Fast'
                          : `${Math.round(s.settings[key] * 100)}%`}
                    </span>
                  </label>
                  {key === 'textSpeed' ? (
                    <div className="text-speed-options">
                      {(
                        [
                          ['Slow', 0],
                          ['Normal', 0.5],
                          ['Fast', 0.8],
                          ['Instant', 1],
                        ] as const
                      ).map(([name, value]) => (
                        <TactileButton
                          key={name}
                          aria-pressed={s.settings.textSpeed === value}
                          onClick={() => setting('textSpeed', value)}
                        >
                          {name}
                        </TactileButton>
                      ))}
                    </div>
                  ) : (
                    <Slider
                      aria-labelledby={`${key}-label`}
                      value={[s.settings[key] * 100]}
                      onValueChange={(v) =>
                        setting(key, (Array.isArray(v) ? v[0] : v) / 100)
                      }
                    />
                  )}
                </div>
              ))}
              {(
                [
                  ['dialogueSounds', 'Dialogue type sounds'],
                  ['muted', 'Mute audio'],
                  ['reducedParticles', 'Fewer particles'],
                  ['reducedMotion', 'Reduced motion'],
                  ['largeUI', 'Larger interface text'],
                ] as const
              ).map(([key, label]) => (
                <div className="setting-switch" key={key}>
                  <label htmlFor={`${key}-switch`}>{label}</label>
                  <Switch
                    id={`${key}-switch`}
                    checked={s.settings[key]}
                    onCheckedChange={(v) => setting(key, v)}
                  />
                </div>
              ))}
            </div>
            <TactileButton
              className="bench-return"
              onClick={() => openMenu(null)}
            >
              Back to the bench <kbd>ESC</kbd>
            </TactileButton>
          </section>
        </DialogContent>
      </Dialog>
      <Dialog
        open={s.phase === 'paused' && (!menu || menu === 'pause') && !restart}
        onOpenChange={(open) => {
          if (!open && (!menuRef.current || menuRef.current === 'pause'))
            openMenu(null);
        }}
      >
        <DialogContent
          className={`pause-menu ${comfortClass}`}
          showCloseButton={false}
        >
          <span className="plate-eyebrow">FROZEN ASSETS</span>
          <DialogTitle>Bench paused.</DialogTitle>
          <DialogDescription>Your ice can wait.</DialogDescription>
          <TactileButton
            className="bench-return"
            onClick={() => openMenu(null)}
          >
            Resume recovery <kbd>ESC</kbd>
          </TactileButton>
          <div className="pause-links">
            <TactileButton onClick={() => openMenu('skills')}>
              Upgrades
            </TactileButton>
            <TactileButton onClick={() => openMenu('settings')}>
              Settings
            </TactileButton>
          </div>
          <TactileButton
            className="save-back"
            onClick={() => openMenu('saves')}
          >
            Save slots
          </TactileButton>
          <div className="controls-guide">
            <span>
              {s.thermal ? 'HOLD ON ICE' : 'CLICK / HOLD ON ICE'}{' '}
              <b>{s.thermal ? 'Melt' : 'Work'}</b>
            </span>
            <span>
              DRAG TRAY <b>Turn</b>
            </span>
            <span>
              Q / E <b>Turn</b>
            </span>
            <span>
              C <b>Center</b>
            </span>
            <span>
              R <b>Free refill</b>
            </span>
            <span>
              1 / 2 <b>Nozzles</b>
            </span>
            <span>
              P / Y / TRIANGLE <b>Phone</b>
            </span>
            <span>
              [ ] / LB RB / L1 R1 <b>Tools</b>
            </span>
            <span>
              RT / R2 <b>Work · left stick aims</b>
            </span>
            <span>
              RIGHT STICK <b>Turn · pan menus</b>
            </span>
            <span>
              D-PAD · A / CROSS <b>Focus · confirm</b>
            </span>
            <span>
              LT / L2 + RIGHT STICK <b>Zoom Upgrades</b>
            </span>
          </div>
          <p className="save-line">
            {testing
              ? 'Practice session. Your save is untouched.'
              : s.saveStatus === 'unavailable'
                ? 'Saving unavailable in this browser.'
                : 'Progress saved on this device.'}
          </p>
          <TactileButton
            className="restart-link"
            onClick={() => setRestart(true)}
          >
            Restart recovery
          </TactileButton>
        </DialogContent>
      </Dialog>
      <Dialog
        open={
          s.phase === 'completed' &&
          !restart &&
          !menu &&
          !s.campaign?.call &&
          !s.campaign?.pending.length
        }
        onOpenChange={() => {}}
      >
        <DialogContent
          className={`completion-menu ${comfortClass}`}
          showCloseButton={false}
        >
          <span className="plate-eyebrow">F/A — RECOVERY RECEIPT</span>
          <span className="reclaimed-stamp">RECLAIMED</span>
          <DialogTitle>All yours. Again.</DialogTitle>
          <DialogDescription>
            Bellwether&apos;s preservation operation is suspended. The records
            are out. Tony&apos;s desk is empty.
          </DialogDescription>
          <div className="completion-stats">
            <span>
              Recovered value<strong>{dollars(s.earned)}</strong>
            </span>
            <span>
              Valuables freed<strong>{s.recovered}</strong>
            </span>
          </div>
          <TactileButton
            className="bench-return"
            onClick={() =>
              s.campaign && !s.campaign.read.includes('epilogue')
                ? action((m) => {
                    m.hangUp();
                    m.campaign?.ensureEpilogue();
                    m.campaign?.deliver();
                    scene.current?.phoneOrigin();
                    m.answerPhone();
                  })
                : action((m) => m.continuePlaying())
            }
          >
            {s.campaign && !s.campaign.read.includes('epilogue')
              ? 'Read the final message'
              : 'Recovery Contracts'}{' '}
            <span>→</span>
          </TactileButton>
          <TactileButton
            className="restart-link"
            onClick={() => setRestart(true)}
          >
            Start a fresh recovery
          </TactileButton>
        </DialogContent>
      </Dialog>
      <Dialog
        open={!!s.toolNotice}
        onOpenChange={(open) => {
          if (!open) game.current?.dismissToolNotice();
        }}
      >
        <DialogContent
          className={`tool-reveal ${comfortClass}`}
          showCloseButton={false}
        >
          {s.toolNotice && (
            <>
              <div className="reveal-kicker">
                {s.toolNotice.kind === 'available'
                  ? 'NEW TOOL AVAILABLE'
                  : s.toolNotice.kind === 'ready'
                    ? 'TOOL READY'
                    : 'TOOL ACQUIRED'}
              </div>
              <ToolDisplay tool={s.toolNotice.tool} />
              <DialogTitle>
                {TOOLS.find((t) => t.id === s.toolNotice!.tool)!.name}
              </DialogTitle>
              <DialogDescription>
                {s.toolNotice.kind === 'ready'
                  ? 'You can afford it.'
                  : s.toolNotice.kind === 'acquired'
                    ? 'On your rack. Ready for the next block.'
                    : TOOLS.find((t) => t.id === s.toolNotice!.tool)!
                        .description}
              </DialogDescription>
              {s.toolNotice.kind !== 'acquired' && (
                <div className="reveal-price">
                  $
                  {TOOLS.find(
                    (t) => t.id === s.toolNotice!.tool,
                  )!.cost.toLocaleString()}
                </div>
              )}
              <div className="tool-reveal-actions">
                <TactileButton
                  onClick={() => {
                    const id = s.toolNotice!.tool;
                    game.current?.dismissToolNotice();
                    openMenu('skills', id);
                  }}
                >
                  {s.toolNotice.kind === 'acquired'
                    ? 'View upgrades'
                    : 'View tool'}
                </TactileButton>
                <TactileButton
                  onClick={() => game.current?.dismissToolNotice()}
                >
                  Back to the bench
                </TactileButton>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent className={`restart-menu ${comfortClass}`}>
          <AlertDialogTitle>Start from the first block?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your money, upgrades, and current ice. Sound and comfort
            settings stay.
          </AlertDialogDescription>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep playing</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>
              Restart recovery
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  );
}
