// src/match/lab/panel.ts — the lab's DOM controls (BAK-207 §4): teams + seed,
// play/pause/step, speed, scrub, Flag, load-a-code, and a live event log.
// Thin: all state lives in LabController.
import { button, el, mount, panel } from '../../ui/dom';
import { RUN_SPEEDS, type RunSpeed } from '../core/engine';
import { decodeFlag } from '../core/flag';
import type { LabController, LabParams } from './controller';
import { TRAIT_MODES, isTraitMode, type LabClub, type TraitMode } from './sheets';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, isAttackPreset, isDefencePreset, type TeamTactics } from '../league/presets';
import type { LabTactics } from './controller';
import { statsLine, statsWindow } from './stats';

const TRAIT_MODE_LABEL: Readonly<Record<TraitMode, string>> = { gen: 'as rolled', none: 'none', stars: 'all superstars' };

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
  private readonly stats: HTMLElement;
  private readonly speedBtns: HTMLButtonElement[];
  private scrubbing = false;
  private lastLogged = -1;
  private lastStatsTick = -1;

  constructor(
    private readonly ctrl: LabController,
    clubs: readonly LabClub[],
    hooks: LabPanelHooks,
    /** One line naming each side's style as the sim is actually playing it. */
    styles = '',
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
    // Trait sandbox: watch a mechanic with the skills as rolled, with none, or with everyone a star.
    const traits = el('select', { class: 'nrl-lab-select nrl-lab-traits', attrs: { title: 'Special skills: as rolled / none / everyone a superstar' } });
    for (const m of TRAIT_MODES) {
      const o = el('option', { text: TRAIT_MODE_LABEL[m], attrs: { value: m } });
      if (m === p.traits) o.selected = true;
      traits.append(o);
    }
    // Tactics picker: a preset per side for attack and defence; "club" keeps the club's own style.
    const presetSelect = (kind: 'attack' | 'defence', value: string | undefined, title: string): HTMLSelectElement => {
      const sel = el('select', { class: 'nrl-lab-select nrl-lab-preset', attrs: { title } });
      sel.append(el('option', { text: kind === 'attack' ? 'club atk' : 'club def', attrs: { value: '' } }));
      for (const k of kind === 'attack' ? ATTACK_PRESETS : DEFENCE_PRESETS) {
        const o = el('option', { text: PRESET_LABEL[k], attrs: { value: k } });
        if (k === value) o.selected = true;
        sel.append(o);
      }
      return sel;
    };
    const hAtk = presetSelect('attack', p.tactics.home.attack, 'Home attack preset');
    const hDef = presetSelect('defence', p.tactics.home.defence, 'Home defence preset');
    const aAtk = presetSelect('attack', p.tactics.away.attack, 'Away attack preset');
    const aDef = presetSelect('defence', p.tactics.away.defence, 'Away defence preset');
    const tactics = (): LabTactics => {
      const side = (atk: HTMLSelectElement, def: HTMLSelectElement): Partial<TeamTactics> => ({
        ...(isAttackPreset(atk.value) ? { attack: atk.value } : {}),
        ...(isDefencePreset(def.value) ? { defence: def.value } : {}),
      });
      return { home: side(hAtk, hDef), away: side(aAtk, aDef) };
    };
    const go = button('Go', () => {
      const s = Math.max(1, Math.floor(Number(seed.value) || 1));
      const mode = isTraitMode(traits.value) ? traits.value : 'gen';
      hooks.restart({ seed: s, home: home.value, away: away.value, tick: 0, note: '', traits: mode, tactics: tactics() });
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
      hooks.restart({ seed: f.seed, home: f.home, away: f.away, tick: f.tick, note: f.note, traits: isTraitMode(traits.value) ? traits.value : 'gen', tactics: tactics() });
    });

    // Event feed: the last few things that happened; tap one to jump back to it.
    this.log = el('div', { class: 'nrl-lab-log' });
    // Stats strip: what the last five minutes produced, so balance is seen.
    this.stats = el('div', { class: 'nrl-lab-stats' });

    const collapse = button('–', () => {
      const on = this.root.toggleAttribute('data-collapsed');
      collapse.textContent = on ? '+' : '–';
    }, { class: 'nrl-lab-mini nrl-lab-collapse' });
    this.root = panel(
      { class: 'nrl-lab' },
      el('div', { class: 'nrl-lab-row nrl-lab-head' }, el('div', { class: 'nrl-lab-title', text: 'Match Lab · Phase 1 set prototype' }), collapse),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, home, el('span', { text: 'v' }), away, seed, go, shuffle),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, el('span', { text: 'Skills' }), traits),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, el('span', { text: 'H' }), hAtk, hDef, el('span', { text: 'A' }), aAtk, aDef),
      ...(styles ? [el('div', { class: 'nrl-lab-hint nrl-lab-more', text: styles })] : []),
      el('div', { class: 'nrl-lab-row' }, this.playBtn, step, ...this.speedBtns, this.readout),
      this.scrub,
      this.label,
      this.stats,
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
    const lastTick = r.history.length ? r.history[r.history.length - 1]!.tick : -1;
    if (lastTick !== this.lastLogged || r.history.length === 0) {
      this.lastLogged = lastTick;
      this.log.replaceChildren(
        ...r.history.slice(-8).reverse().map((e) =>
          el('button', {
            class: 'nrl-lab-line',
            text: `${(e.tick / 20).toFixed(1)}s · ${e.text}${e.trait ? ` (${e.trait})` : ''}`,
            attrs: { type: 'button', title: 'Jump to just before this' },
            onClick: () => {
              this.ctrl.seek(Math.max(0, e.tick - 30));
              this.sync();
            },
          }),
        ),
      );
    }
    if (r.tick !== this.lastStatsTick && r.tick % 20 === 0) {
      this.lastStatsTick = r.tick;
      this.stats.textContent = statsLine(statsWindow(r.history, r.tick));
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
.nrl-lab-traits { flex: 0 1 auto; }
.nrl-lab-preset { flex: 1 1 4rem; max-width: 6.5rem; }
.nrl-lab-seed { width: 4.5rem; }
.nrl-lab-code { flex: 1 1 6rem; }
.nrl-lab .nrl-btn { padding: 0.2rem 0.45rem; font-size: 0.72rem; }
.nrl-lab .nrl-lab-mini { padding: 0.15rem 0.4rem; }
.nrl-lab .nrl-btn[data-active] { background: #fff6c2; box-shadow: inset 0 0 0 2px #1a1a2e, 3px 3px 0 #000; }
.nrl-lab-readout { margin-left: auto; font-variant-numeric: tabular-nums; }
.nrl-lab-scrub { width: 100%; margin: 0; accent-color: #f4d03f; }
.nrl-lab-label { opacity: 0.85; }
.nrl-lab-log { display: flex; flex-direction: column; gap: 0.1rem; min-height: 1.2em; max-height: 7.5em; overflow-y: auto; }
.nrl-lab-line {
  font: inherit; text-align: left; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  background: transparent; border: 0; border-left: 3px solid #f4d03f; padding: 0 0.3rem; color: inherit; cursor: pointer;
}
.nrl-lab-line:hover { background: #fff6c2; }
.nrl-lab-stats { font-variant-numeric: tabular-nums; opacity: 0.85; }
.nrl-lab-hint { opacity: 0.65; font-size: 0.66rem; }
@media (max-height: 480px) {
  .nrl-lab { width: min(19rem, calc(100vw - 1rem)); padding: 0.3rem 0.4rem; gap: 0.2rem; font-size: 0.66rem; }
  .nrl-lab-log { max-height: 3.8em; }
}`;
  document.head.appendChild(style);
}
