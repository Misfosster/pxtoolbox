import { test, expect } from '@playwright/test';

test.describe('JWT Decoder Tool', () => {
  test('decodes a valid JWT header and payload', async ({ page }) => {
    await page.goto('/#/tools/jwt');

    // sample unsigned token (header: {"alg":"none","typ":"JWT"}, payload: {"sub":"123","name":"John"})
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify({ sub: '123', name: 'John' })).toString('base64url');
    const token = `${header}.${payload}.`;

    await page.locator('#jwt-input').fill(token);

    await expect(page.locator('#jwt-header')).toHaveValue(/"typ": "JWT"/);
    await expect(page.locator('#jwt-payload')).toHaveValue(/"name": "John"/);

    // Copy header/payload buttons (overlays) should be clickable
    await page.getByTestId('copy-header-btn').click();
    await page.getByTestId('copy-payload-btn').click();
  });

  test('shows error for malformed JWT', async ({ page }) => {
    await page.goto('/#/tools/jwt');

    await page.locator('#jwt-input').fill('not.a.jwt');

    // Base64URL decode will fail for some malformed segments; or JSON parse may fail
    const errorHelper = page.getByText(/Invalid Base64URL in token|Invalid JSON in segment|JWT must have 2 or 3 segments/);
    await expect(errorHelper).toBeVisible();
  });
});


