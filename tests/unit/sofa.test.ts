import { it,expect } from 'vitest';
import * as THREE from 'three';
import { sofa,furniture } from '../../src/levels/room';

it('builds the sectional and armchair without intersecting upholstery boxes',()=>{
  const root=new THREE.Group();
  furniture.filter(b=>b.name==='Sofa'||b.name==='Armchair').forEach(b=>sofa(root,b));
  root.updateMatrixWorld(true);
  const parts:THREE.Box3[]=[];
  root.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.computeBoundingBox();parts.push(object.geometry.boundingBox!.clone().applyMatrix4(object.matrixWorld));}});
  expect(parts.length).toBeGreaterThan(15);
  for(let a=0;a<parts.length;a++)for(let b=a+1;b<parts.length;b++){
    const intersection=parts[a].clone().intersect(parts[b]);
    const size=intersection.getSize(new THREE.Vector3());
    expect(Math.max(0,size.x)*Math.max(0,size.y)*Math.max(0,size.z)).toBeLessThan(1e-9);
  }
});
