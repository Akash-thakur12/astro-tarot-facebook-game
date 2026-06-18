import { test, expect } from '@playwright/test';

test('Capture check-status request', async ({ page }) => {
  await page.goto('http://localhost:3000/#/');
  
  // Wait for login page
  await page.waitForSelector('button:has-text("Continue as Guest")');
  
  // Capture the request
  const [request] = await Promise.all([
    page.waitForRequest(req => req.url().includes('/api/user/check-status')),
    page.click('button:has-text("Continue as Guest")')
  ]);

  console.log('Request URL:', request.url());
  console.log('Request Headers:', JSON.stringify(request.headers(), null, 2));
  
  const response = await request.response();
  console.log('Response Status:', response.status());
  const body = await response.json();
  console.log('Response Body:', JSON.stringify(body, null, 2));
});
