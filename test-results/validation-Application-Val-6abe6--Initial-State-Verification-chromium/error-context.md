# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: validation.spec.js >> Application Validation >> Guest Login and Initial State Verification
- Location: tests\validation.spec.js:42:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: getByRole('button', { name: 'Continue as Guest' })
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for getByRole('button', { name: 'Continue as Guest' })

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe('Application Validation', () => {
  4  |   let consoleErrors = [];
  5  |   let networkFailures = [];
  6  | 
  7  |   test.beforeEach(async ({ page }) => {
  8  |     consoleErrors = [];
  9  |     networkFailures = [];
  10 |     const startTime = Date.now();
  11 |     
  12 |     page.on('console', msg => {
  13 |       const elapsed = Date.now() - startTime;
  14 |       if (msg.type() === 'error') {
  15 |         consoleErrors.push(msg.text());
  16 |         console.log(`[${elapsed}ms][CONSOLE ERROR]: ${msg.text()}`);
  17 |       }
  18 |     });
  19 | 
  20 |     page.on('requestfailed', request => {
  21 |       const elapsed = Date.now() - startTime;
  22 |       networkFailures.push(`${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  23 |       console.log(`[${elapsed}ms][NETWORK FAILURE]: ${request.method()} ${request.url()} - ${request.failure()?.errorText}`);
  24 |     });
  25 | 
  26 |     page.on('response', async response => {
  27 |       const elapsed = Date.now() - startTime;
  28 |       if (response.url().includes('/api/user/check-status')) {
  29 |         console.log(`[${elapsed}ms][EVIDENCE] API Response (${response.status()}): ${response.url()}`);
  30 |         try {
  31 |           const data = await response.json();
  32 |           console.log(`[${elapsed}ms][EVIDENCE] Firestore User Data: ${JSON.stringify(data)}`);
  33 |         } catch (e) {
  34 |           console.log(`[${elapsed}ms][EVIDENCE] Failed to parse API response as JSON`);
  35 |         }
  36 |       } else if (response.status() >= 400) {
  37 |         console.log(`[${elapsed}ms][HTTP ${response.status()}]: ${response.request().method()} ${response.url()}`);
  38 |       }
  39 |     });
  40 |   });
  41 | 
  42 |   test('Guest Login and Initial State Verification', async ({ page }) => {
  43 |     // Go to the local dev server
  44 |     await page.goto('/#/login');
  45 |     
  46 |     // Wait for the page to load
  47 |     await page.waitForLoadState('networkidle');
  48 | 
  49 |     // Click "Continue as Guest"
  50 |     const guestButton = page.getByRole('button', { name: 'Continue as Guest' });
> 51 |     await expect(guestButton).toBeVisible();
     |                               ^ Error: expect(locator).toBeVisible() failed
  52 |     await guestButton.click();
  53 | 
  54 |     // Verify redirection to home
  55 |     await expect(page).toHaveURL(/.*#\//);
  56 |     
  57 |     // Wait for Home content
  58 |     await page.waitForTimeout(3000);
  59 | 
  60 |     // Capture starting coins
  61 |     const coinsElement = page.locator('span.text-mystic-gold.font-black.text-lg').first();
  62 |     const coinsText = await coinsElement.innerText();
  63 |     console.log(`[EVIDENCE] Starting Coins: ${coinsText}`);
  64 | 
  65 |     // Verify user profile data if possible via console logs from the app
  66 |     // The app calls /api/user/check-status on Home load.
  67 |     
  68 |     // Check if there are any remaining console errors or network failures
  69 |     if (consoleErrors.length > 0) {
  70 |       console.log(`[EVIDENCE] Console Errors detected: ${consoleErrors.length}`);
  71 |     }
  72 |     if (networkFailures.length > 0) {
  73 |       console.log(`[EVIDENCE] Network Failures detected: ${networkFailures.length}`);
  74 |     }
  75 | 
  76 |     expect(consoleErrors).not.toContain(/SyntaxError/); // Specifically checking for the bug I supposedly fixed
  77 |   });
  78 | });
  79 | 
```