import { it,expect } from 'vitest';
import { DogAI } from '../../src/dog/ai';
import { Navigation } from '../../src/navigation/grid';
import { blockers } from '../../src/levels/room';
import { newRound } from '../../src/rules/round';
import { initializePhysics } from '../../src/physics/world';
import { distance } from '../../src/config/balance';
it('navigates a three-minute chase with capped progression without getting stuck',async()=>{
  const nav=new Navigation(blockers),ai=new DogAI(nav),physics=await initializePhysics();const actor=physics.actor({x:1.1,z:1.8},.28,.9);physics.step();const s=newRound();let checkpoint={...actor.position},stationary=0,maxStationary=0,total=0;
  for(let i=0;i<10800;i++){
    const t=i/60;s.catches=Math.floor(t/10);s.anger=60;
    const player=nav.nearest({x:4.7*Math.sin(t*.2),z:3.4*Math.cos(t*.2)});const old={...actor.position};
    ai.update(1/60,actor.position,player,s);physics.move(actor,ai.velocity,1/60);physics.step();total+=distance(old,actor.position);
    expect(Math.abs(actor.position.x)).toBeLessThan(5.73);expect(Math.abs(actor.position.z)).toBeLessThan(4.23);
    if(i%30===0){if(distance(checkpoint,actor.position)<.05&&t>2)stationary+=.5;else stationary=0;maxStationary=Math.max(maxStationary,stationary);checkpoint={...actor.position};}
  }
  expect(total).toBeGreaterThan(100);expect(maxStationary).toBeLessThan(2);physics.world.free();
});
