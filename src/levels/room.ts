import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

export interface Blocker { x: number; z: number; w: number; d: number; h: number; soft?: boolean; name: string }
export const ROOM = { w: 12, d: 9 };
export const furniture: Blocker[] = [
  { x: -3.8, z: -.125, w: 1.35, d: 3.55, h: .96, soft: true, name: 'Sofa' },
  { x: -1.7, z: -2.55, w: 5.5, d: 1.25, h: .96, soft: true, name: 'Sofa' },
  { x: -.5, z: .15, w: 2.3, d: 1.4, h: .66, name: 'Coffee table' },
  { x: 3.6, z: -2.85, w: 2.35, d: .85, h: .92, name: 'Window table' },
  { x: 4.35, z: 2.55, w: 1.3, d: 1.3, h: .94, soft: true, name: 'Armchair' },
  { x: -2.4, z: 2.55, w: .85, d: .85, h: .4, soft: true, name: 'Ottoman' },
  { x: 5.67, z: -.2, w: .66, d: 2.6, h: 1.15, name: 'Hearth' },
  { x: -5.65, z: -3.85, w: .7, d: .7, h: .72, name: 'Plant pot' },
];
export const walls: Blocker[] = [
  { x: -6.1, z: 0, w: .2, d: 9.4, h: 4, name: 'Wall' },
  { x: 6.1, z: 0, w: .2, d: 9.4, h: 4, name: 'Wall' },
  { x: 0, z: -4.6, w: 12, d: .2, h: 4, name: 'Wall' },
  { x: 0, z: 4.6, w: 12, d: .2, h: 4, name: 'Wall' },
];
export const blockers = [...furniture, ...walls];
const matCache = new Map<string, THREE.MeshStandardMaterial>();
export function material(color: string, roughness = .83) {
  const key = color + roughness;
  if (!matCache.has(key)) matCache.set(key, new THREE.MeshStandardMaterial({ color, roughness }));
  return matCache.get(key)!;
}
export function box(parent: THREE.Object3D, w: number, h: number, d: number, x: number, y: number, z: number, color: string) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material(color));
  mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
}
export function ball(parent: THREE.Object3D, r: number, x: number, y: number, z: number, color: string, scale?: [number, number, number]) {
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 8), material(color));
  mesh.position.set(x, y, z); if (scale) mesh.scale.set(...scale); mesh.castShadow = true; parent.add(mesh); return mesh;
}
function cylinder(parent: THREE.Object3D, rt: number, rb: number, h: number, x: number, y: number, z: number, color: string) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, 12), material(color)); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true; parent.add(m); return m;
}
function plant(parent: THREE.Object3D, x: number, y: number, z: number, size = 1) {
  const g = new THREE.Group(); g.position.set(x,y,z); g.scale.setScalar(size); parent.add(g);
  cylinder(g,.24,.18,.38,0,.19,0,'#d59368'); cylinder(g,.23,.23,.035,0,.38,0,'#755344');
  for(let i=0;i<7;i++) { const a=i*2.4; const leaf=ball(g,.22,Math.sin(a)*.21,.66+(i%3)*.12,Math.cos(a)*.21,i%2?'#628e66':'#3c7658',[.48,1.9,.9]); leaf.rotation.z=Math.sin(a)*.5; }
}
function lamp(parent: THREE.Object3D, x:number,y:number,z:number) {
  cylinder(parent,.11,.15,.1,x,y+.05,z,'#315458'); cylinder(parent,.035,.035,.4,x,y+.3,z,'#ba965a'); cylinder(parent,.19,.33,.36,x,y+.61,z,'#f5e2b8');
}
export function sofa(parent:THREE.Object3D,b:Blocker) {
  // Separate upholstery volumes instead of stacking intersecting full-size boxes.
  // Coplanar side faces previously competed in the depth buffer along every seam.
  const horizontal=b.w>=b.d;
  const width=horizontal?b.w:b.d, depth=horizontal?b.d:b.w;
  const group=new THREE.Group();group.position.set(b.x,0,b.z);
  group.rotation.y=horizontal?0:Math.PI/2;parent.add(group);
  box(group,width-.06,.17,depth-.06,0,.215,0,'#b6a58b');
  box(group,width,.27,depth,0,.445,0,'#e9dfc7');
  const backDepth=.22, armWidth=.2, seam=.015;
  box(group,width,.485,backDepth,0,.8375,-depth/2+backDepth/2,'#e2d7bf');
  const frontDepth=depth-backDepth-seam;
  const frontCenter=(backDepth+seam)/2;
  for(const side of [-1,1])box(group,armWidth,.355,frontDepth,side*(width/2-armWidth/2),.7725,frontCenter,'#eee4cf');
  const seatWidth=width-2*(armWidth+seam), count=Math.max(1,Math.floor(seatWidth/.9));
  for(let i=0;i<count;i++)box(group,seatWidth/count-seam,.18,frontDepth-seam,(i+.5)*seatWidth/count-seatWidth/2,.69,frontCenter,'#f4ebd6');
}
export function makeRoom(scene:THREE.Scene) {
  scene.background = new THREE.Color('#c7dedb'); scene.fog = new THREE.Fog('#c7dedb', 18, 36);
  const g = new THREE.Group(); scene.add(g);
  box(g,12,.12,9,0,-.07,0,'#b98956');
  for(let i=0;i<24;i++) for(let j=0;j<3;j++) {
    const colors=['#c39664','#bd905e','#c99d6a','#b98b59'];
    box(g,.492,.015,2.98,-5.75+i*.5,.002,-3+j*3,colors[(i*7+j*3)%4]);
  }
  box(g,6.6,.016,5.1,-.95,.018,.25,'#d9ca9f');
  for(let i=0;i<38;i++) box(g,6.55,.002,.012,-.95,.028,-2.2+i*.13,i%3?'#cebc90':'#e8d9b3');
  box(g,6.3,.003,.025,-.95,.03,2.65,'#b9a579'); box(g,6.3,.003,.025,-.95,.03,-2.13,'#b9a579');
  for(const w of walls) {
    box(g,w.w,3.8,w.d,w.x,1.9,w.z,'#a4c8ca');
    box(g,w.w+.015,1,w.d+.015,w.x,.5,w.z,'#eee9da');
    box(g,w.w+.06,.065,w.d+.06,w.x,1.02,w.z,'#fff6df');
    box(g,w.w+.04,.12,w.d+.04,w.x,.06,w.z,'#e3d9c3');
    box(g,w.w+.08,.12,w.d+.08,w.x,3.65,w.z,'#fff3d9');
  }
  for(let x=-5.7;x<6;x+=.3) { box(g,.015,.9,.025,x,.49,-4.48,'#dbd9ca'); box(g,.015,.9,.025,x,.49,4.48,'#dbd9ca'); }
  for(let z=-4.3;z<4.5;z+=.3) {box(g,.025,.9,.015,-5.98,.49,z,'#dbd9ca');box(g,.025,.9,.015,5.98,.49,z,'#dbd9ca');}
  // The tall, divided windows and cream trim echo the reference room.
  for(const x of [-3.9,-.6,3.2]) {
    const win = box(g,2.08,2.12,.04,x,2.2,-4.47,'#c6e5e2');
    win.material = new THREE.MeshStandardMaterial({color:'#d2eddd',emissive:'#b9d9ce',emissiveIntensity:.35});
    for(let i=0;i<5;i++) ball(g,.32,x-.7+i*.35,1.43+(i%2)*.18,-4.42,i%2?'#9aba82':'#b6cd94',[1,1,.08]);
    for(const dx of [-1.08,0,1.08]) box(g,.07,2.26,.09,x+dx,2.2,-4.38,'#fff9e9');
    for(const dy of [-1.1,0,1.1]) box(g,2.23,.07,.1,x,2.2+dy,-4.38,'#fff9e9');
    box(g,2.38,.08,.23,x,1.08,-4.3,'#f5efdc');
    for(const dx of [-1.3,1.3]) box(g,.33,2.5,.15,x+dx,2,-4.24,'#d5cbb4');
  }
  furniture.filter(b=>b.name==='Sofa').forEach(b=>sofa(g,b));
  for(let i=0;i<4;i++) { const p=box(g,.64,.51,.21,-3.7+i*1.05,.98,-2.85,i%2?'#e0b36d':'#355b64');p.rotation.z=(i%2?.12:-.12); }
  const quilt=box(g,1.22,.035,.92,-2.6,.802,-2.43,'#2d535f');
  for(let i=0;i<5;i++) box(quilt,.07,.012,.9,-.5+i*.25,.02,0,'#e0e5d7');
  // Coffee table: apron and a lower shelf make its solid footprint legible.
  box(g,2.38,.12,1.48,-.5,.67,.15,'#805235');box(g,2.12,.27,1.2,-.5,.5,.15,'#946443');
  for(const dx of [-.93,.93]) for(const dz of [-.49,.49]) cylinder(g,.085,.12,.58,-.5+dx,.3,.15+dz,'#765038');
  box(g,1.9,.08,1.05,-.5,.17,.15,'#805638');
  box(g,.53,.055,.38,-.98,.762,.02,'#335a61'); const book=box(g,.42,.045,.3,-.91,.81,.05,'#d1a254');book.rotation.y=.2;
  cylinder(g,.18,.15,.1,.13,.77,.31,'#e5c693'); ball(g,.085,.12,.85,.3,'#d97943');
  plant(g,-.02,.74,-.28,.5);
  sofa(g,furniture.find(b=>b.name==='Armchair')!);
  const cushion=box(g,.68,.52,.23,4.35,.98,2.19,'#cc9652'); cushion.rotation.z=.14;
  cylinder(g,.46,.42,.38,-2.4,.2,2.55,'#c7b993');cylinder(g,.46,.46,.09,-2.4,.43,2.55,'#e8d7ac');
  box(g,2.45,.09,.94,3.6,.94,-2.85,'#775137');
  for(const x of [2.55,4.65]) for(const z of [-3.15,-2.55]) box(g,.07,.89,.07,x,.445,z,'#805c40');
  lamp(g,4.38,1,-2.85);plant(g,2.8,1,-2.85,.7);
  // White mantel, dark insert, brass log basket. No open flames in a toddler game.
  box(g,.3,1.5,2.6,5.8,.75,-.2,'#eee7d7');box(g,.32,.98,1.62,5.62,.51,-.2,'#3c4a49');
  box(g,.66,.12,2.95,5.65,1.54,-.2,'#fff2da');box(g,.9,.09,2.95,5.53,.06,-.2,'#797b6e');
  for(let i=0;i<5;i++) cylinder(g,.075,.075,.44,5.45,.15,-.65+i*.21,'#8c6945').rotation.z=Math.PI/2;
  const art=box(g,.06,.9,1.3,5.97,2.35,-.2,'#bca168');box(art,.025,.73,1.1,-.04,0,0,'#668779');
  plant(g,-5.65,0,-3.85,1.15);
  // Double doors opposite the windows, with shelves as familiar landmarks.
  for(const x of [-1.04,1.04]) {
    box(g,1.97,2.9,.06,x,1.45,4.46,'#f4edde');box(g,1.56,2.08,.06,x,1.75,4.41,'#b7cfca');
    for(let i=0;i<13;i++) box(g,1.52,.025,.035,x,.8+i*.15,4.36,'#e1e7d9');
    ball(g,.055,x+(x<0?.74:-.74),1.17,4.33,'#c0a35b');
  }
  for(const x of [-3.4,3.4]) {box(g,1.55,2.7,.18,x,1.35,4.45,'#e7dfcc');for(let i=0;i<4;i++){box(g,1.65,.07,.35,x,.43+i*.67,4.3,'#f3ebd9');for(let j=0;j<3;j++) box(g,.14,.26+(j%2)*.12,.19,x-.5+j*.2,.6+i*.67,4.24,['#466a6e','#b67e4e','#b9b993'][j]);}}
  const ambient=new THREE.HemisphereLight('#fffae8','#86785f',1.7);scene.add(ambient);
  const sun=new THREE.DirectionalLight('#fff0c8',2.5);sun.position.set(-3,8,-5);sun.castShadow=true;
  sun.shadow.mapSize.set(2048,2048);sun.shadow.camera.left=-9;sun.shadow.camera.right=9;sun.shadow.camera.top=9;sun.shadow.camera.bottom=-9;sun.shadow.normalBias=.025;sun.shadow.bias=-.00015;scene.add(sun);
  // Batch fixed furniture by material. Hundreds of trim pieces become a few draw calls.
  g.updateMatrixWorld(true);
  const batches=new Map<THREE.Material,THREE.BufferGeometry[]>();
  g.traverse(o=>{if(o instanceof THREE.Mesh&&!Array.isArray(o.material)){const list=batches.get(o.material)||[];list.push(o.geometry.clone().applyMatrix4(o.matrixWorld));batches.set(o.material,list);o.geometry.dispose();}});
  g.clear();
  for(const [mat,geometries] of batches){const merged=mergeGeometries(geometries);if(merged){const mesh=new THREE.Mesh(merged,mat);mesh.castShadow=true;mesh.receiveShadow=true;g.add(mesh);}geometries.forEach(geometry=>geometry.dispose());}
  const ceiling:THREE.Mesh=box(scene,12,.1,9,0,3.84,0,'#f0e9d7');ceiling.material=new THREE.MeshBasicMaterial({color:'#eee9db',toneMapped:false});ceiling.castShadow=false;ceiling.receiveShadow=false;
  return g;
}
