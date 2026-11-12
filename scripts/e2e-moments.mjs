// Actual engine moments, replay consistency and grounded shadows. No forced outcomes.
// E2E_URL=http://localhost:4176/ CHROMIUM_PATH=/usr/bin/chromium node scripts/e2e-moments.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';
const out=process.env.E2E_OUT ?? 'e2e-output/moments'; await mkdir(out,{recursive:true});
const browser=process.env.E2E_BROWSER==='webkit'?await webkit.launch():await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium',args:['--no-sandbox']});
try {
 const page=await browser.newPage({viewport:{width:1280,height:800}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`${process.env.E2E_URL ?? 'http://localhost:5176/'}#lab?seed=1`);
 await page.waitForFunction(()=>window.__lab?.game.scene.getScene('Lab')?.view);
 await page.locator('.nrl-lab-collapse').click();
 const moments=await page.evaluate(()=>{const r=window.__lab.ctrl.runner;r.onEvents=null;const found={};
  while(r.tick<6000){r.step();for(const p of r.cur.players){const ref={side:p.side,slot:p.slot,who:p.who};
   if(p.kick){const kind=p.kick.kind;found[kind]??={...ref,tick:p.kick.strikeTick};}
   if(p.aerialCatchTick===r.tick)found.high??={...ref,tick:r.tick};
   if(p.tryTick===r.tick)found.try??={...ref,tick:r.tick};
  }if(['punt','grubber','drop','high','try'].every(k=>found[k]))break;}
  return found;
 });
 for(const key of ['punt','grubber','drop','high','try'])assert.ok(moments[key],key);
 const seek=async tick=>{await page.evaluate(t=>{const {game,ctrl}=window.__lab;ctrl.seek(t);const s=game.scene.getScene('Lab');s.view.draw(ctrl.runner.cur,ctrl.runner.cur,1);s.cameras.main.centerOn(s.ball.gx,s.ball.gy);},tick);await page.waitForTimeout(100);};
 const inspect=ref=>page.evaluate(ref=>{const {game,ctrl}=window.__lab,s=game.scene.getScene('Lab'),a=s.players[ref.side][ref.slot];return {
  who:a.who,pixels:a.sprite.texture.getSourceImage().toDataURL(),lift:a.lift,ground:a.shadow.y,y:a.sprite.y,ring:a.ring.y,
  separateBall:s.ball.sprite.visible,held:!!ctrl.runner.cur.ball.holder,cache:s.playerFrames.size,textures:game.textures.getTextureKeys().length,
 };},ref);
 const samples=[['punt',0],['grubber',0],['drop',0],['high',1],['try',6],['try',14],['try',25]];
 for(const [name,offset] of samples){const ref=moments[name];await seek(ref.tick+offset);const first=await inspect(ref);
  assert.equal(first.who,ref.who);assert.equal(first.separateBall,!first.held);assert.ok(first.cache<=768);
  assert.equal(first.y,first.ground-first.lift);assert.equal(first.ring,first.ground);
  if(name==='high')assert.equal(first.lift,6);
  await page.waitForTimeout(150);assert.equal((await inspect(ref)).pixels,first.pixels);
  await seek(ref.tick+70);await seek(ref.tick+offset);const replay=await inspect(ref);
  assert.equal(replay.pixels,first.pixels,`${name}/${offset}: exact replay`);assert.equal(replay.y,first.y);assert.equal(replay.textures,first.textures);
  await page.screenshot({path:`${out}/${name}-${offset}.png`});
 }
 await page.setViewportSize({width:844,height:390});await seek(moments.high.tick+1);assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
 await page.screenshot({path:`${out}/phone-high.png`});await seek(moments.try.tick+14);await page.screenshot({path:`${out}/phone-try.png`});
 assert.deepEqual(errors,[]);await writeFile(`${out}/report.json`,JSON.stringify({moments,errors,paused:true,replayed:true,groundedShadows:true,singleBall:true,mobile:true},null,2));
 console.log('PASS: actual punt, grubber, goal kick, high take, try/recovery/celebration; one ball, grounded shadows, pause/seek and phone layout.');
} finally {await browser.close();}
