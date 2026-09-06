import { test,expect } from '@playwright/test';
test('posts a finished round once, shows public scores safely, and preserves the submission across views',async({page})=>{
  const submissions:unknown[]=[];
  await page.route('**/api/leaderboard',async route=>{
    const req=route.request();if(req.method()==='GET')return route.fulfill({json:{scores:[{id:'score-1',player_name:'<img src=x onerror=alert(1)>',score:1234,catches:6,input_mode:'touch'}]}});
    const body=req.postDataJSON();if(body.action==='start')return route.fulfill({json:{runId:'baf96e52-d9ad-4cbb-a4ce-45bd48f6e373'}});
    submissions.push(body);return route.fulfill({json:{id:'score-1'}});
  });
  await page.goto('/?debug');await page.evaluate(()=>(window as any).__dogGame.start());await expect(page.locator('#countdown')).toBeHidden({timeout:10000});
  await page.evaluate(()=>{(window as any).__dogGame.state().time=179.99;});await expect(page.getByRole('heading',{name:"That's a wrap!"})).toBeVisible();
  await page.getByLabel('Leave your name on the leaderboard').fill('Little Legs');await page.getByRole('button',{name:'Post score',exact:true}).click();await expect(page.getByRole('button',{name:'Score posted ✓'})).toBeDisabled();expect(submissions).toHaveLength(1);
  await page.getByRole('button',{name:'View high scores'}).click();await expect(page.locator('.leaderboard-list')).toContainText('<img src=x onerror=alert(1)>');await expect(page.locator('.leaderboard-list img')).toHaveCount(0);
  await page.getByRole('button',{name:'Back to the game'}).click();await expect(page.getByRole('button',{name:'Score posted ✓'})).toBeDisabled();expect(submissions).toHaveLength(1);
});
test('offline scores never block play and a failed submission can be retried',async({page})=>{
  let fail=true;
  await page.route('**/api/leaderboard',async route=>{
    if(route.request().method()==='GET')return route.fulfill({status:503,json:{error:'Online scores are temporarily unavailable.'}});
    if(route.request().postDataJSON().action==='start')return route.fulfill({json:{runId:'baf96e52-d9ad-4cbb-a4ce-45bd48f6e373'}});
    return fail?route.fulfill({status:503,json:{error:'Please try again.'}}):route.fulfill({json:{id:'score-1'}});
  });
  await page.goto('/?debug');await page.getByRole('button',{name:'High scores',exact:true}).click();await expect(page.locator('#leaderboard')).toContainText('temporarily unavailable');await page.getByRole('button',{name:'Back to the game'}).click();
  await page.evaluate(()=>(window as any).__dogGame.start());await expect(page.locator('#countdown')).toBeHidden({timeout:10000});await page.evaluate(()=>{(window as any).__dogGame.state().time=179.99;});
  await page.getByLabel('Leave your name on the leaderboard').fill('Little Legs');await page.getByRole('button',{name:'Post score',exact:true}).click();await expect(page.locator('#score-submission')).toContainText('Please try again.');
  fail=false;await page.getByRole('button',{name:'Post score',exact:true}).click();await expect(page.getByRole('button',{name:'Score posted ✓'})).toBeDisabled();
});
