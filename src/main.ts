import { Game } from './game/Game';
import '@fontsource/dm-sans/latin-400.css';
import '@fontsource/dm-sans/latin-500.css';
import '@fontsource/dm-sans/latin-600.css';
import '@fontsource/dm-sans/latin-700.css';
import '@fontsource/fraunces/latin-500.css';
import '@fontsource/fraunces/latin-600.css';
import './ui/style.css';
import './ui/mobile.css';
import './ui/leaderboard.css';
const app=document.querySelector<HTMLDivElement>('#app')!;
try {
  const game=new Game(app);
  void game.init().catch(error=>{
    console.error('Game initialization failed',error);
    game.ui.menu.innerHTML='<div class="eyebrow">A LITTLE HOLD-UP</div><h1>The dog is<br><em>still waking up.</em></h1><p>The room could not finish loading. Please reload to try again.</p><button class="primary" id="reload">Try again ↗</button>';
    document.getElementById('reload')!.onclick=()=>location.reload();
  });
} catch(error) {
  console.error('Renderer initialization failed',error);
  app.innerHTML='<section class="menu"><div class="eyebrow">A LITTLE HOLD-UP</div><h1>We need a<br><em>little graphics help.</em></h1><p>This game needs WebGL 2. Try Safari on a recent iPhone or iPad, or a desktop browser with hardware acceleration turned on.</p><button class="primary" onclick="location.reload()">Try again ↗</button></section>';
}
