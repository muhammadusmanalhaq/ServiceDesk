import { test, expect, chromium } from '@playwright/test';

(async () => {
  console.log('Launching browser...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
  });
  
  const page = await context.newPage();
  console.log('Navigating to login...');
  await page.goto('http://127.0.0.1:3000/login');
  
  await page.fill('input[type="email"]', 'admin@servicedesk.local');
  await page.fill('input[type="password"]', 'Admin123!');
  await page.click('button[type="submit"]');
  
  console.log('Waiting for Dashboard...');
  await page.waitForURL('http://127.0.0.1:3000/');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_dashboard.png' });
  
  console.log('Navigating to Tickets (Kanban)...');
  await page.goto('http://127.0.0.1:3000/tickets');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_kanban.png' });

  // Mobile layout screenshot for Kanban
  console.log('Testing Mobile Kanban layout...');
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    colorScheme: 'light',
  });
  const mobilePage = await mobileContext.newPage();
  // Pass the token
  const storageState = await context.storageState();
  await mobileContext.addCookies(storageState.cookies);
  // Also need local storage if auth uses that
  await mobilePage.goto('http://127.0.0.1:3000/login');
  await mobilePage.fill('input[type="email"]', 'admin@servicedesk.local');
  await mobilePage.fill('input[type="password"]', 'Admin123!');
  await mobilePage.click('button[type="submit"]');
  
  await mobilePage.goto('http://127.0.0.1:3000/tickets');
  await mobilePage.waitForTimeout(1500);
  await mobilePage.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_kanban_mobile.png' });

  await browser.close();
  console.log('Done!');
})();
