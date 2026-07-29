const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  
  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'bob@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(2000); 
  await page.click('nav a:has-text("Ticket Board")');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Create Ticket")');
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="Cannot access email"]', 'E2E Test Ticket');
  await page.fill('textarea[placeholder*="Describe"]', 'This is an E2E test issue description.');
  await page.selectOption('select#department', { index: 1 });
  await page.selectOption('select#priority', 'Medium');
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(3000);
  
  await browser.close();
})();
