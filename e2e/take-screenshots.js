const { chromium } = require('playwright');

const ARTIFACTS_DIR = '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'agent1@company.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  
  await page.waitForTimeout(3000); // wait for data
  await page.screenshot({ path: `${ARTIFACTS_DIR}/dashboard.png` });

  // Kanban
  await page.goto('http://localhost:3000/tickets');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${ARTIFACTS_DIR}/kanban.png` });
  
  // Asset Registry
  await page.goto('http://localhost:3000/assets');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${ARTIFACTS_DIR}/assets.png` });

  // Audit Logs
  await page.goto('http://localhost:3000/audit');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${ARTIFACTS_DIR}/audit.png` });

  // Settings
  await page.goto('http://localhost:3000/settings');
  await page.waitForTimeout(2000);
  await page.screenshot({ path: `${ARTIFACTS_DIR}/settings.png` });

  await browser.close();
})();
