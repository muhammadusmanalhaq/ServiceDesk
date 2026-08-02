import { test, expect } from '@playwright/test';

test.describe('Edge Case Matrix', () => {

  test('Form Validation Matrix - Tickets', async ({ page }) => {
    await page.goto('http://localhost:3000/login');
    await page.fill('input[type="email"]', 'alice@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
    
    await page.click('nav a:has-text("Ticket Board")');
    await expect(page.locator('text=Tickets').first()).toBeVisible();

    await page.click('button:has-text("Create Ticket")');
    await expect(page.locator('text="Create New Ticket"')).toBeVisible();

    // Fill the required selects so they don't block the form via HTML5
    await page.selectOption('#department', { label: 'IT' });
    await page.fill('#description', 'A valid description');
    
    // 1. Empty title validation (HTML required)
    // The browser will block it if it's required, but we can bypass or just click submit.
    // Let's force submit by removing the required attribute to test backend validation
    await page.evaluate(() => {
      document.querySelector('#title')?.removeAttribute('required');
    });
    
    await page.click('form button[type="submit"]');
    // Backend should return 400 with validation error for empty title
    await expect(page.locator('text=Validation Failed').first()).toBeVisible({ timeout: 5000 });

    // 2. Title over 200 characters
    const longTitle = 'A'.repeat(201);
    await page.fill('#title', longTitle);
    await page.fill('#description', 'Valid description');
    // Select IT department
    await page.selectOption('#department', { label: 'IT' });
    await page.click('form button[type="submit"]');
    
    await expect(page.locator('text=Validation Failed').first()).toBeVisible({ timeout: 5000 });
    
    // Close modal
    await page.click('button:has-text("Cancel")');
  });

  test('RBAC & RLS Violation Test', async ({ request }) => {
    // We will use API Context to test the RLS boundary directly.
    // 1. Log in as Charlie Agent (Operations)
    const charlieLoginRes = await request.post('http://localhost:5093/api/auth/login', {
      data: { email: 'charlie@test.com', password: 'Password123!' }
    });
    expect(charlieLoginRes.ok()).toBeTruthy();
    const charlieData = await charlieLoginRes.json();
    const charlieToken = charlieData.accessToken;

    // 2. Log in as Bob Agent (IT)
    const bobLoginRes = await request.post('http://localhost:5093/api/auth/login', {
      data: { email: 'bob@test.com', password: 'Password123!' }
    });
    expect(bobLoginRes.ok()).toBeTruthy();
    const bobData = await bobLoginRes.json();
    const bobToken = bobData.accessToken;

    // 3. Bob gets an asset in his department
    const assetsRes = await request.get('http://localhost:5093/api/assets', {
      headers: { 'Authorization': `Bearer ${bobToken}` }
    });
    const assets = await assetsRes.json();
    const assetId = assets.length > 0 ? assets[0].id : null;

    // 4. Bob creates a ticket in IT department
    const createTicketRes = await request.post('http://localhost:5093/api/tickets', {
      headers: { 'Authorization': `Bearer ${bobToken}` },
      data: { 
        title: 'IT Only Ticket', 
        description: 'Secret', 
        departmentId: bobData.departmentId, 
        priority: 'Medium',
        assetId: assetId
      }
    });
    expect(createTicketRes.ok()).toBeTruthy();
    const ticket = await createTicketRes.json();

    // 4. Charlie (Operations) tries to fetch Bob's (IT) ticket
    const fetchRes = await request.get(`http://localhost:5093/api/tickets/${ticket.id}`, {
      headers: { 'Authorization': `Bearer ${charlieToken}` }
    });

    // RLS should completely hide it, returning 404 Not Found
    expect(fetchRes.status()).toBe(404);

    // 5. Alice (Admin) logs in and assigns the ticket to Dan (Agent)
    const aliceLoginRes = await request.post('http://localhost:5093/api/auth/login', {
      data: { email: 'alice@test.com', password: 'Password123!' }
    });
    const aliceData = await aliceLoginRes.json();
    const aliceToken = aliceData.accessToken;

    const danLoginRes = await request.post('http://localhost:5093/api/auth/login', {
      data: { email: 'dan@test.com', password: 'Password123!' }
    });
    const danData = await danLoginRes.json();
    const danToken = danData.accessToken;

    // Alice assigns to Dan
    const assignRes = await request.post(`http://localhost:5093/api/tickets/${ticket.id}/assign`, {
      headers: { 'Authorization': `Bearer ${aliceToken}` },
      data: { userId: danData.userId }
    });
    expect(assignRes.ok()).toBeTruthy();

    // 6. Dan tries to forcefully Resolve his own ticket via UpdateStatus backdoor -> Should get 400
    const resolveAttempt = await request.put(`http://localhost:5093/api/tickets/${ticket.id}/status`, {
      headers: { 'Authorization': `Bearer ${danToken}` },
      data: { status: 'Resolved' }
    });
    expect(resolveAttempt.status()).toBe(400);

    // 7. Bob tries to modify Dan's ticket -> Should get 403 Forbidden
    const bobModifyAttempt = await request.put(`http://localhost:5093/api/tickets/${ticket.id}/status`, {
      headers: { 'Authorization': `Bearer ${bobToken}` },
      data: { status: 'InProgress' }
    });
    expect(bobModifyAttempt.status()).toBe(403);
  });
});
