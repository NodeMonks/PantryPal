import { test, expect } from '@playwright/test';

test.describe('Login Flow', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('http://localhost:5000/login');

    await expect(page.locator('input[name=\"username\"]')).toBeVisible();
    await expect(page.locator('input[name=\"password\"]')).toBeVisible();
    await expect(page.locator('button[type=\"submit\"]')).toBeVisible();
  });

  test('should show error with invalid credentials', async ({ page }) => {
    await page.goto('http://localhost:5000/login');

    await page.fill('input[name=\"username\"]', 'invalid');
    await page.fill('input[name=\"password\"]', 'wrong');
    await page.click('button[type=\"submit\"]');

    // Should show error message
    await expect(page.locator('text=/Invalid credentials/i')).toBeVisible();
  });
});
