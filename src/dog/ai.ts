import { escapeJump } from './jump';
import { B,distance,direction,toward,seededRandom,type V2 } from '../config/balance';
import { Navigation } from '../navigation/grid';
import type { RoundState } from '../rules/round';
export type DogState='watch'|'wander'|'flee'|'burst'|'rest'|'seek'|'eat'|'toy'|'warning'|'juke';
export class DogAI {
  state:DogState='watch';velocity:V2={x:0,z:0};yaw=0;path:V2[]=[];timer=1;replan=0;burstCooldown=0;pursuit=0;distractionCooldown=0;lastSeen:V2={x:1.8,z:3.2};memory=0;
  target:V2|null=null;pendingTreat=false;consumed=false;stuck=0;previous:V2={x:1.1,z:1.8};random=seededRandom(32);lastGoals:V2[]=[];
  jumpRequested=false;jumpCooldown=0;flightTime=0;
  jukeCooldown=8;lean=0;
  constructor(readonly nav:Navigation){}
  caught(){this.state='burst';this.timer=1;this.burstCooldown=5;this.replan=0;this.target=null;this.distractionCooldown=6;}
  treat(at:V2){this.target=at;this.pendingTreat=true;this.state='seek';this.timer=1.5;this.path=[];this.replan=0;}
  toy(at:V2){if(this.distractionCooldown>0)return false;this.target=at;this.state='toy';this.timer=3;this.path=[];this.replan=0;return true;}
  pickGoal(pos:V2,threat:V2){
    const candidates:V2[]=[];
    for(let i=0;i<24;i++)candidates.push(this.nav.free[Math.floor(this.random()*this.nav.free.length)]);
    candidates.sort((a,b)=>this.goalScore(b,pos,threat)-this.goalScore(a,pos,threat));
    for(const p of candidates.slice(0,8)){const path=this.nav.path(pos,p);if(path.length&&distance(pos,p)>1.5){this.path=path;this.lastGoals.push(p);if(this.lastGoals.length>2)this.lastGoals.shift();return;}}
    this.path=this.nav.path(pos,this.nav.nearest({x:-pos.x,z:-pos.z}));
  }
  goalScore(p:V2,pos:V2,threat:V2){return distance(p,threat)*1.4-distance(pos,p)*.4+(!this.nav.lineClear(p,threat,0)?1.3:0)-this.lastGoals.reduce((v,g)=>v+(distance(p,g)<1.5?2:0),0);}
  update(dt:number,pos:V2,player:V2,s:RoundState,grounded=true){
    this.jumpRequested=false;this.jumpCooldown=Math.max(0,this.jumpCooldown-dt);
    if(this.flightTime>0&&!grounded){this.flightTime=Math.max(.001,this.flightTime-dt);return;}
    if(this.flightTime>0){this.flightTime=0;this.path=[];this.replan=0;}
    this.timer-=dt;this.replan-=dt;this.burstCooldown=Math.max(0,this.burstCooldown-dt);this.distractionCooldown=Math.max(0,this.distractionCooldown-dt);this.consumed=false;
    this.jukeCooldown=Math.max(0,this.jukeCooldown-dt);
    const d=distance(pos,player),visible=d<5&&this.nav.lineClear(pos,player,0);
    if(visible||d<3){this.lastSeen={...player};this.memory=2;}else this.memory=Math.max(0,this.memory-dt);
    if(s.warning!==null&&this.state!=='seek'&&this.state!=='eat')this.state='warning';
    if(s.warning===null&&this.state==='warning'){this.state='flee';this.replan=0;}
    if(this.state==='seek'&&this.target){
      if(distance(pos,this.target)<.22){this.pendingTreat=false;this.consumed=true;this.state='eat';this.timer=2.4;this.velocity={x:0,z:0};}
      else if(this.replan<=0){this.path=this.nav.path(pos,this.target);this.replan=.3;}
    }
    if(this.state==='eat'&&this.timer<=0){this.state='flee';this.replan=0;this.pursuit=0;this.target=null;}
    if(this.state==='toy'){if(this.timer<=0||s.warning!==null){this.state='flee';this.target=null;this.replan=0;this.distractionCooldown=6;}else if(this.target&&this.replan<=0){this.path=this.nav.path(pos,this.target);this.replan=.4;}}
    if(this.state==='watch'&&this.timer<=0){this.state='flee';this.replan=0;}
    if(this.state==='juke'&&this.timer<=0){this.state='flee';this.replan=0;this.jukeCooldown=Math.max(5,8-s.catches*.15);}
    if(this.state==='rest'&&this.timer<=0){this.state='flee';this.replan=0;this.pursuit=0;}
    if(this.state==='burst'&&this.timer<=0){this.state='rest';this.timer=1;this.pursuit=0;}
    if(this.state==='flee'||this.state==='wander'){
      this.pursuit+=dt;
      if(this.pursuit>=7){this.state='rest';this.timer=1.1;this.pursuit=0;}
      else if(d<1.2&&this.burstCooldown<=0&&s.catches>1){this.state='burst';this.timer=.8;this.burstCooldown=5;}
      else if(s.catches>=4&&d>1.3&&d<3.5&&this.jukeCooldown<=0){this.state='juke';this.timer=.25;this.lean=this.random()>.5?.18:-.18;}
      else this.state=this.memory>0?'flee':'wander';
    }
    if(['flee','wander','burst','rest'].includes(this.state)&&(this.replan<=0||!this.path.length)){
      this.pickGoal(pos,this.memory>0?this.lastSeen:{x:0,z:0});this.replan=this.state==='burst'?.7:1.1;
    }
    if(grounded&&this.jumpCooldown===0&&d<3.8&&['flee','burst'].includes(this.state)&&s.warning===null){
      const dir=escapeJump(this.nav,pos,player);
      if(dir){this.jumpRequested=true;this.jumpCooldown=B.dogJumpCooldown;this.flightTime=2*B.jumpSpeed/B.gravity;this.velocity={x:dir.x*B.dogJumpSpeed,z:dir.z*B.dogJumpSpeed};this.yaw=Math.atan2(-dir.x,-dir.z);this.path=[];return;}
    }
    if(distance(pos,this.previous)<.001&&Math.hypot(this.velocity.x,this.velocity.z)>.3)this.stuck+=dt;else this.stuck=0;
    this.previous={...pos};if(this.stuck>.75){this.replan=0;this.path=[];this.stuck=0;}
    while(this.path.length&&distance(pos,this.path[0])<.18)this.path.shift();
    const cruise=Math.min(3.75,2.7+.06*Math.min(s.catches,15)+(s.anger>=50?.15:0));
    let speed=this.state==='burst'?Math.min(4.9,4.2+.05*s.catches):this.state==='rest'?1.6:this.state==='wander'?1.55:this.state==='seek'?3.5:this.state==='toy'?2.6:cruise;
    if(this.state==='juke')speed=.65;
    if(['watch','eat','warning'].includes(this.state)||!this.path.length)speed=0;
    const dir=this.path.length?direction(pos,this.path[0]):{x:0,z:0};
    const acceleration=(this.state==='seek'?16:8+Math.min(s.catches*.25,3))*dt;
    this.velocity.x=toward(this.velocity.x,dir.x*speed,acceleration);this.velocity.z=toward(this.velocity.z,dir.z*speed,acceleration);
    if(speed===0){this.velocity.x=toward(this.velocity.x,0,20*dt);this.velocity.z=toward(this.velocity.z,0,20*dt);}
    if(Math.hypot(this.velocity.x,this.velocity.z)>.15){const target=Math.atan2(-this.velocity.x,-this.velocity.z);const angle=Math.atan2(Math.sin(target-this.yaw),Math.cos(target-this.yaw));this.yaw+=Math.max(-dt*6,Math.min(dt*6,angle));}
  }
}
