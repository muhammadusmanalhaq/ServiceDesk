const { chromium } = require('@playwright/test');

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    colorScheme: 'light',
  });
  
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'admin@servicedesk.local');
  await page.fill('input[type="password"]', 'Admin123!');
  
  // Use Promise.all to wait for navigation when clicking submit
  await Promise.all([
    page.waitForURL('http://localhost:3000/'),
    page.click('button[type="submit"]')
  ]);
  
  // Wait for the skeleton loader to disappear
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_dashboard.png' });
  
  await page.goto('http://localhost:3000/tickets');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_kanban.png' });

  await page.goto('http://localhost:3000/assets');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_assets.png' });

  // Mobile layout screenshot for Kanban
  const mobileContext = await browser.newContext({
    viewport: { width: 375, height: 667 }, // iPhone SE dimensions
    colorScheme: 'light',
  });
  const mobilePage = await mobileContext.newPage();
  
  // Copy state
  const storageState = await context.storageState();
  await mobileContext.addCookies(storageState.cookies);
  
  await mobilePage.goto('http://localhost:3000/login');
  await mobilePage.fill('input[type="email"]', 'admin@servicedesk.local');
  await mobilePage.fill('input[type="password"]', 'Admin123!');
  await Promise.all([
    mobilePage.waitForURL('http://localhost:3000/'),
    mobilePage.click('button[type="submit"]')
  ]);
  
  await mobilePage.goto('http://localhost:3000/tickets');
  await mobilePage.waitForLoadState('networkidle');
  await mobilePage.waitForTimeout(2000);
  await mobilePage.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/phase4_kanban_mobile.png' });

  await browser.close();
  console.log('Done screenshots!');
})();
