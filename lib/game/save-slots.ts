import { SaveService } from './platform';
import { blockSpec } from './campaign-content';

export type SaveSlot = { raw: string | null; updated: number; backup?: string };
type Catalog = { version: 1; active: number; slots: SaveSlot[] };
export const SLOT_KEY = 'frozen-assets-slots-v1';
export class SaveSlots {
  private pending: Promise<void> = Promise.resolve();
  data: Catalog = {
    version: 1,
    active: 0,
    slots: Array.from({ length: 3 }, () => ({ raw: null, updated: 0 })),
  };
  constructor(
    private storage: SaveService,
    private legacy: SaveService,
  ) {}
  flush() {
    return this.pending;
  }
  async load() {
    const raw = await this.storage.load();
    if (raw) {
      const parsed = JSON.parse(raw) as Catalog;
      if (
        parsed.version !== 1 ||
        !Number.isInteger(parsed.active) ||
        parsed.active < 0 ||
        parsed.active > 2 ||
        parsed.slots?.length !== 3 ||
        !parsed.slots.every(
          (s) => s && (typeof s.raw === 'string' || s.raw === null),
        )
      )
        throw new Error(
          'Save catalog is damaged. Original recovery is preserved.',
        );
      this.data = parsed;
    } else {
      // Import once without changing the original key. It remains a recovery copy.
      this.data.slots[0].raw = await this.legacy.load();
    }
    return this.data;
  }
  private transact(change: (before: Catalog) => Catalog) {
    const operation = this.pending
      .catch(() => {})
      .then(async () => {
        const next = change(this.data);
        await this.storage.save(JSON.stringify(next));
        this.data = next;
      });
    this.pending = operation;
    return operation;
  }
  async put(index: number, raw: string) {
    this.assertIndex(index);
    await this.transact((before) => {
      const slots = [...before.slots];
      slots[index] = { ...slots[index], raw, updated: Date.now() };
      return { ...before, active: index, slots };
    });
  }
  async clear(index: number) {
    this.assertIndex(index);
    await this.transact((before) => {
      const slots = [...before.slots],
        slot = slots[index];
      slots[index] = { raw: null, updated: 0, backup: slot.raw ?? slot.backup };
      return { ...before, slots };
    });
  }
  async restore(index: number) {
    this.assertIndex(index);
    await this.transact((before) => {
      const slot = before.slots[index];
      if (slot.raw || !slot.backup) return before;
      const slots = [...before.slots];
      slots[index] = { ...slot, raw: slot.backup, updated: Date.now() };
      return { ...before, active: index, slots };
    });
  }
  private assertIndex(index: number) {
    if (!Number.isInteger(index) || index < 0 || index > 2)
      throw new Error('Unknown save slot');
  }
}
export function slotSummary(slot: SaveSlot) {
  if (!slot.raw) return null;
  try {
    const save = JSON.parse(slot.raw);
    return {
      chapter: save.campaign ? blockSpec(save.campaign.block).chapter : 1,
      batch: (save.campaign?.block ?? save.round ?? 0) + 1,
      money: Math.round(save.money ?? 0),
      completed: !!save.campaign?.complete,
      induction: !!save.tutorial && save.tutorial.stage !== 'done',
    };
  } catch {
    return { chapter: 1, batch: 1, money: 0, completed: false, damaged: true };
  }
}
