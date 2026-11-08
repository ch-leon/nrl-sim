// Developer settings' marker (#519): a small tag on screen while this browser plays
// anything but the normal game (a playtest career, an override or an experiment on),
// and `data-nrl-dev` on <html> for anything that has to tell (screenshots, analytics).
import { developerSession, type DeveloperSession } from './flags';

/** The tag's words, or null when the game is as players see it. Pure. */
export function devMarkerText(s: DeveloperSession | null): string | null {
  if (!s) return null;
  if (s.testCareer) return 'TEST CAREER';
  return s.overrides.length || s.experiments.length ? 'DEV' : null;
}

const CSS = `
.nrl-dev-marker { position:fixed; left:50%; transform:translateX(-50%); top:calc(2px + var(--nrl-safe-t, 0px)); z-index:2147483000;
  pointer-events:none; font:700 10px/1.2 var(--nrl-f-label, system-ui); letter-spacing:0.08em; color:#1a1a2e; background:#f4d03f;
  padding:2px 6px; border-radius:4px; box-shadow:0 0 0 1px #1a1a2e; white-space:nowrap; }
`;

/** Show, update or remove the tag to match this browser's developer settings. */
export function syncDevMarker(): void {
  if (typeof document === 'undefined') return;
  const s = developerSession();
  const text = devMarkerText(s);
  const root = document.documentElement;
  if (s) root.dataset.nrlDev = s.testCareer ? 'test-career' : 'developer';
  else delete root.dataset.nrlDev;
  let tag = document.querySelector<HTMLElement>('.nrl-dev-marker');
  if (!text) { tag?.remove(); return; }
  if (!document.getElementById('nrl-dev-marker-styles')) {
    const style = document.createElement('style');
    style.id = 'nrl-dev-marker-styles';
    style.textContent = CSS;
    document.head.append(style);
  }
  if (!tag) {
    tag = document.createElement('div');
    tag.className = 'nrl-dev-marker';
    tag.setAttribute('role', 'status');
    document.body.append(tag);
  }
  tag.textContent = text;
  tag.setAttribute('aria-label', text === 'TEST CAREER' ? 'Developer playtest career' : 'Developer settings on');
}
