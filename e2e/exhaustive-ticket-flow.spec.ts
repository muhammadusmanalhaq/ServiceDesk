import { test, expect } from '@playwright/test';

// Configuration assumes backend is on 5093 and frontend is on 3000
const FRONTEND_URL = 'http://localhost:3000';

test.describe('Exhaustive Ticket Flow Matrix', () => {
  // Use a longer timeout for exhaustive flows
  test.setTimeout(90000);

  test.beforeEach(async ({ page }) => {
    // 1. Login as Alice (Admin)
    await page.goto(`${FRONTEND_URL}/login`);
    await page.fill('input[type="email"]', 'alice@test.com');
    await page.fill('input[type="password"]', 'Password123!');
    await page.click('button[type="submit"]');
    
    // Wait for Dashboard to appear, confirming successful login
    await expect(page.locator('text=Dashboard').first()).toBeVisible();
    
    // Navigate to Ticket Board
    await page.click('nav a:has-text("Ticket Board")');
    await expect(page.locator('text=Tickets').first()).toBeVisible();
  });

  test('The Modal Deep-Dive', async ({ page }) => {
    // Open the "Create Ticket" modal
    await page.click('button:has-text("Create Ticket")');
    const modalHeader = page.locator('text="Create New Ticket"');
    await expect(modalHeader).toBeVisible();

    // Verify the 'X' button closes it.
    await page.locator('.fixed.inset-0').locator('button:has(svg.lucide-x)').click();
    await expect(modalHeader).toBeHidden();

    // Open it again
    await page.click('button:has-text("Create Ticket")');
    await expect(modalHeader).toBeVisible();

    // Verify the 'Cancel' button closes it.
    await page.click('button:has-text("Cancel")');
    await expect(modalHeader).toBeHidden();

    // Open it again
    await page.click('button:has-text("Create Ticket")');
    await expect(modalHeader).toBeVisible();

    // Verify pressing the Escape key closes it.
    await page.keyboard.press('Escape');
    await expect(modalHeader).toBeHidden();
  });

  test('Exhaustive Creation, Status Matrix, Assignee Mod, Board Filter', async ({ page }) => {
    // 1. Exhaustive Creation
    await page.click('button:has-text("Create Ticket")');
    await expect(page.locator('text="Create New Ticket"')).toBeVisible();

    const ticketTitle = `Exhaustive E2E Ticket ${Date.now()}`;
    await page.fill('input#title', ticketTitle);
    await page.fill('textarea#description', 'This is a comprehensively tested issue.');
    
    // Open the Priority dropdown and explicitly select "High"
    await page.selectOption('select#priority', 'High');
    
    // Open the Department dropdown and Asset dropdown
    await page.selectOption('select#department', { label: 'IT' });
    await page.selectOption('select#asset', { index: 1 }); // select a linked asset
    
    // Submit
    await page.click('form button[type="submit"]');
    
    // Assert the exact toast "Ticket created successfully" appears.
    await expect(page.locator('text="Ticket created successfully"').first()).toBeVisible();
    await expect(page.locator('text="Create New Ticket"')).toBeHidden();

    // Wait for ticket to appear in Kanban board
    const ticketLocator = page.locator(`text=${ticketTitle}`).first();
    await expect(ticketLocator).toBeVisible();

    // 2. Kanban Status Matrix
    // Click the newly created ticket to open TicketDetailsModal
    await ticketLocator.click();
    
    const detailsHeader = page.locator('h2', { hasText: ticketTitle }).first();
    await expect(detailsHeader).toBeVisible();

    const statusSelect = page.locator('.fixed.inset-0').locator('select').first();

    // Change status from "Open" to "InProgress" (UI displays "In Progress" but value is "InProgress")
    await statusSelect.selectOption('InProgress'); 
    await expect(page.locator('text="Status updated to In Progress"').first()).toBeVisible();

    // Close the modal to verify physical move
    await page.keyboard.press('Escape');
    await expect(detailsHeader).toBeHidden();

    // Assert that the ticket card has physically moved to the "In Progress" column on the Kanban board
    const inProgressColumn = page.locator('div.flex-1:has(h3:has-text("In Progress"))');
    await expect(inProgressColumn.locator(`text=${ticketTitle}`).first()).toBeVisible();

    // Repeat for "Verify" (PendingVerification in code)
    await page.locator(`text=${ticketTitle}`).first().click();
    await expect(detailsHeader).toBeVisible();
    await statusSelect.selectOption('PendingVerification');
    await expect(page.locator('text="Status updated to Pending Verification"').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('div.flex-1:has(h3:has-text("Verify"))').locator(`text=${ticketTitle}`).first()).toBeVisible();

    // Repeat for "Resolved"
    await page.locator(`text=${ticketTitle}`).first().click();
    await expect(detailsHeader).toBeVisible();
    await statusSelect.selectOption('Resolved');
    await expect(page.locator('text="Status updated to Resolved"').first()).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('div.flex-1:has(h3:has-text("Resolved"))').locator(`text=${ticketTitle}`).first()).toBeVisible();

    // Repeat for "Closed"
    await page.locator(`text=${ticketTitle}`).first().click();
    await expect(detailsHeader).toBeVisible();
    await statusSelect.selectOption('Closed');
    await expect(page.locator('text="Status updated to Closed"').first()).toBeVisible();
    
    // 3. Assignee Modification
    // Since the modal is still open (we didn't escape Closed yet), we can change the assignee
    // Change the Assignee dropdown to a different user
    // The assignee dropdown is the second select element that contains "Unassigned"
    const assigneeSelect = page.locator('div:has(> h4:has-text("Assignee")) select');
    // Select Bob Agent explicitly by label instead of index, as JS Object.values(users) order is non-deterministic (GUID keys)
    await assigneeSelect.selectOption({ label: 'Bob Agent' });
    
    // Assert the UI updates instantly
    await expect(page.locator('text=/Assigned to/').first()).toBeVisible();
    
    // Close the modal
    await page.keyboard.press('Escape');

    // Verify it is in Closed column
    const closedColumn = page.locator('div.flex-1:has(h3:has-text("Closed"))');
    await expect(closedColumn.locator(`text=${ticketTitle}`).first()).toBeVisible();

    // 4. Board Filtering
    // Select a specific Department (e.g. Operations)
    const departmentFilter = page.locator('select').first(); // The board filter is the first select on the page
    await departmentFilter.selectOption({ label: 'Operations' });
    
    // Assert that tickets belonging to other departments (IT) disappear from the DOM
    // The ticket we created was in IT, so it should be hidden
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeHidden();

    // Switch back to IT to make it visible again
    await departmentFilter.selectOption({ label: 'IT' });
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible();

    // Toggle the "My Tickets" checkbox
    await page.locator('input[type="checkbox"]').check();

    // The current ticket was assigned to Bob (index 2), but we are Alice, so it should disappear!
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeHidden();

    // Uncheck and it should appear again
    await page.locator('input[type="checkbox"]').uncheck();
    await expect(page.locator(`text=${ticketTitle}`).first()).toBeVisible();
  });
});
