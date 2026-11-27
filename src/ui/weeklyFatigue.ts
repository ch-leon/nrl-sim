import { WEEKLY_FATIGUE, weeklyFatigueInjuryTier, weeklyFatigueStartingEnergy } from '../data/cards';
import type { Player } from '../core/state';
import { crossedFatigueLines, type WeeklyFatiguePreview } from '../systems/fatiguePreview';
import { el } from './dom';

const limits = WEEKLY_FATIGUE.INJURY_TIERS.map(t => t.above).reverse();
export const FATIGUE_LEGEND = `Injury risk rises above ${limits.join(' and again above ')} fatigue.`;

function riskLabel(fatigue: number): string {
  const tier = weeklyFatigueInjuryTier(fatigue);
  return !tier ? 'Normal injury risk' : tier.above === limits[limits.length - 1] ? 'High injury risk' : 'Raised injury risk';
}

export function fatigueEnergyText(fatigue: number): string {
  return `${(weeklyFatigueStartingEnergy(fatigue) * 100).toFixed(1).replace(/\.0$/, '')}%`;
}

/** The compact meter sits inside the player control, whose name also reads the value aloud. */
export function appendFatigueBar(control: HTMLElement, player: Player, fatigue: number, forecast = '', container = control): void {
  ensureFatigueStyles();
  const risk = riskLabel(fatigue);
  const tier = weeklyFatigueInjuryTier(fatigue);
  const barText = `Fatigue ${fatigue} of ${WEEKLY_FATIGUE.MAX}, ${risk.toLowerCase()}`;
  const spoken = [control.getAttribute('aria-label') ?? player.name, barText, forecast].filter(Boolean).join('. ');
  control.setAttribute('aria-label', spoken);
  container.append(el('span', { class: 'nrl-weekly-fatigue' },
    el('span', { class: 'nrl-weekly-fatigue-value', text: `Fatigue ${fatigue}` }),
    el('span', { class: 'nrl-weekly-fatigue-track', attrs: {
      role: 'meter', 'aria-label': `${player.name} weekly fatigue`, 'aria-valuemin': String(WEEKLY_FATIGUE.MIN),
      'aria-valuemax': String(WEEKLY_FATIGUE.MAX), 'aria-valuenow': String(fatigue), 'aria-valuetext': barText,
      'data-weekly-fatigue': player.id, ...(tier ? { 'data-raised-risk': '' } : {}),
    } },
      el('span', { class: 'nrl-weekly-fatigue-fill', attrs: { style: `width:${fatigue / WEEKLY_FATIGUE.MAX * 100}%` } }),
      ...limits.map(line => el('span', { class: 'nrl-weekly-fatigue-tick', attrs: {
        'aria-hidden': 'true', style: `left:${line / WEEKLY_FATIGUE.MAX * 100}%`,
      } }))),
    ...(tier ? [el('span', { class: 'nrl-weekly-fatigue-risk', text: risk })] : []),
    ...(forecast ? [el('span', { class: 'nrl-weekly-fatigue-kickoff', text: forecast })] : []),
  ));
}

function kickoffText(preview: WeeklyFatiguePreview, id: string): string {
  if (!preview.league) return 'No League fixture scheduled.';
  if (preview.awayAtKickoff.has(id)) return `Away for ${preview.league.label}.`;
  const fatigue = preview.kickoff?.[id] ?? WEEKLY_FATIGUE.MIN;
  return `Kicks off ${preview.league.label} on ${fatigue}, at ${fatigueEnergyText(fatigue)} energy.`;
}

export function fatigueEventText(preview: WeeklyFatiguePreview, id: string): string | undefined {
  const appearance = preview.event?.players.get(id);
  if (!appearance) return;
  const crossing = crossedFatigueLines(appearance.before, appearance.after);
  const warning = crossing.length ? ` Injury risk raised (above ${crossing.join(' and ')}).` : '';
  return `${appearance.interchange ? 'If used: ' : ''}Fatigue ${appearance.before} → ${appearance.after} at the event. ${kickoffText(preview, id)}${warning}`;
}

