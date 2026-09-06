import { clamp } from '../config/balance';
import type { Controls } from './controls';

// Safari can cancel a contact during a viewport change before capture is acquired.
const capture=(element:HTMLElement,id:number)=>{try{element.setPointerCapture(id);}catch{/* Document listeners still release the contact. */}};
export const touchDevice=()=>navigator.maxTouchPoints>0||matchMedia('(pointer: coarse)').matches;
export class TouchControls {
  move={x:0,z:0};sprinting=false;
  private stickId:number|null=null;private lookId:number|null=null;private lookX=0;private lookY=0;
  private tapX=0;private tapY=0;private tapStarted=0;private swiped=false;
  private buttons=new Map<number,HTMLElement>();
  readonly root:HTMLElement;readonly stick:HTMLElement;readonly thumb:HTMLElement;
  constructor(readonly controls:Controls){
    this.root=document.getElementById('touch-controls')!;this.stick=document.getElementById('move-stick')!;this.thumb=document.getElementById('move-thumb')!;
    const enabled=()=>controls.active&&controls.settings.touch;
    const move=(e:PointerEvent)=>{
      const r=this.stick.getBoundingClientRect(),radius=r.width*.34;
      const dx=(e.clientX-r.left-r.width/2)/radius,dz=(e.clientY-r.top-r.height/2)/radius,length=Math.hypot(dx,dz);
      const strength=clamp((length-.12)/.88,0,1);
      this.move={x:length?dx/length*strength:0,z:length?dz/length*strength:0};this.sprinting=length>.92;
      this.thumb.style.transform=`translate(${this.move.x*radius}px,${this.move.z*radius}px)`;this.stick.classList.toggle('sprinting',this.sprinting);
    };
    this.stick.addEventListener('pointerdown',e=>{if(!enabled()||this.stickId!==null)return;e.preventDefault();this.stickId=e.pointerId;capture(this.stick,e.pointerId);move(e);});
    document.addEventListener('pointermove',e=>{if(e.pointerId===this.stickId&&enabled()){e.preventDefault();move(e);}});
    const releaseStick=(e:PointerEvent)=>{if(e.pointerId===this.stickId){this.stickId=null;this.move={x:0,z:0};this.sprinting=false;this.thumb.style.transform='';this.stick.classList.remove('sprinting');}};
    for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,releaseStick as EventListener);
    const canvas=controls.canvas;
    canvas.addEventListener('pointerdown',e=>{
      if(!enabled()||e.pointerType==='mouse'||this.lookId!==null)return;e.preventDefault();this.lookId=e.pointerId;this.lookX=e.clientX;this.lookY=e.clientY;
      this.tapX=e.clientX;this.tapY=e.clientY;this.tapStarted=e.timeStamp;this.swiped=false;capture(canvas,e.pointerId);
    });
    document.addEventListener('pointermove',e=>{
      if(!enabled()||e.pointerId!==this.lookId)return;e.preventDefault();
      if(Math.hypot(e.clientX-this.tapX,e.clientY-this.tapY)>10)this.swiped=true;
      const scale=3/Math.min(innerWidth,innerHeight)*controls.settings.sensitivity;
      controls.yaw-=(e.clientX-this.lookX)*scale;
      controls.pitch=clamp(controls.pitch-(e.clientY-this.lookY)*scale*(controls.settings.invert?-1:1),-1.05,1.05);
      this.lookX=e.clientX;this.lookY=e.clientY;
    });
    const releaseLook=(e:PointerEvent)=>{
      if(e.pointerId!==this.lookId)return;this.lookId=null;
      // Grab on a short tap, never on a swipe, hold, or cancelled contact.
      if(e.type==='pointerup'&&enabled()&&!this.swiped&&e.timeStamp-this.tapStarted<=300&&Math.hypot(e.clientX-this.tapX,e.clientY-this.tapY)<=10)controls.edges.add('Grab');
    };
    for(const event of ['pointerup','pointercancel','lostpointercapture'])document.addEventListener(event,releaseLook as EventListener);
    this.root.querySelectorAll<HTMLElement>('[data-action]').forEach(button=>{
      button.addEventListener('pointerdown',e=>{if(!enabled())return;e.preventDefault();capture(button,e.pointerId);this.buttons.set(e.pointerId,button);button.classList.add('pressed');controls.edges.add(button.dataset.action!);});
      const release=(e:PointerEvent)=>{this.buttons.delete(e.pointerId);if(![...this.buttons.values()].includes(button))button.classList.remove('pressed');};
      for(const event of ['pointerup','pointercancel','lostpointercapture'])button.addEventListener(event,release as EventListener);
      // Keyboard/assistive-technology activation still works; touch already fires on pointerdown.
      button.addEventListener('click',e=>{if(e.detail===0&&enabled())controls.edges.add(button.dataset.action!);});
    });
  }
  reset(){
    const stickId=this.stickId,lookId=this.lookId;this.stickId=null;this.lookId=null;
    if(stickId!==null&&this.stick.hasPointerCapture(stickId))this.stick.releasePointerCapture(stickId);
    if(lookId!==null&&this.controls.canvas.hasPointerCapture(lookId))this.controls.canvas.releasePointerCapture(lookId);
    for(const [id,button] of this.buttons){if(button.hasPointerCapture(id))button.releasePointerCapture(id);button.classList.remove('pressed');}this.buttons.clear();
    this.move={x:0,z:0};this.sprinting=false;this.thumb.style.transform='';this.stick.classList.remove('sprinting');
  }
}
