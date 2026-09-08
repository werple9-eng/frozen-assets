// The desktop adapter can provide atomic file writes / Steam Auto-Cloud paths.
// No gameplay or rendering module needs to know which storage owns the save.
export interface SaveBackend {
  load(): Promise<string | null>;
  save(data: string): Promise<void>;
}
export class BrowserSaveBackend implements SaveBackend {
  constructor(private key = 'frozen-assets-v3') {}
  async load() {
    return localStorage.getItem(this.key);
  }
  async save(data: string) {
    const current = localStorage.getItem(this.key);
    if (current && !localStorage.getItem(`${this.key}-before-campaign`))
      localStorage.setItem(`${this.key}-before-campaign`, current);
    localStorage.setItem(this.key, data);
  }
}
export class MemorySaveBackend implements SaveBackend {
  constructor(public data: string | null = null) {}
  async load() {
    return this.data;
  }
  async save(data: string) {
    this.data = data;
  }
}
export class SaveService {
  private pending = Promise.resolve();
  constructor(public backend: SaveBackend) {}
  load() {
    return this.backend.load();
  }
  save(data: string) {
    this.pending = this.pending
      .catch(() => {})
      .then(() => this.backend.save(data));
    return this.pending;
  }
}
export type GameAction =
  | 'PRIMARY_ACTION'
  | 'SECONDARY_ACTION'
  | 'ROTATE'
  | 'TOOL_PREVIOUS'
  | 'TOOL_NEXT'
  | 'OPEN_UPGRADES'
  | 'OPEN_PHONE'
  | 'PAUSE'
  | 'CONFIRM'
  | 'BACK'
  | 'PAN'
  | 'ZOOM';
export const KEY_ACTIONS: Record<string, GameAction> = {
  u: 'OPEN_UPGRADES',
  p: 'OPEN_PHONE',
  Escape: 'PAUSE',
  '[': 'TOOL_PREVIOUS',
  ']': 'TOOL_NEXT',
  Enter: 'CONFIRM',
  Backspace: 'BACK',
  ' ': 'ROTATE',
};
// W3C standard gamepad mapping is shared by Xbox and PlayStation controllers.
// Steam Input can supply these same actions without affecting game rules.
export const PAD_ACTIONS: Record<number, GameAction> = {
  0: 'CONFIRM',
  1: 'BACK',
  2: 'OPEN_UPGRADES',
  3: 'OPEN_PHONE',
  4: 'TOOL_PREVIOUS',
  5: 'TOOL_NEXT',
  6: 'ROTATE',
  7: 'PRIMARY_ACTION',
  8: 'SECONDARY_ACTION',
  9: 'PAUSE',
};
export class ActionInput {
  previous = new Set<number>();
  sample(buttons: readonly { pressed: boolean }[]) {
    const active = new Set(buttons.flatMap((b, i) => (b.pressed ? [i] : [])));
    const events: { action: GameAction; down: boolean }[] = [];
    for (const [index, action] of Object.entries(PAD_ACTIONS)) {
      const i = Number(index);
      if (active.has(i) !== this.previous.has(i))
        events.push({ action, down: active.has(i) });
    }
    this.previous = active;
    return events;
  }
  reset() {
    this.previous.clear();
  }
}
