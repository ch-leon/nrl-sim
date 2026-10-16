// src/match/lab/panel.ts — the lab's DOM controls (BAK-207 §4): teams + seed,
// play/pause/step, speed, scrub, Flag, load-a-code, and a live event log.
// Thin: all state lives in LabController.
import { button, el, mount, panel } from '../../ui/dom';
import { RUN_SPEEDS, type RunSpeed } from '../core/engine';
import { decodeFlag } from '../core/flag';
import type { LabController, LabParams } from './controller';
import type { LabClub } from './sheets';

export interface LabPanelHooks {
  /** Rebuild the lab on new teams / seed / tick (new sprites need a new scene). */
  restart(params: LabParams): void;
  notify(text: string): void;
}

const STYLE_ID = 'nrl-lab-styles';

export class LabPanel {
  private readonly root: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly readout: HTMLElement;
  private readonly label: HTMLElement;
  private readonly scrub: HTMLInputElement;
  private readonly log: HTMLElement;
  private readonly speedBtns: HTMLButtonElement[];
  private scrubbing = false;
  private lastLogged = 0;

  constructor(
    private readonly ctrl: LabController,
    clubs: readonly LabClub[],
    hooks: LabPanelHooks,
  ) {
    ensureLabStyles();
    const p = ctrl.params;

    const select = (value: string, title: string): HTMLSelectElement => {
      const s = el('select', { class: 'nrl-lab-select', attrs: { title } });
      for (const c of clubs) {
        const o = el('option', { text: c.name, attrs: { value: c.id } });
        if (c.id === value) o.selected = true;
        s.append(o);
      }
      return s;
    };
    const home = select(p.home, 'Home team');
    const away = select(p.away, 'Away team');
    const seed = el('input', { class: 'nrl-lab-seed', attrs: { type: 'number', min: '1', step: '1', value: String(p.seed), title: 'Seed' } });
    const go = button('Go', () => {
      const s = Math.max(1, Math.floor(Number(seed.value) || 1));
      hooks.restart({ seed: s, home: home.value, away: away.value, tick: 0, note: '' });
    });
    const shuffle = button('🎲', () => {
      seed.value = String(1 + Math.floor(Math.random() * 999_999));
      go.click();
    }, { class: 'nrl-lab-mini' });

    this.playBtn = button('▶', () => {
      ctrl.toggle();
      this.sync();
    }, { class: 'nrl-lab-mini' });
    const step = button('⏭', () => {
      ctrl.step();
      this.sync();
    }, { class: 'nrl-lab-mini' });
    this.speedBtns = RUN_SPEEDS.map((s) =>
      button(speedLabel(s), () => {
        ctrl.setSpeed(s);
        this.sync();
      }, { class: 'nrl-lab-mini' }),
    );
    this.readout = el('span', { class: 'nrl-lab-readout' });
    this.label = el('div', { class: 'nrl-lab-label' });

    this.scrub = el('input', { class: 'nrl-lab-scrub', attrs: { type: 'range', min: '0', max: '1', value: '0', step: '1', title: 'Scrub' } });
    this.scrub.addEventListener('pointerdown', () => (this.scrubbing = true));
    this.scrub.addEventListener('input', () => {
      ctrl.seek(Number(this.scrub.value));
      this.sync();
    });
    this.scrub.addEventListener('change', () => (this.scrubbing = false));

    const flag = button('⚑ Flag', () => {
      const note = window.prompt('What did you see? (one line)', '') ?? '';
      const code = ctrl.flag(note);
      void copyText(code).then((ok) => hooks.notify(ok ? `Flag copied: ${code.slice(0, 28)}…` : `Flag: ${code}`));
    });
    const codeIn = el('input', { class: 'nrl-lab-code', attrs: { type: 'text', placeholder: 'paste nrl1:… code', spellcheck: 'false' } });
    const load = button('Load', () => {
      const f = decodeFlag(codeIn.value);
      if (!f) return hooks.notify('Not a valid Flag code');
      hooks.restart({ seed: f.seed, home: f.home, away: f.away, tick: f.tick, note: f.note });
    });

    this.log = el('div', { class: 'nrl-lab-log' });

    const collapse = button('–', () => {
      const on = this.root.toggleAttribute('data-collapsed');
      collapse.textContent = on ? '+' : '–';
    }, { class: 'nrl-lab-mini nrl-lab-collapse' });
    this.root = panel(
      { class: 'nrl-lab' },
      el('div', { class: 'nrl-lab-row nrl-lab-head' }, el('div', { class: 'nrl-lab-title', text: 'Match Lab · Phase 1 set prototype' }), collapse),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, home, el('span', { text: 'v' }), away, seed, go, shuffle),
      el('div', { class: 'nrl-lab-row' }, this.playBtn, step, ...this.speedBtns, this.readout),
      this.scrub,
      this.label,
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, flag, codeIn, load),
      this.log,
      el('div', { class: 'nrl-lab-hint nrl-lab-more', text: p.note ? `Flag note: ${p.note}` : 'Nines set: carries, tackles, play-the-ball, last-tackle kick. ⚑ Flag anything that looks wrong.' }),
    );
    this.log.classList.add('nrl-lab-more');
    mount(this.root);
    this.sync();
  }

  /** Refresh readouts (call every frame). */
  sync(): void {
    const r = this.ctrl.runner;
    this.playBtn.textContent = r.playing ? '❚❚' : '▶';
    for (const b of this.speedBtns) b.toggleAttribute('data-active', b.textContent === speedLabel(r.speed));
    this.readout.textContent = `t ${r.tick} · ${(r.tick / 20).toFixed(1)}s`;
    this.label.textContent = r.cur.label;
    if (!this.scrubbing) {
      this.scrub.max = String(Math.max(1, r.maxTick));
      this.scrub.value = String(r.tick);
    }
    if (r.recent.length && r.recent[r.recent.length - 1]!.tick !== this.lastLogged) {
      this.lastLogged = r.recent[r.recent.length - 1]!.tick;
      this.log.replaceChildren(
        ...r.recent.slice(-5).map((e) => el('div', { class: 'nrl-lab-line', text: `${e.tick} · ${e.text}` })),
      );
    }
  }

  destroy(): void {
    this.root.remove();
  }
}

