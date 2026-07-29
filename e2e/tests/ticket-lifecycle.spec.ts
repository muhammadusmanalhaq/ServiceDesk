import { test, expect } from '@playwright/test';

// Configuration assumes backend is on 5093 and frontend is on 3000
const FRONTEND_URL = 'http://localhost:3000';

test('login, create ticket, move to InProgress, Resolve', async ({ page }) => {
  test.setTimeout(60000);
  // 1. Login
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', 'bob@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  // Verify dashboard loaded
  await expect(page.locator('text=Dashboard').first()).toBeVisible();

  // 2. Go to Tickets and Create
  await page.click('nav a:has-text("Ticket Board")');
  await expect(page.locator('text=Tickets').first()).toBeVisible();
  
  await page.click('button:has-text("Create Ticket")');
  
  // Fill modal
  const ticketTitle = `E2E Test Ticket ${Date.now()}`;
  await page.fill('input#title', ticketTitle);
  await page.fill('textarea#description', 'This is an E2E test issue description.');
  await page.selectOption('select#department', { index: 1 });
  await page.selectOption('select#asset', { index: 1 });
  await page.selectOption('select#priority', 'Medium');
  await page.click('form button[type="submit"]');
  await expect(page.locator('form button[type="submit"]')).toBeHidden({ timeout: 10000 });

  // Verify ticket appears in list
  await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible();

  // 3. Open ticket details and claim fix (which moves it to PendingVerification)
  // Assuming clicking the row opens details
  await page.click(`text=${ticketTitle}`);
  
  // Wait for modal
  await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible();

  // Fill resolution note and submit
  await page.fill('textarea[placeholder*="Describe what you fixed"]', 'Fixed via E2E test script.');
  await page.click('button:has-text("Submit Fix for Verification")');

  // Slide-over might not close automatically depending on implementation (currently it closes in handleClaimFix)
  // ticket should now say PendingVerification (or disappear if Agent view filters it, but let's assume it stays)

  
  // 4. Verify & Close (Admin)
  // Logout and login as admin
  // Since we replaced dropdowns with native elements, find the avatar or Settings to logout.
  // Actually, there is a Settings link.
  await page.click('nav a:has-text("Settings")');
  await page.click('button:has-text("Sign Out")');
  
  await page.waitForURL('**/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL(FRONTEND_URL + '/');
  
  await page.click('nav a:has-text("Ticket Board")');
  await expect(page.locator('text=Tickets').first()).toBeVisible();
  
  await page.click(`text=${ticketTitle}`);
  
  await expect(page.locator('text=Admin Verification Required')).toBeVisible();
  await page.click('button:has-text("Verify & Close Ticket")');

  // Verify it says Resolved
  await expect(page.locator('span:has-text("Resolved")').first()).toBeVisible();
});
