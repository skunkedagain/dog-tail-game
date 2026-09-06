export class Sound {
  context:AudioContext|null=null;enabled=true;
  unlock(){try{this.context??=new AudioContext();void this.context.resume().catch(()=>{});}catch{/* Silent play remains available. */}}
  tone(freq:number,duration:number,type:OscillatorType='sine',volume=.055,delay=0,slide=1){
    if(!this.enabled||!this.context||this.context.state!=='running')return;
    const c=this.context,t=c.currentTime+delay,o=c.createOscillator(),g=c.createGain();o.type=type;o.frequency.setValueAtTime(freq,t);o.frequency.exponentialRampToValueAtTime(Math.max(20,freq*slide),t+duration);
    g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(volume,t+.012);g.gain.exponentialRampToValueAtTime(.0001,t+duration);o.connect(g);g.connect(c.destination);o.start(t);o.stop(t+duration+.02);o.onended=()=>{o.disconnect();g.disconnect();};
  }
  catch(){this.tone(530,.13,'sine',.07);this.tone(790,.22,'sine',.055,.08);}
  bump(){this.tone(110,.16,'triangle',.07,0,.4);}
  soft(){this.tone(150,.12,'sine',.025,0,.6);}
  bark(){this.tone(200,.14,'triangle',.045,0,.5);this.tone(240,.1,'triangle',.035,.17,.45);}
  treat(){[440,554,660].forEach((f,i)=>this.tone(f,.18,'sine',.04,i*.08));}
  step(sprint:boolean){this.tone(sprint?170:140,.055,'sine',.014,0,.65);}
  end(){[660,554,440].forEach((f,i)=>this.tone(f,.35,'triangle',.04,i*.14));}
  pause(){void this.context?.suspend().catch(()=>{});}
}
