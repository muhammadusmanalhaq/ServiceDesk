import { chromium } from 'playwright';

const ARTIFACTS = '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();

  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(msg.text());
  });

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');

  // Direct nav to assets (no modal in the way)
  await page.goto('http://localhost:3000/assets');
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);

  await page.screenshot({ path: `${ARTIFACTS}/FINAL_assets.png` });

  const rowCount = await page.locator('tbody tr').count();
  const allText = await page.locator('tbody tr').allTextContents();
  console.log('[INFO] Asset rows visible:', rowCount);
  console.log('[INFO] Row content sample:', JSON.stringify(allText.slice(0, 3)));

  // SignalR errors (shouldn't be any - tickets page not loaded)
  const signalRErrors = errors.filter(e => e.includes('Unauthorized') || e.includes('negotiation') || e.includes('SignalR'));
  console.log('[SUMMARY] SignalR errors:', signalRErrors.length, JSON.stringify(signalRErrors));

  await browser.close();
})();
