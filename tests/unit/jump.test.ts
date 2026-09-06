import { it,expect } from 'vitest';
import { Navigation } from '../../src/navigation/grid';
import { blockers } from '../../src/levels/room';
import { escapeJump } from '../../src/dog/jump';
import { DogAI } from '../../src/dog/ai';
import { initializePhysics } from '../../src/physics/world';
import { newRound } from '../../src/rules/round';
import { distance } from '../../src/config/balance';

it('escapes over the coffee table with a physically clear flight and floor landing',async()=>{
  const nav=new Navigation(blockers),physics=await initializePhysics();
  const from={x:-.5,z:1.8},threat={x:-.5,z:3.5},dir=escapeJump(nav,from,threat);
  expect(dir).not.toBeNull();
  const actor=physics.actor(from,.28,.9),ai=new DogAI(nav),s=newRound();physics.step();ai.state='flee';
  let jumps=0,peak=0,impact=0;
  for(let i=0;i<65;i++){
    ai.update(1/60,actor.position,threat,s,actor.grounded);if(ai.jumpRequested){jumps++;physics.jump(actor);}
    const hit=physics.move(actor,ai.velocity,1/60);physics.step();peak=Math.max(peak,actor.y);impact=Math.max(impact,hit.speed);
  }
  expect(jumps).toBe(1);expect(peak).toBeGreaterThan(1.6);expect(impact).toBe(0);expect(actor.y).toBe(0);
  expect(distance(actor.position,threat)).toBeGreaterThan(distance(from,threat)+1);physics.world.free();
});
it('does not invent jumps on empty floor or through room walls',()=>{
  const nav=new Navigation(blockers.filter(b=>b.name==='Wall'));
  expect(escapeJump(nav,{x:0,z:0},{x:0,z:1})).toBeNull();
  const enclosed=new Navigation([{x:0,z:0,w:20,d:20,h:4,name:'Wall'}]);
  expect(escapeJump(enclosed,{x:0,z:0},{x:0,z:1})).toBeNull();
});
