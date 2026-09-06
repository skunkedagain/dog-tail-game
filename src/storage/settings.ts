import { clamp } from '../config/balance';
import type { Settings } from '../input/controls';
import { touchDevice } from '../input/touch';
export const STORAGE='dog-tail-game-v1';
export function readStorage():{best:number;settings:Settings}{
  const mobile=touchDevice();
  const defaults:Settings={sensitivity:1,fov:75,bob:!mobile,sound:true,invert:false,shadows:!mobile,touch:mobile};
  try{const data=JSON.parse(localStorage.getItem(STORAGE)||'{}');const s=data.settings||{};for(const k of ['bob','sound','invert','shadows','touch'] as const)if(typeof s[k]==='boolean')defaults[k]=s[k];if(Number.isFinite(s.sensitivity))defaults.sensitivity=clamp(s.sensitivity,.3,2);if(Number.isFinite(s.fov))defaults.fov=clamp(s.fov,60,90);return {best:Number.isFinite(data.best)?Math.max(0,data.best):0,settings:defaults};}catch{return {best:0,settings:defaults};}
}
export function saveStorage(best:number,settings:Settings){try{localStorage.setItem(STORAGE,JSON.stringify({best,settings}));}catch{/* Personal records are optional. */}}
