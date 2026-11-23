import type Phaser from 'phaser';
import type { Side, Snapshot } from '../core/snapshot';
import type { DuelResult } from './duels';

const HOLD_MS = 1000;
const INK = 0x252734;
const LINK = 0xffdfa4;

/** A short link at the feet of the two players in a repeat duel. */
export class DuelLayer {
  private readonly mark: Phaser.GameObjects.Graphics;
  private cue: DuelResult | null = null;
  private left = 0;

  constructor(scene: Phaser.Scene, depth: number) {
    this.mark = scene.add.graphics().setDepth(depth);
  }

  note(result: DuelResult | undefined): void {
    if (!result || result.wins < 2) return;
    this.cue = result;
    this.left = HOLD_MS;
  }

  update(delta: number, zoom: number, snap: Snapshot, feet: (side: Side, slot: number) => { x: number; y: number } | null): void {
    this.mark.clear();
    if (snap.phase?.kind === 'half-time' || snap.phase?.kind === 'full-time') this.cue = null;
    this.left -= delta;
    if (!this.cue || this.left <= 0) return;
    const { winner, loser } = this.cue;
    const present = (p: typeof winner) => snap.players.some(q => q.side === p.side && q.slot === p.slot && q.who === p.who && q.pose !== 'bench');
    if (!present(winner) || !present(loser)) return;
    const a = feet(winner.side, winner.slot), b = feet(loser.side, loser.slot);
    if (!a || !b) return;
    const alpha = Math.min(1, this.left / 250);
    for (const [colour, width] of [[INK, 4], [LINK, 1.5]] as const) {
      this.mark.lineStyle(width / zoom, colour, alpha);
      this.mark.lineBetween(a.x, a.y, b.x, b.y);
      this.mark.strokeEllipse(a.x, a.y, 23 / zoom, 10 / zoom);
      this.mark.strokeEllipse(b.x, b.y, 23 / zoom, 10 / zoom);
    }
  }

  clear(): void {
    this.cue = null;
    this.mark.clear();
  }

  destroy(): void {
    this.mark.destroy();
  }
}
