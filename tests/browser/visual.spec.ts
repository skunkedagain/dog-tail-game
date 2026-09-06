import { test,expect } from '@playwright/test';

test('menu footer follows keyboard help at desktop, short and narrow sizes',async({page},info)=>{
  await page.goto('/');
  await expect(page.getByRole('button',{name:"Let's play"})).toBeVisible();
  await page.evaluate(()=>document.fonts.ready);
  for(const size of [{width:1440,height:900},{width:1280,height:600},{width:1024,height:568},{width:390,height:667}]){
    await page.setViewportSize(size);
    const help=await page.locator('.device-note').boundingBox();
    const footer=await page.locator('#corner-note').boundingBox();
    expect(help).not.toBeNull();expect(footer).not.toBeNull();
    expect(footer!.y).toBeGreaterThanOrEqual(help!.y+help!.height+24);
    await page.locator('#corner-note').scrollIntoViewIfNeeded();
    await expect(page.locator('#corner-note')).toBeInViewport();
    await page.getByRole('button',{name:"Let's play"}).scrollIntoViewIfNeeded();
    await expect(page.getByRole('button',{name:"Let's play"})).toBeInViewport();
    await page.screenshot({path:`/private/tmp/dog-tail-${info.project.name}-${size.width}x${size.height}.png`});
  }
});

test('title, settings, pause and results use the same bounded menu layout',async({page})=>{
  await page.setViewportSize({width:1280,height:600});await page.goto('/?debug');
  await page.getByRole('button',{name:'Settings & controls'}).click();
  await page.getByRole('button',{name:'All set'}).scrollIntoViewIfNeeded();
  await page.getByRole('button',{name:'All set'}).click();
  await page.getByRole('button',{name:"Let's play"}).click();
  await expect(page.locator('#hud')).toBeVisible();await expect(page.locator('#menu-layer')).toBeHidden();
  await page.keyboard.press('Escape');await expect(page.getByRole('button',{name:'Back to mischief'})).toBeVisible();
  const menu=await page.locator('#menu').boundingBox(),footer=await page.locator('#corner-note').boundingBox();
  expect(footer!.y).toBeGreaterThan(menu!.y+menu!.height+20);
});
