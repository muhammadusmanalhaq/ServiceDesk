import { chromium } from 'playwright';

const TICKET_ID = '1702d365-0f27-4056-9d32-bb84c62dee67';
const ARTIFACTS = '/home/muhammadusmanalhaq/.gemini/antigravity-ide/brain/8d927738-ec8a-48e2-8c78-682062671f1a';

(async () => {
  const browser = await chromium.launch({ headless: true });
  // Force light mode
  const context = await browser.newContext({
    viewport: { width: 1280, height: 800 },
    colorScheme: 'light'
  });
  const page = await context.newPage();

  await page.goto('http://localhost:3000/login');
  await page.fill('input[type="email"]', 'alice@test.com');
  await page.fill('input[type="password"]', 'Password123!');
  await page.click('button:has-text("Sign in")');
  await page.waitForURL('http://localhost:3000');
  await page.waitForLoadState('networkidle');

  // Make sure we're in light mode (click the sun icon if in dark mode)
  // The app stores theme in localStorage - set it directly
  await page.evaluate(() => localStorage.setItem('theme', 'light'));
  await page.reload();
  await page.waitForLoadState('networkidle');

  // Dashboard - hover over the donut chart to trigger tooltip
  await page.screenshot({ path: `${ARTIFACTS}/LIGHTFIX_dashboard.png` });
  
  // Hover over the donut chart
  const pieChart = page.locator('.recharts-wrapper').last();
  await pieChart.hover();
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${ARTIFACTS}/LIGHTFIX_chart_hover.png` });

  // Open ticket modal - check priority layout
  await page.goto(`http://localhost:3000/tickets?ticket=${TICKET_ID}`);
  await page.waitForLoadState('networkidle');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: `${ARTIFACTS}/LIGHTFIX_modal.png` });

  await browser.close();
})();
