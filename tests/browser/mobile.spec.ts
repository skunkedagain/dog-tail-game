import { test,expect,type Page } from '@playwright/test';
const snap=(page:Page)=>page.evaluate(()=>(window as any).__dogGame.snapshot());
async function start(page:Page){
  await page.goto('/?debug');await page.getByRole('button',{name:"Let's play"}).tap();await expect(page.locator('#countdown')).toBeHidden({timeout:10000});
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:1.4,z:3.5},{x:0,z:2});d.freezeDog();});
}
test('touch layout, simultaneous move/look/jump, cancellation, pause and all actions',async({page},info)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await start(page);
  await expect(page.locator('#touch-controls')).toBeVisible();expect(await page.evaluate(()=>document.pointerLockElement==null)).toBe(true);
  for(const name of ['Jump','Catch tail','Offer treat','Use pickup','Swap pickup','Pause game']){
    const b=await page.getByRole('button',{name,exact:true}).boundingBox();expect(b).not.toBeNull();expect(b!.width).toBeGreaterThanOrEqual(44);expect(b!.height).toBeGreaterThanOrEqual(44);await expect(page.getByRole('button',{name,exact:true})).toBeInViewport();
  }
  await page.screenshot({path:`/private/tmp/dog-tail-${info.project.name}.png`});
  const stick=(await page.locator('#move-stick').boundingBox())!,a=await snap(page);
  await page.locator('#move-stick').dispatchEvent('pointerdown',{pointerId:11,pointerType:'touch',clientX:stick.x+stick.width*.5,clientY:stick.y+stick.height*.24,bubbles:true});
  await page.locator('#game').dispatchEvent('pointerdown',{pointerId:22,pointerType:'touch',clientX:220,clientY:250,bubbles:true});
  await page.locator('#game').dispatchEvent('pointermove',{pointerId:22,pointerType:'touch',clientX:265,clientY:240,bubbles:true});
  await page.getByRole('button',{name:'Jump',exact:true}).tap();await expect.poll(async()=>(await snap(page)).playerY).toBeGreaterThan(.5);
  const moved=await snap(page);expect(moved.yaw).toBeLessThan(a.yaw-.1);expect(Math.hypot(moved.player.x-a.player.x,moved.player.z-a.player.z)).toBeGreaterThan(.1);
  for(const [selector,id] of [['#move-stick',11],['#game',22]] as const)await page.locator(selector).dispatchEvent('pointercancel',{pointerId:id,pointerType:'touch',bubbles:true});
  await page.waitForTimeout(350);const stopped=await snap(page);await page.waitForTimeout(200);expect((await snap(page)).player.z).toBeCloseTo(stopped.player.z,3);
  await page.getByRole('button',{name:'Pause game'}).tap();await expect(page.locator('#touch-controls')).toBeHidden();const paused=await snap(page);await page.waitForTimeout(150);expect((await snap(page)).time).toBe(paused.time);
  await page.getByRole('button',{name:'Back to mischief'}).tap();await expect(page.locator('#touch-controls')).toBeVisible();
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:2,z:2.6},{x:2,z:1.5});d.freezeDog();});
  await page.getByRole('button',{name:'Catch tail'}).tap();await expect.poll(async()=>(await snap(page)).catches).toBe(1);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:2,z:2.6},{x:2,z:1.5});d.freezeDog();const s=d.state();s.treats=1;s.anger=80;});await page.getByRole('button',{name:'Offer treat'}).tap();await expect.poll(async()=>(await snap(page)).treats).toBe(0);
  await page.evaluate(()=>{const d=(window as any).__dogGame;d.place({x:-5.25,z:1.8},{x:0,z:2});d.state().pickup='bandage';});
  await page.getByRole('button',{name:'Swap pickup'}).tap();await expect(page.locator('#pickup')).toHaveText('Juice box');await page.getByRole('button',{name:'Use pickup'}).tap();await expect(page.locator('#buff')).toContainText('Juice box');
  expect(errors).toEqual([]);
});
test('real multitouch contacts move and look together without scrolling',async({page,browserName})=>{
  test.skip(browserName!=='chromium','CDP can generate real simultaneous contacts in Chromium. WebKit exercises pointer delivery above.');
  await start(page);const cdp=await page.context().newCDPSession(page),stick=(await page.locator('#move-stick').boundingBox())!;
  const left={x:Math.round(stick.x+stick.width*.5),y:Math.round(stick.y+stick.height*.2),id:1},right={x:260,y:350,id:2};
  const initial=await snap(page);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[left,right]});
  await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[left,{...right,x:310}]});await page.waitForTimeout(350);
  const moved=await snap(page);expect(moved.yaw).toBeLessThan(initial.yaw-.2);expect(moved.player.z).toBeLessThan(initial.player.z-.1);
  await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});expect(await page.evaluate(()=>scrollY)).toBe(0);
});
