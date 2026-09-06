import { B, distance, type V2 } from '../config/balance';
import { Navigation, segmentHits } from '../navigation/grid';

// Check the whole flight, including takeoff clearance and a floor landing.
export function escapeJump(nav:Navigation,from:V2,threat:V2):V2|null {
  const duration=2*B.jumpSpeed/B.gravity,range=duration*B.dogJumpSpeed;
  const away=Math.atan2(from.z-threat.z,from.x-threat.x);
  let best:V2|null=null,score=distance(from,threat)+.7;
  for(let i=0;i<16;i++){
    const angle=away+i*Math.PI/8,dir={x:Math.cos(angle),z:Math.sin(angle)};
    const to={x:from.x+dir.x*range,z:from.z+dir.z*range};
    if(!nav.isClear(to)||distance(to,threat)<=score)continue;
    if(!nav.obstacles.some(b=>b.h<2&&segmentHits(from,to,b,B.dogRadius)))continue;
    let clear=true;
    for(let n=0;n<=60&&clear;n++){
      const t=duration*n/60,p={x:from.x+dir.x*B.dogJumpSpeed*t,z:from.z+dir.z*B.dogJumpSpeed*t};
      // Extra height allowance covers discrete gravity and collider clearance.
      const y=B.jumpSpeed*t-B.gravity*t*t/2;
      clear=!nav.obstacles.some(b=>y<b.h+.12&&segmentHits(p,p,b,B.dogRadius+.04));
    }
    if(clear){best=dir;score=distance(to,threat);}
  }
  return best;
}
