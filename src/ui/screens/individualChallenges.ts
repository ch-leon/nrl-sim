import { portraitDataUrl } from '../../art/portrait';
import { kitFromColors } from '../../art/match/kit';
import { DEFAULT_PLAYER_COLORS } from '../../config';
import { bus } from '../../core/events';
import { downloadSave, getActiveSlot } from '../../core/save';
import { getState, stateInstallation, type GameState } from '../../core/state';
import { careerNamespace } from '../../core/storage/local';
import { CHALLENGE_CALL_COST, CHALLENGE_CALL_NAMES as names, CHALLENGE_EDITIONS, type ChallengeClash, type ChallengeEdition, type ChallengeEditionId } from '../../data/individualChallengeRules';
import { challengeEngines, type ChallengeContest } from '../../data/individualChallenges';
import { challengeCheckpoint, challengeCalls, previewChallengeAction } from '../../systems/individualChallengeEngine';
import { acknowledgeChallengeOutcome, captureChallengeAction, challengeOutcomeVisible, confirmChallengeAction, type ChallengeSelection } from '../../systems/individualChallengeCommit';
import { challengeCover, challengeEntryPreview, challengeQualified, currentIndividualChallenge, type ChallengeAction, type ChallengeResult } from '../../systems/individualChallenges';
import { isSelectable, POSITION_SHORT } from '../../systems/lineup';
import { ROTATE_ON_CLASS } from '../orientation';
import { mountChallengeLane, type LaneControls } from '../challengeLane';
import { button, closeModal, closeScreen, el, openModal } from '../dom';
import { abilities, callHint, decided, exactPercent, lastClash, money, paragraph, report, titleOdds } from './individualChallengeCopy';
import './individualChallenges.css';

const editions = Object.values(CHALLENGE_EDITIONS);
const crewKit = kitFromColors(['#b83e36','#fff2be'],'showground-crew');
const inWindow = (week: number, edition: ChallengeEdition) => week >= edition.bookingStartWeek && week <= edition.bookingEndWeek;
const rivalClub = (s: GameState, id: string) => s.league.clubs.find(c => c.id === id)?.name ?? id;
function control(label: string, key: string, fn: () => void, primary = false): HTMLButtonElement {
  const node = button(label,fn,primary ? {class:'nrl-btn-primary'} : {});
  node.setAttribute('data-challenge-' + key,'');
  return node;
}

export function buildIndividualChallengeCards(state: GameState): HTMLElement[] {
  if (!state.competitions?.leagueCareer || state.competitions.leagueCareer.phase === 'initial-choice') return [];
  return editions.map(edition => {
    const record = currentIndividualChallenge(state,edition.id);
    const locked = edition.requiresFirstTitle && !challengeQualified(state);
    const visible = challengeOutcomeVisible(state, edition.id);
    let detail = locked ? 'Invitation locked · Win Break the Line' : `Register Weeks ${edition.bookingStartWeek}–${edition.bookingEndWeek} · Away Week ${edition.eventWeek}`;
    let label = locked ? 'Invitation details' : 'Event details';
    if (record?.status === 'booked') {
      detail = `${record.participantName} · Away Week ${edition.eventWeek} · Back Week ${edition.returnWeek}`;
      label = state.week === edition.eventWeek ? 'Contest decision' : 'View booking';
    } else if (record && !visible) {
      detail = 'Saved checkpoint · Device confirmation required';
      label = 'Resume contest';
    } else if (record?.status === 'coaching') {
      detail = `${record.participantName} · ${record.contest!.progress.clashIndex} clashes played`;
      label = 'Resume coaching';
    } else if (record?.status === 'ready-for-interval' || record?.status === 'completed') {
      detail = record.status === 'completed' ? 'Player returned · Award settled' : `Contest complete · Back before Week ${edition.returnWeek}`;
      label = 'Contest report';
    } else if (record?.status === 'interrupted') {
      detail = 'Contest interrupted · Player returned without an award';
      label = 'Contest report';
    } else if (!locked && state.week > edition.bookingEndWeek) detail = 'Registration closed · Returns next season';
    const opener = control(label,'open',()=>openIndividualChallenge(edition.id));
    opener.setAttribute('data-challenge-open',edition.id);
    opener.setAttribute('aria-haspopup','dialog');
    return el('section',{class:'duel-card',attrs:{'data-challenge-card':edition.id}},
      el('div',{},el('h3',{text:edition.name}),paragraph(detail)),opener);
  });
}

