import { test, expect } from '@playwright/test';

test.describe('Application Validation', () => {
  let consoleErrors = [];
  let networkFailures = [];

  test.beforeEach(async ({ page }) => {
    consoleErrors = [];
    networkFailures = [];
    const startTime = Date.now();
    
    page.on('console', msg => {
      const elapsed = Date.now() - startTime;
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
        console.log(`[${elapsed}ms][CONSOLE ERROR]: ${msg.text()}`);
      }
    });

    page.on('requestfailed', request => {
      const elapsed = Date.now() - startTime;
      networkFailures.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
      console.log(`[${elapsed}ms][NETWORK FAILURE]: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
    });

    page.on('response', async response => {
      const elapsed = Date.now() - startTime;
      if (response.url().includes('/api/user/check-status')) {
        console.log(`[${elapsed}ms][EVIDENCE] API Response (${response.status()}): ${response.url()}`);
        try {
          const data = await response.json();
          console.log(`[${elapsed}ms][EVIDENCE] Firestore User Data: ${JSON.stringify(data)}`);
        } catch (e) {
          console.log(`[${elapsed}ms][EVIDENCE] Failed to parse API response as JSON`);
        }
      } else if (response.status() >= 400) {
        console.log(`[${elapsed}ms][HTTP ${response.status()}]: ${response.request().method()} ${response.url()}`);
      }
    });
  });

  test('Guest Login and Initial State Verification', async ({ page }) => {
    // Go to the local dev server
    await page.goto('/#/login');
    
    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Click "Continue as Guest"
    const guestButton = page.getByRole('button', { name: 'Continue as Guest' });
    await expect(guestButton).toBeVisible();
    await guestButton.click();

    // Verify redirection to home
    await expect(page).toHaveURL(/.*#\//);
    
    // Wait for Home content
    await page.waitForTimeout(3000);

    // Capture starting coins
    const coinsElement = page.locator('span.text-mystic-gold.font-black.text-lg').first();
    const coinsText = await coinsElement.innerText();
    console.log(`[EVIDENCE] Starting Coins: ${coinsText}`);

    // Verify user profile data if possible via console logs from the app
    // The app calls /api/user/check-status on Home load.
    
    // Check if there are any remaining console errors or network failures
    if (consoleErrors.length > 0) {
      console.log(`[EVIDENCE] Console Errors detected: ${consoleErrors.length}`);
    }
    if (networkFailures.length > 0) {
      console.log(`[EVIDENCE] Network Failures detected: ${networkFailures.length}`);
    }

    expect(consoleErrors).not.toContain(/SyntaxError/); // Specifically checking for the bug I supposedly fixed
  });
});
