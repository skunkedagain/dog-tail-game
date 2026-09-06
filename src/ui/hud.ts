import { B } from '../config/balance';
import { angerStage,multiplier,type RoundState } from '../rules/round';
import { pickupNames } from '../pickups/pickups';
import type { Settings } from '../input/controls';
export class UI {
  menu:HTMLElement;hud:HTMLElement;toast:HTMLElement;reticle:HTMLElement;warning:HTMLElement;countdown:HTMLElement;flash:HTMLElement;
  toastTime=0;last=0;
  constructor(app:HTMLElement){app.innerHTML=`
    <canvas id="game" aria-label="First-person Dog Tail Game. WASD to move, arrow keys or mouse to look, Space to catch." tabindex="-1"></canvas>
    <div class="brand"><span class="paw">✦</span> DOG TAIL GAME <span class="edition">THE LIVING ROOM</span><button id="pause-button" class="small-button" aria-label="Pause game" hidden>Ⅱ</button></div>
    <div class="menu-layer" id="menu-layer">
      <section class="menu" id="menu" aria-label="Game menu"></section>
      <div class="corner-note" id="corner-note">A tiny chase with a big personality.</div>
    </div>
    <div class="hud" id="hud" hidden>
      <div class="score-panel"><div class="label">TAILS & TALES</div><div class="score-number" id="score">0</div><div class="combo-row"><span id="catch-count">0 catches</span><span id="combo">×1</span></div><div class="track combo-track"><i id="combo-bar"></i></div></div>
      <div class="timer-panel"><span class="label">TIME LEFT</span><strong id="timer">3:00</strong></div>
      <div class="anger-panel"><div class="anger-heading"><span class="dog-face">♧</span><div><span class="label">DOG'S MOOD</span><strong id="mood">CALM</strong></div><span id="anger-value">0</span></div><div class="track anger-track"><i id="anger-bar"></i></div><span class="meter-note" id="cooling-note">A very good dog.</span></div>
      <div class="bottom-hud"><div class="health-panel"><div class="health-heading"><span>♥ <b id="hp">100</b></span><span class="label">LITTLE LEGS</span></div><div class="track health-track"><i id="hp-bar"></i></div><div class="stamina"><span>SPRINT</span><div class="track"><i id="sprint-bar"></i></div><kbd>SHIFT</kbd></div></div>
      <div class="pocket"><kbd>E</kbd><div><span class="label">TREATS</span><strong id="treats">0</strong></div><div class="treat-progress" id="treat-progress"><i></i><i></i><i></i></div><small id="treat-note">3 catches = 1 treat</small></div>
      <div class="ability"><kbd>Q</kbd><div><span class="label">POCKET FIND</span><strong id="pickup">Empty pocket</strong><small id="buff">Find a little advantage.</small></div></div></div>
      <div class="play-help" id="play-help">WASD move · Arrows / mouse look · Space / click grab</div>
    </div>
    <div class="reticle" id="reticle" hidden><div class="crosshair"></div><span id="reach-label"></span></div>
    <div class="toast" id="toast" role="status" aria-live="polite" hidden></div>
    <div class="warning-banner" id="warning" hidden></div><div class="countdown" id="countdown" hidden></div><div class="hit-flash" id="hit-flash"></div>`;
    this.menu=document.querySelector('#menu')!;this.hud=document.querySelector('#hud')!;this.toast=document.querySelector('#toast')!;this.reticle=document.querySelector('#reticle')!;this.warning=document.querySelector('#warning')!;this.countdown=document.querySelector('#countdown')!;this.flash=document.querySelector('#hit-flash')!;
  }
  el(id:string){return document.getElementById(id)!;}
  title(best:number){this.menu.classList.remove('results');this.menu.innerHTML=`<div class="eyebrow">LITTLE FEET. BIG MISCHIEF.</div><h1>Catch the tail.<br><em>Cause a little chaos.</em></h1><p>Three minutes. One very good dog.<br>And a toddler with absolutely no chill.</p><button id="start" class="primary">Let's play <span>↗</span></button><div class="menu-meta"><span>${best?`PERSONAL BEST · ${best.toLocaleString()}`:'ONE ROOM · THREE MINUTES'}</span><button id="settings" class="text-button">Settings & controls</button></div><div class="how"><span><kbd>W A S D</kbd> Move <kbd>SHIFT</kbd> Sprint</span><span><kbd>↑ ↓ ← →</kbd> / Mouse · Look</span><span><kbd>SPACE</kbd> / Click · Catch the tail</span><span><kbd>E</kbd> Treat <kbd>Q</kbd> Use pickup</span></div><p class="device-note">Made for a keyboard. Arrow keys work without mouse lock.</p>`;this.showMenu();}
  showMenu(){this.el('menu-layer').hidden=false;this.menu.hidden=false;this.hud.hidden=true;this.reticle.hidden=true;this.warning.hidden=true;this.toast.hidden=true;this.toastTime=0;this.el('corner-note').hidden=false;this.el('pause-button').hidden=true;document.body.classList.remove('playing');}
  play(){this.el('menu-layer').hidden=true;this.menu.hidden=true;this.hud.hidden=false;this.reticle.hidden=false;this.el('corner-note').hidden=true;this.el('pause-button').hidden=false;document.body.classList.add('playing');}
  pause(){this.menu.classList.remove('results');this.menu.innerHTML=`<div class="eyebrow">TAKE A BREATHER</div><h1>Paws.<br><em>And relax.</em></h1><p>Your chase is right where you left it.<br>The dog appreciates the breather.</p><button class="primary" id="resume">Back to mischief <span>↗</span></button><div class="menu-meta"><button class="text-button" id="restart">Start a fresh round</button><button class="text-button" id="settings">Settings & controls</button></div>`;this.showMenu();this.el('resume').focus();}
  settings(s:Settings){this.menu.classList.remove('results');this.menu.innerHTML=`<div class="eyebrow">MAKE YOURSELF AT HOME</div><h1 class="smaller-title">Your kind<br>of <em>chaos.</em></h1><div class="settings-grid"><label>Mouse sensitivity <input id="sensitivity" type="range" min="0.3" max="2" step="0.1" value="${s.sensitivity}" /></label><label>Field of view <input id="fov" type="range" min="60" max="90" value="${s.fov}" /></label>${([['bob','Gentle camera bob'],['sound','Sound effects'],['invert','Invert mouse Y'],['shadows','Detailed shadows']] as const).map(([id,label])=>`<label class="check-row">${label}<input type="checkbox" id="${id}" ${s[id]?'checked':''}/></label>`).join('')}</div><p class="settings-help">WASD move · Shift sprint<br>Arrow keys / mouse look · Space / click grab<br>E treat · Q use pickup · F swap pickup<br>Right-drag to look when mouse lock is unavailable.<br>Escape pauses. Earn a treat every 3 catches.<br>Hard sprint impacts knock you down. Bandage kits restore HP.</p><button class="primary" id="back">All set <span>✓</span></button>`;this.showMenu();this.el('back').focus();}
  results(s:RoundState,best:number,isNew:boolean){this.menu.classList.add('results');const reason=s.ended==='time'?"That's a wrap!":s.ended==='health'?'Nap time.':'Time out!';const line=s.ended==='time'?'Three minutes of very important toddler business.':s.ended==='health'?'Those table corners got the best of your little legs.':'Someone has officially had enough. Treats help!';
    this.menu.innerHTML=`<div class="eyebrow">${isNew?'A NEW PERSONAL BEST!':'THE LIVING ROOM · ROUND COMPLETE'}</div><h1>${reason}</h1><p>${line}</p><div class="result-score"><strong>${s.score.toLocaleString()}</strong><span>POINTS OF MISCHIEF</span></div><div class="result-stats"><div><strong>${s.catches}</strong><span>tails caught</span></div><div><strong>×${multiplier(s.bestChain)}</strong><span>best combo</span></div><div><strong>${Math.floor(s.time)}s</strong><span>play time</span></div></div><button class="primary" id="restart">One more chase <span>↗</span></button><div class="menu-meta"><span>BEST · ${best.toLocaleString()}</span><button class="text-button" id="home">Back home</button></div><details class="score-details"><summary>The little details</summary><div>Catch points <b>${s.catchPoints}</b></div><div>Risk bonus <b>${s.riskPoints}</b></div><div>Clean chase bonus <b>${s.cleanPoints}</b></div><div>Finish bonuses <b>${s.completionPoints}</b></div><div>Hard bumps <b>${s.hits}</b></div><div>HP remaining <b>${Math.floor(s.hp)}</b></div><div>Highest anger <b>${Math.round(s.maxAnger)}</b></div><div>Treats earned / used / left <b>${s.treatsEarned} / ${s.treatsUsed} / ${s.treats}</b></div></details>`;
    this.showMenu();this.el('restart').focus();
  }
  notify(message:string,time=2.5){this.toast.textContent=message;this.toastTime=time;this.toast.hidden=false;}
  update(s:RoundState,dt:number,ready:boolean,reachLabel:string,locked:boolean){
    this.toastTime-=dt;this.toast.hidden=this.toastTime<=0;
    this.el('score').textContent=s.score.toLocaleString();this.el('catch-count').textContent=`${s.catches} ${s.catches===1?'catch':'catches'}`;
    this.el('combo').textContent=`×${multiplier(s.chain)}`;this.el('combo-bar').style.width=`${s.chain?Math.max(0,1-(s.time-s.lastCatch)/B.comboTime)*100:0}%`;
    const left=Math.max(0,Math.ceil(B.duration-s.time));this.el('timer').textContent=`${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`;this.el('timer').classList.toggle('urgent',left<=30);
    this.el('mood').textContent=angerStage(s.anger);this.el('anger-value').textContent=String(Math.round(s.anger));this.el('anger-bar').style.width=`${s.anger}%`;this.el('anger-bar').style.background=s.anger>=75?'#ce6245':s.anger>=50?'#d79942':'#67927a';
    this.el('cooling-note').textContent=s.warning!==null?'One treat. Right now.':s.cooling>4?'Cooling down. Keep your distance.':s.anger>=75?'A treat or a little space?':s.anger>=50?'Getting a little grumbly.':s.anger>=25?'A little side-eye.':'A very good dog.';
    this.el('hp').textContent=String(Math.ceil(s.hp));this.el('hp-bar').style.width=`${s.hp}%`;this.el('sprint-bar').style.width=`${s.sprint/B.sprintCapacity*100}%`;
    this.el('treats').textContent=String(s.treats);this.el('treat-note').textContent=s.treatCooldown>0?`Ready in ${Math.ceil(s.treatCooldown)}s`:`${3-s.progress} ${3-s.progress===1?'catch':'catches'} to next treat`;
    this.el('treat-progress').querySelectorAll('i').forEach((e,i)=>e.classList.toggle('filled',i<s.progress));
    this.el('pickup').textContent=s.pickup?pickupNames[s.pickup]:'Empty pocket';this.el('buff').textContent=s.buff?`${pickupNames[s.buff]} · ${Math.ceil(s.buffTime)}s`:s.pickup==='bandage'?'Q · Restore up to 30 HP':s.pickup?'Press Q to use':'Find a little advantage.';
    this.reticle.classList.toggle('ready',ready);this.el('reach-label').textContent=reachLabel;this.el('play-help').textContent=locked?'WASD move · Shift sprint · Arrows / mouse look · Space / click grab':'WASD move · Arrows look · Space grab · Right-drag mouse look';
    this.warning.hidden=s.warning===null;if(s.warning!==null)this.warning.textContent=`ENOUGH!  ${s.warning.toFixed(1)}s · ${s.treats?'Press E — offer a treat!':'No treats left. Time-out is coming!'}`;
  }
}