function guide(edition: ChallengeEdition): HTMLElement {
  return el('details',{},el('summary',{text:'Scoring, rivals and rewards'}),
    paragraph('Carry once and defend once against each rival. Stopped short scores 0, held on the marker scores 1, and a clean breakthrough scores 2. Highest total after six clashes wins.'),
    paragraph('A tie gives your player one bonus carry against Big Mick. Only a clean breakthrough wins.'),
    paragraph(`Free entry once per season. Earn ${edition.completionXp} base XP for finishing and another ${edition.winnerXp} base XP, ${money(edition.winnerCash)} and the personal ${edition.honour} honour for winning. Event XP replaces weekly training and uses your settings, age and XP traits on return.`),
    ...edition.opponents.flatMap(rival=>[el('h3',{text:rival.name}),paragraph(`Runs with ${names[rival.attack]}. Defends with ${names[rival.defence]}.`),abilities(rival)]));
}

export function openIndividualChallenge(editionId: ChallengeEditionId): HTMLElement {
  const edition = CHALLENGE_EDITIONS[editionId];
  const slot = getActiveSlot();
  const namespace = careerNamespace();
  const originalOpener = document.activeElement;
  let installation = stateInstallation();
  let review: ChallengeSelection | null = null;
  let selectedCall: ChallengeSelection | null = null;
  let playerId = '';
  let watching: ChallengeClash | null = null;
  let busy = false;
  let lane: LaneControls | null = null;
  let disposeState: (()=>void) | null = null;
  let status = '';
  const title = el('h2',{text:edition.name,attrs:{id:'duel-title'}});
  const leave = control('Back to club','leave',()=>{closeModal();closeScreen();});
  const body = el('div',{class:'duel-body',attrs:{tabindex:'0',role:'region','aria-label':'Contest details'}});
  const stage = el('div',{class:'duel-stage-wrap'});
  const actions = el('div',{class:'duel-footer'});
  const content = el('div',{class:'duel-dialog',attrs:{role:'dialog','aria-modal':'true','aria-labelledby':'duel-title','data-challenge-dialog':editionId}},
    el('header',{},title,leave),el('div',{class:'duel-middle'},stage,body),actions);
  const modal = openModal(content,{class:'duel-modal',cut:true,onRemove:()=>{
    lane?.close(); lane=null; disposeState?.();
    document.removeEventListener('keydown', dialogKeys, true);
    const opener = document.querySelector<HTMLElement>(`[data-challenge-open="${editionId}"]`) ?? originalOpener;
    if (opener?.isConnected && 'focus' in opener) (opener as HTMLElement).focus();
  }});
  const stillHere = () => modal.isConnected && slot === getActiveSlot() && namespace === careerNamespace();
  function owns(): boolean {
    if (stillHere() && stateInstallation() === installation) return true;
    if (modal.isConnected) closeModal();
    return false;
  }
  function focus(selector: string): void { content.querySelector<HTMLElement>(selector)?.focus(); }
  function capture(action: ChallengeAction): ChallengeSelection | null {
    if (!owns() || busy) return null;
    const result = captureChallengeAction(editionId,action);
    if (!result.ok) { status=result.message; render(); return null; }
    return result.selection;
  }
  function inspect(action: ChallengeAction): void {
    const selection=capture(action);
    if (!selection) return;
    review=selection; status=''; render(); focus('[data-challenge-confirm]');
  }
  function run(action: ChallengeAction): void {
    const selection=capture(action);
    if (selection) void submit(selection);
  }
  async function submit(selection: ChallengeSelection | null): Promise<void> {
    if (busy || !owns()) return;
    busy=true;
    const action = selection?.action;
    review=null; selectedCall=null;
    status=selection ? 'Saving your choice…' : 'Confirming the saved checkpoint…';
    // Hide every prior score and all controls while the new revision is being
    // saved. Never render an outcome from state:changed during native mirroring.
    render();
    let result: ChallengeResult;
    let expectedInstallation = installation;
    try {
      const pending = selection ? confirmChallengeAction(selection) : acknowledgeChallengeOutcome(editionId);
      // Local installation is synchronous. Never attach a native completion to
      // a career loaded while its acknowledgement was still in flight.
      expectedInstallation = stateInstallation();
      result = await pending;
    }
    catch { result = {ok:false,reason:'storage',message:'The checkpoint could not be confirmed. Reopen the saved contest or retry.'}; }
    busy=false;
    if (!stillHere()) return;
    if (expectedInstallation !== stateInstallation() || (!result.ok && result.reason === 'stale') || (result.ok && result.state !== getState())) { closeModal(); return; }
    installation=stateInstallation();
    status=result.ok ? '' : result.message;
    const current=currentIndividualChallenge(getState(),editionId);
    if (result.ok && challengeOutcomeVisible(result.state,editionId) && (action?.kind==='call' || action?.kind==='auto-clash')) {
      watching=current?.contest?.clashes[current.contest.clashes.length-1] ?? null;
    }
    render();
    if (watching) focus('[data-challenge-skip]');
    else body.focus();
  }
  function checkpoint(): void {
    if (!owns()) return;
    watching=null; selectedCall=null; status=''; render(); body.focus();
  }

  function render(): void {
    lane?.close(); lane=null;
    body.replaceChildren(); stage.replaceChildren(); actions.replaceChildren();
    content.removeAttribute('data-live'); content.removeAttribute('data-watch');
    body.scrollTop=0;
    const s=getState();
    const record=currentIndividualChallenge(s,editionId);
    leave.textContent=record?.status==='coaching' || watching ? 'Save & return to club' : 'Back to club';
    if (status) body.append(el('p',{class:'duel-status',text:status,attrs:{role:'status','data-challenge-status':''}}));
    if (busy) return;
    if (!challengeOutcomeVisible(s,editionId)) {
      body.append(el('h3',{text:'Confirm saved checkpoint'}),paragraph('Your choice is saved locally. Confirm the device copy to see the result and continue.'));
      actions.append(control('Export career','export',()=>{ if(owns()) downloadSave(getState()); }),
        control('Retry confirmation','retry',()=>void submit(null),true));
      return;
    }
    if (watching && record?.contest) { renderWatch(s,record.contest,watching); return; }
    if (review && review.action.kind!=='book') {
      const text = review.action.kind === 'finish' ? 'Finish every remaining clash using auto-coach? Your player stays away until the club plays this week.'
        : review.action.kind === 'interrupt' ? 'Return this player to the club now? The interrupted contest grants no award.'
        : `Withdraw ${record?.participantName} before departure? Your player stays available for the club fixture.`;
      body.append(paragraph(text)); confirmation(); return;
    }
    if (record?.status==='coaching' && record.contest) { renderCoach(s,record.contest); return; }
    if (record?.status==='booked') {
      const cover=challengeCover(s,editionId,record.participantId);
      body.append(el('h3',{text:`${record.participantName} is booked`}),paragraph(`Misses Week ${edition.eventWeek} against ${rivalClub(s,record.opponentId)}. Back before Week ${edition.returnWeek}.`),
        paragraph(cover.reason ? `Starting will cancel this entry. ${cover.reason}` : (cover.cover ? `${cover.cover.name} covers the ${cover.role} place.` : 'The starting side and bench have cover.')),guide(edition));
      if (s.week===edition.eventWeek) actions.append(control('Withdraw','withdraw',()=>inspect({kind:'withdraw'})),control('Start contest','start',()=>run({kind:'start'}),true));
      else actions.append(control('Cancel booking','cancel',()=>inspect({kind:'cancel'})));
    } else if (record && ['ready-for-interval','completed','interrupted'].includes(record.status)) {
      body.append(report(record,record.contest?.edition ?? edition,challengeQualified(s)));
      const margins=(s.competitions?.individualChallenges ?? []).filter(r=>r.participantId===record.participantId && r.editionId===editionId && r.status==='completed' && r.contest)
        .map(r=>r.contest!.progress.playerScore-r.contest!.progress.crewScore);
      if (margins.length) body.append(paragraph(`${record.participantName}’s best settled margin in this edition: ${Math.max(...margins)}.`));
    } else {
      if (record?.status==='cancelled') body.append(report(record,edition,challengeQualified(s)));
      renderOffer(s);
    }
    const previous=(s.competitions?.individualChallenges ?? []).filter(r=>r.clubId===s.clubId && r.editionId===editionId && r.season<s.season && (r.status==='completed' || r.status==='interrupted' || r.status==='cancelled')).sort((a,b)=>b.season-a.season);
    if (previous.length) body.append(el('details',{},el('summary',{text:'Past contests'}),...previous.map(r=>report(r,r.contest?.edition ?? edition,challengeQualified(s)))));
  }
  function confirmation(): void {
    actions.append(control('Back','back',()=>{review=null;render();body.focus();}),
      control(review?.action.kind==='finish' ? 'Confirm finish' : review?.action.kind==='book' ? 'Confirm booking' : 'Confirm','confirm',()=>{ if(review) void submit(review); },true));
  }
  function renderOffer(s: GameState): void {
    const locked=edition.requiresFirstTitle && !challengeQualified(s);
    body.append(el('h3',{text:locked ? 'Invitation locked' : 'One player against Mick’s crew'}),
      paragraph(locked ? 'Win Break the Line to earn permanent club entry. Any eligible club player can then enter.' : 'Six clashes. Carry and defend against Gaz, Danny and Big Mick. Strong carriers and tacklers suit this physical contest.'),
      paragraph(`Free registration Weeks ${edition.bookingStartWeek}–${edition.bookingEndWeek}. Away Week ${edition.eventWeek}, back before Week ${edition.returnWeek}. Cancel freely before departure.`),
      el('div',{class:'duel-crew'},...edition.opponents.map(r=>el('div',{},
        el('img',{attrs:{src:portraitDataUrl(r.id,crewKit),alt:'',width:'28',height:'32'}}),el('strong',{text:r.name})))),guide(edition));
    if (locked || !inWindow(s.week,edition) || s.competitions?.leagueCareer?.phase!=='active') return;
    if (!review) {
      const select=el('select',{attrs:{'data-challenge-player':''}},el('option',{text:'Choose a squad player',attrs:{value:''}}),
        ...s.squad.filter(p=>isSelectable(p)).map(p=>el('option',{text:`${p.name} · ${POSITION_SHORT[p.position]}`,attrs:{value:p.id}})));
      select.value=playerId;
      select.onchange=()=>{if(!owns())return;playerId=select.value;status='';render();focus('[data-challenge-player]');};
      body.append(el('label',{class:'duel-picker'},el('strong',{text:'Choose your entrant'}),select));
    }
    if (!playerId) return;
    const preview=challengeEntryPreview(s,editionId,playerId);
    if (!preview.ok) { body.append(paragraph(preview.message)); return; }
    body.append(el('section',{class:'duel-preview',attrs:{'data-challenge-preview':''}},
      el('h3',{text:preview.actor.name}),abilities(preview.actor),
      el('strong',{text:`Auto-coach title chance · ${titleOdds(preview.titleProbability)}`}),
      el('details',{},el('summary',{text:'How this is estimated'}),paragraph(`Exact chance from the public ratings, rival plans and auto-coach policy: ${exactPercent(preview.titleProbability)}. Recalculated at departure.`)),
      paragraph(`Misses Week ${edition.eventWeek} against ${rivalClub(s,preview.opponentId)}. ${preview.cover ? preview.cover.name+' covers the '+preview.role+' place.' : 'Reserve · usual matchday places remain covered.'}`),
      paragraph(`Completion ${edition.completionXp} base XP · Title adds ${edition.winnerXp} base XP and ${money(edition.winnerCash)} for your club. Replaces the interval’s training.`)));
    if (review) confirmation();
    else actions.append(control('Review booking','review',()=>inspect({kind:'book',participantId:playerId}),true));
  }
  function startLane(s:GameState, contest: ChallengeContest, opponentId:string, role:'carry'|'defend', caption:string, score:string, clash?:ChallengeClash):void {
    content.setAttribute('data-live','');
    const viewport=el('div',{class:'duel-lane',attrs:{'data-challenge-lane':'',role:'img','aria-label':caption}});
    stage.append(el('div',{class:'duel-score'},el('strong',{text:caption}),el('span',{text:score})),viewport);
    const position=s.squad.find(p=>p.id===contest.actor.id)?.position;
    lane=mountChallengeLane({element:viewport,clubId:s.clubId,colors:s.league.clubs.find(c=>c.id===s.clubId)?.colors ?? DEFAULT_PLAYER_COLORS,
      playerId:contest.actor.id,...(position ? {position}:{}),opponentId,role,...(clash?{clash}:{}),
      onFinish:()=>{ if (clash && watching === clash && viewport.isConnected) checkpoint(); },
    });
  }
  function renderWatch(s:GameState, contest: ChallengeContest, clash:ChallengeClash):void {
    content.setAttribute('data-watch','');
    const rival=contest.edition.opponents[Math.min(2,Math.floor(clash.clashIndex/2))]!;
    const beforePlayer=contest.progress.playerScore-(!clash.bonus && clash.role==='carry'?clash.score:0);
    const beforeCrew=contest.progress.crewScore-(!clash.bonus && clash.role==='defend'?clash.score:0);
    const turn = clash.bonus ? 'Bonus carry' : `Clash ${clash.clashIndex+1} · You ${clash.role}`;
    startLane(s,contest,rival.id,clash.role,`${turn} · ${names[clash.playerCall]} v ${names[clash.opponentCall]}`,
      `${contest.actor.name} ${beforePlayer} – ${beforeCrew} crew`,clash);
    let paused=false;
    const pause=control('Pause','pause',()=>{paused=!paused;lane?.pause(paused);pause.textContent=paused?'Resume':'Pause';pause.setAttribute('aria-pressed',String(paused));});
    pause.setAttribute('aria-pressed','false');
    actions.append(pause,control('Skip action','skip',checkpoint));
  }
  function renderCoach(s:GameState, contest:ChallengeContest):void {
    if (challengeEngines[contest.engineVersion]?.status === 'retired') {
      body.append(paragraph('This version of the contest has retired. Return the player to club availability without an award.'));
      actions.append(control('Resolve interruption','interrupt',()=>inspect({kind:'interrupt'}),true)); return;
    }
    const cp=challengeCheckpoint(contest.edition,contest.actor,contest.progress);
    if (!cp) return;
    const caption=cp.bonus ? 'Bonus carry against Big Mick' : `Clash ${cp.clashIndex+1}/6 · You ${cp.role==='carry'?'carry':'defend'}`;
    startLane(s,contest,cp.opponent.id,cp.role,caption,`${contest.actor.name} ${cp.playerScore} – ${cp.crewScore} crew`);
    const rivalCall=cp.role==='carry'?cp.opponent.defence:cp.opponent.attack;
    body.append(el('h3',{text:cp.opponent.name}),paragraph(`${names[rivalCall]} · Your energy ${cp.playerEnergy} · Rival energy ${cp.opponentEnergy}`));
    const sealed=decided(contest.progress);
    if (sealed) body.append(paragraph(sealed));
    if (cp.bonus) body.append(paragraph('Only a clean breakthrough wins the title.'));
    const last=contest.clashes[contest.clashes.length-1];
    if (last) body.append(paragraph(`Last clash · ${lastClash(last)}`));
    const choices=el('div',{class:'duel-choices',attrs:{'aria-label':'Coaching calls'}});
    const legal=challengeCalls(cp);
    const watch=control(contest.autoCoach?'Watch auto-coached clash':'Watch clash','watch',()=>{
      if(contest.autoCoach) run({kind:'auto-clash'}); else if(selectedCall) void submit(selectedCall);
    },true);
    watch.disabled=!contest.autoCoach && !selectedCall;
    if (!contest.autoCoach) {
      for (const call of legal) {
        const preview=previewChallengeAction(cp,call);
        const btn=control(names[call],'call',()=>{
          selectedCall=capture({kind:'call',call});
          if(!selectedCall) return;
          for (const child of Array.from(choices.children)) child.setAttribute('aria-pressed',String(child===btn));
          watch.disabled=false;
        });
        btn.setAttribute('data-challenge-call',call);
        btn.setAttribute('aria-pressed',String(selectedCall?.action.kind==='call' && selectedCall.action.call===call));
        btn.append(el('small',{text:`${CHALLENGE_CALL_COST[call]} energy · ${callHint[call]}`}),
          el('small',{text:`Stop ${preview.counts[0]*4}% · Held ${preview.counts[1]*4}% · Break ${preview.counts[2]*4}%`}));
        choices.append(btn);
      }
      body.append(choices);
    }
    body.append(el('details',{},el('summary',{text:'Compare athletes'}),el('h3',{text:contest.actor.name}),abilities(contest.actor),
      paragraph(`Title chance at departure · ${exactPercent(contest.titleProbability)}`),el('h3',{text:cp.opponent.name}),abilities(cp.opponent)),
      el('div',{class:'duel-actions'},
        control(contest.autoCoach?'Return to manual':'Enable auto-coach','auto',()=>run({kind:'set-auto',enabled:!contest.autoCoach})),
        control('Finish with auto-coach','finish',()=>inspect({kind:'finish'}))));
    actions.append(watch);
  }

  function dialogKeys(event: KeyboardEvent): void {
    if (!modal.isConnected || document.documentElement.classList.contains(ROTATE_ON_CLASS)) return;
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      closeModal();
      return;
    }
    if (event.key !== 'Tab') return;
    // WebKit may skip ordinary buttons in native Tab order. Drive both directions
    // through the open dialog, including when a redraw removed the focused node.
    const controls = Array.from(content.querySelectorAll<HTMLElement>('button:not(:disabled),select,summary,[tabindex="0"]'))
      .filter(node => node.getClientRects().length > 0 && !node.closest('[hidden]'));
    if (!controls.length) return;
    const index = controls.indexOf(document.activeElement as HTMLElement);
    const next = index < 0 ? event.shiftKey ? controls.length-1 : 0
      : (index + (event.shiftKey ? -1 : 1) + controls.length) % controls.length;
    event.preventDefault();
    event.stopPropagation();
    controls[next]!.focus();
  }
  document.addEventListener('keydown', dialogKeys, true);
  disposeState=bus.on('state:changed',()=>{
    if (busy) return;
    // A different installation or a different slot owns its own UI. Routine
    // management edits invalidate pending previews before their next confirm.
    if (!owns()) return;
    review=null;selectedCall=null;
    if (!watching) render();
  });
  render(); leave.focus();
  return modal;
}
