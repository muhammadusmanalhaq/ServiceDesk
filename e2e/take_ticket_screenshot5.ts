import { chromium } from 'playwright';

(async () => {
  const browser = await chromium.launch();
  
  // Capture Light Mode
  const contextLight = await browser.newContext({ colorScheme: 'light' });
  const pageLight = await contextLight.newPage();
  
  await pageLight.goto('http://localhost:3000/login');
  await pageLight.fill('input[type="email"]', 'alice@test.com');
  await pageLight.fill('input[type="password"]', 'Password123!');
  await pageLight.click('button:has-text("Sign in")');
  await pageLight.waitForURL('http://localhost:3000');
  await pageLight.waitForLoadState('networkidle');

  // Go to tickets
  await pageLight.click('nav a:has-text("Ticket Board")');
  await pageLight.waitForURL('http://localhost:3000/tickets');
  await pageLight.waitForLoadState('networkidle');

  // Open Ticket Details Modal by clicking the first card in the Kanban board
  await pageLight.click('.flex.flex-col.gap-3 > div'); // Click the first card
  
  // Wait for the modal to appear (look for 'Assignee' text in h4)
  await pageLight.waitForSelector('h4:has-text("Assignee")');
  // Wait a moment for animation
  await pageLight.waitForTimeout(1000);
  await pageLight.screenshot({ path: '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a/ticket_modal_light.png' });
  
  await browser.close();
})();
