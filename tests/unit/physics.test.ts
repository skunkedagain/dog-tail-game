import { beforeAll,it,expect } from 'vitest';
import { initializePhysics,type Physics } from '../../src/physics/world';
let physics:Physics;beforeAll(async()=>{physics=await initializePhysics();});
it('blocks maximum-speed movement at the hard coffee table and reports impact',()=>{const actor=physics.actor({x:0,z:1.2},.24,.9);physics.step();const hit=physics.move(actor,{x:0,z:-20},.1);expect(actor.position.z).toBeGreaterThan(1.08);expect(hit.speed).toBeGreaterThan(10);});
it('classifies a sofa as a soft contact',()=>{const actor=physics.actor({x:-2.8,z:.3},.24,.9);physics.step();const hit=physics.move(actor,{x:-5,z:0},.1);expect(hit.soft).toBe(true);expect(hit.speed).toBe(0);});
it('jumps over the coffee table, lands on the floor, and cannot double jump',()=>{
  const actor=physics.actor({x:-.5,z:1.8},.24,.9);physics.step();
  expect(physics.jump(actor)).toBe(true);expect(physics.jump(actor)).toBe(false);
  let peak=0,impact=0;
  for(let i=0;i<60;i++){const hit=physics.move(actor,{x:0,z:-3.8},1/60);physics.step();peak=Math.max(peak,actor.y);impact=Math.max(impact,hit.speed);}
  expect(peak).toBeGreaterThan(1.6);expect(actor.position.z).toBeLessThan(-1.5);expect(actor.y).toBe(0);expect(actor.grounded).toBe(true);expect(impact).toBe(0);
});
it('can land on furniture and walk off, while airborne walls remain solid',()=>{
  const actor=physics.actor({x:-.5,z:1.8},.24,.9);physics.step();physics.jump(actor);
  for(let i=0;i<75;i++){physics.move(actor,{x:0,z:i<25?-3.8:0},1/60);physics.step();}
  expect(actor.y).toBeCloseTo(.668,1);expect(actor.grounded).toBe(true);
  for(let i=0;i<75;i++){physics.move(actor,{x:3.8,z:0},1/60);physics.step();}
  expect(actor.y).toBe(0);
  physics.teleport(actor,{x:5.4,z:3.8});physics.step();physics.jump(actor);
  for(let i=0;i<40;i++){physics.move(actor,{x:5.2,z:0},1/60);physics.step();}
  expect(actor.position.x).toBeLessThan(5.77);expect(actor.y).toBeGreaterThan(0);
});
