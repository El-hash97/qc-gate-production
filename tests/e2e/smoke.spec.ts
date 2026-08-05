import { test, expect } from '@playwright/test';

test('operator enters counts on Input, sees them on Dashboard, resets, and finds the shift in History', async ({ page, context }) => {
  await page.goto('/input');

  await page.getByPlaceholder('Nama Operator').fill('Budi Santoso');
  await page.getByRole('button', { name: 'Tambah OK' }).first().click();
  await page.getByRole('button', { name: 'Tambah OK' }).first().click();

  const dashboard = await context.newPage();
  await dashboard.goto('/dashboard');
  await expect(dashboard.getByText(/Budi Santoso/)).toBeVisible({ timeout: 10000 });

  await page.getByRole('button', { name: 'Reset' }).click();
  await page.getByPlaceholder('Masukkan password').fill(process.env.RESET_PASSWORD ?? '1234');
  await page.getByRole('button', { name: 'Reset Data' }).click();
  await expect(page.getByText('Data berhasil direset & diarsipkan')).toBeVisible();

  await page.goto('/history');
  await expect(page.getByText('Budi Santoso')).toBeVisible();
});
