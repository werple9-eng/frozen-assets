'use client';
import { useEffect, useRef, useState } from 'react';
import {
  Snowflake,
  Flame,
  Mouse,
  Pause,
  Volume2,
  VolumeX,
  ArrowUpRight,
  Coins,
  Crosshair,
  Gauge,
  Fuel,
  Fan,
  Waves,
  Check,
  LockKeyhole,
  RotateCcw,
  Play,
  Trophy,
} from 'lucide-react';
import { GameScene } from '@/lib/game/scene';
import {
  GameModel,
  SAVE_KEY,
  UPGRADES,
  type Upgrade,
  type Settings,
} from '@/lib/game/model';
import { TUNE } from '@/lib/game/tuning';
import { registerGameTools } from '@/lib/game/webmcp';
import { Button } from '@/components/ui/button';
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
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
const ICONS = { heat: Flame, tank: Gauge, wide: Fan, residual: Waves };
const initial = new GameModel().snapshot();
export default function Home() {
  const host = useRef<HTMLDivElement>(null),
    scene = useRef<GameScene | null>(null),
    game = useRef<GameModel | null>(null);
  const [s, setS] = useState(initial),
    [restart, setRestart] = useState(false),
    [failure, setFailure] = useState(''),
    [displayMoney, setDisplayMoney] = useState(0);
  const moneyRef = useRef(0);
  useEffect(() => {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem(SAVE_KEY);
    } catch {}
    const m = new GameModel(raw);
    game.current = m;
    const save = () => {
      try {
        localStorage.setItem(SAVE_KEY, m.serialize());
        m.saveStatus = 'saved';
      } catch {
        m.saveStatus = 'unavailable';
      }
    };
    m.onSave = save;
    m.onChange = () => setS(m.snapshot());
    let engine: GameScene;
    try {
      engine = new GameScene(host.current!, m);
      scene.current = engine;
    } catch (err) {
      setFailure(
        'The 3D renderer could not start. Enable hardware acceleration in your browser, then reload.',
      );
      return;
    }
    m.onSound = (kind, intensity) => engine.audio.sound(kind, intensity);
    m.onBurst = (point, count, fragment) =>
      engine.burst(point, count, fragment);
    const audioSettings = () => {
      engine.audio.masterVolume = m.settings.master;
      engine.audio.effects = m.settings.effects;
      engine.audio.muted = m.settings.muted;
      engine.audio.volume();
    };
    audioSettings();
    m.onChange = () => {
      audioSettings();
      setS(m.snapshot());
    };
    const unregister = registerGameTools(engine, () => m.snapshot());
    const keys = (e: KeyboardEvent) => {
      if (
        e.defaultPrevented ||
        e.repeat ||
        (e.target as HTMLElement)?.tagName === 'INPUT'
      )
        return;
      if (
        e.key === 'Escape' &&
        m.phase !== 'paused' &&
        m.phase !== 'completed'
      ) {
        e.preventDefault();
        m.pause(true);
      }
      if (m.phase === 'playing') {
        if (e.key.toLowerCase() === 'r') {
          engine.audio.init();
          m.refill();
        }
        if (e.key === '1') m.selectMode('precision');
        if (e.key === '2') m.selectMode('wide');
      }
    };
    const loseFocus = () => {
      m.stop();
      engine.audio.fire(false, false);
      save();
    };
    const hide = () => {
      if (document.hidden) loseFocus();
    };
    window.addEventListener('keydown', keys);
    window.addEventListener('blur', loseFocus);
    window.addEventListener('pagehide', loseFocus);
    document.addEventListener('visibilitychange', hide);
    m.emit();
    return () => {
      save();
      unregister();
      window.removeEventListener('keydown', keys);
      window.removeEventListener('blur', loseFocus);
      window.removeEventListener('pagehide', loseFocus);
      document.removeEventListener('visibilitychange', hide);
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
  const pause = (open: boolean) => action((m) => m.pause(open));
  const reset = () => {
    setRestart(false);
    action((m) => {
      scene.current?.audio.fire(false, false);
      scene.current?.clearParticles();
      m.restart();
    });
  };
  const fuel = Math.max(0, (s.fuel / s.capacity) * 100),
    busy = s.phase !== 'playing';
  const title =
    s.round === 0
      ? 'Break the ice.'
      : s.round === 19
        ? 'The final thaw.'
        : s.continuing
          ? 'Back to the bench.'
          : s.round % 4 === 2
            ? 'Find the weak spot.'
            : s.round % 4 === 3
              ? 'A deeper deposit.'
              : 'Keep the change.';
  return (
    <main className={`game-shell ${s.settings.largeUI ? 'large-ui' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <Snowflake size={30} />
          <strong>
            FROZEN ASSETS<span className="edition">RECOVERY DIVISION</span>
          </strong>
        </div>
        <div className="balance">
          <span>AVAILABLE FUNDS</span>
          <strong aria-label={`Available funds: ${s.money} dollars`}>
            <small>$</small>
            {displayMoney.toLocaleString()}
          </strong>
        </div>
        <div className="header-actions">
          <button
            aria-label={s.settings.muted ? 'Unmute sound' : 'Mute sound'}
            onClick={() => setting('muted', !s.settings.muted)}
          >
            {s.settings.muted ? <VolumeX size={19} /> : <Volume2 size={19} />}
          </button>
          <button aria-label="Pause and settings" onClick={() => pause(true)}>
            <Pause size={19} />
          </button>
        </div>
      </header>
      <div className="workspace">
        <section className="play-area">
          <div className="station-heading">
            <div>
              <span className="eyebrow">
                ASSET RECOVERY / BATCH {String(s.round + 1).padStart(3, '0')}
              </span>
              <h1>{title}</h1>
              <p>
                {s.round === 0
                  ? 'The bank froze your assets. Literally.'
                  : s.round === 19
                    ? 'One last vault. Every asset comes home.'
                    : s.round % 4 === 2
                      ? 'One shared support. A whole account waiting.'
                      : 'A little patience. A little heat. All yours.'}
              </p>
            </div>
            <span className="live-tag">
              <i />{' '}
              {s.phase === 'playing' ? 'STATION ONLINE' : 'STATION STANDBY'}
            </span>
          </div>
          <div className="scene" ref={host} />
          {failure && (
            <div className="render-error" role="alert">
              {failure}
              <Button onClick={() => location.reload()}>Reload</Button>
            </div>
          )}
          <div className="bench-caption">
            <span>
              <i className={s.firing ? 'live active' : 'live'} />
              {s.phase === 'transitioning'
                ? 'NEXT BATCH ARRIVING'
                : s.phase === 'refilling'
                  ? 'REFILLING'
                  : s.firing
                    ? 'TORCH ACTIVE'
                    : s.fuel === 0
                      ? 'REFILL TO CONTINUE'
                      : 'READY TO RECOVER'}
            </span>
            <span>
              {s.family.toUpperCase()}{' '}
              <b>
                {s.collected} / {s.total} RECOVERED
              </b>
            </span>
          </div>
          <div
            className={`instruction ${s.message ? 'has-message' : ''}`}
            role="status"
          >
            {s.message ? <Check size={18} /> : <Mouse size={20} />}
            <span>
              {s.message || (
                <>
                  <strong>
                    {s.settings.toggle
                      ? 'Click to fire. Click to stop.'
                      : 'Hold to melt.'}
                  </strong>{' '}
                  {s.round % 4 === 2
                    ? 'Cut the narrow support.'
                    : 'Sweep around a find to free it.'}
                </>
              )}
            </span>
          </div>
          <div className="tool-dock">
            <div className="torch-status">
              <Flame size={24} />
              <div>
                <span>FIELD TORCH · MK {s.upgrades.heat + 1}</span>
                <strong>
                  {s.mode === 'wide' ? 'Fan nozzle' : 'Precision nozzle'}
                </strong>
              </div>
            </div>
            <div className="fuel-control">
              <div className="fuel-label">
                <span>
                  <Fuel size={14} /> FUEL
                </span>
                <b>{Math.ceil(fuel)}%</b>
              </div>
              <Progress
                aria-label="Fuel remaining"
                value={fuel}
                className={`fuel-progress ${fuel < 15 ? 'low' : ''}`}
              />
            </div>
            <button
              className={`refill ${fuel === 0 ? 'empty' : ''}`}
              disabled={busy}
              onClick={() => action((m) => m.refill())}
            >
              Refill <span>R · FREE</span>
            </button>
          </div>
        </section>
        <aside className="upgrade-panel">
          <div className="panel-heading">
            <span className="eyebrow">BETTER TOOLS. WARMER ASSETS.</span>
            <h2>
              Workshop <ArrowUpRight size={20} />
            </h2>
          </div>
          <div className="mode-label">
            <span>NOZZLE</span>
            <span>1 / 2 TO SWITCH</span>
          </div>
          <RadioGroup
            aria-label="Nozzle mode"
            value={s.mode}
            onValueChange={(v) => action((m) => m.selectMode(String(v)))}
            className="nozzle-options"
          >
            <label
              className={`nozzle-option ${s.mode === 'precision' ? 'selected' : ''}`}
            >
              <Crosshair size={22} />
              <span>
                <strong>Precision</strong>
                <small>Focused penetration</small>
              </span>
              <RadioGroupItem
                value="precision"
                aria-label="Precision nozzle"
                disabled={busy}
              />
            </label>
            <label
              className={`nozzle-option ${s.mode === 'wide' ? 'selected' : ''} ${!s.upgrades.wide ? 'locked' : ''}`}
            >
              <Fan size={22} />
              <span>
                <strong>Fan</strong>
                <small>
                  {s.upgrades.wide
                    ? 'Wider, gentler heat'
                    : 'Unlock in workshop'}
                </small>
              </span>
              {!s.upgrades.wide ? (
                <LockKeyhole size={13} />
              ) : (
                <RadioGroupItem
                  value="wide"
                  aria-label="Fan nozzle"
                  disabled={busy}
                />
              )}
            </label>
          </RadioGroup>
          <div className="panel-rule" />
          <div className="section-label">UPGRADES</div>
          <div className="upgrades">
            {(Object.keys(UPGRADES) as Upgrade[]).map((key) => {
              const u = UPGRADES[key],
                level = s.upgrades[key],
                cost = u.costs[level],
                max = cost === undefined,
                Icon = ICONS[key],
                afford = !max && s.money >= cost;
              return (
                <div
                  className={`upgrade-card ${afford ? 'affordable' : ''}`}
                  key={key}
                >
                  <div className="upgrade-title">
                    <Icon size={19} />
                    <strong>{u.name}</strong>
                    <span>
                      {max ? <Check size={13} /> : `${level}/${u.costs.length}`}
                    </span>
                  </div>
                  <p>{u.description}</p>
                  <div className="upgrade-bottom">
                    <span>{max ? 'Fully upgraded' : u.effects[level]}</span>
                    <button
                      disabled={busy || max || !afford}
                      onClick={() => action((m) => m.purchase(key))}
                      aria-label={
                        max
                          ? `${u.name} fully upgraded`
                          : `Upgrade ${u.name} for ${cost} dollars`
                      }
                      className="buy"
                    >
                      {max ? 'MAX' : `$${cost.toLocaleString()}`}
                      {!max && <span>+</span>}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="recovery-progress">
            <div>
              <span>
                {s.continuing ? 'ASSETS RECLAIMED' : 'RECOVERY PROGRESS'}
              </span>
              <b>
                {s.continuing ? 'COMPLETE' : `${Math.min(20, s.round)} / 20`}
              </b>
            </div>
            <Progress
              aria-label="Recovery progress"
              value={s.continuing ? 100 : Math.min(100, (s.round / 20) * 100)}
            />
            <p>
              {s.continuing
                ? 'Keep recovering at your own pace.'
                : s.round === 0
                  ? 'Your first coin buys a hotter torch.'
                  : s.round < 19
                    ? 'The vault is waiting. Keep thawing.'
                    : 'The final batch is on your bench.'}
            </p>
          </div>
          <div className="save-status">
            <i />{' '}
            {s.saveStatus === 'unavailable'
              ? 'SAVE UNAVAILABLE IN THIS BROWSER'
              : s.saveStatus === 'invalid'
                ? 'INVALID SAVE · FRESH START'
                : 'SAVED ON THIS DEVICE'}
          </div>
        </aside>
      </div>
      <footer>
        <span>
          FROZEN ASSETS <b> / </b> FIELD STATION 01
        </span>
        <span>
          MOVE TO AIM <b>·</b>{' '}
          {s.settings.toggle ? 'CLICK TO FIRE' : 'HOLD TO MELT'} <b>·</b> ESC TO
          PAUSE
        </span>
      </footer>
      <Dialog
        open={s.phase === 'paused'}
        onOpenChange={(open) => {
          if (!restart) pause(open);
        }}
      >
        <DialogContent className="settings-modal">
          <div className="modal-symbol">
            <Pause size={23} />
          </div>
          <DialogTitle className="modal-title">Take a breather.</DialogTitle>
          <DialogDescription>
            Your assets can wait. Your progress is saved.
          </DialogDescription>
          <div className="setting-row">
            <label id="master-label">
              Master volume <span>{Math.round(s.settings.master * 100)}%</span>
            </label>
            <Slider
              aria-labelledby="master-label"
              value={[s.settings.master * 100]}
              onValueChange={(v) =>
                setting('master', (Array.isArray(v) ? v[0] : v) / 100)
              }
            />
          </div>
          <div className="setting-row">
            <label id="effects-label">
              Sound effects <span>{Math.round(s.settings.effects * 100)}%</span>
            </label>
            <Slider
              aria-labelledby="effects-label"
              value={[s.settings.effects * 100]}
              onValueChange={(v) =>
                setting('effects', (Array.isArray(v) ? v[0] : v) / 100)
              }
            />
          </div>
          <div className="setting-switch">
            <label htmlFor="mute-switch">Mute audio</label>
            <Switch
              id="mute-switch"
              checked={s.settings.muted}
              onCheckedChange={(v) => setting('muted', v)}
            />
          </div>
          <div className="setting-switch">
            <label htmlFor="toggle-switch">
              Toggle to fire<small>Click once to start, again to stop.</small>
            </label>
            <Switch
              id="toggle-switch"
              checked={s.settings.toggle}
              onCheckedChange={(v) => setting('toggle', v)}
            />
          </div>
          <div className="setting-switch">
            <label htmlFor="particles-switch">Fewer particles</label>
            <Switch
              id="particles-switch"
              checked={s.settings.reducedParticles}
              onCheckedChange={(v) => setting('reducedParticles', v)}
            />
          </div>
          <div className="setting-switch">
            <label htmlFor="scale-switch">Larger interface text</label>
            <Switch
              id="scale-switch"
              checked={s.settings.largeUI}
              onCheckedChange={(v) => setting('largeUI', v)}
            />
          </div>
          <Button className="resume-button" onClick={() => pause(false)}>
            <Play size={16} /> Back to the bench
          </Button>
          <button className="restart-link" onClick={() => setRestart(true)}>
            <RotateCcw size={14} /> Restart recovery
          </button>
          <p className="audio-credit">
            Original synthesized sound. No music. Just you and the ice.
          </p>
        </DialogContent>
      </Dialog>
      <Dialog open={s.phase === 'completed'} onOpenChange={() => {}}>
        <DialogContent className="completion-modal" showCloseButton={false}>
          <div className="modal-symbol gold">
            <Trophy size={30} />
          </div>
          <span className="eyebrow">ACCOUNT STATUS: UNFROZEN</span>
          <DialogTitle className="completion-title">
            All yours. Again.
          </DialogTitle>
          <DialogDescription>
            You reclaimed the vault and every frozen asset along the way.
          </DialogDescription>
          <div className="completion-stats">
            <div>
              <span>RECOVERED VALUE</span>
              <strong>${s.earned.toLocaleString()}</strong>
            </div>
            <div>
              <span>VALUABLES FREED</span>
              <strong>{s.recovered}</strong>
            </div>
          </div>
          <Button
            className="resume-button"
            onClick={() => action((m) => m.continuePlaying())}
          >
            Continue playing <ArrowUpRight size={17} />
          </Button>
          <button className="restart-link" onClick={() => setRestart(true)}>
            <RotateCcw size={14} /> Start a fresh recovery
          </button>
        </DialogContent>
      </Dialog>
      <AlertDialog open={restart} onOpenChange={setRestart}>
        <AlertDialogContent>
          <AlertDialogTitle>Start from the first block?</AlertDialogTitle>
          <AlertDialogDescription>
            This clears your recovered money, upgrades, and current ice. Your
            sound and comfort settings stay.
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
