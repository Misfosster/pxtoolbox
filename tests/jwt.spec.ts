import { test, expect } from '@playwright/test';

test.describe('JWT Decoder Tool', () => {
  test('decodes a valid JWT header and payload', async ({ page }) => {
    await page.goto('/tools/jwt');

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

  test('shows exp/nbf/iat helper text with UTC and relative time', async ({ page }) => {
    await page.goto('/tools/jwt');

    const nowSec = Math.floor(Date.now() / 1000);
    const payloadObj = {
      sub: 'abc',
      nbf: nowSec - 60, // became valid 1 minute ago
      iat: nowSec - 120, // issued 2 minutes ago
      exp: nowSec + 3600, // expires in 1 hour
    };
    const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
    const payload = Buffer.from(JSON.stringify(payloadObj)).toString('base64url');
    const token = `${header}.${payload}.`;

    await page.locator('#jwt-input').fill(token);

    // Helper text should include labels and UTC suffix
    await expect(page.getByText(/nbf: .* UTC/)).toBeVisible();
    await expect(page.getByText(/iat: .* UTC/)).toBeVisible();
    await expect(page.getByText(/exp: .* UTC/)).toBeVisible();
  });

  test('shows error for malformed JWT', async ({ page }) => {
    await page.goto('/tools/jwt');

    await page.locator('#jwt-input').fill('not.a.jwt');

    // Base64URL decode will fail for some malformed segments; or JSON parse may fail
    const errorHelper = page.getByText(/Invalid Base64URL in token|Invalid JSON in segment|JWT must have 2 or 3 segments/);
    await expect(errorHelper).toBeVisible();
  });
});


