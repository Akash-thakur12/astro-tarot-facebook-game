# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: debug-auth.spec.js >> Capture check-status request
- Location: tests\debug-auth.spec.js:3:1

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: page.waitForSelector: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("Continue as Guest")') to be visible

```

# Test source

```ts
  1  | import { test, expect } from '@playwright/test';
  2  | 
  3  | test('Capture check-status request', async ({ page }) => {
  4  |   await page.goto('http://localhost:3000/#/');
  5  |   
  6  |   // Wait for login page
> 7  |   await page.waitForSelector('button:has-text("Continue as Guest")');
     |              ^ Error: page.waitForSelector: Test timeout of 30000ms exceeded.
  8  |   
  9  |   // Capture the request
  10 |   const [request] = await Promise.all([
  11 |     page.waitForRequest(req => req.url().includes('/api/user/check-status')),
  12 |     page.click('button:has-text("Continue as Guest")')
  13 |   ]);
  14 | 
  15 |   console.log('Request URL:', request.url());
  16 |   console.log('Request Headers:', JSON.stringify(request.headers(), null, 2));
  17 |   
  18 |   const response = await request.response();
  19 |   console.log('Response Status:', response.status());
  20 |   const body = await response.json();
  21 |   console.log('Response Body:', JSON.stringify(body, null, 2));
  22 | });
  23 | 
```