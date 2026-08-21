import { test, expect } from '@playwright/test';

const artistSlug = process.env.E2E_VOTING_ARTIST_SLUG;
test.describe('public voting integrity', () => {
  test.beforeEach(({}, testInfo) => {
    testInfo.skip(!artistSlug, 'Set E2E_VOTING_ARTIST_SLUG against an open local test round.');
  });

  test('counts only after OTP verification and rejects a canonical alias duplicate', async ({
    page,
  }) => {
    const local = `canadianstare2e${Date.now()}`;
    const voterEmail = `${local}@gmail.com`;
    await page.goto(`/artists/${artistSlug}`);
    await page.getByRole('button', { name: /vote/i }).first().click();
    await page.getByLabel('Email address').fill(voterEmail);
    await page.getByRole('button', { name: /send verification code/i }).click();

    await expect(page.getByText(/verify your email/i)).toBeVisible();
    await expect(page.getByText(/your vote has been counted/i)).toHaveCount(0);
    const developmentCode = await page.getByText(/development code:/i).textContent();
    const code = developmentCode?.match(/\d{6}/)?.[0];
    expect(code).toBeTruthy();
    for (let index = 0; index < 6; index += 1) {
      await page.getByLabel(`Digit ${index + 1} of verification code`).fill(code![index]!);
    }
    await page.getByRole('button', { name: /verify & cast vote/i }).click();
    await expect(page.getByText(/your vote has been counted/i)).toBeVisible();

    await page.goto(`/artists/${artistSlug}`);
    await page.getByRole('button', { name: /vote/i }).first().click();
    const alias = `${local.slice(0, 1)}.${local.slice(1)}+duplicate@gmail.com`;
    await page.getByLabel('Email address').fill(alias);
    await page.getByRole('button', { name: /send verification code/i }).click();
    await expect(page.getByText(/already cast|already has a vote/i)).toBeVisible();
  });
});
