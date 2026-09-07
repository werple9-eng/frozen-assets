'use client';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { GameScene } from '@/lib/game/scene';
import { GameModel, SAVE_KEY, type Settings } from '@/lib/game/model';
import { TactileButton, DotCursor } from '@/components/game/tactile';
import { SkillTree } from '@/components/game/skill-tree';
import { registerGameTools } from '@/lib/game/webmcp';
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
type Menu = 'skills' | 'settings' | 'pause' | null;
type Reward = { id: number; value: number; x: number; y: number };
const initial = new GameModel().snapshot();
const dollars = (n: number) => `$${n.toLocaleString()}`;
export default function Home() {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<GameScene | null>(null),
    game = useRef<GameModel | null>(null);
  const [s, setS] = useState(initial),
    [menu, setMenu] = useState<Menu>(null),
    [restart, setRestart] = useState(false),
    [failure, setFailure] = useState(''),
    [displayMoney, setDisplayMoney] = useState(0),
    [rotate, setRotate] = useState(false),
    [rotated, setRotated] = useState(false),
    [rewards, setRewards] = useState<Reward[]>([]),
    [moneyPulse, setMoneyPulse] = useState(0),
    [testing, setTesting] = useState(false);
  const menuRef = useRef<Menu>(null),
    moneyRef = useRef(0),
    rewardId = useRef(0);
  useEffect(() => {
    const qa =
      ['localhost', '127.0.0.1'].includes(location.hostname) &&
      new URLSearchParams(location.search).get('qa') === '1';
    let raw: string | null = null;
    if (!qa)
      try {
        raw = localStorage.getItem(SAVE_KEY);
      } catch {}
    const m = new GameModel(raw);
    game.current = m;
    const save = () => {
      if (qa) return;
      try {
        localStorage.setItem(SAVE_KEY, m.serialize());
        m.saveStatus = 'saved';
      } catch {
        m.saveStatus = 'unavailable';
      }
    };
    m.onSave = save;
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
    m.onCredit = (t) => {
      const g = engine.lootMeshes.get(t.id);
      if (!g) return;
      const p = g.getWorldPosition(engine.scratch).project(engine.camera),
        r = host.current!.getBoundingClientRect(),
        id = ++rewardId.current;
      setRewards((prev) => [
        ...prev.slice(-3),
        {
          id,
          value: t.value,
          x: r.left + ((p.x + 1) * r.width) / 2,
          y: r.top + ((1 - p.y) * r.height) / 2,
        },
      ]);
      setMoneyPulse(id);
    };
    engine.onViewChange = () => {
      setRotate(engine.rotateMode);
      setRotated(engine.turntable.demonstrated);
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
      } else if (m.phase !== 'paused' && menuRef.current) {
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
      if (m.phase === 'playing') {
        if (e.key.toLowerCase() === 'r') {
          engine.audio.init();
          m.refill();
        }
        if (e.key === '1') m.selectMode('precision');
        if (e.key === '2') m.selectMode('wide');
        if (e.key.toLowerCase() === 'u') {
          engine.cancelInput();
          menuRef.current = 'skills';
          setMenu('skills');
          m.pause(true);
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
    m.emit();
    return () => {
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
  }, []);
  useEffect(() => {
    const from = moneyRef.current,
      start = performance.now();
    let frame = 0;
    const step = () => {
      const t = Math.min(1, (performance.now() - start) / 190),
        v = Math.round(from + (s.money - from) * (1 - (1 - t) ** 3));
      moneyRef.current = v;
      setDisplayMoney(v);
      if (t < 1) frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [s.money]);
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
  const openMenu = (next: Menu) => {
    scene.current?.cancelInput();
    scene.current?.audio.ui(next ? 'open' : 'close');
    menuRef.current = next;
    setMenu(next);
    action((m) => m.pause(!!next));
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
      m.restart();
    });
  };
  const fuel = Math.max(0, (s.fuel / s.capacity) * 100),
    busy = s.phase !== 'playing';
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
          <span>
            BATCH {String(s.round + 1).padStart(2, '0')} /{' '}
            {s.continuing ? '∞' : '20'} · {s.family}
          </span>
        </div>
      </TactileButton>
      <nav aria-label="Station menus" data-active={active || 'bench'}>
        <TactileButton
          aria-current={active === 'skills' ? 'page' : undefined}
          onClick={() => openMenu(active === 'skills' ? null : 'skills')}
        >
          Skill Tree <kbd>U</kbd>
        </TactileButton>
        <TactileButton
          aria-current={active === 'settings' ? 'page' : undefined}
          onClick={() => openMenu(active === 'settings' ? null : 'settings')}
        >
          Settings
        </TactileButton>
        <i className="nav-marker" />
      </nav>
      <div className="balance" key={`balance-${moneyPulse}`}>
        <span>RECOVERED FUNDS</span>
        <strong aria-label={`Available funds: ${s.money} dollars`}>
          {dollars(displayMoney)}
        </strong>
      </div>
    </header>
  );
  const comfortClass = `${s.settings.largeUI ? 'large-ui' : ''} ${s.settings.reducedMotion ? 'reduced-motion' : ''}`;
  return (
    <main
      className={`game-shell ${comfortClass} ${rotate ? 'rotation-mode' : ''}`}
    >
      <div className="scene" ref={host} />
      {failure && (
        <div className="render-error" role="alert">
          {failure}
          <TactileButton onClick={() => location.reload()}>
            Reload
          </TactileButton>
        </div>
      )}
      {!menu && navigation()}
      <DotCursor />
      {s.round === 0 && (
        <p className="premise">
          The bank froze your assets. <em>Literally.</em>
        </p>
      )}
      <output className="recovery-message" key={s.message}>
        {s.message}
      </output>
      <div className="control-rail">
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
        {!rotated && (
          <div className="interaction-hint">
            <strong>Hold on ice to melt.</strong>
            <span>Drag the tray to turn it.</span>
          </div>
        )}
        <div className="tool-controls" data-hud>
          {s.upgrades.wide > 0 && (
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
        <span className="test-indicator">PRACTICE BENCH · SAVE UNTOUCHED</span>
      )}
      {rewards.map((r) => (
        <div
          key={r.id}
          className="reward-flight"
          style={
            { '--from-x': `${r.x}px`, '--from-y': `${r.y}px` } as CSSProperties
          }
          onAnimationEnd={() =>
            setRewards((prev) => prev.filter((x) => x.id !== r.id))
          }
        >
          <span>+{dollars(r.value)}</span>
          <i />
        </div>
      ))}
      <Dialog
        open={s.phase === 'paused' && menu === 'skills' && !restart}
        onOpenChange={(open) => {
          if (!open && menuRef.current === 'skills') openMenu(null);
        }}
      >
        <DialogContent
          className={`station-screen skill-screen ${comfortClass}`}
          unstyled
          showCloseButton={false}
        >
          {navigation('skills')}
          <section className="skill-plate">
            <div className="skill-title">
              <div>
                <span className="plate-eyebrow">
                  42 UPGRADES · FOUR WAYS TO THAW
                </span>
                <DialogTitle>Skill Tree</DialogTitle>
              </div>
              <DialogDescription>Choose your next upgrade.</DialogDescription>
            </div>
            <SkillTree
              levels={s.upgrades}
              money={s.money}
              canPurchase={s.canPurchase}
              purchase={(id) => {
                const m = game.current;
                if (!m) return false;
                scene.current?.audio.init();
                const ok = m.purchaseSkill(id);
                m.emit();
                return ok;
              }}
            />
            <footer className="screen-footer">
              <span>EVERY FITTING STAYS WITH YOU.</span>
              <TactileButton
                className="bench-return"
                onClick={() => openMenu(null)}
              >
                Back to the bench <kbd>ESC</kbd>
              </TactileButton>
            </footer>
          </section>
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
            <span className="plate-eyebrow">BENCH PREFERENCES</span>
            <DialogTitle>Settings</DialogTitle>
            <DialogDescription>Make yourself comfortable.</DialogDescription>
            <div className="settings-grid">
              {(['master', 'effects', 'rotationSensitivity'] as const).map(
                (key) => (
                  <div className="setting-row" key={key}>
                    <label id={`${key}-label`}>
                      {key === 'master'
                        ? 'Master volume'
                        : key === 'effects'
                          ? 'Sound effects'
                          : 'Tray sensitivity'}
                      <span>
                        {key === 'rotationSensitivity'
                          ? `${(0.5 + s.settings[key]).toFixed(2)}×`
                          : `${Math.round(s.settings[key] * 100)}%`}
                      </span>
                    </label>
                    <Slider
                      aria-labelledby={`${key}-label`}
                      value={[s.settings[key] * 100]}
                      onValueChange={(v) =>
                        setting(key, (Array.isArray(v) ? v[0] : v) / 100)
                      }
                    />
                  </div>
                ),
              )}
              {(
                [
                  ['muted', 'Mute audio'],
                  ['toggle', 'Toggle to fire'],
                  ['reducedParticles', 'Fewer particles'],
                  ['reducedMotion', 'Reduced motion'],
                  ['largeUI', 'Larger interface text'],
                ] as const
              ).map(([key, label]) => (
                <div className="setting-switch" key={key}>
                  <label htmlFor={`${key}-switch`}>
                    {label}
                    {key === 'toggle' && (
                      <small>Click ice to start; click again to stop.</small>
                    )}
                  </label>
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
              Skill Tree
            </TactileButton>
            <TactileButton onClick={() => openMenu('settings')}>
              Settings
            </TactileButton>
          </div>
          <div className="controls-guide">
            <span>
              HOLD ON ICE <b>Melt</b>
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
        open={s.phase === 'completed' && !restart}
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
            One vault. Twenty batches. Every frozen asset, back in your hands.
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
            onClick={() => action((m) => m.continuePlaying())}
          >
            Continue playing <span>→</span>
          </TactileButton>
          <TactileButton
            className="restart-link"
            onClick={() => setRestart(true)}
          >
            Start a fresh recovery
          </TactileButton>
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
