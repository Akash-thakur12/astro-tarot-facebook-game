# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: e2e.spec.js >> E2E Application Flow >> 1 & 2 & 3: Login as Guest, New User Creation, Verify Starting Coins
- Location: tests\e2e.spec.js:32:3

# Error details

```
Error: expect(page).toHaveURL(expected) failed

Expected pattern: /.*#\/login/
Received string:  "http://localhost:3000/#/"
Timeout: 5000ms

Call log:
  - Expect "toHaveURL" with timeout 5000ms
    14 × unexpected value "http://localhost:3000/#/"

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test.describe.serial('E2E Application Flow', () => {
  4  |   let failedRequests = [];
  5  |   let pageErrors = [];
  6  |   let consoleErrors = [];
  7  | 
  8  |   test.beforeEach(async ({ page }) => {
  9  |     failedRequests = [];
  10 |     pageErrors = [];
  11 |     consoleErrors = [];
  12 | 
  13 |     page.on('pageerror', error => pageErrors.push(error.message));
  14 |     page.on('console', msg => {
  15 |       if (msg.type() === 'error') {
  16 |         consoleErrors.push(msg.text());
  17 |       }
  18 |     });
  19 |     page.on('response', response => {
  20 |       if (response.status() >= 400 && response.status() !== 429) {
  21 |         failedRequests.push(`${response.request().method()} ${response.url()} - ${response.status()}`);
  22 |       }
  23 |     });
  24 |   });
  25 | 
  26 |   test.afterEach(async ({ page }, testInfo) => {
  27 |     if (pageErrors.length > 0) console.log(`[Page Errors]: ${pageErrors.join(', ')}`);
  28 |     if (consoleErrors.length > 0) console.log(`[Console Errors]: ${consoleErrors.join(', ')}`);
  29 |     if (failedRequests.length > 0) console.log(`[Failed Requests]: ${failedRequests.join(', ')}`);
  30 |   });
  31 | 
  32 |   test('1 & 2 & 3: Login as Guest, New User Creation, Verify Starting Coins', async ({ page }) => {
  33 |     await page.goto('/#/');
  34 |     
  35 |     // Login page should be displayed since we are not authenticated
> 36 |     await expect(page).toHaveURL(/.*#\/login/);
     |                        ^ Error: expect(page).toHaveURL(expected) failed
  37 | 
  38 |     // Click Continue as Guest
  39 |     await page.getByRole('button', { name: 'Continue as Guest' }).click();
  40 | 
  41 |     // Verify navigation to home
  42 |     await expect(page).toHaveURL(/.*#\//);
  43 | 
  44 |     // Wait for the UI to load
  45 |     await page.waitForTimeout(2000);
  46 | 
  47 |     // Starting coins should be 40.
  48 |     const coinsElement = page.locator('span.text-mystic-gold.font-black.text-lg').first();
  49 |     await expect(coinsElement).toHaveText('40');
  50 |     
  51 |     console.log(`Verified starting coins: 40`);
  52 |   });
  53 | 
  54 |   test('Navigation and API Verification', async ({ page }) => {
  55 |     await page.goto('/#/');
  56 |     await page.waitForTimeout(2000);
  57 | 
  58 |     // Navigate to Tarot
  59 |     await page.getByRole('heading', { name: 'Today\'s Tarot' }).click();
  60 |     await expect(page).toHaveURL(/.*#\/tarot/);
  61 |     
  62 |     // Navigate to Fortune Wheel
  63 |     await page.goto('/#/');
  64 |     await page.getByRole('heading', { name: 'Fortune Wheel' }).click();
  65 |     await expect(page).toHaveURL(/.*#\/fortune-wheel/);
  66 |     
  67 |     // Navigate to Ask Pandit
  68 |     await page.goto('/#/');
  69 |     await page.getByRole('heading', { name: 'Ask Pandit AI' }).click();
  70 |     await expect(page).toHaveURL(/.*#\/ask-pandit/);
  71 | 
  72 |     // Intercept one of the API calls (e.g., check-status) to see its content
  73 |     const response = await page.request.post('/api/user/check-status', {
  74 |       data: { provider: 'anonymous' }
  75 |     });
  76 |     
  77 |     console.log(`API Status: ${response.status()}`);
  78 |     const contentType = response.headers()['content-type'];
  79 |     console.log(`API Content-Type: ${contentType}`);
  80 |     if (contentType && contentType.includes('text/html')) {
  81 |        console.log('BUG: API is returning HTML instead of JSON (Vite dev server proxy missing)');
  82 |     }
  83 |   });
  84 | });
  85 | 
```