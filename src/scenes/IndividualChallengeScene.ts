import Phaser from 'phaser';
import { drawText } from '../art/match/font';
import { drawSpectator } from '../art/match/crowd';
import { resolveKits } from '../art/match/kitClash';
import { drawPlayerShadow } from '../art/match/props';
import { appearanceFor } from '../art/prototype/player';
import { contactLayout } from '../match/view/contactLayout';
import { bindChallengeLane, type ChallengeLane } from '../ui/challengeLane';
import { CLASH_DURATION, LANE_MARKER, clashFrame, waitingFrame } from './individualChallengePresentation';
import { MatchArtRegistry } from './matchArt';
import { MatchActor, MatchContactLayer, PlayerFrameCache } from './matchPlayers';

const KEY = 'IndividualChallenge';
interface Playback { lane: ChallengeLane; paused: boolean; finished: boolean }

/** A mounted dialog owns one scene. Closing it, including during a queued Phaser
 * start, revokes that ownership before any completion can reach the next screen. */
export function bindIndividualChallengeGame(game: Phaser.Game): void {
  let owner: Playback | null = null;
  bindChallengeLane(lane => {
    const playback: Playback = { lane, paused: false, finished: false };
    owner = playback;
    game.scene.start(KEY, { playback, current: () => owner === playback });
    game.scene.bringToTop(KEY);
    return {
      pause(paused) { playback.paused = paused; },
      close() {
        if (owner !== playback) return;
        owner = null;
        game.scene.stop(KEY);
      },
    };
  });
}

/** This scene only draws an acknowledged clash, or its two athletes waiting. */
export class IndividualChallengeScene extends Phaser.Scene {
  private active: {
    playback: Playback;
    current: () => boolean;
    carrier: MatchActor;
    defender: MatchActor;
    contact: MatchContactLayer;
  } | null = null;
  private elapsed = 0;

  constructor() { super(KEY); }

