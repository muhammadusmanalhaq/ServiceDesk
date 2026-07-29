import { test, expect } from '@playwright/test';

test('Admin can reassign a ticket using the dropdown', async ({ page }) => {
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');

  await page.click('nav a:has-text("Ticket Board")');
  await page.waitForURL('http://localhost:3000/tickets');

  const ticketResponse = await page.waitForResponse(res => res.url().includes('/api/tickets'));
  expect(ticketResponse.status()).toBe(200);

  // Wait for network idle to ensure cards render
  await page.waitForLoadState('networkidle');

  // Take screenshot of the board
  await page.screenshot({ path: 'board_before_click.png' });

  // Click the first card
  await page.locator('.group').first().click();
  
  // Wait a moment for modal animation
  await page.waitForTimeout(500);
  
  // Take screenshot of the modal
  await page.screenshot({ path: 'modal_after_click.png' });

  const assigneeLabel = page.locator('h4:has-text("Assignee")');
  await expect(assigneeLabel).toBeVisible();

  const assigneeSelect = assigneeLabel.locator('~ div select');
  await expect(assigneeSelect).toBeVisible();

  const assignPromise = page.waitForResponse(res => 
    res.url().includes('/api/tickets') && res.url().includes('/assign') && res.request().method() === 'PUT'
  );

  await assigneeSelect.selectOption({ label: 'Bob Tech' });

  const assignResponse = await assignPromise;
  expect(assignResponse.status()).toBe(200);

  const selectedOptionText = await assigneeSelect.locator('option:checked').textContent();
  expect(selectedOptionText).toBe('Bob Tech');
});
