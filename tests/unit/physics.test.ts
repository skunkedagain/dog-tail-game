import { beforeAll,it,expect } from 'vitest';
import { initializePhysics,type Physics } from '../../src/physics/world';
let physics:Physics;beforeAll(async()=>{physics=await initializePhysics();});
it('blocks maximum-speed movement at the hard coffee table and reports impact',()=>{const actor=physics.actor({x:0,z:1.2},.24,.9);physics.step();const hit=physics.move(actor,{x:0,z:-20},.1);expect(actor.position.z).toBeGreaterThan(1.08);expect(hit.speed).toBeGreaterThan(10);});
it('classifies a sofa as a soft contact',()=>{const actor=physics.actor({x:-2.8,z:.3},.24,.9);physics.step();const hit=physics.move(actor,{x:-5,z:0},.1);expect(hit.soft).toBe(true);expect(hit.speed).toBe(0);});
