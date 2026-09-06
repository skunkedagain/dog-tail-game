import * as THREE from 'three';
import { B,clamp,distance,toward,type V2 } from '../config/balance';
import { makeRoom,ball,blockers } from '../levels/room';
import { DogModel } from '../dog/model';
import { DogAI } from '../dog/ai';
import { Navigation,segmentHits } from '../navigation/grid';
import { initializePhysics,type Physics,type Actor } from '../physics/world';
import { Controls } from '../input/controls';
import { catchTail,consumeTreat,hardImpact,newRound,spendTreat,tickRules,type RoundState } from '../rules/round';
import { UI } from '../ui/hud';
import { Sound } from '../audio/sound';
import { Pickups,pickupNames } from '../pickups/pickups';
import { readStorage,saveStorage } from '../storage/settings';

type Mode='loading'|'menu'|'countdown'|'playing'|'paused'|'results';
export class Game {
  ui:UI;renderer:THREE.WebGLRenderer;scene=new THREE.Scene();camera:THREE.PerspectiveCamera;
  model:DogModel;nav=new Navigation(blockers);ai=new DogAI(this.nav);sound=new Sound();pickups:Pickups;
  controls:Controls;physics!:Physics;player!:Actor;dog!:Actor;velocity:V2={x:0,z:0};
  state:RoundState=newRound();mode:Mode='loading';countdown=3;resumeMode:Mode='playing';
  stored=readStorage();settings=this.stored.settings;best=this.stored.best;
  previous=0;accumulator=0;visualTime=0;stepTime=0;reachWindow=0;reachSuccess=false;handTime=0;
  hands=new THREE.Group();thrown:THREE.Mesh|null=null;throwFlight=0;throwFrom=new THREE.Vector3();throwTo=new THREE.Vector3();treatArrived=false;
  toyMesh:THREE.Mesh|null=null;
  prevPlayer:V2={x:1.8,z:3.2};prevDog:V2={x:1.1,z:1.8};wasWarning=false;
  debugEnabled=import.meta.env.DEV&&new URLSearchParams(location.search).has('debug');
  constructor(app:HTMLElement){
    this.ui=new UI(app);
    this.renderer=new THREE.WebGLRenderer({canvas:document.querySelector('#game')!,antialias:true,powerPreference:'high-performance'});
    this.renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));this.renderer.setSize(innerWidth,innerHeight);this.renderer.shadowMap.enabled=this.settings.shadows;this.renderer.shadowMap.type=THREE.PCFSoftShadowMap;this.renderer.toneMapping=THREE.ACESFilmicToneMapping;this.renderer.toneMappingExposure=1.05;
    this.camera=new THREE.PerspectiveCamera(this.settings.fov,innerWidth/innerHeight,.035,55);this.camera.rotation.order='YXZ';this.scene.add(this.camera);
    makeRoom(this.scene);this.model=new DogModel(this.scene);this.model.root.position.set(1.1,0,1.8);this.model.root.rotation.y=-.6;
    this.pickups=new Pickups(this.scene);this.controls=new Controls(this.renderer.domElement,this.settings);this.controls.onPause=()=>this.pause();
    this.camera.add(this.hands);for(const sign of [-1,1]){
      ball(this.hands,.068,sign*.25,-.31,-.43,'#e9b483',[.9,1.2,1]);
      ball(this.hands,.074,sign*.28,-.4,-.34,'#d6a955',[1,1.5,1]);
      for(let i=0;i<3;i++)ball(this.hands,.021,sign*.25+(i-1)*.023,-.28,-.485,'#e9b483',[.6,1,1.2]);
    }this.hands.traverse(o=>{if(o instanceof THREE.Mesh){o.castShadow=false;o.frustumCulled=false;}});
    this.hands.visible=false;
    this.ui.menu.innerHTML='<div class="eyebrow">MAKE YOURSELF AT HOME</div><h1>Little feet.<br><em>Big mischief.</em></h1><p>Waking up the dog…</p>';
    addEventListener('resize',()=>{this.renderer.setSize(innerWidth,innerHeight);this.camera.aspect=innerWidth/innerHeight;this.camera.updateProjectionMatrix();});
    this.ui.el('pause-button').addEventListener('click',()=>this.pause());
    this.renderer.setAnimationLoop(t=>this.frame(t));
  }
  async init(){this.physics=await initializePhysics();this.player=this.physics.actor({x:1.8,z:3.2},B.playerRadius,.9);this.dog=this.physics.actor({x:1.1,z:1.8},B.dogRadius,.9);this.physics.step();this.showTitle();this.registerTools();if(this.debugEnabled)this.registerDebug();}
  bind(id:string,fn:()=>void){this.ui.el(id).onclick=fn;}
  showTitle(){this.mode='menu';this.controls.active=false;this.controls.reset();this.controls.unlock();this.ui.title(this.best);this.hands.visible=false;this.ui.countdown.hidden=true;this.ui.toast.hidden=true;this.bind('start',()=>this.start());this.bind('settings',()=>this.showSettings());}
  start(lock=true){
    this.state=newRound();this.velocity={x:0,z:0};this.controls.reset();this.controls.yaw=0;this.controls.pitch=-.055;
    this.physics.teleport(this.player,{x:1.8,z:3.2});this.physics.teleport(this.dog,{x:1.1,z:1.8});this.physics.step();
    this.prevPlayer={...this.player.position};this.prevDog={...this.dog.position};this.ai=new DogAI(this.nav);this.ai.yaw=.15;this.pickups.reset();
    this.reachWindow=0;this.reachSuccess=false;this.stepTime=0;this.handTime=0;this.wasWarning=false;this.clearThrow();this.accumulator=0;
    this.clearToy();
    this.countdown=3;this.mode='countdown';this.controls.active=true;this.hands.visible=true;this.ui.play();this.ui.countdown.hidden=false;
    this.sound.enabled=this.settings.sound;this.sound.unlock();this.sound.tone(440,.12);if(lock)void this.controls.lock();
    this.camera.fov=this.settings.fov;this.camera.updateProjectionMatrix();this.renderer.domElement.focus();
  }
  pause(){if(this.mode!=='playing'&&this.mode!=='countdown')return;this.resumeMode=this.mode;this.mode='paused';this.controls.active=false;this.controls.reset();this.controls.unlock();this.sound.pause();this.ui.countdown.hidden=true;this.ui.pause();this.bind('resume',()=>this.resume());this.bind('restart',()=>this.start());this.bind('settings',()=>this.showSettings());}
  resume(){this.mode=this.resumeMode;this.controls.active=true;this.controls.reset();this.accumulator=0;this.sound.unlock();void this.controls.lock();this.ui.play();this.camera.fov=this.settings.fov;this.camera.updateProjectionMatrix();this.ui.countdown.hidden=this.mode!=='countdown';this.renderer.domElement.focus();}
  showSettings(){this.ui.settings(this.settings);for(const id of ['sensitivity','fov','bob','sound','invert','shadows'] as const){const input=this.ui.el(id) as HTMLInputElement;input.oninput=()=>{
      if(id==='sensitivity'||id==='fov')this.settings[id]=Number(input.value);else this.settings[id]=input.checked;
      this.sound.enabled=this.settings.sound;this.renderer.shadowMap.enabled=this.settings.shadows;saveStorage(this.best,this.settings);
    };}
    this.bind('back',()=>{if(this.mode==='paused'){this.ui.pause();this.bind('resume',()=>this.resume());this.bind('restart',()=>this.start());this.bind('settings',()=>this.showSettings());}else this.showTitle();});
  }
  end(){if(this.mode==='results')return;this.mode='results';this.controls.active=false;this.controls.reset();this.controls.unlock();this.hands.visible=false;this.ui.countdown.hidden=true;
    const isNew=this.state.score>this.best;this.best=Math.max(this.best,this.state.score);saveStorage(this.best,this.settings);this.ui.results(this.state,this.best,isNew);this.sound.end();this.bind('restart',()=>this.start());this.bind('home',()=>this.showTitle());
  }
  frame(ms:number){const elapsed=this.previous?(ms-this.previous)/1000:0;this.previous=ms;const dt=Math.min(elapsed,.08);this.visualTime+=dt;
    if(elapsed>2&&this.mode==='playing')this.pause();
    if(this.mode==='playing'){
      this.accumulator+=dt;let steps=0;while(this.accumulator>=B.step&&steps<5&&this.mode==='playing'){this.update(B.step);this.accumulator-=B.step;steps++;}
      if(steps===5)this.accumulator=0;
      if(this.mode==='playing'){
      this.renderActors(this.accumulator/B.step);
      const query=this.reachable();let label=query.label;const nearby=this.pickups.nearby(this.player.position);if(nearby&&this.state.pickup)label=`F · Swap for ${pickupNames[nearby.kind]}`;
      this.ui.update(this.state,dt,query.ready,label,this.controls.locked);
      }
    }else if(this.mode==='countdown'){
      const prev=Math.ceil(this.countdown);this.countdown-=dt;this.controls.look(dt);this.ui.countdown.innerHTML=`${Math.max(1,Math.ceil(this.countdown))}<small>READY, LITTLE LEGS?</small>`;if(Math.ceil(this.countdown)<prev)this.sound.tone(440+220*(3-Math.ceil(this.countdown)),.1);
      this.renderActors(1);this.ui.update(this.state,dt,false,'',this.controls.locked);
      if(this.countdown<=0){this.mode='playing';this.controls.edges.clear();this.ui.countdown.hidden=true;this.ui.notify('Catch the tail! Space or click when it glows.',3);}
    }else if(this.mode==='menu'||this.mode==='loading'||this.mode==='results'){
      this.camera.fov=58;this.camera.updateProjectionMatrix();this.camera.position.set(4.9+Math.sin(this.visualTime*.07)*.12,2.6,4.1);this.camera.lookAt(-.6,.4,-.9);this.model.root.position.set(1.3,0,1.45);this.model.root.rotation.y=-.6;this.model.animate(this.visualTime,0,0);
    }
    this.renderer.render(this.scene,this.camera);
  }
  renderActors(alpha:number){
    const p=this.player.position,d=this.dog.position,speed=Math.hypot(this.velocity.x,this.velocity.z);
    this.camera.position.set(THREE.MathUtils.lerp(this.prevPlayer.x,p.x,alpha),B.eyeHeight,THREE.MathUtils.lerp(this.prevPlayer.z,p.z,alpha));
    if(this.settings.bob&&speed>.3)this.camera.position.y+=Math.sin(this.state.time*13)*.008*Math.min(speed/2,1);
    this.camera.rotation.set(this.controls.pitch,this.controls.yaw,0,'YXZ');
    this.model.root.position.set(THREE.MathUtils.lerp(this.prevDog.x,d.x,alpha),0,THREE.MathUtils.lerp(this.prevDog.z,d.z,alpha));this.model.root.rotation.y=this.ai.yaw;
    this.model.animate(this.visualTime,Math.hypot(this.ai.velocity.x,this.ai.velocity.z),this.state.anger,this.ai.state==='eat',this.state.immunity>0);
    this.model.body.rotation.z=this.ai.state==='juke'?this.ai.lean:0;
    const reach=this.handTime>0?Math.sin((1-this.handTime/.35)*Math.PI):0;this.hands.position.set(0,reach*.13,-reach*.2);
    if(this.thrown&&this.throwFlight>0){const t=1-this.throwFlight/.38;this.thrown.position.lerpVectors(this.throwFrom,this.throwTo,t);this.thrown.position.y+=Math.sin(t*Math.PI)*.7;}
  }
  update(dt:number){
    const s=this.state;if(s.ended){this.end();return;}
    this.prevPlayer={...this.player.position};this.prevDog={...this.dog.position};this.controls.look(dt);
    const keys=this.controls.keys;let x=Number(keys.has('KeyD'))-Number(keys.has('KeyA')),z=Number(keys.has('KeyS'))-Number(keys.has('KeyW'));const mag=Math.hypot(x,z);if(mag){x/=mag;z/=mag;}
    const sprint=mag>0&&(keys.has('ShiftLeft')||keys.has('ShiftRight'))&&s.sprint>dt;
    if(sprint){s.sprint=Math.max(0,s.sprint-dt);s.sprintRest=0;}else{s.sprintRest+=dt;if(s.sprintRest>B.sprintRefillDelay)s.sprint=Math.min(B.sprintCapacity,s.sprint+dt*B.sprintCapacity/B.sprintRefillTime);}
    let maxSpeed=(sprint?B.sprintSpeed:B.playerSpeed)*(s.buff==='juice'?1.15:1);if(s.stagger>0)maxSpeed*=.6;else if(s.softSlow>0)maxSpeed*=.7;
    const yaw=this.controls.yaw,tx=(x*Math.cos(yaw)+z*Math.sin(yaw))*maxSpeed,tz=(-x*Math.sin(yaw)+z*Math.cos(yaw))*maxSpeed;
    const acceleration=mag?B.acceleration:B.braking;this.velocity.x=toward(this.velocity.x,tx,acceleration*dt);this.velocity.z=toward(this.velocity.z,tz,acceleration*dt);
    const hit=this.physics.move(this.player,this.velocity,dt);this.velocity=hit.actual;
    if(hit.soft){if(s.softSlow===0)this.sound.soft();s.softSlow=.4;}
    const damage=hardImpact(s,hit.speed);if(damage){this.sound.bump();this.ui.notify(`Bonk! −${damage} HP`,1.4);this.ui.flash.classList.remove('active');void this.ui.flash.offsetWidth;this.ui.flash.classList.add('active');}
    if(s.ended){this.end();return;}
    this.stepTime+=dt;if(mag&&Math.hypot(this.velocity.x,this.velocity.z)>.5&&this.stepTime>(sprint?.22:.32)){this.stepTime=0;this.sound.step(sprint);}
    this.handTime=Math.max(0,this.handTime-dt);
    const grab=this.controls.take('Space','Grab');if(grab){s.cooling=0;if(s.grabCooldown<=0){s.grabCooldown=B.missCooldown;this.reachWindow=B.grabWindow;this.reachSuccess=false;this.handTime=.35;}}
    if(this.controls.take('KeyE'))this.useTreat();
    if(this.controls.take('KeyQ'))this.usePickup();
    this.pickups.update(dt,s.time,this.player.position,this.dog.position);const item=this.pickups.collect(this.player.position,!!s.pickup,this.controls.take('KeyF'));if(item){s.pickup=item;this.ui.notify(`${pickupNames[item]}! Press Q to use.`);this.sound.treat();}
    if(this.throwFlight>0){this.throwFlight=Math.max(0,this.throwFlight-dt);if(this.throwFlight===0&&this.ai.pendingTreat){this.ai.treat({x:this.throwTo.x,z:this.throwTo.z});this.treatArrived=true;}}
    // A toss takes a moment to land; accepted food then has priority over ordinary escape.
    if(!(this.ai.pendingTreat&&!this.treatArrived))this.ai.update(dt,this.dog.position,this.player.position,s);
    else {this.ai.velocity.x=toward(this.ai.velocity.x,0,20*dt);this.ai.velocity.z=toward(this.ai.velocity.z,0,20*dt);}
    this.physics.move(this.dog,this.ai.velocity,dt);
    // Keep a little personal space, without turning the dog into a pinning obstacle.
    const dd=distance(this.player.position,this.dog.position);if(dd<.49&&dd>.001){const scale=(.49-dd)/dt;this.physics.move(this.dog,{x:(this.dog.position.x-this.player.position.x)/dd*scale,z:(this.dog.position.z-this.player.position.z)/dd*scale},dt);}
    if(this.ai.consumed){consumeTreat(s);this.clearThrow();this.sound.treat();this.ui.notify('Good dog. −32 anger. Find your next angle.',2.6);}
    if(this.toyMesh&&this.ai.state!=='toy')this.clearToy();
    this.physics.step();
    let caught=false;
    if(this.reachWindow>0){this.reachWindow=Math.max(0,this.reachWindow-dt);if(!this.reachSuccess&&this.reachable().ready){const before=s.treats;const points=catchTail(s);if(points){caught=true;this.reachSuccess=true;this.ai.caught();this.clearThrow();this.sound.catch();this.ui.notify(`Got it! +${points}${s.treats>before?' · Treat earned!':''}`,1.8);}}}
    tickRules(s,dt,distance(this.player.position,this.dog.position)>4&&!grab&&!caught,this.ai.state==='eat');
    if(s.warning!==null&&!this.wasWarning){this.sound.bark();this.ui.notify(s.treats?'A treat, quick! E calms the dog.':'Uh-oh! No treats left.',2);}
    this.wasWarning=s.warning!==null;
    if(s.ended)this.end();
  }
  reachable(){
    const s=this.state,d=this.dog.position,p=this.player.position,angle=this.ai.yaw;
    const tail={x:d.x+Math.sin(angle)*.59,z:d.z+Math.cos(angle)*.59};const dx=tail.x-p.x,dz=tail.z-p.z,dy=.74-B.eyeHeight,dist=Math.hypot(dx,dy,dz);
    const near=dist<B.reach+.18;
    if(!near)return {ready:false,label:''};
    if(s.warning!==null)return {ready:false,label:'Time for a treat!'};
    if(this.ai.state==='eat'||this.ai.pendingTreat)return {ready:false,label:'Let the good dog eat.'};
    if(s.immunity>0)return {ready:false,label:'Here we go again…'};
    const rear=(p.x-d.x)*Math.sin(angle)+(p.z-d.z)*Math.cos(angle)>0;
    const aimX=-Math.sin(this.controls.yaw)*Math.cos(this.controls.pitch),aimZ=-Math.cos(this.controls.yaw)*Math.cos(this.controls.pitch),aimY=Math.sin(this.controls.pitch);
    const aimed=(dx*aimX+dy*aimY+dz*aimZ)/Math.max(dist,.001)>Math.cos(B.reachAngle);
    const clear=!blockers.some(b=>segmentHits(p,tail,b,.025));
    const ready=rear&&aimed&&clear;return {ready,label:ready?'SPACE / CLICK · Got your tail!':rear&&clear?'Aim at the tail':''};
  }
  useTreat(){const s=this.state;
    if(!s.treats){this.ui.notify(`Catch ${3-s.progress} more ${3-s.progress===1?'tail':'tails'} to earn a treat.`);return;}
    if(s.treatCooldown>0||this.ai.pendingTreat||this.ai.state==='eat'){this.ui.notify('One biscuit at a time.');return;}
    const p=this.player.position,d=this.dog.position;
    if(distance(p,d)>5){this.ui.notify('Get a little closer to offer a treat.');return;}
    if(!this.nav.lineClear(p,d,0)){this.ui.notify('Clear the throw — the dog is behind furniture.');return;}
    const target=this.nav.nearest(d);const path=this.nav.path(d,target);let length=0,last=d;for(const node of path){length+=distance(last,node);last=node;}
    if(!path.length||length>2){this.ui.notify('Wait for the dog to reach an open spot.');return;}
    if(!spendTreat(s))return;
    this.clearThrow();this.ai.pendingTreat=true;this.ai.target=target;this.ai.state='seek';this.ai.velocity={x:0,z:0};this.treatArrived=false;
    this.thrown=ball(this.scene,.07,p.x,B.eyeHeight,p.z,'#d59b49',[1.2,.6,1]);this.throwFrom.set(p.x,B.eyeHeight,p.z);this.throwTo.set(target.x,.08,target.z);this.throwFlight=.38;this.ui.notify('Biscuit delivery!',1.3);
  }
  usePickup(){const s=this.state;if(!s.pickup){this.ui.notify('Find a juice box, teddy, or toy around the room.');return;}
    if(s.pickup==='toy'){
      if(s.warning!==null){this.ui.notify('Only a treat will help now.');return;}
      if(this.ai.pendingTreat||this.ai.state==='eat'||this.ai.distractionCooldown>0){this.ui.notify('The dog needs a moment before another toy.');return;}
      const p=this.player.position;const desired={x:p.x-Math.sin(this.controls.yaw)*2.4,z:p.z-Math.cos(this.controls.yaw)*2.4},target=this.nav.nearest(desired);
      if(distance(p,target)>4||!this.nav.lineClear(p,target,0)){this.ui.notify('Aim the toy at open floor.');return;}
      if(!this.ai.toy(target))return;s.pickup=null;this.clearToy();this.toyMesh=ball(this.scene,.135,target.x,.14,target.z,'#d57350');this.ui.notify('Squeak! Get into position.',2);this.sound.tone(790,.2,'sine',.04,0,.6);
    }else {s.buff=s.pickup;s.buffTime=s.pickup==='juice'?6:10;s.pickup=null;this.ui.notify(s.buff==='juice'?'Juice power! +15% speed for 6s.':'Teddy hug! Half damage for 10s.');this.sound.treat();}
  }
  clearThrow(){if(this.thrown){this.scene.remove(this.thrown);this.thrown.geometry.dispose();this.thrown=null;}this.throwFlight=0;this.treatArrived=false;}
  clearToy(){if(this.toyMesh){this.scene.remove(this.toyMesh);this.toyMesh.geometry.dispose();this.toyMesh=null;}}
  snapshot(){return {mode:this.mode,time:Math.round(this.state.time*100)/100,score:this.state.score,catches:this.state.catches,hp:this.state.hp,anger:this.state.anger,treats:this.state.treats,progress:this.state.progress,ended:this.state.ended,dogState:this.ai.state,player:{...this.player.position},dog:{...this.dog.position},yaw:this.controls.yaw,pitch:this.controls.pitch,ready:this.reachable().ready,render:{calls:this.renderer.info.render.calls,triangles:this.renderer.info.render.triangles,geometries:this.renderer.info.memory.geometries}};}
  registerTools(){
    type Tool={name:string;description:string;inputSchema:object;annotations:{readOnlyHint:boolean};execute:(input:unknown)=>unknown};
    const context=(document as Document&{modelContext?:{registerTool:(tool:Tool,options:{signal:AbortSignal})=>void|Promise<void>}}).modelContext;
    if(!context)return;const lifecycle=new AbortController();const empty=(input:unknown)=>{if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('Expected an empty object.');};
    const tools:Tool[]=[{name:'read_dog_tail_round',description:'Read the current Dog Tail Game score, timer, resources, and play state.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:input=>{empty(input);return this.snapshot();}},{name:'pause_dog_tail_round',description:'Pause an active round without losing progress, exactly like the pause button.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false},execute:input=>{empty(input);this.pause();return this.snapshot();}}];
    for(const tool of tools)try{void Promise.resolve(context.registerTool(tool,{signal:lifecycle.signal})).catch(()=>{});}catch{/* Optional browser extension. */}
    addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
  }
  registerDebug(){
    // Only compiled into development builds, and only enabled by ?debug.
    const debug={snapshot:()=>this.snapshot(),start:()=>this.start(false),step:(seconds:number)=>{this.mode='playing';for(let i=0;i<seconds*60&&this.mode==='playing';i++)this.update(B.step);},state:()=>this.state,place:(player:V2,dog:V2,yaw=0)=>{this.physics.teleport(this.player,player);this.physics.teleport(this.dog,dog);this.physics.step();this.prevPlayer={...player};this.prevDog={...dog};this.controls.yaw=yaw;this.controls.pitch=0;this.ai.yaw=yaw;this.ai.velocity={x:0,z:0};this.velocity={x:0,z:0};},freezeDog:()=>{this.ai.state='watch';this.ai.timer=999;this.ai.velocity={x:0,z:0};},look:(yaw:number,pitch=0)=>{this.controls.yaw=yaw;this.controls.pitch=clamp(pitch,-1.05,1.05);}};
    (window as unknown as {__dogGame:typeof debug}).__dogGame=debug;
  }
}
