import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test('should load the login page', async ({ page }) => {
    // Navigate to the app root (which should redirect to login if not authenticated)
    await page.goto('/');
    
    // Check if we are on the login page or if login form exists
    await expect(page).toHaveURL(/.*login/);
    await expect(page.getByRole('button', { name: /sign in|login/i })).toBeVisible();
  });

  // Example test for successful login (replace with real credentials or mocked API)
  test('should login with valid credentials', async ({ page }) => {
    await page.goto('/login');
    
    // Using standard selectors. Adjust to match actual data-testid or input names.
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    if (await emailInput.isVisible() && await passwordInput.isVisible()) {
      await emailInput.fill(process.env.TEST_USER_EMAIL);
      await passwordInput.fill(process.env.TEST_USER_PASSWORD);
      await page.getByRole('button', { name: /sign in|login/i }).click();
      
      // Check if redirected to a dashboard
      await expect(page).not.toHaveURL(/.*login/);
    }
  });
});
