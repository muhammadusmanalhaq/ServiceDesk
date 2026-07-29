const { chromium } = require('playwright');
const ARTIFACTS_DIR = '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a';
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'bob@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(3000); 
  await page.screenshot({ path: `${ARTIFACTS_DIR}/dashboard_bob.png` });
  await browser.close();
})();
