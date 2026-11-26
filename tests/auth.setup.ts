import { test as setup, expect } from '@playwright/test';

/**
 * Login once, save storage state for all tests.
 * Uses Better Auth API /api/auth/sign-in/email
 * 
 * Run: npx playwright test --project=setup
 */
setup('authenticate', async ({ page }) => {
  const BASE = 'https://dev.erza.ai';
  
  // Login via API
  const res = await page.request.post(BASE + '/api/auth/sign-in/email', {
    data: {
      email: process.env.ERZA_EMAIL || 'dodihomeless@web-library.net',
      password: process.env.ERZA_PASSWORD || '',
    },
  });
  
  expect(res.status()).toBe(200);
  
  // Navigate to set cookies
  await page.goto(BASE + '/en/dashboard');
  await page.waitForLoadState('networkidle');
  
  // Verify logged in
  const bodyText = await page.locator('body').innerText();
  expect(bodyText).toContain('Dashboard');
  
  // Save storage state
  await page.context().storageState({ path: 'playwright/.auth/storageState.json' });
});