export const B = {
  duration: 180, step: 1 / 60,
  playerSpeed: 3.8, sprintSpeed: 5.2, acceleration: 12, braking: 16,
  sprintCapacity: 1.4, sprintRefillTime: 4, sprintRefillDelay: .75,
  eyeHeight: .72, playerRadius: .24, dogRadius: .28,
  reach: 1.05, reachAngle: Math.PI / 6, grabWindow: .18, missCooldown: .45, immunity: 2.5,
  angerPerCatch: 18, treatRelief: 32, catchesPerTreat: 3, maxTreats: 3,
  treatCooldown: 8, warningTime: 4, coolingDelay: 4, coolingRate: 2,
  fallTime: 2.2, stumbleTime: .8, healAmount: 30, comboTime: 12,
} as const;
export type V2 = { x: number; z: number };
export const distance = (a: V2, b: V2) => Math.hypot(a.x-b.x,a.z-b.z);
export const clamp = (v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));
export const toward = (value:number,target:number,max:number)=>value+clamp(target-value,-max,max);
export function direction(a:V2,b:V2):V2 {const d=distance(a,b)||1;return {x:(b.x-a.x)/d,z:(b.z-a.z)/d};}
export function seededRandom(seed:number) {return ()=>{seed|=0;seed=seed+0x6d2b79f5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return ((t^t>>>14)>>>0)/4294967296;};}
