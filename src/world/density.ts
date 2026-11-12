// The canvas at the screen's pixel density (#627). Phaser 3.90 has no
// `resolution` setting and its RESIZE mode sizes the canvas in CSS px, so on a 2×
// phone every canvas px was two device px and the only crisp zooms were ×1 and ×2.
// Here the game runs in Scale.NONE with a backing store of CSS size × density and
// a scale-manager zoom of 1 / density, so the canvas is shown at its CSS size: one
// canvas px is one device px, and a camera zoom of 3 is ×1.5 in CSS terms. Past
// MAX_DENSITY (2) a screen renders at a whole fraction of its ratio (viewport.ts).
//
// Game units are canvas px from here on. Pointer positions come in canvas px
// (Phaser's displayScale), so drags and taps map to the world as before. What is
// sized in screen px reads screenDensity(): a camera's zoom in CSS terms is
// cam.zoom / screenDensity() (cssZoom), the zoom ranges of a camera controller are
// CSS zooms multiplied by it, and the DOM's CSS px become canvas px times it.
import Phaser from 'phaser';
import { backingSize, densityFor, screenDensity, setScreenDensity } from './viewport';
import { CSS_PIXELS, overrideOn } from '../labs/flags';

/** The screen's ratio, or 1 under the developer override that keeps the old CSS-pixel canvas (labs/flags CSS_PIXELS). */
function deviceRatio(): number {
  if (typeof window === 'undefined' || overrideOn(CSS_PIXELS)) return 1;
  return window.devicePixelRatio || 1;
}

/** The game's scale config: the window's size at the screen's density, shown at CSS size. */
export function densityScaleConfig(): Phaser.Types.Core.ScaleConfig {
  const density = densityFor(deviceRatio());
  setScreenDensity(density);
  const size = backingSize({ width: window.innerWidth, height: window.innerHeight }, density);
  return { mode: Phaser.Scale.NONE, width: size.width, height: size.height, zoom: 1 / density };
}

/**
 * Keep the canvas filling its parent at the screen's density: on every scale
 * refresh (Phaser's own parent-size check, a rotation, main.ts's refresh after the
 * rotate card), and when the density itself changes (the window moved to another
 * screen, or browser zoom). Call once, right after `new Phaser.Game`.
 */
export function trackDensity(game: Phaser.Game): void {
  let busy = false;
  const fit = (): void => {
    const scale = game.scale;
    if (busy || !scale.canvas) return;
    const parent = scale.parentSize;
    if (parent.width <= 0 || parent.height <= 0) return;
    busy = true;
    try {
      const density = densityFor(deviceRatio());
      setScreenDensity(density);
      scale.zoom = 1 / density;
      const size = backingSize(parent, density);
      const style = scale.canvas.style;
      const cssW = `${parent.width}px`;
      const cssH = `${parent.height}px`;
      if (scale.gameSize.width !== size.width || scale.gameSize.height !== size.height) {
        scale.resize(size.width, size.height); // sets the style from the zoom: put it back exactly below
      }
      if (style.width !== cssW || style.height !== cssH) {
        style.width = cssW;
        style.height = cssH;
        scale.refresh(); // re-read the canvas bounds, so pointer maths use the size just set
      }
    } finally {
      busy = false;
    }
  };
  game.scale.on(Phaser.Scale.Events.RESIZE, fit);
  game.events.once(Phaser.Core.Events.READY, fit);
  // A density change with no size change (another monitor, browser zoom) fires no
  // resize; a media query on the current ratio does, once, then is set up again.
  const watch = (): void => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(`(resolution: ${deviceRatio()}dppx)`);
    const onChange = (): void => {
      mq.removeEventListener('change', onChange);
      if (densityFor(deviceRatio()) !== screenDensity()) game.scale.refresh();
      watch();
    };
    mq.addEventListener('change', onChange);
  };
  watch();
}

