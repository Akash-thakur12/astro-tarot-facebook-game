import { test, expect } from '@playwright/test';

test('Debug buttons', async ({ page }) => {
  await page.goto('http://localhost:3000/');
  await page.waitForTimeout(5000); // Wait for potential redirects
  
  console.log('Current URL:', page.url());
  
  const buttons = await page.locator('button').allTextContents();
  console.log('Buttons found:', buttons);
  
  const body = await page.locator('body').innerHTML();
  console.log('Body HTML length:', body.length);
});
