import { expect, test } from '@playwright/test';

test('public routes render the primary CTAs', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { name: /영어를 읽을 때/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /확장앱 설치하기/i })).toBeVisible();
  await expect(page.getByRole('link', { name: /내 단어장 보기/i })).toBeVisible();

  await page.goto('/setup');
  await expect(page.getByRole('heading', { name: /AI English Study 설치 가이드/i })).toBeVisible();

  await page.goto('/wordbook');
  await expect(page.getByRole('heading', { name: 'Wordbook' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Login to Start/i })).toBeVisible();
});
