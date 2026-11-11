// Real engine → live renderer checks. Artifacts stay outside source control.
// E2E_URL=http://localhost:5173 CHROMIUM_PATH=/usr/bin/chromium node scripts/e2e-live-art.mjs
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium, webkit } from 'playwright-core';
const out = process.env.E2E_OUT ?? 'e2e-output/live-art';
await mkdir(out, {recursive:true});
const browser = process.env.E2E_BROWSER === 'webkit' ? await webkit.launch() : await chromium.launch({executablePath:process.env.CHROMIUM_PATH ?? '/opt/pw-browsers/chromium', args:['--no-sandbox']});
const errors=[];
try {
  const page=await browser.newPage({viewport:{width:1280,height:800}});
  page.on('pageerror',e=>errors.push(e.message));
  await page.goto(`${process.env.E2E_URL ?? 'http://localhost:5173/'}#lab?seed=1`);
  await page.waitForFunction(()=>window.__lab?.game.scene.getScene('Lab')?.view);
  await page.locator('.nrl-lab-collapse').click();
  // Find actual engine events; no authored contact cases or forced outcomes.
  const moments=await page.evaluate(()=>{
    const r=window.__lab.ctrl.runner; const found={};
    r.onEvents=null;
    while(r.tick<10000 && !r.finished) {
      r.step(); const s=r.cur, c=s.contact;
      const holder=s.players.find(p=>p.side===s.ball.holder?.side && p.slot===s.ball.holder?.slot);
      if(holder && holder.caughtTick===s.tick && ['run','idle'].includes(holder.pose)) found.catch ??= s.tick;
      if(holder?.pose==='dummyHalf') found.pickup ??= s.tick;
      if(s.players.some(p=>p.pose==='pass')) found.pass ??= s.tick;
      if(c) {
        if(c.defenders.length>=2 && !c.outcome && s.tick>=Math.max(...c.joinedTicks)+3) found.group ??= s.tick;
        if(c.defenders.length===3 && s.tick>=Math.max(...c.joinedTicks)+3) found.three ??= s.tick;
        if(c.outcome) found[c.outcome] ??= s.tick;
        if(c.releaseTick>s.tick+4 && s.tick>c.resolvedTick+3) found.ground ??= s.tick;
        if(s.players.some(p=>p.side===c.carrier.side && p.slot===c.carrier.slot && p.pose==='ptb')) found.ptb ??= s.tick;
      }
      if(!s.ball.holder) found.flight ??= s.tick;
      if(['group','three','tackle','big-hit','break-tackle','strip','ground','ptb','flight','catch','pickup','pass'].every(k=>found[k]!==undefined)) break;
    }
    return found;
  });
  console.log('Actual moments',moments);
  for(const required of ['group','tackle','ground','ptb','flight','catch','pickup','pass']) assert.ok(moments[required]!==undefined,required);
  const inspect=()=>page.evaluate(()=>{
    const {ctrl,game}=window.__lab, s=game.scene.getScene('Lab'), r=ctrl.runner;
    const state=s.view.contactState;
    return {tick:r.tick, contact:state?.kind, visible:s.contact.sprite.visible,
      hidden:Object.values(s.players).flat().filter(a=>!a.sprite.visible).map(a=>a.who).sort(),
      expected:state?[state.contact.carrier,...state.contact.defenders].map(p=>p.who).sort():[],
      ball:s.ball.sprite.visible, held:!!r.cur.ball.holder,
      textures:game.textures.getTextureKeys().length,cache:s.playerFrames.size,
      actors:Object.values(s.players).flat().map(a=>[a.who,a.sprite.texture.getSourceImage().toDataURL()]),
      player:s.players.home[0].sprite.texture.getSourceImage().toDataURL(),
      group:s.contact.sprite.texture.getSourceImage().toDataURL()};
  });
  const seek=async tick=>{
    await page.evaluate(t=>{const {ctrl,game}=window.__lab;ctrl.seek(t);const s=game.scene.getScene('Lab');s.view.draw(ctrl.runner.cur,ctrl.runner.cur,1);s.cameras.main.centerOn(s.ball.gx,s.ball.gy);},tick);
    await page.waitForTimeout(200);
  };
  for(const [name,tick] of Object.entries(moments)) {
    await seek(tick+(name==='strip'||name==='break-tackle'?2:0));
    const state=await inspect();
    assert.equal(state.ball,!state.held,`${name}: only flying ball uses separate sprite`);
    if(state.visible) assert.deepEqual(state.hidden,state.expected,`${name}: exact contact participants`);
    else assert.equal(state.hidden.length,0,`${name}: ordinary actors restored`);
    assert.ok(state.cache<=512);
    await page.screenshot({path:`${out}/${name}.png`});
  }
  await seek(moments.group);
  const first=await inspect();
  await page.waitForTimeout(500);
  const paused=await inspect();
  assert.equal(first.player,paused.player);assert.equal(first.group,paused.group);
  await seek(moments.group+50);await seek(moments.group);
  const replay=await inspect();
  assert.equal(first.player,replay.player);assert.equal(first.group,replay.group);
  assert.equal(first.textures,replay.textures,'seek does not allocate textures');
  for(const name of ['catch','ptb','pickup','pass']) {
    await seek(moments[name]+1); const original=await inspect();
    await page.waitForTimeout(100); assert.deepEqual((await inspect()).actors,original.actors,`${name}: pause freezes handling`);
    await seek(moments[name]+40); await seek(moments[name]+1);
    const repeated=await inspect();
    assert.deepEqual(repeated.actors,original.actors,`${name}: seek reproduces every player`);
    assert.equal(repeated.ball,!repeated.held,`${name}: ownership controls the only ball`);
  }
  await page.setViewportSize({width:844,height:390});
  await seek(moments.group);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:`${out}/mobile.png`});
  await page.setViewportSize({width:1280,height:800});
  if(process.env.E2E_RECORD==='1') {
    await seek(Math.max(0,moments.group-45));
    await page.evaluate(()=>{
      const canvas=window.__lab.game.canvas, chunks=[];
      const rec=new MediaRecorder(canvas.captureStream(30),{mimeType:'video/webm'});
      rec.ondataavailable=e=>chunks.push(e.data);
      window.__liveArtRecording=new Promise(resolve=>rec.onstop=async()=>resolve(Array.from(new Uint8Array(await new Blob(chunks,{type:'video/webm'}).arrayBuffer()))));
      window.__liveArtRecorder=rec;rec.start();window.__lab.ctrl.setSpeed(1);window.__lab.ctrl.play();
    });
    await page.waitForTimeout(22000);
    await page.evaluate(()=>{window.__lab.ctrl.pause();window.__liveArtRecorder.stop();});
    await writeFile(`${out}/live-match.webm`,Buffer.from(await page.evaluate(()=>window.__liveArtRecording)));
  }
  // Restart the same Phaser scene: old dynamic textures must be released.
  await page.evaluate(()=>{const {game,ctrl}=window.__lab;ctrl.pause();const s=game.scene.getScene('Lab');s.scene.restart(s.sys.settings.data);});
  await page.waitForTimeout(1200);
  const restarted=await inspect();
  assert.equal(restarted.textures,first.textures,'scene restart frees previous fixture textures');

  // Career uses LivePlayback, while the lab above drives LiveView directly.
  const career=await browser.newPage({viewport:{width:844,height:390}});
  career.on('pageerror',e=>errors.push(e.message));
  await career.addInitScript(()=>localStorage.setItem('nrlsim.iosInstallHintShown','1'));
  await career.goto(`${process.env.E2E_URL ?? 'http://localhost:5173/'}?e2e`);
  await career.locator('[data-nrl-start]').click();
  await career.locator('[data-expansion-work]').click();
  await career.locator('.nrl-tutorial-skip').click();
  await career.locator('.nrl-dock [data-hud="advance"]').click();
  for(let i=0;i<2;i++) {
    const ask=career.locator('[data-confirm-advance], [data-ask-proceed]');
    if(await ask.count()) await ask.first().click();
  }
  await career.locator('.nrl-mo-controls').waitFor({timeout:30000});
  await career.locator('.nrl-mo-speed[data-speed="1"]').click();
  await career.waitForFunction(()=>window.__nrlGame?.scene.getScene('Match').contact?.sprite.visible,null,{timeout:30000});
  const actual=await career.evaluate(()=>{
    const s=window.__nrlGame.scene.getScene('Match');s.playback.runner.pause();
    return {players:Object.values(s.players).flat().map(a=>a.sprite.texture.key),hidden:Object.values(s.players).flat().filter(a=>!a.sprite.visible).length,
      contact:s.contact.sprite.visible, ball:s.ball.sprite.visible};
  });
  assert.equal(actual.contact,true);assert.ok(actual.hidden>=2);assert.equal(actual.ball,false);
  assert.ok(actual.players.every(k=>k.startsWith('live-player-')));
  await career.screenshot({path:`${out}/career-mobile.png`});
  await career.close();
  assert.deepEqual(errors,[]);
  await writeFile(`${out}/report.json`,JSON.stringify({moments,errors,textureCount:first.textures,paused:true,replayed:true,mobile:true,restarted:true,career:true},null,2));
  console.log('PASS: actual contact participants/outcomes, one ball, pause, replay, phone, bounded cache/textures, scene restart and career match.');
} finally {await browser.close();}
