import * as THREE from 'three';
import { ball, box, material } from '../levels/room';
import { distance,type V2 } from '../config/balance';
import type { PickupKind } from '../rules/round';
export const pickupNames:Record<PickupKind,string>={juice:'Juice box',stuffie:'Teddy shield',toy:'Squeaky toy'};
export class Pickups {
  items:{kind:PickupKind;position:V2;mesh:THREE.Group}[]=[];
  slots:V2[]=[{x:-5.25,z:1.8},{x:2.8,z:-3.95},{x:2.6,z:2.8},{x:4.1,z:.7}];
  timer=0;next=0;
  constructor(readonly scene:THREE.Scene){}
  reset(){this.items.forEach(i=>this.remove(i));this.items=[];this.timer=0;this.next=0;this.spawn(0,'juice');this.spawn(1,'stuffie');}
  remove(i:{mesh:THREE.Group}){this.scene.remove(i.mesh);i.mesh.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});}
  spawn(slot:number,kind:PickupKind){const g=new THREE.Group(),p=this.slots[slot];g.position.set(p.x,.28,p.z);this.scene.add(g);
    if(kind==='juice'){box(g,.18,.28,.15,0,0,0,'#e7a652');box(g,.186,.13,.156,0,-.015,0,'#fff1c9');const straw=box(g,.025,.17,.025,.035,.19,0,'#edf3df');straw.rotation.z=-.2;}
    else if(kind==='stuffie'){ball(g,.13,0,0,0,'#b88d5e',[1,1.2,.8]);ball(g,.11,0,.18,0,'#d3ab75');for(const s of [-1,1]){ball(g,.045,s*.09,.25,0,'#b88d5e');ball(g,.052,s*.14,.025,0,'#b88d5e');ball(g,.045,s*.07,-.14,0,'#b88d5e');ball(g,.013,s*.04,.195,.1,'#263e3f');}ball(g,.026,0,.155,.108,'#735138');}
    else{ball(g,.135,0,0,0,'#d57350');const band=new THREE.Mesh(new THREE.TorusGeometry(.13,.025,6,12),material('#efd992'));g.add(band);}
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.3,.015,5,24),material(kind==='juice'?'#f0c872':kind==='stuffie'?'#9fc9be':'#d79177'));ring.rotation.x=Math.PI/2;ring.position.y=-.25;g.add(ring);
    this.items.push({kind,position:p,mesh:g});
  }
  update(dt:number,time:number,player:V2,dog:V2){this.timer+=dt;for(const i of this.items){i.mesh.position.y=.32+Math.sin(time*2.4+i.position.x)*.055;i.mesh.rotation.y=time*.65;}
    if(this.timer>=25){this.timer=0;if(this.items.length>=3)return;const slot=this.slots.findIndex(p=>!this.items.some(i=>i.position===p)&&distance(player,p)>1.5&&distance(dog,p)>1.5);if(slot>=0){const kinds:PickupKind[]=['toy','juice','stuffie'];this.spawn(slot,kinds[this.next++%3]);}}
  }
  collect(player:V2,occupied:boolean,swap:boolean){if(occupied&&!swap)return null;const index=this.items.findIndex(i=>distance(i.position,player)<.65);if(index<0)return null;const item=this.items.splice(index,1)[0];this.remove(item);return item.kind;}
  nearby(player:V2){return this.items.find(i=>distance(i.position,player)<.65);}
}
