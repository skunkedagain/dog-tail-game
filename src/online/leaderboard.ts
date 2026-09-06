import type { RoundState } from '../rules/round';

type Entry={id:string;player_name:string;score:number;catches:number;input_mode:string};
type Session={token:Promise<{runId:string|null;error?:string}>;saved:boolean;posting:boolean};
const unavailable='Online scores are unavailable. Your personal best is still saved on this device.';
async function api(body?:object){
  let response:Response;
  try{response=await fetch('/api/leaderboard',{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});}catch{throw new Error(unavailable);}
  const data=await response.json().catch(()=>({error:unavailable}));
  if(!response.ok||data.error)throw new Error(data.error||unavailable);
  return data;
}

export class Leaderboard {
  session:Session|null=null;
  startRound(){
    this.session={saved:false,posting:false,token:api({action:'start'}).then(data=>({runId:data.runId as string})).catch(error=>({runId:null,error:error.message}))};
  }
  mountScores(host:HTMLElement){
    host.innerHTML='<p class="online-status" role="status">Fetching the top 20…</p>';
    void api().then(data=>{
      if(!host.isConnected)return;
      const scores=data.scores as Entry[];
      if(!Array.isArray(scores))throw new Error(unavailable);
      host.replaceChildren();
      if(!scores.length){host.textContent='No scores yet. Be the first to leave your paw print!';return;}
      const list=document.createElement('ol');list.className='leaderboard-list';
      scores.slice(0,20).forEach((entry,index)=>{
        const item=document.createElement('li');
        const rank=document.createElement('span');rank.className='rank';rank.textContent=String(index+1).padStart(2,'0');
        const name=document.createElement('span');name.className='player-name';name.textContent=entry.player_name;
        const detail=document.createElement('small');detail.textContent=`${entry.catches} catches · ${entry.input_mode==='touch'?'Touch':'Keyboard'}`;name.append(detail);
        const score=document.createElement('strong');score.textContent=entry.score.toLocaleString();item.append(rank,name,score);list.append(item);
      });host.append(list);
    }).catch(error=>{
      if(!host.isConnected)return;host.replaceChildren();const message=document.createElement('p');message.className='online-status';message.setAttribute('role','status');message.textContent=error.message;
      const retry=document.createElement('button');retry.className='text-button';retry.textContent='Try again';retry.onclick=()=>this.mountScores(host);host.append(message,retry);
    });
  }
  mountSubmission(host:HTMLElement,s:RoundState,input:'touch'|'keyboard'){
    const session=this.session;if(!session)return;
    host.innerHTML='<form class="score-form"><label for="player-name">Leave your name on the leaderboard</label><div class="score-form-row"><input id="player-name" name="name" placeholder="Your nickname" minlength="2" maxlength="20" autocomplete="nickname" enterkeyhint="done" required /><button class="primary" type="submit" disabled>Post score</button></div><small>Your nickname and score will be public.</small><p class="online-status" role="status">Checking online scores…</p></form>';
    const form=host.querySelector('form')!,field=host.querySelector('input')!,button=host.querySelector('button')!,status=host.querySelector<HTMLElement>('[role=status]')!;
    try{field.value=localStorage.getItem('dog-tail-nickname')||'';}catch{/* Storage is optional. */}
    const update=()=>{if(session.saved){button.disabled=true;button.textContent='Score posted ✓';status.textContent='Your score is on the leaderboard.';field.disabled=true;return true;}return false;};
    if(update())return;
    void session.token.then(result=>{if(!host.isConnected||update())return;button.disabled=!result.runId||session.posting;status.textContent=result.runId?'':result.error||unavailable;});
    form.onsubmit=async e=>{
      e.preventDefault();if(session.saved||session.posting)return;
      session.posting=true;button.disabled=true;status.textContent='Posting your score…';
      try{
        const {runId,error}=await session.token;if(!runId)throw new Error(error||unavailable);
        await api({action:'submit',runId,name:field.value,score:s.score,catches:s.catches,duration:Math.min(180,Math.round(s.time*1000)/1000),reason:s.ended,input});
        session.saved=true;try{localStorage.setItem('dog-tail-nickname',field.value.trim());}catch{/* Storage is optional. */}
        if(host.isConnected)update();
      }catch(error){if(host.isConnected){status.textContent=error instanceof Error?error.message:unavailable;button.disabled=false;}}
      finally{session.posting=false;}
    };
  }
}
