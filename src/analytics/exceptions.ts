// #548: error text, object values, causes and function names can contain career
// data. Keep only standard types and locations in known production JS chunks.
import { sanitize } from './events';

export const EXCEPTION_MAX_FRAMES = 20;
export const EXCEPTION_WINDOW_MS = 60_000;
export const EXCEPTION_BURST_MAX = 10;
export const EXCEPTION_MESSAGE = 'JavaScript error (message removed)';
const TYPES = ['Error', 'TypeError', 'RangeError', 'ReferenceError', 'SyntaxError', 'URIError', 'EvalError', 'AggregateError'];
const CHUNKS = 'index|boot|guide|panel|towns|uk|matchWorker|artWorker|posthogClient|virtual_pwa-register|workbox-window.prod.es5';
const ASSET = new RegExp(`^(?:https?://[^/\\s]+)?(?:/[^?#\\s]*)?/assets/(${CHUNKS})-[A-Za-z0-9_-]{8}\\.js(?:[?#].*)?$`);
const CANONICAL = new RegExp(`^app:///assets/(${CHUNKS})\\.js$`);

export interface ExceptionFrame { filename: string; lineno: number; colno: number }
export interface SafeException { type: string; frames: ExceptionFrame[] }

function filename(value: unknown): string | null {
  if (typeof value !== 'string' || value.length > 2048) return null;
  const match = CANONICAL.exec(value) ?? ASSET.exec(value);
  return match ? `app:///assets/${match[1]}.js` : null;
}
function position(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 10_000_000;
}
function frame(file: unknown, line: unknown, col: unknown): ExceptionFrame | null {
  const clean = filename(file);
  return clean && position(line) && position(col) ? { filename: clean, lineno: line, colno: col } : null;
}
const errorType = (value: unknown): string => typeof value === 'string' && TYPES.includes(value) ? value : 'Error';

/** Never serialize arbitrary rejection reasons; hostile accessors are fail-open too. */
export function sanitizeException(error: unknown, fallback?: { filename: string; lineno: number; colno: number }): SafeException {
  let type = 'Error';
  const frames: ExceptionFrame[] = [];
  try {
    if (error instanceof Error) {
      type = errorType(error.name);
      if (typeof error.stack === 'string') {
        for (const line of error.stack.slice(0, 16_384).split('\n').slice(0, 60)) {
          // V8 and Firefox/Safari; never keep the message or function name.
          const match = /(?:^|\(|@|\s)((?:https?:\/\/|app:\/\/\/|\/)[^\s]*?):(\d+):(\d+)\)?$/.exec(line);
          if (!match) continue;
          const clean = frame(match[1], Number(match[2]), Number(match[3]));
          if (clean) frames.push(clean);
          if (frames.length === EXCEPTION_MAX_FRAMES) break;
        }
      }
    }
    if (!frames.length && fallback) {
      const clean = frame(fallback.filename, fallback.lineno, fallback.colno);
      if (clean) frames.push(clean);
    }
  } catch { /* No arbitrary error data survives, even when stack access throws. */ }
  return { type, frames };
}

/** Last gate on the official SDK's $exception event: rebuild, never spread it. */
export function sanitizeExceptionProperties(props: Record<string, unknown>): Record<string, unknown> | null {
  const context = sanitize('season_finished', props);
  if (!context || !Array.isArray(props.$exception_list) || !props.$exception_list.length) return null;
  const original = props.$exception_list[0];
  if (!original || typeof original !== 'object') return null;
  const frames: (ExceptionFrame & { platform: 'web:javascript' })[] = [];
  if (Array.isArray(original.stacktrace?.frames)) {
    for (const f of original.stacktrace.frames.slice(0, EXCEPTION_MAX_FRAMES)) {
      if (!f || typeof f !== 'object') continue;
      const clean = frame(f.filename, f.lineno, f.colno);
      if (clean) frames.push({ ...clean, platform: 'web:javascript' });
    }
  }
  const mechanism = props.exception_source === 'unhandledrejection' ? 'onunhandledrejection' : 'onerror';
  return {
    ...context,
    $exception_level: 'error',
    $exception_list: [{ type: errorType(original.type), value: EXCEPTION_MESSAGE,
      mechanism: { type: mechanism, handled: false }, stacktrace: { type: 'raw', frames } }],
    // Only known SDK metadata; no arbitrary $-prefixed data or browser URLs.
    $lib: 'web',
    ...(typeof props.$lib_version === 'string' && /^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(props.$lib_version) ? { $lib_version: props.$lib_version } : {}),
    ...(typeof props.token === 'string' && /^phc_[A-Za-z0-9_-]{16,}$/.test(props.token) ? { token: props.token } : {}),
    distinct_id: '$posthog_cookieless',
    $process_person_profile: false,
    $cookieless_mode: true,
  };
}
