import { PixelBuffer } from '../../art/pixel';
import { buildKit } from '../../art/match/kit';
import { drawPlayerFrame, LOOKS, lookForPlayer, PLAYER_ANIMS, type PlayerAnim } from '../../art/match/players';
import { appearanceFor, ballPixels, CENTRE, FOOT, HEAD_OPTIONS, drawPrototypePlayer, type Action, type Appearance, type Build, type Facing, type Head } from '../../art/prototype/player';
import { BEATS, DURATION, momentAt, type ArtActor } from './sequence';
import { ART_LAB_CSS } from './style';
import { drawTacklePair, tacklePoseAt, PAIR_X, PAIR_FOOT } from '../../art/prototype/tackle';
import { BRAND } from '../../brand';
import { RECOGNITION_CAST, recognitionAt } from './recognition';
import { CONTACT_CASES, CASE_CARRIER, CASE_DEFENDERS, caseDefinition, caseDuration, contactCaseAt, type ContactCaseId } from './contactCases';
import { CONTACT_W, CONTACT_X, CONTACT_FOOT, contactPoseAt, drawContact } from '../../art/prototype/contact';
import { contactPlayerKey } from '../../match/view/contactAnimation';
import type { ContactPlayer } from '../../match/core/snapshot';

const HOME = buildKit(0xe6b632, 0x21394a, 'v');
const AWAY = buildKit(0x669ba4, 0xf3eee2, 'hoops');
const OLD_ACTION: Record<Action, PlayerAnim> = { idle: 'idle', run: 'run', carry: 'run', pass: 'pass', catch: 'catch', brace: 'tackled', wrap: 'tackle', ground: 'down', ptb: 'ptb' };
const LABELS: Record<Head, string> = { short: 'Short', buzz: 'Buzz cut', mullet: 'Mullet', headgear: 'Headgear', headband: 'Headband', curls: 'Curls', braids: 'Braids', mohawk: 'Mohawk', bald: 'Bald', ponytail: 'Ponytail', flatTop: 'Flat top' };

function texture(buf: PixelBuffer): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = buf.w; canvas.height = buf.h;
  const ctx = canvas.getContext('2d')!;
  const pixels = ctx.createImageData(buf.w, buf.h);
  pixels.data.set(buf.data); ctx.putImageData(pixels, 0, 0);
  return canvas;
}

