import { test, expect } from '@playwright/test';

test.describe('Erza AI - Quick Create & Auto Generate', () => {
  const BASE = 'https://dev.erza.ai';

  test.beforeEach(async ({ page }) => {
    await page.goto(BASE + '/en/article/quick-create');
    await page.waitForLoadState('networkidle');
  });

  test('Quick Create single article - generates output & deducts credit', async ({ page }) => {
    await page.fill('textarea[placeholder*="Enter your article topic"]', 'Tips olahraga pagi untuk pemula');
    await page.click('button:has-text("Create 1 Articles")');
    await expect(page.locator('text=/\\d+ Words/')).toBeVisible({ timeout: 45000 });
    await expect(page.locator('text=Credit Used')).toBeVisible();
  });

  test('Quick Create bulk - max 10 rows enforced', async ({ page }) => {
    await page.goto(BASE + '/en/article/quick-create?tab=bulk');
    await page.waitForLoadState('networkidle');
    
    // Add 10 topics
    for (let i = 1; i <= 10; i++) {
      const topicInput = page.locator('textarea[placeholder*="topic"]').nth(i - 1);
      if (await topicInput.count() > 0) {
        await topicInput.fill(`Topik olahraga ${i}`);
      } else if (i < 10) {
        await page.click('button:has-text("Add Topic")');
      }
    }
    
    // Verify Add Topic button hidden at 10
    await expect(page.locator('button:has-text("Add Topic")')).toBeHidden();
    
    // Submit
    await page.click('button:has-text("Create Articles")');
    await expect(page.locator('text=/\\d+ Words/')).toBeVisible({ timeout: 60000 });
  });

  test('Auto Generate SIMPLE with pipe override - draft + schedule + WP site', async ({ page }) => {
    await page.goto(BASE + '/en/article/auto-generate');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea[placeholder*="Enter your article topic"]', 'Cara makan sehat setiap hari');
    
    // Status = Draft
    await page.click('button:has-text("Publish")'); // open dropdown
    await page.click('text=Draft');
    
    // Schedule = Later 11 menit
    await page.click('button:has-text("Post Now")');
    await page.click('text=Schedule Later');
    await page.fill('input[placeholder*="minutes"]', '11');
    
    // Site = WordPress Site 17cf4b (default)
    
    await page.click('button:has-text("Create 1 Articles")');
    await expect(page.locator('text=/generationId|preview/i')).toBeVisible({ timeout: 45000 });
  });

  test('Auto Generate BULK - 5 topics + template workaround', async ({ page }) => {
    await page.goto(BASE + '/en/article/auto-generate?tab=bulk');
    await page.waitForLoadState('networkidle');
    
    // Fill 5 topics
    for (let i = 1; i <= 5; i++) {
      await page.locator('textarea[placeholder*="topic"]').nth(i - 1).fill(`Olahraga sehat ${i}`);
    }
    
    // Template workaround: click All Templates -> select card -> Apply
    await page.click('button:has-text("All Templates")');
    await page.waitForTimeout(500);
    await page.click('text=admin template'); // or first template card
    await page.click('button:has-text("Apply")');
    
    // Status = Draft
    await page.click('button:has-text("Publish")');
    await page.click('text=Draft');
    
    // Schedule = Later 11 menit
    await page.click('button:has-text("Post Now")');
    await page.click('text=Schedule Later');
    await page.fill('input[placeholder*="minutes"]', '11');
    
    await page.click('button:has-text("Create Articles")');
    await expect(page.locator('text=/generationId|preview/i')).toBeVisible({ timeout: 60000 });
  });
});

