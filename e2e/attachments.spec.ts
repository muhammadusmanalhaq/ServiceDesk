import { test, expect } from '@playwright/test';
import path from 'path';
import fs from 'fs';

test('User can upload an attachment to a ticket', async ({ page }) => {
  // 1. Log in
  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');

  // 2. Go to ticket board
  await page.click('nav a:has-text("Ticket Board")');
  await page.waitForURL('http://localhost:3000/tickets');

  const ticketResponse = await page.waitForResponse(res => res.url().includes('/api/tickets'));
  expect(ticketResponse.status()).toBe(200);

  // Wait for network idle to ensure cards render
  await page.waitForLoadState('networkidle');

  // Click the first card to open modal
  await page.locator('h4').first().click();
  
  // Wait a moment for modal animation
  await page.waitForTimeout(500);

  // 3. Create a dummy file to upload
  const filePath = path.join(__dirname, 'test-attachment.txt');
  fs.writeFileSync(filePath, 'Hello world from Playwright!');

  // 4. Listen for the attachment endpoints to be called
  const generateSasPromise = page.waitForResponse(res => res.url().includes('/api/attachments/generate-sas'));
  const registerPromise = page.waitForResponse(res => res.url().includes('/api/attachments/register'));

  // 5. Upload the file
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(filePath);

  // 6. Verify responses
  const sasResponse = await generateSasPromise;
  expect(sasResponse.status()).toBe(200);

  const regResponse = await registerPromise;
  expect(regResponse.status()).toBe(200);

  // 7. Verify UI updates to show the attachment
  const attachmentName = page.getByText('test-attachment.txt', { exact: true });
  await expect(attachmentName).toBeVisible();

  // Cleanup
  fs.unlinkSync(filePath);
});