/** Entry before the title/save flow. Cosmetics here are disposable art-lab controls. */
export function bootArtLab(): void {
  document.title = `Match art lab · ${BRAND.name}`;
  const style = document.createElement('style'); style.textContent = ART_LAB_CSS; document.head.append(style);
  const root = document.createElement('main'); root.className = 'art-lab';
  root.innerHTML = `
    <header><div><p class="eyebrow" id="art-brand"></p><h1>Make contact count.</h1><p class="intro">Read the hit, the help and who comes away with the ball.</p></div><a href="${location.pathname}">Back to game</a></header>
    <div class="mode-switch"><button id="passage" aria-pressed="true">Passage of play</button><button id="contact-cases" aria-pressed="false">Tackle situations</button><button id="tackle-loop" aria-pressed="false">Original wrap</button><button id="recognise" aria-pressed="false">Nine-player test</button><button id="rearrange" hidden>Change positions</button></div>
    <p class="note" id="study-note">Compare the carry, catch and contact at playing size.</p>
    <div class="contact-controls" id="contact-controls" hidden><label>Situation<select id="contact-case">${CONTACT_CASES.map(c => `<option value="${c.id}">${c.label}</option>`).join('')}</select></label><button id="contact-variation">Stance variation: A</button><button id="case-contact">First contact</button><button id="case-outcome">Outcome</button><button id="case-finish">Follow-through</button></div>
    <div class="topline"><div class="toggle"><button id="compare" aria-pressed="true">Compare</button><button id="new-only" aria-pressed="false">Prototype only</button></div><div class="toggle"><button id="zoom" aria-pressed="false">Close up</button><button id="turn" aria-pressed="false">Turn players</button></div></div>
    <section class="stage" aria-label="Match artwork comparison">
      <figure class="panel old"><figcaption>CURRENT</figcaption><canvas class="pitch" id="old-pitch" role="img" aria-label="Current pixel artwork playing the same passage"></canvas></figure>
      <figure class="panel new"><figcaption>PROTOTYPE / 05</figcaption><canvas class="pitch" id="new-pitch" role="img" aria-label="Prototype artwork with varied bodies and directional poses"></canvas></figure>
    </section>
    <div class="transport"><button id="play" class="primary">Pause</button><button id="restart" aria-label="Replay passage">↻ Replay</button><span class="phase" id="phase">Carry</span><input id="scrub" type="range" min="0" max="10" step="0.01" value="0" aria-label="Passage time"><select id="speed" aria-label="Playback speed"><option value="0.5">½ speed</option><option value="1" selected>1× speed</option><option value="2">2× speed</option></select></div>
    <div class="beats" aria-label="Jump to action">${BEATS.map(b => `<button data-time="${b.at}">${b.label}</button>`).join('')}<button id="pass">Pass now →</button></div>
    <section class="workbench"><div><h2>Build your ball runner</h2><p class="note">Changes apply to the receiver in gold. Skin and hair colour stay tied to his original identity.</p><div class="fields">
      <label>Build<select id="build"><option value="lean">Lean back</option><option value="athletic">Athletic</option><option value="stocky">Stocky forward</option></select></label>
      <label>Hair / headwear<select id="head">${HEAD_OPTIONS.map(h => `<option value="${h}">${LABELS[h]}</option>`).join('')}</select></label>
      <label class="check"><input id="beard" type="checkbox"> Beard</label><label class="check"><input id="tape" type="checkbox"> Wrist tape</label>
    </div><p class="note">Tap Pass now during the carry. Use ↑ / ↓ to move the attacking lane, or scrub and pause to inspect contact.</p><button id="reset">Restore his original look</button></div>
    <div><h2>The same player, more personality</h2><p class="note">All eleven head options on the selected build. Tap a player to choose his look.</p><canvas class="lineup" id="lineup" role="img" aria-label="Eleven head options on the same player; choose using the hair dropdown"></canvas><p class="note">Front and back views share the same face, colours and accessories. Close up enlarges pixels without smoothing.</p></div></section>
    <footer>Character study · A passage of play and a nine-player recognition test. These preview choices are temporary; career saves are untouched.</footer>`;
  document.body.append(root);
  const back = root.querySelector<HTMLAnchorElement>('header a')!;
  back.onclick = e => {
    const target = new URL(back.href);
    if (target.origin !== location.origin || target.pathname !== location.pathname) return;
    // Removing a hash alone is same-document navigation; boot the career route afresh.
    e.preventDefault(); history.replaceState(null, '', location.pathname + location.search); location.reload();
  };
  const el = <T extends HTMLElement>(id: string) => root.querySelector<T>(`#${id}`)!;
  el('art-brand').textContent = `${BRAND.titleText} / ART STUDY 05`;
  const oldCanvas = el<HTMLCanvasElement>('old-pitch'); const newCanvas = el<HTMLCanvasElement>('new-pitch');
  const gallery = el<HTMLCanvasElement>('lineup');
  const buildSelect = el<HTMLSelectElement>('build'); const headSelect = el<HTMLSelectElement>('head');
  const beardCheck = el<HTMLInputElement>('beard'); const tapeCheck = el<HTMLInputElement>('tape');
  const scrub = el<HTMLInputElement>('scrub'); const play = el<HTMLButtonElement>('play');
  const original = appearanceFor('p-art-4');
  let custom: Appearance = { ...original };
  let time = 0; let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let recognition = false; let arrangement = 0; let tackleLoop = false;
  let contactCases = false; let contactCase: ContactCaseId = 'two'; let variation = 0;
  let speed = 1; let close = false; let turned = false; let lane = 0;
  let last = performance.now(); let raf = 0; let stopped = false;
  const cache = new Map<string, HTMLCanvasElement>();
  const ball = texture(ballPixels());

  function syncFields(): void {
    buildSelect.value = custom.build; headSelect.value = custom.head;
    beardCheck.checked = custom.beard; tapeCheck.checked = custom.tape;
  }
  function syncPlay(): void { play.textContent = playing ? 'Pause' : 'Play'; }
  function invalidate(): void { cache.clear(); draw(); }
  function getTexture(actor: ArtActor, modern: boolean): HTMLCanvasElement {
    const facing: Facing = turned ? (actor.facing === 'front' ? 'back' : 'front') : actor.facing;
    const key = `${recognition}/${modern}/${actor.id}/${actor.action}/${actor.frame}/${facing}/${actor.possession}`;
    const hit = cache.get(key); if (hit) return hit;
    const kit = actor.side === 'home' ? HOME : AWAY;
    let b: PixelBuffer;
    if (modern) {
      const look = recognition ? RECOGNITION_CAST.find(p => p.id === actor.id)!.look : actor.id === 'p-art-4' ? custom : appearanceFor(actor.id);
      b = drawPrototypePlayer(look, kit, actor.action, actor.frame, facing, actor.possession);
    } else {
      const anim = OLD_ACTION[actor.action];
      const frames = PLAYER_ANIMS[anim].frames;
      const frame = actor.action === 'run' || actor.action === 'carry' ? actor.frame : Math.min(frames - 1, Math.floor(actor.frame * frames / 6));
      const demo = recognition ? RECOGNITION_CAST.find(p => p.id === actor.id)!.look : null;
      const oldLook = LOOKS[lookForPlayer(actor.id)]!;
      b = drawPlayerFrame(kit, demo ? { ...oldLook, skin: demo.skin, hair: demo.hair, beard: demo.beard, style: ['short', 'buzz', 'mullet', 'headgear', 'headband'].includes(demo.head) ? demo.head as typeof oldLook.style : 'short' } : oldLook, anim, frame);
    }
    const result = texture(b); cache.set(key, result); return result;
  }
  function size(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
    const r = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.round(r.width)); const h = Math.max(1, Math.round(r.height));
    if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
    const ctx = canvas.getContext('2d')!; ctx.imageSmoothingEnabled = false; return ctx;
  }
  function paintPitch(canvas: HTMLCanvasElement, modern: boolean): void {
    const ctx = size(canvas); const w = canvas.width; const h = canvas.height;
    const moment = recognition ? recognitionAt(time, arrangement) : momentAt(time, lane);
    ctx.fillStyle = '#436749'; ctx.fillRect(0, 0, w, h);
    // Quiet field texture shared by both views, with diagonal metre lines.
    for (let i = -2; i < 9; i++) {
      ctx.fillStyle = i % 2 ? '#426447' : '#496e4c';
      ctx.beginPath(); ctx.moveTo(i * 100, 0); ctx.lineTo(i * 100 + 50, 0); ctx.lineTo(i * 100 - 100, h); ctx.lineTo(i * 100 - 150, h); ctx.fill();
    }
    ctx.strokeStyle = '#b5c9a080'; ctx.lineWidth = 2;
    for (let i = -1; i < 5; i++) { ctx.beginPath(); ctx.moveTo(i * 190, h); ctx.lineTo(i * 190 + 150, 0); ctx.stroke(); }
    ctx.fillStyle = '#c7d4af70'; ctx.font = 'bold 20px monospace'; ctx.fillText('30', w * .22, h - 18); ctx.fillText('40', w * .75, h - 18);
    if (contactCases) { paintContactCase(ctx, w, h, modern); return; }
    const scale = close ? 3 : 2;
    const x = (n: number) => Math.round(close && !recognition ? w / 2 + (n - .57) * w * 1.5 : 18 + n * (w - 36));
    const y = (n: number) => Math.round(20 + n * (h - 30));
    const paired = modern && moment.tackleFrame !== undefined;
    const actors = moment.actors.filter(a => !paired || a.id !== 'p-art-11').sort((a, b) => a.y - b.y);
    for (const actor of actors) {
      // Keep contact readable as the comparison panes narrow on phones.
      const receiver = moment.actors.find(a => a.id === 'p-art-4')!;
      let px = actor.action === 'wrap' ? Math.max(x(actor.x), x(receiver.x) + 17 * scale) : x(actor.x);
      let py = y(actor.y);
      if (modern && !recognition && actor.id === 'p-art-11' && time >= 5 && time < 5.5) {
        // Arrive at the rig's pixel-space shoulder distance on every viewport.
        const u = (time - 5) / .5; const ease = u * u * (3 - 2 * u);
        px = Math.round(px + (x(receiver.x) + 30 * scale - px) * ease);
        py = Math.round(py + (y(receiver.y) - py) * ease);
      }
      const pair = paired && actor.id === 'p-art-4';
      let img: HTMLCanvasElement;
      if (pair) {
        const key = `tackle/${moment.tackleFrame}/${turned}`;
        img = cache.get(key)!;
        if (!img) { img = texture(drawTacklePair(custom, appearanceFor('p-art-11'), HOME, AWAY, moment.tackleFrame!, turned ? 'back' : 'front')); cache.set(key, img); }
        const pose = tacklePoseAt(time);
        const shadowX = (pose.defender.foot[0] + pose.defender.farFoot[0]) / 2 - PAIR_X;
        ctx.fillStyle = '#142d2866'; ctx.beginPath(); ctx.ellipse(px + shadowX * scale, py + 2, 15 * scale, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
      } else img = getTexture(actor, modern);
      ctx.fillStyle = '#142d2866'; ctx.beginPath(); ctx.ellipse(px, py + 2, 12 * scale, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
      if (actor.possession) {
        ctx.strokeStyle = '#ffdb68'; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(px, py + 2, 13 * scale, 4 * scale, 0, 0, Math.PI * 2); ctx.stroke();
      }
      ctx.save(); ctx.translate(px, py); if (actor.left) ctx.scale(-1, 1);
      ctx.drawImage(img, -(pair ? PAIR_X : modern ? CENTRE : 13) * scale, -(pair ? PAIR_FOOT : modern ? FOOT : 26) * scale, img.width * scale, img.height * scale);
      if (!modern && actor.possession) {
        const ground = actor.action === 'ground' || actor.action === 'ptb';
        ctx.drawImage(ball, 2 * scale, (ground ? -5 : -13) * scale, ball.width * scale, ball.height * scale);
      }
      ctx.restore();
      if (actor.id === 'p-art-4') {
        ctx.font = '600 10px "IBM Plex Mono",monospace'; ctx.textAlign = 'center';
        ctx.fillStyle = '#101b28dd'; ctx.fillRect(px - 29, py + 14, 58, 16);
        ctx.fillStyle = '#ffda6c'; ctx.fillText('RUNNER', px, py + 25); ctx.textAlign = 'left';
      }
    }
    if (moment.ball) ctx.drawImage(ball, x(moment.ball.x), y(moment.ball.y) - 13 * scale, ball.width * scale, ball.height * scale);
    ctx.fillStyle = '#10271eb3'; ctx.fillRect(0, h - 23, w, 23);
    ctx.fillStyle = '#e2e9d7'; ctx.font = '11px "IBM Plex Mono",monospace';
    ctx.fillText(`${moment.beat.toUpperCase()}  ·  ${time.toFixed(1)}s`, 12, h - 8);
  }
  function paintContactCase(ctx: CanvasRenderingContext2D, w: number, h: number, modern: boolean): void {
    const sample = contactCaseAt(contactCase, time, variation);
    const scale = Math.max(1, Math.min(close ? 3 : 2, Math.floor(w / 160)));
    const ox = Math.round(w / 2 - CONTACT_W * scale / 2); const oy = Math.round(h * .72 - CONTACT_FOOT * scale);
    const look = (p: ContactPlayer) => p.who === CASE_CARRIER.who ? custom : appearanceFor(p.who);
    const kit = (p: ContactPlayer) => p.side === 'home' ? HOME : AWAY;
    const shadow = (x: number, y: number, owner: boolean) => {
      ctx.fillStyle = '#142d2866'; ctx.beginPath(); ctx.ellipse(ox + x * scale, oy + y * scale + 2, 11 * scale, 3 * scale, 0, 0, Math.PI * 2); ctx.fill();
      if (owner) { ctx.strokeStyle = '#ffdb68'; ctx.lineWidth = 2; ctx.stroke(); }
    };
    const single = (p: ContactPlayer, x: number, y: number, action: Action, possession: boolean, left = p.side === 'away') => {
      const actor: ArtActor = { id: p.who, x: 0, y: 0, side: p.side, left, facing: 'front', action, frame: Math.floor(time * 12) % 6, possession };
      const img = getTexture(actor, modern);
      shadow(x, y, possession); ctx.save(); ctx.translate(ox + x * scale, oy + y * scale); if (left) ctx.scale(-1, 1);
      ctx.drawImage(img, -(modern ? CENTRE : 13) * scale, -(modern ? FOOT : 26) * scale, img.width * scale, img.height * scale);
      if (!modern && possession) ctx.drawImage(ball, 3 * scale, -13 * scale, ball.width * scale, ball.height * scale);
      ctx.restore();
    };
    const def = caseDefinition(contactCase);
    for (let i = 0; i < def.joins.length; i++) {
      if (sample.state?.joined.some(j => j.player.who === CASE_DEFENDERS[i]!.who)) continue;
      const u = Math.max(0, Math.min(1, (time * 20 - def.joins[i]! + 9) / 9));
      const from = i === 2 ? 15 : 151; const to = i === 2 ? 39 : i === 1 ? 117 : 105;
      single(CASE_DEFENDERS[i]!, from + (to - from) * u, i === 1 ? 85 - 10 * u : 75, 'run', false);
    }
    if (sample.state) {
      const pose = contactPoseAt(sample.state); const all = [...pose.defenders, pose.carrier];
      if (modern) {
        for (const a of all) shadow(a.pose.hip[0], Math.max(a.pose.foot[1], a.pose.farFoot[1]), contactPlayerKey(a.player) === contactPlayerKey(pose.owner));
        const key = `case/${contactCase}/${variation}/${Math.floor(time * 20)}/${turned}`;
        let img = cache.get(key);
        if (!img) { img = texture(drawContact(sample.state, look, kit, turned ? 'back' : 'front')); cache.set(key, img); }
        ctx.drawImage(img, ox, oy, img.width * scale, img.height * scale);
      } else {
        for (const a of all) single(a.player, a.pose.hip[0], a.pose.foot[1], a.running ? 'carry' : sample.state.phase === 'ptb' ? a.role === 'carrier' ? 'ptb' : 'idle' : sample.state.phase === 'ground' ? 'ground' : a.role === 'carrier' ? 'brace' : 'wrap', contactPlayerKey(a.player) === contactPlayerKey(pose.owner), a.left);
      }
    } else single(CASE_CARRIER, CONTACT_X, CONTACT_FOOT, 'carry', true, false);
    ctx.fillStyle = '#10271eb3'; ctx.fillRect(0, h - 23, w, 23); ctx.fillStyle = '#e2e9d7'; ctx.font = '11px "IBM Plex Mono",monospace';
    ctx.fillText(`${sample.beat.toUpperCase()} · ${time.toFixed(1)}s`, 10, h - 8);
  }
  function paintGallery(): void {
    const cols = gallery.getBoundingClientRect().width < 480 ? 4 : 6;
    const rows = Math.ceil(HEAD_OPTIONS.length / cols);
    gallery.style.height = `${rows * 116}px`;
    const ctx = size(gallery); const w = gallery.width; const h = gallery.height;
    ctx.fillStyle = '#192b36'; ctx.fillRect(0, 0, w, h);
    const cell = w / cols; const cellH = h / rows;
    const scale = 2;
    HEAD_OPTIONS.forEach((head, i) => {
      const cx = Math.round((i % cols + .5) * cell); const bottom = Math.floor(i / cols) * cellH + cellH - 20;
      if (head === custom.head) { ctx.fillStyle = '#30434b'; ctx.fillRect(Math.floor(i % cols * cell), Math.floor(i / cols * cellH), Math.ceil(cell), cellH); }
      const key = `gallery/${head}/${turned}`;
      let img = cache.get(key);
      if (!img) { img = texture(drawPrototypePlayer({ ...custom, head }, HOME, 'idle', 0, turned ? 'back' : 'front')); cache.set(key, img); }
      ctx.drawImage(img, cx - CENTRE * scale, bottom - FOOT * scale, img.width * scale, img.height * scale);
      ctx.font = '10px "IBM Plex Sans",sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = head === custom.head ? '#ffda6c' : '#c3d0d1'; ctx.fillText(LABELS[head], cx, bottom + 14); ctx.textAlign = 'left';
    });
  }
  function draw(): void {
    if (!oldCanvas.parentElement!.hidden) paintPitch(oldCanvas, false);
    paintPitch(newCanvas, true); paintGallery();
    scrub.value = String(time); el('phase').textContent = contactCases ? contactCaseAt(contactCase, time, variation).beat : recognition ? 'Follow your player' : momentAt(time).beat;
    for (const button of root.querySelectorAll<HTMLButtonElement>('[data-time]')) button.setAttribute('aria-pressed', String(button.textContent === momentAt(time).beat));
  }
  const resize = new ResizeObserver(() => draw()); resize.observe(root);
  play.onclick = () => { playing = !playing; syncPlay(); };
  el('restart').onclick = () => { time = tackleLoop ? 5.35 : 0; playing = true; syncPlay(); draw(); };
  el('pass').onclick = () => { time = 2; playing = true; syncPlay(); draw(); };
  el<HTMLSelectElement>('speed').onchange = e => { speed = Number((e.target as HTMLSelectElement).value); };
  scrub.oninput = () => { time = Number(scrub.value); playing = false; syncPlay(); draw(); };
  root.querySelectorAll<HTMLButtonElement>('[data-time]').forEach(b => { b.onclick = () => { time = Number(b.dataset.time); playing = false; syncPlay(); draw(); }; });
  const compare = (yes: boolean) => {
    oldCanvas.parentElement!.hidden = !yes;
    root.querySelector('.stage')!.classList.toggle('solo', !yes);
    el('compare').setAttribute('aria-pressed', String(yes)); el('new-only').setAttribute('aria-pressed', String(!yes)); draw();
  };
  el('compare').onclick = () => compare(true); el('new-only').onclick = () => compare(false);
  const setStudy = (nine: boolean) => {
    recognition = nine; time = 0; tackleLoop = false; contactCases = false; scrub.max = String(DURATION);
    el('contact-cases').setAttribute('aria-pressed', 'false'); el('contact-controls').hidden = true; el('tackle-loop').setAttribute('aria-pressed', 'false');
    root.classList.toggle('recognition', nine);
    el('passage').setAttribute('aria-pressed', String(!nine)); el('recognise').setAttribute('aria-pressed', String(nine));
    el('rearrange').hidden = !nine;
    root.querySelector<HTMLElement>('.beats')!.hidden = nine;
    root.querySelector<HTMLElement>('.workbench')!.hidden = nine;
    el('study-note').textContent = nine ? 'Nine fixed characters. The same kit. No names or markers. Pick one and follow them as they turn and move.' : 'Compare the carry, catch and contact at playing size.';
    compare(!nine); invalidate();
  };
  el('recognise').onclick = () => setStudy(true); el('passage').onclick = () => setStudy(false);
  el('tackle-loop').onclick = () => {
    setStudy(false); tackleLoop = true; time = 5.35;
    el('tackle-loop').setAttribute('aria-pressed', 'true'); el('passage').setAttribute('aria-pressed', 'false');
    close = true; el('zoom').setAttribute('aria-pressed', 'true'); compare(false);
    playing = !matchMedia('(prefers-reduced-motion: reduce)').matches; syncPlay(); draw();
  };
  const refreshCase = () => {
    time = 0; scrub.max = String(caseDuration(contactCase));
    el('study-note').textContent = caseDefinition(contactCase).note;
    el('contact-variation').textContent = `Stance variation: ${variation ? 'B' : 'A'}`;
    invalidate();
  };
  el('contact-cases').onclick = () => {
    setStudy(false); contactCases = true;
    el('contact-cases').setAttribute('aria-pressed', 'true'); el('passage').setAttribute('aria-pressed', 'false');
    el('contact-controls').hidden = false; root.querySelector<HTMLElement>('.beats')!.hidden = true;
    close = true; el('zoom').setAttribute('aria-pressed', 'true'); compare(true);
    playing = !matchMedia('(prefers-reduced-motion: reduce)').matches; syncPlay(); refreshCase();
  };
  el<HTMLSelectElement>('contact-case').onchange = e => { contactCase = (e.target as HTMLSelectElement).value as ContactCaseId; refreshCase(); };
  el('contact-variation').onclick = () => { variation = 1 - variation; refreshCase(); };
  for (const [id, seconds] of [['case-contact', () => .75], ['case-outcome', () => caseDefinition(contactCase).end / 20 + .15], ['case-finish', () => caseDefinition(contactCase).end / 20 + .85]] as const) {
    el(id).onclick = () => { time = seconds(); playing = false; syncPlay(); draw(); };
  }
  el('rearrange').onclick = () => { arrangement = (arrangement + 1) % 9; draw(); };
  el('zoom').onclick = () => { close = !close; el('zoom').setAttribute('aria-pressed', String(close)); draw(); };
  el('turn').onclick = () => { turned = !turned; el('turn').setAttribute('aria-pressed', String(turned)); invalidate(); };
  const change = () => { custom = { ...custom, build: buildSelect.value as Build, head: headSelect.value as Head, beard: beardCheck.checked, tape: tapeCheck.checked }; invalidate(); };
  buildSelect.onchange = headSelect.onchange = beardCheck.onchange = tapeCheck.onchange = change;
  el('reset').onclick = () => { custom = { ...original }; syncFields(); invalidate(); };
  gallery.onclick = e => {
    const rect = gallery.getBoundingClientRect(); const cols = rect.width < 480 ? 4 : 6;
    const rows = Math.ceil(HEAD_OPTIONS.length / cols);
    const i = Math.floor((e.clientX - rect.left) / rect.width * cols) + Math.floor((e.clientY - rect.top) / rect.height * rows) * cols;
    const head = HEAD_OPTIONS[i]; if (head) { custom = { ...custom, head }; syncFields(); invalidate(); }
  };
  const keydown = (e: KeyboardEvent) => {
    if ((e.target as HTMLElement).matches('input,select,button,a')) return;
    if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); lane = Math.max(-.12, Math.min(.08, lane + (e.key === 'ArrowUp' ? -.03 : .03))); draw(); }
    if (e.code === 'Space') { e.preventDefault(); playing = !playing; syncPlay(); }
  };
  document.addEventListener('keydown', keydown);
  const loop = (now: number) => {
    if (stopped) return;
    if (playing && !document.hidden) {
      time += Math.min(.05, (now - last) / 1000) * speed;
      const duration = contactCases ? caseDuration(contactCase) : DURATION;
      if (time >= duration) time = (tackleLoop ? 5.35 : 0) + (time - duration);
    }
    last = now; if (playing) draw(); raf = requestAnimationFrame(loop);
  };
  const cleanup = () => { stopped = true; cancelAnimationFrame(raf); resize.disconnect(); document.removeEventListener('keydown', keydown); };
  window.addEventListener('pagehide', e => { if (!e.persisted) cleanup(); });
  syncFields(); syncPlay(); draw(); raf = requestAnimationFrame(loop);
}
