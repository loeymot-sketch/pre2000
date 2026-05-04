import type { Page } from '@playwright/test';
import { expect } from '@playwright/test';

/**
 * Session Playwright vierge → flux langue EN + invité + onboarding minimal → MainTabs.
 * Idempotent si les tabs sont déjà visibles.
 */
export async function ensureMainTabs(page: Page): Promise<void> {
  await page.goto('/HomeMain', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1500);
  if (await page.getByRole('tablist').isVisible().catch(() => false)) {
    return;
  }

  await page.goto('/Language', { waitUntil: 'domcontentloaded' });
  await page.getByText('English', { exact: true }).first().click();
  await page.getByText('Continue', { exact: true }).first().click();
  await page.getByTestId('auth_guest_button').click();
  await page.waitForTimeout(800);

  await page.getByRole('button', { name: 'I am pregnant' }).click({ timeout: 20_000 });
  await page.getByRole('button', { name: /Last Period/i }).click({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(600);

  await page.getByRole('button', { name: '25-29' }).click();
  await page.getByRole('button', { name: 'France' }).click();
  await page.getByRole('button', { name: /Yes, it.*all new/i }).click();
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.waitForTimeout(800);

  await page.getByText('Continue as Guest', { exact: true }).click({ timeout: 20_000 });

  await expect(page.getByRole('tablist')).toBeVisible({ timeout: 45_000 });
}
