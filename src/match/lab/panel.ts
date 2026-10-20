// src/match/lab/panel.ts — the lab's DOM controls (BAK-207 §4): teams + seed,
// play/pause/step, speed, scrub, Flag, load-a-code, and a live event log.
// Thin: all state lives in LabController.
import { button, el, mount, panel } from '../../ui/dom';
import { RUN_SPEEDS, type RunSpeed } from '../core/engine';
import { decodeFlag } from '../core/flag';
import { isWeather, type LabController, type LabParams } from './controller';
import type { WeatherKind } from '../../sim/events';
import { TRAIT_MODES, isTraitMode, type LabClub, type TraitMode } from './sheets';
import { ATTACK_PRESETS, DEFENCE_PRESETS, PRESET_LABEL, isAttackPreset, isDefencePreset, type TeamTactics } from '../league/presets';
import type { LabTactics } from './controller';
import { statsLine, statsWindow } from './stats';
import { LEGS, isLegs, type Legs } from '../league/fatigue';
import { DEFAULT_ROTATION, ROTATIONS, isRotation, type Rotation } from '../league/bench';
import { CALL_LABEL, COACH_CALLS, type CoachCall } from '../league/calls';

const TRAIT_MODE_LABEL: Readonly<Record<TraitMode, string>> = { gen: 'as rolled', none: 'none', stars: 'all superstars' };
const LEGS_LABEL: Readonly<Record<Legs, string>> = { fresh: 'fresh', late: 'last 10 min', spent: 'cooked' };

export interface LabPanelHooks {
  /** Rebuild the lab on new teams / seed / tick (new sprites need a new scene). */
  restart(params: LabParams): void;
  notify(text: string): void;
}

const STYLE_ID = 'nrl-lab-styles';
/** At or below this viewport height (a phone on its side) the lab panel goes compact and starts collapsed. */
const SHORT_SCREEN_PX = 480;

