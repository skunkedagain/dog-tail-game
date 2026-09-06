import * as THREE from 'three';
import { ball, box, material } from '../levels/room';
export class DogModel {
  root = new THREE.Group();
  body = new THREE.Group();
  head = new THREE.Group();
  tail = new THREE.Group();
  legs: THREE.Group[] = [];
  ears: THREE.Mesh[] = [];
  shadow:THREE.Mesh;
  sparkles = new THREE.Group();
  constructor(scene:THREE.Scene) {
    scene.add(this.root);this.root.add(this.body);
    ball(this.body,.34,0,.55,0,'#c98b46',[.82,.83,1.5]);
    ball(this.body,.25,0,.57,-.32,'#dea65b',[1,1.1,1]);
    this.head.position.set(0,.78,-.43);this.body.add(this.head);
    ball(this.head,.255,0,.03,0,'#dca154',[1,1.05,.95]);
    ball(this.head,.175,0,-.07,-.2,'#f1c982',[.9,.7,1.2]);
    ball(this.head,.075,0,-.04,-.355,'#333d3b',[1,.72,.6]);
    for(const s of [-1,1]) {
      ball(this.head,.071,s*.153,.08,-.161,'#fff2d5');
      ball(this.head,.039,s*.159,.084,-.22,'#243638');
      ball(this.head,.011,s*.15,.098,-.252,'#ffffff');
      const ear=ball(this.head,.15,s*.25,-.02,.015,'#976135',[.55,1.8,.95]);ear.rotation.z=-s*.18;this.ears.push(ear);
      const brow=box(this.head,.1,.028,.03,s*.15,.179,-.17,'#956132');brow.rotation.z=-s*.15;
    }
    const collar=new THREE.Mesh(new THREE.CylinderGeometry(.215,.215,.095,12),material('#367575'));collar.position.set(0,.62,-.36);collar.rotation.x=Math.PI/2;this.body.add(collar);
    ball(this.body,.05,0,.435,-.39,'#e7bb51',[.8,1,.35]);
    for(const x of [-.19,.19]) for(const z of [-.29,.29]) {
      const leg=new THREE.Group();leg.position.set(x,.44,z);this.body.add(leg);
      ball(leg,.087,0,-.13,0,'#ba7b3d',[.85,2,.85]);ball(leg,.105,0,-.36,-.025,'#e1b472',[1,.63,1.3]);this.legs.push(leg);
    }
    this.tail.position.set(0,.64,.4);this.body.add(this.tail);
    const tail=new THREE.Mesh(new THREE.CapsuleGeometry(.065,.35,3,8),material('#dca151'));tail.position.set(0,.12,.17);tail.rotation.x=.92;tail.castShadow=true;this.tail.add(tail);
    ball(this.tail,.085,0,.26,.35,'#f4d596',[.8,1,1.15]);
    this.tail.add(this.sparkles);
    for(let i=0;i<3;i++){const sparkle=new THREE.Mesh(new THREE.OctahedronGeometry(.035),new THREE.MeshBasicMaterial({color:'#ffe08a'}));sparkle.position.set(Math.sin(i*2.1)*.18,.25+Math.cos(i*2.1)*.16,.3);this.sparkles.add(sparkle);}
    // Soft grounding shadow stays readable even with real-time shadows disabled.
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(.51,24),new THREE.MeshBasicMaterial({color:'#5c503c',transparent:true,opacity:.14,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=.035;shadow.scale.set(.8,1.4,1);this.root.add(shadow);this.shadow=shadow;
  }
  animate(time:number,speed:number,anger:number,eating=false,immune=false,airborne=false) {
    this.shadow.visible=!airborne;
    this.legs.forEach((l,i)=>l.rotation.x=airborne?(i%2===0?-.5:.65):Math.sin(time*(speed>3?18:12)+(i===0||i===3?0:Math.PI))*Math.min(speed*.16,.65));
    this.body.position.y=airborne?0:Math.abs(Math.sin(time*12))*.024*Math.min(speed,2);
    this.tail.rotation.z=Math.sin(time*(anger>74?14:8))*.5;
    this.head.rotation.x=eating?.64:Math.sin(time*1.5)*.05;
    this.head.rotation.y=eating?0:Math.sin(time*.75)*.12;
    this.ears.forEach((e,i)=>e.rotation.x=Math.sin(time*12+i)*.11*Math.min(speed,2));
    this.tail.scale.setScalar(immune?1+Math.sin(time*15)*.06:1);
    this.sparkles.visible=immune;this.sparkles.rotation.z=time*2;
  }
}
