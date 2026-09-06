import RAPIER from '@dimforge/rapier3d-compat';
import { blockers, type Blocker } from '../levels/room';
import { B, type V2 } from '../config/balance';
export type Actor={collider:RAPIER.Collider;controller:RAPIER.KinematicCharacterController;position:V2;height:number;y:number;vy:number;grounded:boolean};
export class Physics {
  world=new RAPIER.World({x:0,y:0,z:0});
  metadata=new Map<number,Blocker>();
  constructor(){for(const b of blockers){const c=this.world.createCollider(RAPIER.ColliderDesc.cuboid(b.w/2,b.h/2,b.d/2).setTranslation(b.x,b.h/2,b.z));this.metadata.set(c.handle,b);}this.world.timestep=1/60;this.world.step();}
  actor(p:V2,radius:number,height:number):Actor {const collider=this.world.createCollider(RAPIER.ColliderDesc.capsule(height/2-radius,radius).setTranslation(p.x,height/2,p.z));const controller=this.world.createCharacterController(.008);controller.setSlideEnabled(true);return {collider,controller,position:{...p},height,y:0,vy:0,grounded:true};}
  teleport(a:Actor,p:V2){a.position={...p};a.y=0;a.vy=0;a.grounded=true;a.collider.setTranslation({x:p.x,y:a.height/2,z:p.z});}
  jump(a:Actor){if(!a.grounded)return false;a.vy=B.jumpSpeed;a.grounded=false;return true;}
  move(a:Actor,velocity:V2,dt:number,vertical=true){
    if(vertical)a.vy-=B.gravity*dt;
    const descending=a.vy<=0;if(vertical)a.grounded=false;
    a.controller.computeColliderMovement(a.collider,{x:velocity.x*dt,y:vertical?a.vy*dt:0,z:velocity.z*dt},undefined,undefined,c=>this.metadata.has(c.handle));
    let speed=0,soft=false,normal:V2={x:0,z:0};
    for(let i=0;i<a.controller.numComputedCollisions();i++){const hit=a.controller.computedCollision(i);if(!hit?.collider)continue;if(vertical&&descending&&hit.normal1.y>.5){a.grounded=true;a.vy=0;}if(hit.normal1.y>.5)continue;const b=this.metadata.get(hit.collider.handle);if(!b)continue;const v=Math.max(0,-velocity.x*hit.normal1.x-velocity.z*hit.normal1.z);if(b.soft&&v>.1)soft=true;else if(v>speed){speed=v;normal={x:hit.normal1.x,z:hit.normal1.z};}}
    const move=a.controller.computedMovement();if(vertical){a.y=Math.max(0,a.y+move.y);if(a.y<=.001){a.y=0;a.vy=0;a.grounded=true;}}a.position.x+=move.x;a.position.z+=move.z;a.collider.setTranslation({x:a.position.x,y:a.y+a.height/2,z:a.position.z});
    return {speed,soft,normal,actual:{x:move.x/dt,z:move.z/dt}};
  }
  step(){this.world.step();}
}
export async function initializePhysics(){await RAPIER.init();return new Physics();}