export function fatigueBookingNote(preview: WeeklyFatiguePreview | undefined, id: string): HTMLElement | undefined {
  const text = preview && fatigueEventText(preview, id);
  if (!text) return;
  return el('p', { text, attrs: { id: 'nrl-booking-fatigue', 'data-fatigue-event-preview': id } });
}

export function fatigueLineupText(preview: WeeklyFatiguePreview | undefined, id: string): string {
  if (!preview?.league) return '';
  if (preview.awayAtKickoff.has(id)) return 'Away for next League match';
  const energy = fatigueEnergyText(preview.kickoff?.[id] ?? WEEKLY_FATIGUE.MIN);
  return preview.event?.players.get(id)?.interchange
    ? `If used in event, starts at ${energy} energy` : `Starts at ${energy} energy`;
}

export function fatigueBonusMatchNote(preview: WeeklyFatiguePreview | undefined, squad: readonly Player[]): HTMLElement | undefined {
  const event = preview?.event;
  if (!preview || !event?.fixture || !event.players.size) return;
  ensureFatigueStyles();
  return el('details', { class: 'nrl-weekly-fatigue-details', attrs: { 'data-fatigue-match-preview': '' } },
    el('summary', { text: `Fatigue preview · ${event.fixture.label}` }),
    el('ul', {}, ...squad.flatMap(p => {
      const text = fatigueEventText(preview, p.id);
      return text ? [el('li', { attrs: { 'data-fatigue-event-preview': p.id } }, el('strong', { text: p.name }), ' ', text)] : [];
    })));
}

function ensureFatigueStyles(): void {
  if (document.getElementById('nrl-weekly-fatigue-styles')) return;
  const style = el('style', { attrs: { id: 'nrl-weekly-fatigue-styles' }, text: `
.nrl-weekly-fatigue { display: grid; gap: 3px; min-inline-size: 0; text-align: start; font-size: .6875rem; line-height: 1.25; color: var(--nrl-text); }
.nrl-weekly-fatigue-value { font-family: var(--nrl-f-num); }
.nrl-weekly-fatigue-track { display: block; position: relative; block-size: 5px; border-radius: 4px; background: var(--nrl-line-2); }
.nrl-weekly-fatigue-fill { display: block; block-size: 100%; border-radius: inherit; background: var(--nrl-pos); }
.nrl-weekly-fatigue-track[data-raised-risk] .nrl-weekly-fatigue-fill { background: var(--nrl-neg); }
.nrl-weekly-fatigue-tick { position: absolute; inset-block: 0; inline-size: 1px; background: var(--nrl-text); }
.nrl-weekly-fatigue-risk { overflow-wrap: anywhere; }
.nrl-squad-list > .nrl-row > .nrl-weekly-fatigue { grid-column: 2 / -1; max-inline-size: 15rem; padding-block: 4px; }
.nrl-swap-row > .nrl-weekly-fatigue { grid-column: 2 / -1; max-inline-size: 15rem; }
.nrl-weekly-fatigue-heading { font-size: .75rem; line-height: 1.25; margin-block: 2px 4px; overflow-wrap: anywhere; }
.nrl-weekly-fatigue-details { margin-block: 4px; overflow-wrap: anywhere; }
.nrl-weekly-fatigue-details ul { margin-block: 5px; padding-inline-start: 1.4em; max-block-size: 24vh; overflow-y: auto; }
.nrl-weekly-fatigue-details li + li { margin-block-start: 5px; }
.nrl-weekly-fatigue-details summary { cursor: pointer; }
.nrl-weekly-fatigue-kickoff { display: block; min-inline-size: 0; color: var(--nrl-text); font-size: .6875rem; line-height: 1.25; overflow-wrap: anywhere; }
.nrl-lineup[data-fatigue] .nrl-pitch-lane { flex: 1 0 auto; }
@media (max-width: 760px) {
  .nrl-lineup[data-fatigue] .nrl-pitch-cards .nrl-pcard-face { display: none; }
  .nrl-lineup[data-fatigue] .nrl-pitch-cards .nrl-pcard-tag { inset-inline-start: 0; inset-block: auto 0; }
  .nrl-lineup[data-fatigue] .nrl-pitch-cards .nrl-pcard-body { padding: 5px; }
}
` });
  document.head.append(style);
}