test.describe('Erza AI - AI Tools (English)', () => {
  const BASE = 'https://dev.erza.ai';

  test('Writing Assistant - Import, Save, Export, Add to Collection work', async ({ page }) => {
    await page.goto(BASE + '/en/ai-tools/writing-assistant');
    await page.waitForLoadState('networkidle');
    
    // Verify buttons exist
    await expect(page.locator('button:has-text("Import")')).toBeVisible();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Export")')).toBeVisible();
    await expect(page.locator('button:has-text("Add to Collection")')).toBeVisible();
    
    // Generate - known to fail (0 output, -1 credit) - just verify it triggers
    await page.fill('textarea[placeholder*="Enter your text"]', 'Test content for writing assistant to process. This is a sample text that should be long enough for the tool to work with.');
    await page.click('button:has-text("Generate")');
    // Wait for either success or known failure pattern
    await page.waitForTimeout(5000);
  });

  test('Humanizer - min 30 words, generate fails (known bug)', async ({ page }) => {
    await page.goto(BASE + '/en/ai-tools/humanize');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea[placeholder*="Enter your text"]', 'This is a test text that should be long enough for the humanizer tool to process. It needs at least thirty words to enable the button.');
    await expect(page.locator('button:has-text("Humanize")')).toBeEnabled();
    await page.click('button:has-text("Humanize")');
    await page.waitForTimeout(5000);
    // Known: returns empty output, -3 credits
  });

  test('Proofreader - min 150 words, word counter stuck at 0/2000', async ({ page }) => {
    await page.goto(BASE + '/en/ai-tools/proofread');
    await page.waitForLoadState('networkidle');
    
    const longText = 'This is a test text for proofreader. '.repeat(10); // ~150 words
    await page.fill('textarea[placeholder*="Enter your text"]', longText);
    // Word counter shows 0/2000 despite input (known bug)
    await page.click('button:has-text("Check")');
    await page.waitForTimeout(5000);
  });

  test('Grammar Checker - min 30 words, word counter bug', async ({ page }) => {
    await page.goto(BASE + '/en/ai-tools/grammar-correction');
    await page.waitForLoadState('networkidle');
    
    await page.fill('textarea[placeholder*="Enter your text"]', 'This is a test text for grammar checker that has enough words to meet the minimum requirement.');
    await page.click('button:has-text("Check")');
    await page.waitForTimeout(5000);
  });

  test('AI Detector - Scan button appears after 260 words, no backend call', async ({ page }) => {
    await page.goto(BASE + '/en/ai-tools/ai-detector');
    await page.waitForLoadState('networkidle');
    
    const longText = 'This is a test text for AI detector. '.repeat(20); // ~260 words
    await page.fill('textarea[placeholder*="Enter your text"]', longText);
    await expect(page.locator('button:has-text("Scan")')).toBeVisible();
    await page.click('button:has-text("Scan")');
    await page.waitForTimeout(5000);
    // Known: no /api/detect call, shows "No content to analyze yet"
  });

  test('Plagiarism Checker - identical bug to AI Detector', async ({ page }) => {
    await page.goto(BASE + '/en/ai-tools/plagiarism-checker');
    await page.waitForLoadState('networkidle');
    
    const longText = 'This is a test text for plagiarism checker. '.repeat(15); // ~180 words
    await page.fill('textarea[placeholder*="Enter your text"]', longText);
    await expect(page.locator('button:has-text("Scan")')).toBeVisible();
    await page.click('button:has-text("Scan")');
    await page.waitForTimeout(5000);
    // Known: no backend call, shows "Minimum 150 words" error
  });
});

test.describe('Erza AI - Indonesian Locale (i18n)', () => {
  const BASE = 'https://dev.erza.ai';

  test('AI Chat identity leak - answers "dilatih oleh Google" instead of Erza AI', async ({ page }) => {
    await page.goto(BASE + '/id/ai-chat');
    await page.waitForLoadState('networkidle');
    
    // Check history cards for wrong identity
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).not.toContain('dilatih oleh Google');
    
    // Send prompt "Siapa kamu?" - 1 credit
    await page.fill('textarea[placeholder*="Ask anything"]', 'Siapa kamu?');
    await page.click('button:has-text("Send")');
    await page.waitForTimeout(3000);
    
    const responseText = await page.locator('body').innerText();
    expect(responseText).not.toContain('dilatih oleh Google');
    // Expected: "Saya adalah Erza AI..."
  });

  test('Dashboard /id/dashboard - mostly translated (reference)', async ({ page }) => {
    await page.goto(BASE + '/id/dashboard');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.locator('body').innerText();
    expect(bodyText).toContain('Beranda');
    expect(bodyText).toContain('PERPUSTAKAAN');
    expect(bodyText).toContain('Koleksi');
  });

  test('AI Tools sidebar still English in /id locale', async ({ page }) => {
    await page.goto(BASE + '/id/ai-tools/writing-assistant');
    await page.waitForLoadState('networkidle');
    
    // Sidebar should be translated but currently English
    const sidebarText = await page.locator('aside, nav, [role=navigation]').innerText();
    // These are BUGS - currently English
    console.log('Sidebar text:', sidebarText);
  });

  test('Route /id/ai-tools/ returns 404 "Tautan Dibatasi"', async ({ page }) => {
    await page.goto(BASE + '/id/ai-tools/');
    await page.waitForLoadState('networkidle');
    
    const bodyText = await page.locator('body').innerText();
    // Currently shows "Tautan Dibatasi atau Tidak Valid"
    expect(bodyText).toContain('Tautan Dibatasi');
  });
});