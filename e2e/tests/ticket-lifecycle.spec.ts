import { test, expect } from '@playwright/test';

// Configuration assumes backend is on 5093 and frontend is on 3000
const FRONTEND_URL = 'http://localhost:3000';

test('login, create ticket, move to InProgress, Resolve', async ({ page }) => {
  // 1. Login
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', 'agent1@company.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');

  // Verify dashboard loaded
  await expect(page.locator('text=ServiceDesk Dashboard')).toBeVisible();

  // 2. Go to Tickets and Create
  await page.click('text=Tickets');
  await expect(page.locator('h1')).toHaveText('Tickets');
  
  await page.click('button:has-text("New Ticket")');
  
  // Fill modal
  const ticketTitle = `E2E Test Ticket ${Date.now()}`;
  await page.fill('input[placeholder="Enter ticket title"]', ticketTitle);
  await page.fill('textarea[placeholder="Describe the issue..."]', 'This is an E2E test issue description.');
  await page.click('button:has-text("Create Ticket")');

  // Verify ticket appears in list
  await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible();

  // 3. Open ticket details and claim fix (which moves it to PendingVerification)
  // Assuming clicking the row opens details
  await page.click(`text=${ticketTitle}`);
  
  // Wait for modal
  await expect(page.locator('h2', { hasText: ticketTitle })).toBeVisible();

  // Fill resolution note and submit
  await page.fill('textarea[placeholder*="Describe what you fixed"]', 'Fixed via E2E test script.');
  await page.click('button:has-text("Submit Fix for Verification")');

  // Modal closes, ticket should now say PendingVerification (or disappear if Agent view filters it, but let's assume it stays)
  await expect(page.locator('text=PendingVerification').first()).toBeVisible();
  
  // 4. Verify & Close (Admin)
  // Logout and login as admin
  await page.click('button:has-text("Sign Out")');
  
  await page.goto(`${FRONTEND_URL}/login`);
  await page.fill('input[type="email"]', 'admin@company.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button[type="submit"]');
  
  await page.click('text=Tickets');
  await page.click(`text=${ticketTitle}`);
  
  await expect(page.locator('text=Admin Verification Required')).toBeVisible();
  await page.click('button:has-text("Verify & Close Ticket")');

  // Verify it says Resolved
  await expect(page.locator('text=Resolved').first()).toBeVisible();
});
