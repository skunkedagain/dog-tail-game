import { B, clamp } from '../config/balance';
export type EndReason='time'|'health'|'anger';
export type PickupKind='juice'|'stuffie'|'toy';
export interface RoundState {
  time:number; hp:number; anger:number; catches:number; treats:number; progress:number; score:number;
  chain:number; bestChain:number; lastCatch:number; clean:boolean; lastHit:number; hitCooldown:number; stagger:number; softSlow:number;
  immunity:number; grabCooldown:number; treatCooldown:number; warning:number|null; cooling:number;
  ended:EndReason|null; maxAnger:number; hits:number; treatsEarned:number; treatsUsed:number;
  catchPoints:number; riskPoints:number; cleanPoints:number; completionPoints:number;
  sprint:number; sprintRest:number; pickup:PickupKind|null; buff:Exclude<PickupKind,'toy'>|null; buffTime:number;
}
export const newRound=():RoundState=>({time:0,hp:100,anger:0,catches:0,treats:0,progress:0,score:0,chain:0,bestChain:0,lastCatch:-Infinity,clean:true,lastHit:-Infinity,hitCooldown:0,stagger:0,softSlow:0,immunity:0,grabCooldown:0,treatCooldown:0,warning:null,cooling:0,ended:null,maxAnger:0,hits:0,treatsEarned:0,treatsUsed:0,catchPoints:0,riskPoints:0,cleanPoints:0,completionPoints:0,sprint:B.sprintCapacity,sprintRest:0,pickup:null,buff:null,buffTime:0});
export function angerStage(anger:number){return anger>=100?'ENOUGH!':anger>=75?'VERY ANGRY':anger>=50?'AGITATED':anger>=25?'ANNOYED':'CALM';}
export const multiplier=(chain:number)=>Math.min(2,1+.25*Math.max(0,chain-1));
export function finish(s:RoundState,reason:EndReason){if(s.ended)return;s.ended=reason;if(reason==='time'){s.completionPoints=200+Math.floor(s.hp)*2+s.treats*25;s.score+=s.completionPoints;}}
export function catchTail(s:RoundState):number {
  if(s.ended||s.warning!==null||s.immunity>0)return 0;
  s.chain=s.time-s.lastCatch<=B.comboTime?s.chain+1:1;s.bestChain=Math.max(s.chain,s.bestChain);
  const m=multiplier(s.chain),risk=s.anger>=75?30:s.anger>=50?15:0,clean=s.clean?20:0;
  const points=Math.round((100+risk+clean)*m);s.catchPoints+=Math.round(100*m);s.riskPoints+=Math.round(risk*m);s.cleanPoints+=points-Math.round(100*m)-Math.round(risk*m);
  s.score+=points;s.catches++;s.progress++;s.lastCatch=s.time;s.clean=true;s.cooling=0;
  if(s.progress===3){s.progress=0;s.treatsEarned++;s.treats=Math.min(3,s.treats+1);}
  s.anger=clamp(s.anger+B.angerPerCatch,0,100);s.maxAnger=Math.max(s.maxAnger,s.anger);s.immunity=B.immunity;
  if(s.anger>=100)s.warning=B.warningTime;
  return points;
}
export function impactDamage(speed:number){return speed<2?0:speed<3.2?4:speed<4.5?8:12;}
export function hardImpact(s:RoundState,speed:number){if(s.ended||s.hitCooldown>0)return 0;let damage=impactDamage(speed);if(!damage)return 0;if(s.buff==='stuffie')damage=Math.ceil(damage/2);s.hp=Math.max(0,s.hp-damage);s.hits++;s.chain=0;s.clean=false;s.lastHit=s.time;s.hitCooldown=1;s.stagger=speed<3.2?.15:speed<4.5?.25:.35;if(s.hp<=0)finish(s,'health');return damage;}
export function spendTreat(s:RoundState){if(s.ended||s.treats<1||s.treatCooldown>0)return false;s.treats--;s.treatsUsed++;s.treatCooldown=B.treatCooldown;return true;}
export function consumeTreat(s:RoundState){if(s.ended)return;s.anger=Math.max(0,s.anger-B.treatRelief);if(s.warning!==null&&s.anger<=75)s.warning=null;}
export function tickRules(s:RoundState,dt:number,canCool:boolean,eating:boolean){
  if(s.ended)return;
  s.time=Math.min(B.duration,s.time+dt);
  for(const key of ['hitCooldown','stagger','softSlow','immunity','grabCooldown','treatCooldown','buffTime'] as const)s[key]=Math.max(0,s[key]-dt);
  if(s.buffTime===0)s.buff=null;
  if(s.time-s.lastHit>=B.regenDelay&&s.stagger===0)s.hp=Math.min(100,s.hp+B.regenRate*dt);
  if(s.time-s.lastCatch>B.comboTime)s.chain=0;
  if(s.warning!==null){s.warning=Math.max(0,s.warning-dt);if(s.warning<=1e-8)finish(s,'anger');}
  else if(canCool&&!eating){const old=s.cooling;s.cooling+=dt;const active=Math.max(0,s.cooling-B.coolingDelay)-Math.max(0,old-B.coolingDelay);s.anger=Math.max(0,s.anger-active*B.coolingRate);}
  else s.cooling=0;
  if(s.time>=B.duration-1e-8)finish(s,'time');
}
