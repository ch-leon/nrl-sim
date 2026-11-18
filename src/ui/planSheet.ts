// src/ui/planSheet.ts — the pre-match plan sheet in the half-time sheet's look (SuperCOOKED 42, §6).
// The Lineup's Game plan and Set plays sheets (lineup.ts) keep their markup and hooks; this
// stylesheet, appended after theirs, gives them the half-time sheet's type: the title in
// Archivo, the row labels in JetBrains Mono, the presets in Oswald caps, a ringed panel.
// No imports: the Lineup's stylesheet takes it as a string.

export const PLAN_SHEET_CSS = `
.nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal { box-shadow: inset 0 0 0 1px var(--nrl-line), 0 -8px 30px rgba(0, 0, 0, 0.4); padding-left: 20px; padding-right: 20px; }
.nrl-lineup-plan .nrl-lineup-plan-title { font-family: var(--nrl-f-display); font-weight: 400; font-size: 1.625rem; line-height: 1; letter-spacing: -0.02em; color: var(--nrl-text); }
.nrl-lineup-plan .nrl-lineup-plan-label { font-family: var(--nrl-f-num); font-size: 0.75rem; font-weight: 700; letter-spacing: 0.12em; }
.nrl-lineup-plan .nrl-seg > .nrl-btn { font-size: 0.9375rem; letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-lineup-plan .nrl-lineup-tac-hint { color: #e6e9ef; }
.nrl-lineup-plan .nrl-lineup-tac-hint b { font-family: var(--nrl-f-label); font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; }
.nrl-lineup-plan .nrl-lineup-plan-foot .nrl-btn-primary { min-height: 50px; padding: 0 22px; border-radius: 10px; font-size: 1.125rem; }
@media (max-height: 440px) {
  .nrl-lineup-plan .nrl-lineup-plan-title { font-size: 1.375rem; }
  .nrl-lineup-plan .nrl-lineup-plan-foot .nrl-btn-primary { min-height: 44px; }
}
@media (max-width: 760px) {
  .nrl-dialog-region .nrl-modal.nrl-lineup-plan-modal { padding-left: 14px; padding-right: 14px; }
  .nrl-lineup-plan .nrl-seg > .nrl-btn { font-size: 0.8125rem; letter-spacing: 0.03em; }
}
`;
