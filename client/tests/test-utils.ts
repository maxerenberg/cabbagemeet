import { ElementHandle, expect, Locator, Page } from "@playwright/test";

export function getPublicURL(): string {
  const url = process.env.PUBLIC_URL;
  if (!url) {
    throw new Error('Please set the PUBLIC_URL environment variable');
  }
  return url;
}

export async function getClasses(elem: Locator): Promise<string[]> {
  const attrValue = await elem.getAttribute('class');
  if (!attrValue) {
    return [];
  }
  return attrValue.split(' ').filter(s => s.length > 0);
}

export function createRandomEmailAddress(): string {
  return 'test' + Math.floor(Math.random() * 1_000_000) + '@example.com';
}

export async function clickNavbarLink(page: Page, text: string) {
  // The text should be capitalized, not upper case, because there is a
  // CSS text-transform
  const link = page.locator(`a >> text="${text}" >> visible=true`);
  await expect(link).toHaveCount(1);
  await link.click();
}

export async function getButton(page: Page, text: string) {
  const button = page.locator(`button >> text="${text}" >> visible=true`);
  await expect(button).toHaveCount(1);
  return button;
}

export async function clickButton(page: Page, text: string) {
  await (await getButton(page, text)).click();
}

export async function getElementCenter(elem: ElementHandle): Promise<[number, number]> {
  const box = await elem.boundingBox();
  if (box === null) {
    throw new Error('box is null');
  }
  return [box.x + box.width / 2, box.y + box.height / 2];
}

export async function closeToast(page: Page) {
  await page.locator('.toast .btn-close >> visible=true').click();
  await expect(page.locator('.toast')).toHaveCount(0);
}

export async function createNewUser(page: Page, {
  name = 'Bob',
  email = createRandomEmailAddress(),
  password = 'abcdef',
}: {
  name?: string,
  email?: string,
  password?: string,
} = {}) {
  await page.getByText('SIGN UP').click();
  await page.getByLabel('Name').fill(name);
  await page.getByLabel('Email').fill(email);
  await page.getByLabel('Password').fill(password);
  await clickButton(page, 'Sign up');
}

export function getTimeCells(page: Page) {
  return page.$$('.weeklyview__bodycell');
}

export function getSelectedTimeCells(page: Page) {
  return page.$$('.weeklyview__bodycell.selected');
}

export async function clickModalConfirmationButton(page: Page, text: string) {
  const confirmationButton =
    await page.$(`.modal-footer button >> text="${text}" >> visible=true`);
  expect(confirmationButton).not.toBeNull();
  await confirmationButton!.click();
}

export function getByExactText(page: Page, text: string) {
  return page.locator(`text="${text}" >> visible=true`);
}

export function getByDate(page: Page, date: Date) {
  return getByExactText(page, date.getDate().toString());
}
