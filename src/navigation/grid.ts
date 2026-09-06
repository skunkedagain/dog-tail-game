import { distance, type V2 } from '../config/balance';
import type { Blocker } from '../levels/room';
// Both path smoothing and reach occlusion use authored collision geometry.
export function segmentHits(a:V2,b:V2,box:Blocker,margin=0):boolean {
  let lo=0,hi=1;
  for(const axis of ['x','z'] as const){const extent=(axis==='x'?box.w:box.d)/2+margin;const min=box[axis]-extent,max=box[axis]+extent;const delta=b[axis]-a[axis];
    if(Math.abs(delta)<1e-8){if(a[axis]<min||a[axis]>max)return false;}
    else{let t1=(min-a[axis])/delta,t2=(max-a[axis])/delta;if(t1>t2)[t1,t2]=[t2,t1];lo=Math.max(lo,t1);hi=Math.min(hi,t2);if(lo>hi)return false;}
  }return true;
}
export class Navigation {
  readonly cell=.25;readonly cols=48;readonly rows=36;
  readonly cells=new Uint8Array(this.cols*this.rows);
  readonly free:V2[]=[];
  constructor(readonly obstacles:Blocker[],readonly radius=.31){
    for(let id=0;id<this.cells.length;id++){const p=this.point(id);this.cells[id]=this.isClear(p)?1:0;if(this.cells[id])this.free.push(p);}
  }
  isClear(p:V2){return Math.abs(p.x)<6-this.radius&&Math.abs(p.z)<4.5-this.radius&&!this.obstacles.some(b=>Math.abs(p.x-b.x)<b.w/2+this.radius&&Math.abs(p.z-b.z)<b.d/2+this.radius);}
  lineClear(a:V2,b:V2,margin=this.radius){return !this.obstacles.some(o=>segmentHits(a,b,o,margin));}
  point(id:number):V2{return {x:(id%this.cols+.5)*this.cell-6,z:(Math.floor(id/this.cols)+.5)*this.cell-4.5};}
  id(p:V2){return Math.max(0,Math.min(this.cols-1,Math.floor((p.x+6)/this.cell)))+Math.max(0,Math.min(this.rows-1,Math.floor((p.z+4.5)/this.cell)))*this.cols;}
  nearest(p:V2):V2 {if(this.cells[this.id(p)])return this.point(this.id(p));let best=this.free[0],d=Infinity;for(const q of this.free){const n=distance(p,q);if(n<d){d=n;best=q;}}return {...best};}
  neighbors(id:number){const out:number[]=[];const x=id%this.cols,z=Math.floor(id/this.cols);for(let dx=-1;dx<=1;dx++)for(let dz=-1;dz<=1;dz++){
    if(!dx&&!dz)continue;const nx=x+dx,nz=z+dz;if(nx<0||nx>=this.cols||nz<0||nz>=this.rows)continue;const n=nz*this.cols+nx;if(!this.cells[n])continue;
    if(dx&&dz&&(!this.cells[z*this.cols+nx]||!this.cells[nz*this.cols+x]))continue;out.push(n);
  }return out;}
  path(from:V2,to:V2):V2[]{
    if(!this.isClear(to))to=this.nearest(to);
    if(this.lineClear(from,to))return [{...to}];
    const start=this.id(this.nearest(from)),goal=this.id(this.nearest(to));
    const open=[start],closed=new Uint8Array(this.cells.length),g=new Float32Array(this.cells.length).fill(Infinity),f=new Float32Array(this.cells.length).fill(Infinity),prev=new Int32Array(this.cells.length).fill(-1);g[start]=0;f[start]=distance(this.point(start),this.point(goal));
    while(open.length){let bi=0;for(let i=1;i<open.length;i++)if(f[open[i]]<f[open[bi]])bi=i;const current=open.splice(bi,1)[0];if(current===goal){const path:V2[]=[];let p=goal;while(p!==start){path.unshift(this.point(p));p=prev[p];if(p<0)return [];}
        const smooth:V2[]=[];let origin=from;for(let i=0;i<path.length;i++){if(i+1<path.length&&this.lineClear(origin,path[i+1]))continue;smooth.push(path[i]);origin=path[i];}return smooth;
      }closed[current]=1;
      for(const n of this.neighbors(current)){if(closed[n])continue;const next=g[current]+distance(this.point(current),this.point(n));if(next<g[n]){prev[n]=current;g[n]=next;f[n]=next+distance(this.point(n),this.point(goal));if(!open.includes(n))open.push(n);}}
    }return [];
  }
}
