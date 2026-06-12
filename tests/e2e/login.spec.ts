import { expect, test } from '@playwright/test'

test('renders login screen', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByRole('heading', { name: 'Mendjahit' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeVisible()
  await expect(page.getByLabel('Password')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Sign In' })).toBeVisible()
})

