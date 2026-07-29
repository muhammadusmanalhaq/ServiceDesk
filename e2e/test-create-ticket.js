const { chromium } = require('playwright');
(async () => {
  const browser = await chromium.launch();
  const context = await browser.newContext();
  const page = await context.newPage();
  page.on('response', response => {
    if (response.request().method() === 'POST' || response.request().method() === 'PUT') {
      console.log('<<', response.status(), response.url());
    }
  });
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'bob@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForTimeout(2000); 
  await page.click('nav a:has-text("Ticket Board")');
  await page.waitForTimeout(2000);
  await page.click('button:has-text("Create Ticket")');
  await page.waitForTimeout(1000);
  await page.fill('input[placeholder*="title"]', 'E2E Test Ticket');
  await page.fill('textarea[placeholder*="Describe"]', 'This is an E2E test issue description.');
  await page.click('form button[type="submit"]');
  await page.waitForTimeout(2000);
  await browser.close();
})();
