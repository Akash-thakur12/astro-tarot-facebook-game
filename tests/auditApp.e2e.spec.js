import { test, expect } from '@playwright/test';
import * as path from 'path';

test.describe('End-to-End Audit & Security Penetration Test', () => {
  const screenshotDir = 'C:/Users/user/.gemini/antigravity-ide/brain/2e12a55e-e8ab-4ef5-acf4-f878baea3bc3';

  test('Perform complete page crawl and capture screenshots', async ({ page }) => {
    // 1. BOOT & LOGIN
    await page.goto('/#/login');
    await page.waitForLoadState('networkidle');
    await page.screenshot({ path: path.join(screenshotDir, 'login.png') });

    const guestButton = page.getByRole('button', { name: 'Continue as Guest' });
    await expect(guestButton).toBeVisible();
    await guestButton.click();
    await expect(page).toHaveURL(/.*#\//);
    await page.waitForTimeout(3000);

    // 2. HOME SCREEN
    await page.screenshot({ path: path.join(screenshotDir, 'home.png') });

    // 3. TAROT SCREEN
    await page.goto('/#/tarot');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'tarot.png') });

    // 4. ASK PANDIT SCREEN
    await page.goto('/#/ask-pandit');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'ask-pandit.png') });

    // 5. FORTUNE WHEEL SCREEN
    await page.goto('/#/fortune-wheel');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'fortune-wheel.png') });

    // 6. PREMIUM SCREEN
    await page.goto('/#/premium');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'premium.png') });

    // 7. PROFILE SCREEN
    await page.goto('/#/profile');
    await page.waitForTimeout(3000);
    await page.screenshot({ path: path.join(screenshotDir, 'profile.png') });
  });

  const fillBirthDetails = async (page) => {
    // Fill Name
    await page.locator('input[placeholder*="Rahul"]').fill('Rahul');

    // Select Day
    await page.locator('button:has-text("Day")').first().click();
    await page.getByText('15', { exact: true }).first().click();

    // Select Month
    await page.locator('button:has-text("Month")').first().click();
    await page.getByText('August', { exact: true }).first().click();

    // Select Year
    await page.locator('button:has-text("Year")').first().click();
    await page.getByText('1995', { exact: true }).first().click();

    // Select Hour
    await page.locator('button:has-text("Hour")').first().click();
    await page.getByText('09', { exact: true }).first().click();

    // Select Minute
    await page.locator('button:has-text("Min")').first().click();
    await page.getByText('30', { exact: true }).first().click();

    // Select Period
    await page.locator('button:has-text("Period")').first().click();
    await page.getByText('AM', { exact: true }).first().click();

    // Select Gender (Male)
    await page.locator('button:has-text("Male")').first().click();

    // Select Marital Status
    await page.locator('button:has-text("Marital")').first().click();
    await page.getByText('Single', { exact: true }).first().click();

    // Select Occupation
    await page.locator('button:has-text("Occupation")').first().click();
    await page.getByText('Private Job', { exact: true }).first().click();

    // Fill Place of Birth
    await page.locator('input[placeholder*="New Delhi"]').fill('New Delhi');

    // Click Start Chat
    await page.locator('button:has-text("Start Chat")').click();
    await page.waitForTimeout(2000);
  };

  test('Perform Ask Pandit queries and token validation', async ({ page }) => {
    await page.goto('/#/');
    await page.waitForTimeout(2000);
    if (page.url().includes('/login')) {
      await page.getByRole('button', { name: 'Continue as Guest' }).click();
      await page.waitForTimeout(2000);
    }

    await page.goto('/#/ask-pandit');
    await page.waitForTimeout(2000);

    // If Birth details form is visible, fill it
    const startChatButton = page.locator('button:has-text("Start Chat")');
    if (await startChatButton.isVisible()) {
      await fillBirthDetails(page);
    }

    const inputField = page.locator('input[type="text"]').first();
    const sendButton = page.locator('button[type="submit"]').first();

    const testQueries = [
      'Hlo',
      'Namaste',
      'Har Har Mahadev',
      'Jai Mata Di meri shadi kab hogi',
      'Meri job kab lagegi'
    ];

    for (const query of testQueries) {
      console.log(`[AUDIT] Submitting Pandit AI query: "${query}"`);
      await inputField.fill(query);
      await page.waitForTimeout(500);
      await sendButton.click();
      await page.waitForTimeout(6000); // Wait for response
      await page.screenshot({ path: path.join(screenshotDir, `pandit_query_${query.replace(/\s+/g, '_')}.png`) });
    }
  });
});
