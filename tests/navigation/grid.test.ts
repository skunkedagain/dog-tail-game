import { describe,it,expect } from 'vitest';
import { Navigation,segmentHits } from '../../src/navigation/grid';
import { blockers,furniture } from '../../src/levels/room';
const nav=new Navigation(blockers);
describe('room navigation',()=>{
  it('finds routes through every designed loop and pickup position',()=>{const points=[{x:1.8,z:3.2},{x:-5.25,z:1.8},{x:2.8,z:-3.95},{x:2.6,z:2.8},{x:4.1,z:.7}];for(const a of points)for(const b of points){expect(nav.isClear(a)).toBe(true);const path=nav.path(a,b);expect(path.length).toBeGreaterThan(0);let p=a;for(const step of path){expect(nav.lineClear(p,step)).toBe(true);p=step;}}});
  it('routes around the coffee table rather than through it',()=>{const a={x:-.5,z:1.7},b={x:-.5,z:-1.3};expect(nav.lineClear(a,b)).toBe(false);const path=nav.path(a,b);expect(path.length).toBeGreaterThan(1);});
  it('never cuts a diagonal corner between blocked neighbors',()=>{for(let i=0;i<nav.cells.length;i++)if(nav.cells[i])for(const n of nav.neighbors(i)){const dx=n%nav.cols-i%nav.cols,dz=Math.floor(n/nav.cols)-Math.floor(i/nav.cols);if(dx&&dz){expect(nav.cells[Math.floor(i/nav.cols)*nav.cols+n%nav.cols]).toBe(1);expect(nav.cells[Math.floor(n/nav.cols)*nav.cols+i%nav.cols]).toBe(1);}}});
  it('detects reach occlusion at table, wall and inside a blocker',()=>{const table=furniture.find(b=>b.name==='Coffee table')!;expect(segmentHits({x:-.5,z:1.2},{x:-.5,z:-1},table)).toBe(true);expect(segmentHits({x:2,z:1.2},{x:2,z:-1},table)).toBe(false);expect(segmentHits({x:-.5,z:0},{x:-.5,z:0},table)).toBe(true);});
});
