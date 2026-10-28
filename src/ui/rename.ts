// src/ui/rename.ts — the name field the rename screens share (GitHub #398): the
// player page, the rival squad sheet and the Kit screen. A 44px text box, the
// rename rule's reason under it while the name won't do, and Save / Cancel.
// The rule itself is data/names.ts cleanName (pure, unit-tested). No Phaser.

import { cleanName, NAME_MAX } from '../data/names';
import { button, el } from './dom';

const STYLE_ID = 'nrl-rename-styles';

function ensureRenameStyles(): void {
  if (document.getElementById(STYLE_ID)) return;
  const style = document.createElement('style');
  style.id = STYLE_ID;
  style.textContent = RENAME_CSS;
  document.head.appendChild(style);
}

const RENAME_CSS = `
.nrl-rename { display: flex; flex-direction: column; gap: 4px; min-width: 0; }
.nrl-rename-row { display: flex; gap: 6px; min-width: 0; }
.nrl-rename-input {
  flex: 1 1 auto; min-width: 0; min-height: 44px; padding: 0 10px;
  font: inherit; font-size: 1rem; color: var(--nrl-text);
  background: var(--nrl-button); border: 2px solid var(--nrl-raised); border-radius: 10px;
}
.nrl-rename-input:focus { outline: none; border-color: var(--nrl-accent); }
.nrl-rename-input[aria-invalid="true"] { border-color: var(--nrl-neg); }
.nrl-rename-why { min-height: 1.2em; font-size: 0.6875rem; line-height: 1.2; color: var(--nrl-muted); }
.nrl-rename-why.nrl-attn { color: var(--nrl-neg); }
.nrl-rename .nrl-btn { flex: 1 1 0; min-width: 0; min-height: 44px; padding: 0 8px; }
/* The Rename button beside a sheet's ◂ back: small, never wider than its word. */
.nrl-btn.nrl-rename-open { flex: 0 0 auto; min-height: 44px; padding: 0 12px; font-size: 0.875rem; }
`;

export interface NameFieldOpts {
  /** The name as it stands; the box opens on it. */
  value: string;
  /** What is being named, for a screen reader ("Player name", "Club name"). */
  label: string;
  /** Keep the clean name; return a reason to show when it can't be kept, else null. */
  onSave: (name: string) => string | null;
  onCancel?: () => void;
  /** Called on each keystroke with the text, so a re-render can keep the draft. */
  onDraft?: (text: string) => void;
  /** The Save button's word (default "Save"). */
  saveLabel?: string;
  /** Put Save beside the box rather than under it (a wide row). */
  inline?: boolean;
  /** An attribute on the box, for tests and the e2e checks. */
  attr?: string;
  /** Focus the box when it opens (default true; a screen that opens on other things says false). */
  focus?: boolean;
}

/** A name field: the box, the reason a name won't do, Save (and Cancel when there is one). */
export function nameField(opts: NameFieldOpts): HTMLElement {
  ensureRenameStyles();
  const input = el('input', {
    class: 'nrl-rename-input',
    attrs: {
      type: 'text', 'aria-label': opts.label, maxlength: String(NAME_MAX * 2),
      autocomplete: 'off', autocapitalize: 'words', spellcheck: 'false', enterkeyhint: 'done',
      ...(opts.attr ? { [opts.attr]: '' } : {}),
    },
  });
  input.value = opts.value;
  const why = el('div', { class: 'nrl-rename-why', attrs: { 'aria-live': 'polite' } });
  const save = button(opts.saveLabel ?? 'Save', () => submit(), { class: 'nrl-btn-primary nrl-rename-save' });
  const check = (): void => {
    const c = cleanName(input.value);
    save.disabled = !c.ok;
    input.setAttribute('aria-invalid', String(!c.ok));
    why.className = `nrl-rename-why${c.ok ? '' : ' nrl-attn'}`;
    why.textContent = c.ok ? `${NAME_MAX} characters at most` : c.why;
  };
  const submit = (): void => {
    const c = cleanName(input.value);
    if (!c.ok) { check(); return; }
    const err = opts.onSave(c.name);
    if (err) { why.className = 'nrl-rename-why nrl-attn'; why.textContent = err; }
  };
  input.addEventListener('input', () => { check(); opts.onDraft?.(input.value); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); submit(); }
    else if (e.key === 'Escape' && opts.onCancel) { e.preventDefault(); e.stopPropagation(); opts.onCancel(); }
  });
  check();
  const buttons = [save, ...(opts.onCancel ? [button('Cancel', opts.onCancel, { class: 'nrl-rename-cancel' })] : [])];
  const field = opts.inline
    ? el('div', { class: 'nrl-rename' }, el('div', { class: 'nrl-rename-row' }, input, ...buttons), why)
    : el('div', { class: 'nrl-rename' }, input, why, el('div', { class: 'nrl-rename-row' }, ...buttons));
  // Focus once the field is in the page (the caller appends it after this returns).
  if (opts.focus !== false) queueMicrotask(() => { if (input.isConnected) { input.focus(); input.select(); } });
  return field;
}

/** The small Rename button a sheet puts beside its ◂ back. */
export function renameButton(onClick: () => void, label = 'Rename'): HTMLButtonElement {
  ensureRenameStyles();
  const b = button(label, onClick, { class: 'nrl-rename-open' });
  b.setAttribute('data-rename-open', '');
  return b;
}
