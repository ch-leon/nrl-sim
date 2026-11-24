import type { DuelPlayer, SimEvent } from '../core/snapshot';

export interface DuelResult {
  winner: DuelPlayer;
  loser: DuelPlayer;
  wins: number;
  text: string;
}

const VERB: Readonly<Record<string, string>> = {
  step: 'steps',
  fend: 'fends off',
  'break-tackle': 'busts through',
  'run-down': 'runs down',
  'held-up': 'holds up',
};

/** Counts only real, distinct results. A player keeps his record if he changes slots. */
export class DuelTimeline {
  private readonly wins = new Map<string, { tick: number; count: number }>();
  private readonly results = new Map<SimEvent, DuelResult>();
  private read = 0;
  private first: SimEvent | undefined;
  private last: SimEvent | undefined;

  /** A seek supplies new event objects. Rebuild the match silently from its current history. */
  sync(history: readonly SimEvent[]): void {
    const rebuilt = history.length < this.read || (this.read > 0
      && (history[0] !== this.first || history[this.read - 1] !== this.last));
    if (rebuilt) {
      this.wins.clear();
      this.results.clear();
      this.read = 0;
    }
    for (; this.read < history.length; this.read++) {
      const event = history[this.read]!;
      const verb = event.kind === 'break-tackle' && event.detail === 'wrestle' ? 'breaks free of' : VERB[event.kind];
      if (!event.duel || !verb) continue;
      const { winner, loser } = event.duel;
      const key = JSON.stringify([winner.side, winner.who, loser.side, loser.who]);
      const previous = this.wins.get(key);
      if (previous?.tick === event.tick) continue;
      const wins = (previous?.count ?? 0) + 1;
      this.wins.set(key, { tick: event.tick, count: wins });
      const again = wins === 1 ? '.' : wins === 2 ? ' again!' : ` for win number ${wins}!`;
      this.results.set(event, { winner, loser, wins, text: `${winner.name} ${verb} ${loser.name}${again}` });
    }
    this.first = history[0];
    this.last = history[this.read - 1];
  }

  result(event: SimEvent): DuelResult | undefined {
    return this.results.get(event);
  }
}
