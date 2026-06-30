# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: auditApp.e2e.spec.js >> End-to-End Audit & Security Penetration Test >> Perform Ask Pandit queries and token validation
- Location: tests\auditApp.e2e.spec.js:95:3

# Error details

```
Test timeout of 30000ms exceeded.
```

```
Error: locator.click: Test timeout of 30000ms exceeded.
Call log:
  - waiting for locator('button:has-text("15")').first()

```

# Page snapshot

```yaml
- generic [ref=e3]:
  - main [ref=e4]:
    - generic [ref=e5]:
      - generic [ref=e8]:
        - heading "Select Day" [level=3] [ref=e10]
        - generic [ref=e11]:
          - generic [ref=e12] [cursor=pointer]: "01"
          - generic [ref=e13] [cursor=pointer]: "02"
          - generic [ref=e14] [cursor=pointer]: "03"
          - generic [ref=e15] [cursor=pointer]: "04"
          - generic [ref=e16] [cursor=pointer]: "05"
          - generic [ref=e17] [cursor=pointer]: "06"
          - generic [ref=e18] [cursor=pointer]: "07"
          - generic [ref=e19] [cursor=pointer]: "08"
          - generic [ref=e20] [cursor=pointer]: "09"
          - generic [ref=e21] [cursor=pointer]: "10"
          - generic [ref=e22] [cursor=pointer]: "11"
          - generic [ref=e23] [cursor=pointer]: "12"
          - generic [ref=e24] [cursor=pointer]: "13"
          - generic [ref=e25] [cursor=pointer]: "14"
          - generic [ref=e26] [cursor=pointer]: "15"
          - generic [ref=e27] [cursor=pointer]: "16"
          - generic [ref=e28] [cursor=pointer]: "17"
          - generic [ref=e29] [cursor=pointer]: "18"
          - generic [ref=e30] [cursor=pointer]: "19"
          - generic [ref=e31] [cursor=pointer]: "20"
          - generic [ref=e32] [cursor=pointer]: "21"
          - generic [ref=e33] [cursor=pointer]: "22"
          - generic [ref=e34] [cursor=pointer]: "23"
          - generic [ref=e35] [cursor=pointer]: "24"
          - generic [ref=e36] [cursor=pointer]: "25"
          - generic [ref=e37] [cursor=pointer]: "26"
          - generic [ref=e38] [cursor=pointer]: "27"
          - generic [ref=e39] [cursor=pointer]: "28"
          - generic [ref=e40] [cursor=pointer]: "29"
          - generic [ref=e41] [cursor=pointer]: "30"
          - generic [ref=e42] [cursor=pointer]: "31"
        - button "Cancel" [ref=e44]
      - generic [ref=e46]:
        - button "←" [ref=e47]
        - generic [ref=e48]:
          - heading "Pandit AI Chat" [level=1] [ref=e49]
          - generic [ref=e52]: Divine Presence Online
        - generic [ref=e54]:
          - generic [ref=e55]: Balance
          - generic [ref=e56]:
            - generic [ref=e57]: "40"
            - generic [ref=e58]: 🪙
      - generic [ref=e62]:
        - generic [ref=e63]:
          - heading "Birth Details" [level=2] [ref=e64]
          - generic [ref=e65]:
            - generic [ref=e66]: Name *
            - textbox "e.g. Rahul" [ref=e67]: Rahul
          - generic [ref=e68]:
            - generic [ref=e69]: Date of Birth *
            - generic [ref=e70]:
              - button "Day ▼" [active] [ref=e71]:
                - generic [ref=e72]: Day
                - generic [ref=e73]: ▼
              - button "Month ▼" [ref=e74]:
                - generic [ref=e75]: Month
                - generic [ref=e76]: ▼
              - button "Year ▼" [ref=e77]:
                - generic [ref=e78]: Year
                - generic [ref=e79]: ▼
          - generic [ref=e80]:
            - generic [ref=e81]: Time of Birth *
            - generic [ref=e82]:
              - button "Hour ▼" [ref=e83]:
                - generic [ref=e84]: Hour
                - generic [ref=e85]: ▼
              - button "Min ▼" [ref=e86]:
                - generic [ref=e87]: Min
                - generic [ref=e88]: ▼
              - button "AM/PM ▼" [ref=e89]:
                - generic [ref=e90]: AM/PM
                - generic [ref=e91]: ▼
          - group [ref=e92]:
            - generic "More details (recommended for higher accuracy) ▼" [ref=e93] [cursor=pointer]:
              - generic [ref=e94]: More details (recommended for higher accuracy)
              - generic [ref=e95]: ▼
        - button "Start Chatting" [disabled] [ref=e96]
  - navigation [ref=e97]:
    - button "🏠 Home" [ref=e98] [cursor=pointer]:
      - generic [ref=e99]: 🏠
      - generic [ref=e100]: Home
    - button "🔮 Pandit" [ref=e101] [cursor=pointer]:
      - generic [ref=e102]: 🔮
      - generic [ref=e103]: Pandit
    - button "🃏 Tarot" [ref=e104] [cursor=pointer]:
      - generic [ref=e105]: 🃏
      - generic [ref=e106]: Tarot
    - button "🎡 Wheel" [ref=e107] [cursor=pointer]:
      - generic [ref=e108]: 🎡
      - generic [ref=e109]: Wheel
    - button "👤 Profile" [ref=e110] [cursor=pointer]:
      - generic [ref=e111]: 👤
      - generic [ref=e112]: Profile
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | import * as path from 'path';
  3   | 
  4   | test.describe('End-to-End Audit & Security Penetration Test', () => {
  5   |   const screenshotDir = 'C:/Users/user/.gemini/antigravity-ide/brain/2e12a55e-e8ab-4ef5-acf4-f878baea3bc3';
  6   | 
  7   |   test('Perform complete page crawl and capture screenshots', async ({ page }) => {
  8   |     // 1. BOOT & LOGIN
  9   |     await page.goto('/#/login');
  10  |     await page.waitForLoadState('networkidle');
  11  |     await page.screenshot({ path: path.join(screenshotDir, 'login.png') });
  12  | 
  13  |     const guestButton = page.getByRole('button', { name: 'Continue as Guest' });
  14  |     await expect(guestButton).toBeVisible();
  15  |     await guestButton.click();
  16  |     await expect(page).toHaveURL(/.*#\//);
  17  |     await page.waitForTimeout(3000);
  18  | 
  19  |     // 2. HOME SCREEN
  20  |     await page.screenshot({ path: path.join(screenshotDir, 'home.png') });
  21  | 
  22  |     // 3. TAROT SCREEN
  23  |     await page.goto('/#/tarot');
  24  |     await page.waitForTimeout(3000);
  25  |     await page.screenshot({ path: path.join(screenshotDir, 'tarot.png') });
  26  | 
  27  |     // 4. ASK PANDIT SCREEN
  28  |     await page.goto('/#/ask-pandit');
  29  |     await page.waitForTimeout(3000);
  30  |     await page.screenshot({ path: path.join(screenshotDir, 'ask-pandit.png') });
  31  | 
  32  |     // 5. FORTUNE WHEEL SCREEN
  33  |     await page.goto('/#/fortune-wheel');
  34  |     await page.waitForTimeout(3000);
  35  |     await page.screenshot({ path: path.join(screenshotDir, 'fortune-wheel.png') });
  36  | 
  37  |     // 6. PREMIUM SCREEN
  38  |     await page.goto('/#/premium');
  39  |     await page.waitForTimeout(3000);
  40  |     await page.screenshot({ path: path.join(screenshotDir, 'premium.png') });
  41  | 
  42  |     // 7. PROFILE SCREEN
  43  |     await page.goto('/#/profile');
  44  |     await page.waitForTimeout(3000);
  45  |     await page.screenshot({ path: path.join(screenshotDir, 'profile.png') });
  46  |   });
  47  | 
  48  |   const fillBirthDetails = async (page) => {
  49  |     // Fill Name
  50  |     await page.locator('input[placeholder*="Rahul"]').fill('Rahul');
  51  | 
  52  |     // Select Day
  53  |     await page.locator('button:has-text("Day")').first().click();
> 54  |     await page.locator('button:has-text("15")').first().click();
      |                                                         ^ Error: locator.click: Test timeout of 30000ms exceeded.
  55  | 
  56  |     // Select Month
  57  |     await page.locator('button:has-text("Month")').first().click();
  58  |     await page.locator('button:has-text("August")').first().click();
  59  | 
  60  |     // Select Year
  61  |     await page.locator('button:has-text("Year")').first().click();
  62  |     await page.locator('button:has-text("1995")').first().click();
  63  | 
  64  |     // Select Hour
  65  |     await page.locator('button:has-text("Hour")').first().click();
  66  |     await page.locator('button:has-text("09")').first().click();
  67  | 
  68  |     // Select Minute
  69  |     await page.locator('button:has-text("Min")').first().click();
  70  |     await page.locator('button:has-text("30")').first().click();
  71  | 
  72  |     // Select Period
  73  |     await page.locator('button:has-text("Period")').first().click();
  74  |     await page.locator('button:has-text("AM")').first().click();
  75  | 
  76  |     // Select Gender (Male)
  77  |     await page.locator('button:has-text("Male")').first().click();
  78  | 
  79  |     // Select Marital Status
  80  |     await page.locator('button:has-text("Marital")').first().click();
  81  |     await page.locator('button:has-text("Single")').first().click();
  82  | 
  83  |     // Select Occupation
  84  |     await page.locator('button:has-text("Occupation")').first().click();
  85  |     await page.locator('button:has-text("Private Job")').first().click();
  86  | 
  87  |     // Fill Place of Birth
  88  |     await page.locator('input[placeholder*="New Delhi"]').fill('New Delhi');
  89  | 
  90  |     // Click Start Chat
  91  |     await page.locator('button:has-text("Start Chat")').click();
  92  |     await page.waitForTimeout(2000);
  93  |   };
  94  | 
  95  |   test('Perform Ask Pandit queries and token validation', async ({ page }) => {
  96  |     await page.goto('/#/');
  97  |     await page.waitForTimeout(2000);
  98  |     if (page.url().includes('/login')) {
  99  |       await page.getByRole('button', { name: 'Continue as Guest' }).click();
  100 |       await page.waitForTimeout(2000);
  101 |     }
  102 | 
  103 |     await page.goto('/#/ask-pandit');
  104 |     await page.waitForTimeout(2000);
  105 | 
  106 |     // If Birth details form is visible, fill it
  107 |     const startChatButton = page.locator('button:has-text("Start Chat")');
  108 |     if (await startChatButton.isVisible()) {
  109 |       await fillBirthDetails(page);
  110 |     }
  111 | 
  112 |     const inputField = page.locator('input[type="text"]').first();
  113 |     const sendButton = page.locator('button[type="submit"]').first();
  114 | 
  115 |     const testQueries = [
  116 |       'Hlo',
  117 |       'Namaste',
  118 |       'Har Har Mahadev',
  119 |       'Jai Mata Di meri shadi kab hogi',
  120 |       'Meri job kab lagegi'
  121 |     ];
  122 | 
  123 |     for (const query of testQueries) {
  124 |       console.log(`[AUDIT] Submitting Pandit AI query: "${query}"`);
  125 |       await inputField.fill(query);
  126 |       await page.waitForTimeout(500);
  127 |       await sendButton.click();
  128 |       await page.waitForTimeout(6000); // Wait for response
  129 |       await page.screenshot({ path: path.join(screenshotDir, `pandit_query_${query.replace(/\s+/g, '_')}.png`) });
  130 |     }
  131 |   });
  132 | });
  133 | 
```