import { test,expect } from '@playwright/test';
test('production build starts from the real play button, pauses, resumes and has no debug hook',async({page})=>{
  const errors:string[]=[];const failed:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>failed.push(r.url()));
  await page.goto('/?debug');await expect(page.getByRole('button',{name:"Let's play"})).toBeVisible();
  expect(await page.evaluate(()=>'__dogGame' in window)).toBe(false);
  await page.getByRole('button',{name:"Let's play"}).click();await expect(page.locator('#countdown')).toBeHidden({timeout:10000});await expect(page.locator('#hud')).toBeVisible();
  await page.screenshot({path:'/private/tmp/dog-tail-production.png'});
  await page.keyboard.down('ArrowRight');await page.waitForTimeout(350);await page.keyboard.up('ArrowRight');await page.keyboard.press('Space');
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Back to mischief'})).toBeVisible();const time=await page.locator('#timer').textContent();await page.waitForTimeout(250);expect(await page.locator('#timer').textContent()).toBe(time);
  await page.getByRole('button',{name:'Back to mischief'}).click();await expect(page.locator('#hud')).toBeVisible();await page.waitForTimeout(1100);expect(await page.locator('#timer').textContent()).not.toBe(time);
  expect(errors).toEqual([]);expect(failed).toEqual([]);
});