export class LabPanel {
  private readonly root: HTMLElement;
  private readonly playBtn: HTMLButtonElement;
  private readonly readout: HTMLElement;
  private readonly label: HTMLElement;
  private readonly scrub: HTMLInputElement;
  private readonly log: HTMLElement;
  private readonly stats: HTMLElement;
  private readonly speedBtns: HTMLButtonElement[];
  private readonly callBtns: HTMLButtonElement[];
  private readonly callSide: () => 'home' | 'away';
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
    // Legs (§8): start fresh, as the last ten minutes, or cooked — fatigue without waiting for it.
    const legs = el('select', { class: 'nrl-lab-select nrl-lab-traits', attrs: { title: 'Legs: fresh / the last ten minutes / cooked' } });
    for (const m of LEGS) {
      const o = el('option', { text: LEGS_LABEL[m], attrs: { value: m } });
      if (m === p.legs) o.selected = true;
      legs.append(o);
    }
    const legsOf = (): Legs => (isLegs(legs.value) ? legs.value : 'fresh');
    // Bench (BAK-207 2b): how hard both coaches rotate their interchanges.
    const bench = el('select', { class: 'nrl-lab-select nrl-lab-traits', attrs: { title: 'Bench: how hard both coaches rotate (off / standard / heavy)' } });
    for (const r of ROTATIONS) {
      const o = el('option', { text: r, attrs: { value: r } });
      if (r === (p.bench ?? DEFAULT_ROTATION)) o.selected = true;
      bench.append(o);
    }
    const benchOf = (): Rotation => (isRotation(bench.value) ? bench.value : DEFAULT_ROTATION);
    // Weather (BAK-207 2f): rain makes the ball slippery; wind carries kicks and blows goal kicks off line.
    const wx = el('select', { class: 'nrl-lab-select nrl-lab-traits', attrs: { title: 'Weather: clear / rain (slippery ball) / wind (kicks carry, goals drift)' } });
    for (const w of ['clear', 'rain', 'wind'] as const) {
      const o = el('option', { text: w, attrs: { value: w } });
      if (w === (p.weather ?? 'clear')) o.selected = true;
      wx.append(o);
    }
    const wxOf = (): WeatherKind => (isWeather(wx.value) ? wx.value : 'clear');
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
      hooks.restart({ seed: s, home: home.value, away: away.value, tick: 0, note: '', traits: mode, tactics: tactics(), legs: legsOf(), bench: benchOf(), weather: wxOf(), ...(p.calls ? { calls: true } : {}), ...(p.ai ? { ai: true } : {}), ...(p.final ? { final: true } : {}) });
    });
    // Any setup change applies at once: the match restarts from the kick-off on the same seed.
    for (const s of [home, away, seed, traits, legs, bench, wx, hAtk, hDef, aAtk, aDef]) s.addEventListener('change', () => go.click());
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
    const whistle = button('⏩', () => {
      ctrl.skipToWhistle();
      this.sync();
    }, { class: 'nrl-lab-mini' });
    whistle.title = 'Skip to the next half-time or full time';
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
      hooks.restart({ seed: f.seed, home: f.home, away: f.away, tick: f.tick, note: f.note, traits: isTraitMode(traits.value) ? traits.value : 'gen', tactics: tactics(), legs: legsOf(), bench: benchOf(), weather: wxOf(), ...(p.calls ? { calls: true } : {}), ...(p.ai ? { ai: true } : {}), ...(p.final ? { final: true } : {}) });
    });

    // Event feed: the last few things that happened; tap one to jump back to it.
    this.log = el('div', { class: 'nrl-lab-log' });
    // Stats strip: what the last five minutes produced, so balance is seen.
    this.stats = el('div', { class: 'nrl-lab-stats' });

    // Coach calls (#73, `calls=1`): a chip per call for the side picked; greyed with the reason when it can't be made now.
    const callSide = el('select', { class: 'nrl-lab-select nrl-lab-traits', attrs: { title: 'Which coach makes the call' } });
    for (const sd of ['home', 'away'] as const) callSide.append(el('option', { text: sd === 'home' ? 'H coach' : 'A coach', attrs: { value: sd } }));
    const sideOf = (): 'home' | 'away' => (callSide.value === 'away' ? 'away' : 'home');
    this.callBtns = COACH_CALLS.map((c) => {
      const b = button(CALL_LABEL[c], () => {
        const why = ctrl.call(sideOf(), c);
        hooks.notify(why ? `${CALL_LABEL[c]}: ${why}` : `${CALL_LABEL[c]} called`);
        this.sync();
      }, { class: 'nrl-lab-mini' });
      b.setAttribute('data-call', c);
      return b;
    });
    this.callSide = sideOf;
    const callsRow = p.calls ? [el('div', { class: 'nrl-lab-row nrl-lab-calls' }, callSide, ...this.callBtns)] : [];

    const collapse = button('–', () => {
      const on = this.root.toggleAttribute('data-collapsed');
      collapse.textContent = on ? '+' : '–';
    }, { class: 'nrl-lab-mini nrl-lab-collapse' });
    this.root = panel(
      { class: 'nrl-lab' },
      el('div', { class: 'nrl-lab-row nrl-lab-head' }, el('div', { class: 'nrl-lab-title', text: 'Match Lab · live match' }), collapse),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, home, el('span', { text: 'v' }), away, seed, go, shuffle),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, el('span', { text: 'Skills' }), traits, el('span', { text: 'Legs' }), legs, el('span', { text: 'Bench' }), bench, el('span', { text: 'Wx' }), wx),
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, el('span', { text: 'H' }), hAtk, hDef, el('span', { text: 'A' }), aAtk, aDef),
      ...(styles ? [el('div', { class: 'nrl-lab-hint nrl-lab-more', text: styles })] : []),
      el('div', { class: 'nrl-lab-row' }, this.playBtn, step, whistle, ...this.speedBtns, this.readout),
      ...callsRow,
      this.scrub,
      this.label,
      this.stats,
      el('div', { class: 'nrl-lab-row nrl-lab-more' }, flag, codeIn, load),
      this.log,
      el('div', { class: 'nrl-lab-hint nrl-lab-more', text: p.note ? `Flag note: ${p.note}` : 'Nines match: two 9:00 halves, the clock in the label, ⏩ skips to the next break. ⚑ Flag anything that looks wrong.' }),
    );
    this.log.classList.add('nrl-lab-more');
    // A short screen (a phone on its side) starts with just the play controls; + opens the rest.
    if (window.matchMedia?.(`(max-height: ${SHORT_SCREEN_PX}px)`).matches) {
      this.root.setAttribute('data-collapsed', '');
      collapse.textContent = '+';
    }
    mount(this.root);
    this.sync();
  }

  /** Refresh readouts (call every frame). */
  sync(): void {
    const r = this.ctrl.runner;
    for (const b of this.callBtns) {
      const why = this.ctrl.callRefusal(this.callSide(), b.getAttribute('data-call') as CoachCall);
      b.disabled = why !== null;
      b.title = why ?? 'Make the call';
    }
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
  /* Never taller than the screen: scroll inside it (a phone on its side is short). */
  max-height: calc(100vh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  max-height: calc(100dvh - 1rem - env(safe-area-inset-top, 0px) - env(safe-area-inset-bottom, 0px));
  overflow-y: auto; overscroll-behavior: contain;
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
@media (max-height: ${SHORT_SCREEN_PX}px) {
  .nrl-lab { width: min(19rem, calc(100vw - 1rem)); padding: 0.3rem 0.4rem; gap: 0.2rem; font-size: 0.66rem; }
  .nrl-lab-log { max-height: 3.8em; }
  /* The game's 44px tap targets don't fit the lab on a short screen; 30px still taps. */
  .nrl-lab .nrl-btn { min-height: 30px; padding: 0.1rem 0.35rem; font-size: 0.66rem; }
  .nrl-lab .nrl-lab-mini { padding: 0.1rem 0.3rem; }
  .nrl-lab-select, .nrl-lab-seed, .nrl-lab-code { padding: 0.05rem 0.2rem; }
  .nrl-lab-title { font-size: 0.7rem; }
}`;
  document.head.appendChild(style);
}
