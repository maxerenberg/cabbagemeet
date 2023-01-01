import { test, expect } from '@playwright/test';
import {
  createRandomEmailAddress,
  getPublicURL,
  clickNavbarLink,
  clickButton,
  createNewUser,
  getButton,
  clickModalConfirmationButton,
  closeToast,
  getByExactText,
} from './test-utils';

test('signup, logout and login', async ({ page }) => {
  const emailAddress = createRandomEmailAddress();
  await page.goto(getPublicURL());

  await createNewUser(page, {email: emailAddress});

  await clickNavbarLink(page, 'Profile');
  await clickButton(page, 'Sign out');

  await clickNavbarLink(page, 'Login');
  await page.getByLabel('Email').fill(emailAddress);
  await page.getByLabel('Password').fill('abcdef');
  await clickButton(page, 'Log in');

  await clickNavbarLink(page, 'Profile');
});

test('Edit user settings', async ({ page }) => {
  await page.goto(getPublicURL());
  await createNewUser(page);
  await clickNavbarLink(page, 'Profile');
  await clickButton(page, 'Settings');

  await clickButton(page, 'Edit');
  await page.getByLabel('Edit name').fill('Robert');
  await clickButton(page, 'Save');
  await closeToast(page);
  await getButton(page, 'Edit');
  await expect(getByExactText(page, 'Robert')).toHaveCount(1);

  await clickButton(page, 'Subscribe to updates');
  await closeToast(page);
  await getButton(page, "Unsubscribe from updates");

  await clickButton(page, 'Delete');
  await clickModalConfirmationButton(page, 'Delete');
  await closeToast(page);
  await getButton(page, "Let's meet");
});
