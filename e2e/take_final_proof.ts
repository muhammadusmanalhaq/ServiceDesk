import { chromium } from 'playwright';

const TICKET_ID = '1702d365-0f27-4056-9d32-bb84c62dee67';
const ARTIFACTS = '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a';

(async () => {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await context.newPage();
  
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push(`[${new Date().toISOString()}] ${msg.text()}`);
  });
  
  // Login
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  
  // 1. Dashboard
  await page.screenshot({ path: `${ARTIFACTS}/FINAL_dashboard.png`, fullPage: false });
  console.log('[DONE] Dashboard');

  // 2. Ticket modal with assignee dropdown
  await page.goto(`http://localhost:3000/tickets?ticket=${TICKET_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(2500); // Wait for SignalR + modal + users to load
  
  // Take screenshot - should show if overlay is present
  await page.screenshot({ path: `${ARTIFACTS}/FINAL_modal.png` });
  const assigneeLabel = page.getByText('Assignee', { exact: true }).first();
  await expect(assigneeLabel).toBeVisible();

  const assigneeSelect = assigneeLabel.locator('..').locator('select');
  const selectVisible = await assigneeSelect.isVisible();
  console.log('[INFO] Assignee select visible:', selectVisible);
  
  if (selectVisible) {
    const assignPromise = page.waitForResponse(res => res.url().includes('/assign'), { timeout: 8000 });
    await assigneeSelect.selectOption({ index: 2 }); // Bob Agent
    const assignRes = await assignPromise;
    console.log('[INFO] POST /assign status:', assignRes.status());
    await page.waitForTimeout(400);
    await page.screenshot({ path: `${ARTIFACTS}/FINAL_assignee.png` });
    console.log('[DONE] Assignee assigned (Bob Agent), status =', assignRes.status());
  }

  // 3. Assets page - all 7 should show
  await page.click('a[href="/assets"]');
  await page.waitForURL('http://localhost:3000/assets');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: `${ARTIFACTS}/FINAL_assets.png` });
  console.log('[DONE] Assets page');
  
  // Count visible rows
  const rowCount = await page.locator('tbody tr').count();
  console.log('[INFO] Asset rows visible:', rowCount);
  
  // 4. Console errors summary
  const signalRErrors = errors.filter(e => e.includes('SignalR') || e.includes('Unauthorized') || e.includes('negotiation'));
  console.log('[SUMMARY] Total console errors:', errors.length);
  console.log('[SUMMARY] SignalR-related errors:', signalRErrors.length);
  if (signalRErrors.length > 0) {
    console.log('[SUMMARY] SignalR errors:', JSON.stringify(signalRErrors));
  } else {
    console.log('[SUMMARY] Zero SignalR errors during session.');
  }
  
  await browser.close();
})();
