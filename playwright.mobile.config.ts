import { defineConfig,devices } from '@playwright/test';
export default defineConfig({
  testDir:'./tests/browser',testMatch:'**/mobile.spec.ts',timeout:45000,workers:1,
  projects:[
    {name:'iphone-portrait',use:{...devices['iPhone 13'],browserName:'webkit'}},
    {name:'iphone-landscape',use:{...devices['iPhone 13 landscape'],browserName:'webkit'}},
    {name:'ipad',use:{...devices['iPad (gen 7)'],browserName:'webkit'}},
    {name:'chrome-touch',use:{browserName:'chromium',channel:'chrome',hasTouch:true,isMobile:true,viewport:{width:390,height:844}}},
  ],
  use:{baseURL:'http://127.0.0.1:5173',headless:true,screenshot:'only-on-failure'},
  webServer:{command:'npm run dev',url:'http://127.0.0.1:5173',reuseExistingServer:true},
});
