import { test, expect } from '@playwright/test';

test.describe.serial('E2E Application Flow', () => {
  let failedRequests = [];
  let pageErrors = [];
  let consoleErrors = [];

  test.beforeEach(async ({ page }) => {
    failedRequests = [];
    pageErrors = [];
    consoleErrors = [];

    page.on('pageerror', error => pageErrors.push(error.message));
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });
    page.on('response', response => {
      if (response.status() >= 400 && response.status() !== 429) {
        failedRequests.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
      }
    });
  });

  test.afterEach(async ({ page }, testInfo) => {
    if (pageErrors.length > 0) console.log(`[Page Errors]: ${pageErrors.join(', ')}`);
    if (consoleErrors.length > 0) console.log(`[Console Errors]: ${consoleErrors.join(', ')}`);
    if (failedRequests.length > 0) console.log(`[Failed Requests]: ${failedRequests.join(', ')}`);
  });

  test('1 & 2 & 3: Login as Guest, New User Creation, Verify Starting Coins', async ({ page }) => {
    await page.goto('/#/');
    
    // Login page should be displayed since we are not authenticated
    await expect(page).toHaveURL(/.*#\/login/);

    // Click Continue as Guest
    await page.getByRole('button', { name: 'Continue as Guest' }).click();

    // Verify navigation to home
    await expect(page).toHaveURL(/.*#\//);

    // Wait for the UI to load
    await page.waitForTimeout(2000);

    // Starting coins should be 40.
    const coinsElement = page.locator('span.text-mystic-gold.font-black.text-lg').first();
    await expect(coinsElement).toHaveText('40');
    
    console.log(`Verified starting coins: 40`);
  });

  test('Navigation and API Verification', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForTimeout(2000);

    // If redirected to login, perform guest login
    if (page.url().includes('/login') || await page.getByRole('button', { name: 'Continue as Guest' }).isVisible()) {
      await page.getByRole('button', { name: 'Continue as Guest' }).click();
      await expect(page).toHaveURL(/.*#\//);
      await page.waitForTimeout(2000);
    }

    // Navigate to Tarot
    await page.getByRole('heading', { name: 'Today\'s Tarot' }).click();
    await expect(page).toHaveURL(/.*#\/tarot/);
    
    // Navigate to Fortune Wheel
    await page.goto('/#/');
    await page.getByRole('heading', { name: 'Fortune Wheel' }).click();
    await expect(page).toHaveURL(/.*#\/fortune-wheel/);
    
    // Navigate to Ask Pandit
    await page.goto('/#/');
    await page.getByRole('heading', { name: 'Ask Pandit AI' }).click();
    await expect(page).toHaveURL(/.*#\/ask-pandit/);

    // Intercept one of the API calls (e.g., check-status) to see its content
    const response = await page.request.post('/api/user/check-status', {
      data: { provider: 'anonymous' }
    });
    
    console.log(`API Status: ${response.status()}`);
    const contentType = response.headers()['content-type'];
    console.log(`API Content-Type: ${contentType}`);
    if (contentType && contentType.includes('text/html')) {
       console.log('BUG: API is returning HTML instead of JSON (Vite dev server proxy missing)');
    }
  });
});
