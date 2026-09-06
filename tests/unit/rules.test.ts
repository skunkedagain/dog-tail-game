import { describe,it,expect } from 'vitest';
import { newRound,catchTail,consumeTreat,spendTreat,hardImpact,tickRules,finish,impactDamage } from '../../src/rules/round';
function caught(s:ReturnType<typeof newRound>){s.immunity=0;return catchTail(s);}
describe('catch and treat economy',()=>{
  it('awards exactly one catch during immunity and one treat per three catches',()=>{const s=newRound();expect(catchTail(s)).toBe(120);expect(catchTail(s)).toBe(0);caught(s);caught(s);expect(s.catches).toBe(3);expect(s.treats).toBe(1);expect(s.progress).toBe(0);expect(s.anger).toBe(54);});
  it('retains permanent difficulty and a net anger cost after treats',()=>{const s=newRound();for(let group=0;group<3;group++){for(let i=0;i<3;i++)caught(s);s.treatCooldown=0;expect(spendTreat(s)).toBe(true);consumeTreat(s);}expect(s.anger).toBe(66);expect(s.catches).toBe(9);expect(s.treatsUsed).toBe(3);});
  it('cannot spend absent or cooling-down treats',()=>{const s=newRound();expect(spendTreat(s)).toBe(false);s.treats=2;expect(spendTreat(s)).toBe(true);expect(spendTreat(s)).toBe(false);expect(s.treats).toBe(1);});
  it('caps inventory and resets overflow progress',()=>{const s=newRound();s.treats=3;s.progress=2;caught(s);expect(s.treats).toBe(3);expect(s.progress).toBe(0);});
  it('credits an earned treat before warning and allows a rescue',()=>{const s=newRound();s.anger=90;s.progress=2;caught(s);expect(s.warning).toBe(4);expect(s.treats).toBe(1);expect(spendTreat(s)).toBe(true);consumeTreat(s);expect(s.anger).toBe(68);expect(s.warning).toBeNull();});
  it('blocks catches during warning and ends without passive-cooling rescue',()=>{const s=newRound();s.anger=99;caught(s);s.immunity=0;expect(catchTail(s)).toBe(0);for(let i=0;i<240;i++)tickRules(s,1/60,true,false);expect(s.ended).toBe('anger');expect(s.anger).toBe(100);});
});
describe('scoring',()=>{
  it('uses pre-catch anger and the defined fourth-chain example',()=>{const s=newRound();s.chain=3;s.lastCatch=0;s.time=3;s.anger=60;expect(catchTail(s)).toBe(236);expect(s.score).toBe(s.catchPoints+s.riskPoints+s.cleanPoints);});
  it('expires combos, but misses need not reset them',()=>{const s=newRound();caught(s);s.time=12.01;expect(caught(s)).toBe(120);expect(s.chain).toBe(1);});
  it('applies completion bonuses exactly once and none on failure',()=>{const s=newRound();s.hp=50;s.treats=2;finish(s,'time');expect(s.score).toBe(350);finish(s,'time');expect(s.score).toBe(350);const t=newRound();finish(t,'health');expect(t.score).toBe(0);});
});
describe('health and time',()=>{
  it('uses speed thresholds and prevents repeated damage',()=>{expect([1.99,2,3.2,4.5].map(impactDamage)).toEqual([0,4,8,12]);const s=newRound();expect(hardImpact(s,5)).toBe(12);expect(hardImpact(s,5)).toBe(0);expect(s.hp).toBe(88);expect(s.hits).toBe(1);});
  it('teddy halves damage but does not preserve combo',()=>{const s=newRound();s.buff='stuffie';s.chain=4;expect(hardImpact(s,5)).toBe(6);expect(s.chain).toBe(0);expect(s.clean).toBe(false);});
  it('starts regeneration after eight seconds and caps health',()=>{const s=newRound();hardImpact(s,4);tickRules(s,7,false,false);expect(s.hp).toBe(92);tickRules(s,1,false,false);expect(s.hp).toBe(95);tickRules(s,3,false,false);expect(s.hp).toBe(100);});
  it('cools only the time beyond four seconds and not while eating',()=>{const s=newRound();s.anger=50;tickRules(s,10,true,false);expect(s.anger).toBe(38);tickRules(s,10,true,true);expect(s.anger).toBe(38);expect(s.cooling).toBe(0);});
  it('new round resets effects, cooldowns, scoring and resources',()=>{const s=newRound();s.buff='juice';s.buffTime=5;s.score=500;expect(newRound()).toMatchObject({buff:null,buffTime:0,score:0,treats:0,time:0,ended:null,hp:100,immunity:0});});
  it('freezes rules once terminal',()=>{const s=newRound();finish(s,'anger');tickRules(s,100,true,false);expect(s.time).toBe(0);expect(catchTail(s)).toBe(0);});
});