  create({ playback, current }: { playback: Playback; current: () => boolean }): void {
    // Phaser retains settings.data between starts. Only the live session should
    // hold a dialog, its callbacks, or its scene textures.
    this.sys.settings.data = {};
    this.elapsed = 0;
    if (!current()) return;
    const { lane } = playback;
    const art = new MatchArtRegistry(this);
    const kits = resolveKits({clubId: lane.clubId, colors: lane.colors}, {clubId: 'showground-crew', colors:['#b83e36', '#fff2be']});
    const look = (who: string) => appearanceFor(who, who === lane.playerId ? lane.position : who === 'danny' ? 'winger' : 'prop');
    const cache = new PlayerFrameCache(kits, look, 80);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.active = null;
      cache.clear();
      // MatchScene's registry also outlives display-list shutdown by a tick.
      setTimeout(() => art.destroy(), 0);
    });
    this.paintShowground(art, kits.home.jersey);
    const shadow = art.texture('duel-shadow', drawPlayerShadow('day'));
    const club = new MatchActor(this, art, cache, 'home', 0, lane.playerId, shadow, kits.rings.home, 'solid');
    const rival = new MatchActor(this, art, cache, 'away', 0, lane.opponentId, shadow, kits.rings.away, 'dashed');
    this.active = {
      playback, current,
      carrier: lane.role === 'carry' ? club : rival,
      defender: lane.role === 'carry' ? rival : club,
      contact: new MatchContactLayer(this, art, kits, look),
    };
    this.update(0, 0);
  }

  private paintShowground(art: MatchArtRegistry, homeColor: number): void {
    const g = this.add.graphics().setDepth(-100000);
    const rect = (color: number, x: number, y: number, w: number, h: number) => g.fillStyle(color).fillRect(x, y, w, h);
    rect(0xa6dccc, -1200,-600,2600,640);
    // Distant hills, striped canvas booths and picnic spectators.
    for (let x = -220; x < 450; x += 50) {
      g.fillStyle(0x79b6a3).fillTriangle(x-20,43,x+12,8,x+58,43);
      rect(0xd7ac71,x,29,37,21);
      g.fillStyle(0xc86955).fillTriangle(x-4,31,x+18,13,x+40,31);
      g.fillStyle(0xffda9b).fillTriangle(x+4,31,x+18,13,x+13,31);
      g.fillStyle(0xffda9b).fillTriangle(x+23,31,x+18,13,x+32,31);
      rect(0x645446,x+7,36,23,8);
    }
    for (let i=0; i<16; i++) {
      const key = art.texture('duel-fan-'+i, drawSpectator([homeColor,0xe2b04c,0xa64b44,0x3c7890][i%4]!, i%6, 'front', i%4===1 ? 2 : 0));
      this.add.image(i*16-20,50+(i%3),key).setOrigin(.5,1).setDepth(-95000);
    }
    rect(0x678a59,-1200,51,2600,650);
    rect(0x78a768,-1200,55,2600,48);
    for (let x=-280; x<500; x+=20) {
      rect(0x7eab6b,x,55,10,48);
      rect(0x426949,x+2,98,4,1);
      rect(0x9ac583,x+7,65,2,1);
    }
    rect(0xffeab0,LANE_MARKER,56,2,46);
    rect(0xe7c762,LANE_MARKER+2,56,2,46);
    // Paired marker pennants remain visible above the tackle pile.
    for (const y of [54,104]) {
      rect(0x60452e,LANE_MARKER,y-14,2,15);
      g.fillStyle(0xffbe42).fillTriangle(LANE_MARKER+2,y-16,LANE_MARKER+12,y-13,LANE_MARKER+2,y-9);
    }
    for (const y of [52,104]) {
      rect(0x6c4e38,-700,y,1600,3);
      rect(0xe6ce9e,-700,y,1600,1);
      for (let x=-240; x<450; x+=32) {
        rect(0x654b37,x,y-4,3,10);
        rect(0xa98250,x,y-5,2,8);
      }
    }
    const sign = this.add.graphics().setDepth(-94000);
    sign.fillStyle(0x564336).fillRect(LANE_MARKER-12,44,27,9);
    sign.fillStyle(0xffe39b);
    drawText('SCORE',(x,y)=>sign.fillRect(LANE_MARKER-8+x,46+y,1,1));
    for (let x=-240; x<450; x+=12) {
      const y=9+Math.round(Math.sin(x*.012)*3);
      rect(0x785645,x,y,13,1);
      g.fillStyle([0xad413f,0xe7b54c,0x3f7a85][Math.abs(x/12)%3]!).fillTriangle(x+1,y+1,x+10,y+1,x+6,y+9);
    }
  }

  update(_time: number, delta: number): void {
    const active = this.active;
    if (!active?.current()) return;
    const { playback } = active;
    const { lane } = playback;
    if (!lane.element.isConnected) return;
    // The camera fits the DOM lane in backing-store pixels, including after a
    // text-size change or rotation. Read the live bounds, never a stale phone size.
    const box = lane.element.getBoundingClientRect();
    const canvas = this.game.canvas;
    const bounds = canvas.getBoundingClientRect();
    if (!box.width || !box.height || !bounds.width || !bounds.height) return;
    const dx = canvas.width / bounds.width;
    const dy = canvas.height / bounds.height;
    const w = Math.round(box.width*dx), h = Math.round(box.height*dy);
    const cam = this.cameras.main;
    cam.setViewport(Math.round((box.left-bounds.left)*dx),Math.round((box.top-bounds.top)*dy),w,h);
    cam.setZoom(Math.min(w/208,h/108)).centerOn(103,58);
    if (!playback.paused) this.elapsed += Math.min(delta,100);
    const frame = lane.clash ? clashFrame(lane.clash, this.elapsed)
      : waitingFrame(lane.role === 'carry' ? lane.playerId : lane.opponentId, lane.role === 'carry' ? lane.opponentId : lane.playerId);
    const { carrier, defender, contact } = frame;
    const layout = contact ? contactLayout(contact, [
      { player: contact.contact.carrier, x:carrier.x,y:carrier.y },
      { player: contact.contact.defenders[0]!, x:defender.x,y:defender.y },
    ],false) : null;
    active.contact.paint(contact,layout,'front');
    for (const [actor, pose] of [[active.carrier, carrier], [active.defender, defender]] as const) {
      actor.place(pose.x,pose.y,pose.y);
      actor.setSpriteVisible(layout === null);
      if (!layout) actor.paint(pose.picture);
    }
    if (lane.clash && this.elapsed >= CLASH_DURATION && !playback.finished) {
      playback.finished = true;
      const owns = active.current;
      queueMicrotask(() => { if (owns()) lane.onFinish(); });
    }
  }
}