function speedLabel(s: RunSpeed): string {
  return s < 1 ? `×${s === 0.25 ? '¼' : '½'}` : `×${s}`;
}

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function ensureLabStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = `
.nrl-lab {
  position: fixed; left: calc(0.5rem + env(safe-area-inset-left, 0px)); top: calc(0.5rem + env(safe-area-inset-top, 0px));
  z-index: 30; width: min(22rem, calc(100vw - 1rem)); box-sizing: border-box; padding: 0.4rem 0.5rem;
  font-size: 0.72rem; display: flex; flex-direction: column; gap: 0.3rem; pointer-events: auto;
}
.nrl-lab-title { font-weight: bold; font-size: 0.78rem; flex: 1 1 auto; }
.nrl-lab-head { flex-wrap: nowrap; }
.nrl-lab .nrl-lab-collapse { padding: 0 0.4rem; line-height: 1.1; }
.nrl-lab[data-collapsed] .nrl-lab-more { display: none; }
.nrl-lab[data-collapsed] { width: auto; max-width: min(22rem, calc(100vw - 1rem)); }
.nrl-lab-row { display: flex; align-items: center; gap: 0.3rem; flex-wrap: wrap; }
.nrl-lab-select, .nrl-lab-seed, .nrl-lab-code {
  font: inherit; border: 2px solid #000; background: #fff6c2; color: #1a1a2e; padding: 0.15rem 0.25rem; min-width: 0;
}
.nrl-lab-select { flex: 1 1 5rem; max-width: 8rem; }
.nrl-lab-seed { width: 4.5rem; }
.nrl-lab-code { flex: 1 1 6rem; }
.nrl-lab .nrl-btn { padding: 0.2rem 0.45rem; font-size: 0.72rem; }
.nrl-lab .nrl-lab-mini { padding: 0.15rem 0.4rem; }
.nrl-lab .nrl-btn[data-active] { background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000; }
.nrl-lab-readout { margin-left: auto; font-variant-numeric: tabular-nums; }
.nrl-lab-scrub { width: 100%; margin: 0; accent-color: #f4d03f; }
.nrl-lab-label { opacity: 0.85; }
.nrl-lab-log { display: flex; flex-direction: column; gap: 0.05rem; min-height: 1.2em; }
.nrl-lab-line { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.nrl-lab-hint { opacity: 0.65; font-size: 0.66rem; }
@media (max-height: 480px) {
  .nrl-lab { width: min(19rem, calc(100vw - 1rem)); padding: 0.3rem 0.4rem; gap: 0.2rem; font-size: 0.66rem; }
  .nrl-lab-log { display: none; }
}`;
  document.head.appendChild(style);
}
