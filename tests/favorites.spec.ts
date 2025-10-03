import { test, expect } from '@playwright/test';

test.describe('Favorites System', () => {
  test.beforeEach(async ({ page }) => {
    // Clear localStorage before each test
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('should show empty state on homepage when no favorites', async ({ page }) => {
    await page.goto('/#/');
    
    // Should show empty state message
    await expect(page.locator('text=No favorite tools selected yet')).toBeVisible();
    await expect(page.locator('text=Use the star icons in the sidebar to add tools to your favorites')).toBeVisible();
  });

  test('should add tool to favorites and show on homepage', async ({ page }) => {
    // Go to Base64 tool
    await page.goto('/#/tools/base64');
    
    // Click the star button to favorite
    const starButton = page.locator('[data-testid="favorite-star"]').first();
    await starButton.click();
    
    // Go to homepage
    await page.goto('/#/');
    
    // Should show Base64 tool on homepage (use more specific selector)
    await expect(page.locator('.tool-preview-card:has-text("Base64 Encoder/Decoder")')).toBeVisible();
    await expect(page.locator('text=1 favorite')).toBeVisible();
  });

  test('should remove tool from favorites', async ({ page }) => {
    // First add a favorite
    await page.goto('/#/tools/base64');
    const starButton = page.locator('[data-testid="favorite-star"]').first();
    await starButton.click();
    
    // Go to homepage to verify it's there
    await page.goto('/#/');
    await expect(page.locator('.tool-preview-card:has-text("Base64 Encoder/Decoder")')).toBeVisible();
    
    // Go back to tool and unfavorite
    await page.goto('/#/tools/base64');
    await starButton.click();
    
    // Go to homepage - should be empty again
    await page.goto('/');
    await expect(page.locator('text=No favorite tools selected yet')).toBeVisible();
  });

  test('should persist favorites across page navigation', async ({ page }) => {
    // Add multiple favorites
    await page.goto('/#/tools/base64');
    await page.locator('[data-testid="favorite-star"]').first().click();
    
    await page.goto('/#/tools/jwt');
    await page.locator('[data-testid="favorite-star"]').first().click();
    
    // Go to homepage
    await page.goto('/#/');
    
    // Should show both tools
    await expect(page.locator('.tool-preview-card:has-text("Base64 Encoder/Decoder")')).toBeVisible();
    await expect(page.locator('.tool-preview-card:has-text("JWT Decoder")')).toBeVisible();
    await expect(page.locator('text=2 favorites')).toBeVisible();
    
    // Navigate away and back
    await page.goto('/#/tools/url');
    await page.goto('/');
    
    // Favorites should still be there
    await expect(page.locator('.tool-preview-card:has-text("Base64 Encoder/Decoder")')).toBeVisible();
    await expect(page.locator('.tool-preview-card:has-text("JWT Decoder")')).toBeVisible();
  });

  test('should show correct star states on tool pages', async ({ page }) => {
    // Initially unfavorited
    await page.goto('/#/tools/base64');
    const starButton = page.locator('[data-testid="favorite-star"]').first();
    
    // Check if the button has the correct icon (Blueprint might use different attributes)
    const iconElement = starButton.locator('[data-icon="star-empty"]');
    await expect(iconElement).toBeVisible();
    
    // After favoriting
    await starButton.click();
    const filledIconElement = starButton.locator('[data-icon="star"]');
    await expect(filledIconElement).toBeVisible();
    
    // Navigate away and back
    await page.goto('/#/tools/jwt');
    await page.goto('/#/tools/base64');
    
    // Should still be favorited
    const stillFilledIconElement = starButton.locator('[data-icon="star"]');
    await expect(stillFilledIconElement).toBeVisible();
  });

  test('should handle all tool types', async ({ page }) => {
    const tools = [
      { path: 'base64', name: 'Base64 Encoder/Decoder' },
      { path: 'jwt', name: 'JWT Decoder' },
      { path: 'url', name: 'URL Encoder/Decoder' },
      { path: 'json', name: 'JSON Formatter' },
      { path: 'diff', name: 'Diff Viewer' }
    ];
    
    // Favorite each tool
    for (const tool of tools) {
      await page.goto(`/#/tools/${tool.path}`);
      await page.locator('[data-testid="favorite-star"]').first().click();
    }
    
    // Go to homepage
    await page.goto('/#/');
    
    // Should show all tools
    for (const tool of tools) {
      await expect(page.locator(`.tool-preview-card:has-text("${tool.name}")`)).toBeVisible();
    }
    
    await expect(page.locator('text=5 favorites')).toBeVisible();
  });

  test('should maintain favorites after browser refresh', async ({ page }) => {
    // Add favorites
    await page.goto('/#/tools/base64');
    await page.locator('[data-testid="favorite-star"]').first().click();
    
    await page.goto('/#/tools/jwt');
    await page.locator('[data-testid="favorite-star"]').first().click();
    
    // Refresh the page
    await page.reload();
    
    // Go to homepage
    await page.goto('/#/');
    
    // Favorites should persist
    await expect(page.locator('.tool-preview-card:has-text("Base64 Encoder/Decoder")')).toBeVisible();
    await expect(page.locator('.tool-preview-card:has-text("JWT Decoder")')).toBeVisible();
  });
});
