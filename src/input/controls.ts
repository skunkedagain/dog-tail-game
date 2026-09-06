import { clamp } from '../config/balance';
export type Settings={sensitivity:number;fov:number;bob:boolean;sound:boolean;invert:boolean;shadows:boolean};
export class Controls {
  keys=new Set<string>();edges=new Set<string>();yaw=0;pitch=0;active=false;dragging=false;
  onPause=()=>{};
  constructor(readonly canvas:HTMLCanvasElement,readonly settings:Settings){
    addEventListener('keydown',e=>{if(e.target instanceof HTMLInputElement)return;
      if(e.code==='Escape'){this.onPause();return;}if(!this.active)return;
      if(['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Space','Tab'].includes(e.code))e.preventDefault();
      if(!e.repeat)this.edges.add(e.code);this.keys.add(e.code);
    });
    addEventListener('keyup',e=>this.keys.delete(e.code));
    canvas.addEventListener('pointerdown',e=>{if(!this.active)return;if(e.button===0)this.edges.add('Grab');if(e.button===2)this.dragging=true;});
    addEventListener('pointerup',()=>this.dragging=false);
    canvas.addEventListener('contextmenu',e=>e.preventDefault());
    addEventListener('mousemove',e=>{if(!this.active||(!this.locked&&!this.dragging))return;this.yaw-=e.movementX*.002*this.settings.sensitivity;this.pitch=clamp(this.pitch-e.movementY*.002*this.settings.sensitivity*(this.settings.invert?-1:1),-1.05,1.05);});
    document.addEventListener('pointerlockchange',()=>{if(!this.locked&&this.active)this.onPause();});
    document.addEventListener('visibilitychange',()=>{if(document.hidden)this.onPause();});addEventListener('blur',()=>this.onPause());
  }
  get locked(){return document.pointerLockElement===this.canvas;}
  async lock(){try{await this.canvas.requestPointerLock();}catch{/* Arrow keys and right-drag remain available. */}}
  unlock(){if(this.locked)document.exitPointerLock();}
  reset(){this.keys.clear();this.edges.clear();this.dragging=false;}
  take(...codes:string[]){let found=false;for(const c of codes)if(this.edges.delete(c))found=true;return found;}
  look(dt:number){const horizontal=Number(this.keys.has('ArrowLeft'))-Number(this.keys.has('ArrowRight'));const vertical=Number(this.keys.has('ArrowUp'))-Number(this.keys.has('ArrowDown'));this.yaw+=horizontal*1.8*dt;this.pitch=clamp(this.pitch+vertical*1.35*dt,-1.05,1.05);}
}
