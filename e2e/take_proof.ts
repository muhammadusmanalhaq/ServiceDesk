import { chromium } from 'playwright';

const TICKET_ID = '1702d365-0f27-4056-9d32-bb84c62dee67';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  const signalRErrors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') signalRErrors.push(msg.text());
  });
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // 1. Dashboard - verify no WoW badges
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/dashboard_proof.png' });
  console.log('[1] Dashboard screenshot done');
  
  // 2. Open ticket modal via URL param
  await page.goto(`http://localhost:3000/tickets?ticket=${TICKET_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2000);
  
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/modal_proof.png' });
  console.log('[2] Modal screenshot done');
  
  // 3. Locate the assignee select
  const assigneeSelect = page.locator('h4:has-text("Assignee") ~ div select');
  const isVisible = await assigneeSelect.isVisible();
  console.log('[3] Assignee select visible:', isVisible);
  
  if (isVisible) {
    // Set up response interception BEFORE triggering the action
    const assignPromise = page.waitForResponse(res =>
      res.url().includes('/assign'),
      { timeout: 10000 }
    );
    
    // Trigger the change
    await assigneeSelect.selectOption({ index: 2 }); // Bob Agent
    
    const assignRes = await assignPromise;
    const status = assignRes.status();
    console.log('[4] POST /assign response status:', status);
    
    await page.waitForTimeout(500);
    await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/assignee_proof.png' });
    console.log('[5] Assignee proof screenshot done. Status was', status);
  }
  
  console.log('[6] SignalR/console errors during session:', JSON.stringify(signalRErrors));
  
  await browser.close();
})();
