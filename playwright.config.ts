import { defineConfig } from '@playwright/test';
export default defineConfig({
  testDir: './tests/browser', timeout: 45000, workers: 1,
  testMatch: process.env.PRODUCTION ? '**/production.spec.ts' : ['**/game.spec.ts','**/leaderboard.spec.ts'],
  use: { baseURL: process.env.PRODUCTION ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173', channel: 'chrome', headless: true, viewport: { width: 1440, height: 900 },
    launchOptions: { args: ['--enable-webgl','--ignore-gpu-blocklist'] }, screenshot: 'only-on-failure' },
  webServer: { command: process.env.PRODUCTION ? 'npm run preview -- --port 4173' : 'npm run dev', url: process.env.PRODUCTION ? 'http://127.0.0.1:4173' : 'http://127.0.0.1:5173', reuseExistingServer: true },
});
