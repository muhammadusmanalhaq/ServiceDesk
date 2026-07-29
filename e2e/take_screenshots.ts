import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/dashboard_light.png' });
  
  await page.click('nav a:has-text("Ticket Board")');
  await page.waitForURL('http://localhost:3000/tickets');
  await page.waitForLoadState('networkidle');
  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/kanban_light.png' });
  
  // Click the first ticket to open modal
  await page.locator('.group').first().click();
  // Wait for the modal to be visible
  await page.waitForSelector('h4:has-text("Assignee")');
  
  // Wait for the dropdown to be visible
  await page.waitForSelector('select');
  
  // Change assignee to Bob Tech
  const assignPromise = page.waitForResponse(res => res.url().includes('/assign') && res.request().method() === 'PUT');
  await page.selectOption('h4:has-text("Assignee") ~ div select', { label: 'Bob Tech' });
  await assignPromise;

  await page.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/ticket_modal_assignee.png' });

  await browser.close();
})();
