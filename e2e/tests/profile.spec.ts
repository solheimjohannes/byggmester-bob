import { test, expect, type Page } from '@playwright/test';

function uniqueEmail(label: string) {
  return `e2e-profile-${label}-${Date.now()}@example.com`;
}

async function registerAndLogin(page: Page, email: string, name = 'Profile Tester') {
  await page.goto('/register');
  await page.fill('#name', name);
  await page.fill('#email', email);
  await page.fill('#password', 'Password123!');
  await page.fill('#confirm', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// ---------------------------------------------------------------------------
// Unauthenticated access
// ---------------------------------------------------------------------------

test.describe('Profile page — unauthenticated', () => {
  test('redirects to /login when not signed in', async ({ page }) => {
    await page.goto('/profile');
    await expect(page).toHaveURL('/login');
  });
});

// ---------------------------------------------------------------------------
// Navigation to profile
// ---------------------------------------------------------------------------

test.describe('Profile page — navigation', () => {
  test('Profile link in hamburger menu navigates to /profile', async ({ page }) => {
    const email = uniqueEmail('nav');
    await registerAndLogin(page, email);

    await page.click('[aria-label="Open menu"]');
    await page.click('a[href="/profile"]');

    await expect(page).toHaveURL('/profile');
  });
});

// ---------------------------------------------------------------------------
// Profile page content
// ---------------------------------------------------------------------------

test.describe('Profile page — content', () => {
  let email: string;
  const name = 'E2E Profile User';
  const password = 'Password123!';

  test.beforeAll(async ({ browser }) => {
    email = uniqueEmail('content');
    const page = await browser.newPage();
    await registerAndLogin(page, email, name);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', email);
    await page.fill('#password', password);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    await page.goto('/profile');
  });

  test('displays user name and email', async ({ page }) => {
    await expect(page.getByText(name)).toBeVisible();
    await expect(page.getByText(email)).toBeVisible();
  });

  test('Edit Profile button is present', async ({ page }) => {
    await expect(page.getByRole('link', { name: 'Edit Profile' })).toBeVisible();
  });

  test('shows "My Upcoming Plans" section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'My Upcoming Plans' })).toBeVisible();
  });

  test('shows "Events I\'ve Created" section', async ({ page }) => {
    await expect(page.getByRole('heading', { name: "Events I've Created" })).toBeVisible();
  });

  test('empty state message for upcoming plans when user has none', async ({ page }) => {
    await expect(page.getByText("You haven't joined any upcoming events yet.")).toBeVisible();
  });

  test('empty state message for created events when user has none', async ({ page }) => {
    await expect(page.getByText("You haven't created any events yet.")).toBeVisible();
  });
});
