import { test,expect,type Page } from '@playwright/test';
async function boot(page:Page){await page.goto('/?debug');await expect(page.getByRole('button',{name:"Let's play"})).toBeVisible();}
async function start(page:Page){await page.evaluate(()=>{(window as any).__dogGame.start();});await expect.poll(async()=>(await snap(page)).mode,{timeout:10000}).toBe('playing');}
async function snap(page:Page){return page.evaluate(()=>(window as any).__dogGame.snapshot());}
test('C jumps only on press, clears furniture, and pause freezes flight',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:-2.4,z:3.8},{x:2,z:1});d.freezeDog();});
  await page.waitForTimeout(150);expect((await snap(page)).playerY).toBe(0);
  await page.keyboard.down('KeyC');await expect.poll(async()=>(await snap(page)).playerY).toBeGreaterThan(.5);
  await page.keyboard.press('Escape');const paused=await snap(page);await page.waitForTimeout(200);expect((await snap(page)).playerY).toBe(paused.playerY);
  await page.keyboard.up('KeyC');await page.getByRole('button',{name:'Back to mischief'}).click();
  await expect.poll(async()=>(await snap(page)).playerGrounded).toBe(true);
  await page.keyboard.down('KeyW');await page.keyboard.down('KeyC');await expect.poll(async()=>(await snap(page)).playerY).toBeGreaterThan(1);
  await page.screenshot({path:'/private/tmp/dog-tail-jump.png'});
  await page.waitForTimeout(900);await page.keyboard.up('KeyW');
  await expect.poll(async()=>(await snap(page)).playerY).toBe(0);const landed=await snap(page);expect(landed.player.z).toBeLessThan(1.9);expect(landed.hp).toBe(100);
  await page.waitForTimeout(450);expect((await snap(page)).playerY).toBe(0);await page.keyboard.up('KeyC');
  await page.keyboard.press('KeyC');await expect.poll(async()=>(await snap(page)).playerY).toBeGreaterThan(.5);
});
test('the dog jumps over furniture while escaping',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:-.5,z:3.5},{x:-.5,z:1.8});});
  await expect.poll(async()=>(await snap(page)).dogY).toBeGreaterThan(.7);
  await page.screenshot({path:'/private/tmp/dog-tail-dog-jump.png'});
  await expect.poll(async()=>(await snap(page)).dogGrounded).toBe(true);
  const s=await snap(page);expect(s.dogY).toBe(0);expect(Math.hypot(s.dog.x+.5,s.dog.z-3.5)).toBeGreaterThan(3);
});
test('jump height limits tail reach and a restart returns both actors to the floor',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:2,z:2.6},{x:2,z:1.5});d.freezeDog();});
  expect((await snap(page)).ready).toBe(true);
  await page.keyboard.press('KeyC');await expect.poll(async()=>(await snap(page)).playerY).toBeGreaterThan(1.4);
  await page.keyboard.press('Space');expect((await snap(page)).catches).toBe(0);
  await page.evaluate(()=>(window as any).__dogGame.start());
  expect(await snap(page)).toMatchObject({playerY:0,dogY:0,playerGrounded:true,dogGrounded:true});
});
test('scene loads, arrow keys look, movement works, and pause freezes clocks',async({page})=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await boot(page);await page.screenshot({path:'/private/tmp/dog-tail-menu.png'});await start(page);
  const a=await snap(page);await page.keyboard.down('ArrowRight');await page.waitForTimeout(500);await page.keyboard.up('ArrowRight');const b=await snap(page);expect(b.yaw).toBeLessThan(a.yaw-.4);
  await page.keyboard.down('ArrowUp');await page.waitForTimeout(300);await page.keyboard.up('ArrowUp');expect((await snap(page)).pitch).toBeGreaterThan(b.pitch+.2);
  await page.keyboard.down('KeyW');await page.waitForTimeout(500);await page.keyboard.up('KeyW');const c=await snap(page);expect(Math.hypot(c.player.x-b.player.x,c.player.z-b.player.z)).toBeGreaterThan(.5);
  await page.screenshot({path:'/private/tmp/dog-tail-playing.png'});await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Back to mischief'})).toBeVisible();const paused=await snap(page);await page.waitForTimeout(400);expect((await snap(page)).time).toBe(paused.time);expect(errors).toEqual([]);
});
test('a rear catch scores once, repeated catches earn a treat and eating calms anger',async({page})=>{
  await boot(page);await start(page);
  for(let i=0;i<3;i++){
    await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:2,z:2.6},{x:2,z:1.5});d.freezeDog();d.state().immunity=0;d.state().grabCooldown=0;});
    await page.keyboard.press('Space');await expect.poll(async()=>(await snap(page)).catches).toBe(i+1);
  }
  const s=await snap(page);expect(s.treats).toBe(1);expect(s.score).toBeGreaterThan(300);
  await page.keyboard.press('KeyE');await expect.poll(async()=>(await snap(page)).treats).toBe(0);
  await expect.poll(async()=>(await snap(page)).anger).toBeLessThan(30);
  expect((await snap(page)).dogState).toBe('eat');await page.keyboard.press('Space');expect((await snap(page)).catches).toBe(3);
});
test('all end states and restarts reset state',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.state().time=179.98;});await expect(page.getByRole('button',{name:'One more chase'})).toBeVisible();expect((await snap(page)).ended).toBe('time');await page.screenshot({path:'/private/tmp/dog-tail-results.png'});
  await page.evaluate(()=>(window as any).__dogGame.start());await expect(page.locator('#countdown')).toBeHidden({timeout:10000});expect(await snap(page)).toMatchObject({catches:0,score:0,anger:0,hp:100,treats:0});
  await page.evaluate(()=>{const s=(window as any).__dogGame.state();s.anger=100;s.warning=.05;});await expect(page.getByRole('heading',{name:'Time out!'})).toBeVisible();
});
test('settings persist and narrow screens keep start accessible',async({page})=>{
  await boot(page);await page.getByRole('button',{name:'Settings & controls'}).click();await page.locator('#bob').uncheck();await page.getByRole('button',{name:'All set'}).click();await page.reload();await page.getByRole('button',{name:'Settings & controls'}).click();await expect(page.locator('#bob')).not.toBeChecked();await page.getByRole('button',{name:'All set'}).click();await page.setViewportSize({width:390,height:844});await expect(page.getByRole('button',{name:"Let's play"})).toBeInViewport();await page.screenshot({path:'/private/tmp/dog-tail-narrow.png'});
});
test('optional structured tools share game state and reject invalid input',async({page})=>{
  await page.addInitScript(()=>{(window as any).__registered={};Object.defineProperty(document,'modelContext',{value:{registerTool:(tool:any)=>{(window as any).__registered[tool.name]=tool;}}});});await boot(page);
  const result=await page.evaluate(()=>{const t=(window as any).__registered.read_dog_tail_round;let rejected=false;try{t.execute({extra:true});}catch{rejected=true;}return {snapshot:t.execute({}),rejected};});expect(result.snapshot.mode).toBe('menu');expect(result.rejected).toBe(true);
  await start(page);await page.evaluate(()=>(window as any).__registered.pause_dog_tail_round.execute({}));expect((await snap(page)).mode).toBe('paused');await expect(page.getByRole('button',{name:'Back to mischief'})).toBeVisible();
});
test('wall occlusion prevents a tail grab and maximum anger is rescued by a real treat action',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:-.5,z:1.4},{x:-.5,z:-1.3});d.freezeDog();});await page.keyboard.press('Space');expect((await snap(page)).catches).toBe(0);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:2,z:2.6},{x:2,z:1.5});d.state().anger=100;d.state().warning=4;d.state().treats=1;});await page.keyboard.press('KeyE');await expect.poll(async()=>(await snap(page)).anger).toBe(68);expect((await snap(page)).ended).toBeNull();await expect(page.locator('#warning')).toBeHidden();
});
test('ten restarts do not retain effects or accumulate geometry',async({page})=>{
  await boot(page);await start(page);const initial=(await snap(page)).render.geometries;
  for(let i=0;i<10;i++){await page.evaluate(()=>{const d=(window as any).__dogGame;d.state().buff='juice';d.state().buffTime=6;d.state().pickup='toy';d.start();});await page.waitForTimeout(50);}
  const last=await snap(page);expect(last.render.geometries).toBeLessThanOrEqual(initial+3);expect(last).toMatchObject({catches:0,score:0,hp:100,treats:0});
});
test('a hard impact can end a round, while a collected juice box is a timed ability',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:-5.25,z:1.8},{x:2,z:1});d.freezeDog();});
  await expect(page.locator('#pickup')).toHaveText('Juice box');await page.keyboard.press('KeyQ');await expect(page.locator('#buff')).toContainText('Juice box');await expect(page.locator('#pickup')).toHaveText('Empty pocket');
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:4.8,z:3.9},{x:0,z:3},-Math.PI/2);d.state().hp=4;d.state().buff=null;d.state().buffTime=0;});
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');await expect(page.getByRole('heading',{name:'Nap time.'})).toBeVisible();await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');expect((await snap(page)).ended).toBe('health');
});
test('sprint impacts knock the toddler down, pause freezes recovery, and bandages restore health',async({page})=>{
  await boot(page);await start(page);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:4.8,z:3.9},{x:0,z:3},-Math.PI/2);});
  await page.keyboard.down('ShiftLeft');await page.keyboard.down('KeyW');
  await expect.poll(async()=>(await snap(page)).knockedDown).toBeGreaterThan(1.5);
  await page.keyboard.up('KeyW');await page.keyboard.up('ShiftLeft');
  await page.waitForTimeout(250);const fallen=await snap(page);expect(fallen.eyeHeight).toBeLessThan(.5);expect(fallen.hp).toBe(88);await page.screenshot({path:'/private/tmp/dog-tail-knockdown.png'});
  await page.keyboard.press('KeyC');expect((await snap(page)).playerY).toBe(0);
  await page.keyboard.down('KeyS');await page.waitForTimeout(150);await page.keyboard.up('KeyS');const locked=await snap(page);expect(locked.player.x).toBeCloseTo(fallen.player.x,3);expect(locked.time).toBeGreaterThan(fallen.time);
  await page.keyboard.press('Escape');const paused=await snap(page);await page.waitForTimeout(250);expect((await snap(page)).knockedDown).toBe(paused.knockedDown);
  await page.getByRole('button',{name:'Back to mischief'}).click();await expect.poll(async()=>(await snap(page)).knockedDown).toBe(0);
  expect((await snap(page)).hp).toBe(88);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:2.6,z:2.8},{x:0,z:3});d.freezeDog();});
  await expect(page.locator('#pickup')).toHaveText('Bandage kit');await page.keyboard.press('KeyQ');await expect.poll(async()=>(await snap(page)).hp).toBe(100);await expect(page.locator('#pickup')).toHaveText('Empty pocket');
});
