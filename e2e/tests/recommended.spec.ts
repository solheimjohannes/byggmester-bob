import { test, expect, type Page } from '@playwright/test';

function uniqueEmail(label: string) {
  return `e2e-${label}-${Date.now()}@example.com`;
}

async function registerAndLogin(page: Page, email: string) {
  await page.goto('/register');
  await page.fill('#email', email);
  await page.fill('#password', 'Password123!');
  await page.fill('#confirm', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

test.describe('Recommended page — auth guard', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/recommended');
    await expect(page).toHaveURL('/login');
  });
});

// ---------------------------------------------------------------------------
// Signed-in experience
// ---------------------------------------------------------------------------

test.describe('Recommended page — signed-in', () => {
  let seededEmail: string;

  test.beforeAll(async ({ browser }) => {
    seededEmail = uniqueEmail('rec-seed');
    const page = await browser.newPage();
    await registerAndLogin(page, seededEmail);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', seededEmail);
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
  });

  test('page renders heading "Recommended for You"', async ({ page }) => {
    await page.goto('/recommended');
    await expect(page.getByRole('heading', { name: 'Recommended for You' })).toBeVisible();
  });

  test('page shows events or empty state — never an unhandled error', async ({ page }) => {
    await page.goto('/recommended');

    // Wait for loading to resolve (skeleton grid disappears)
    await expect(page.locator('[aria-busy="true"]')).not.toBeVisible({ timeout: 10000 });

    // Either event cards or empty-state message should be present; no [role=alert] error
    const hasCards = await page.locator('.event-card').count() > 0;
    const hasEmpty = await page.getByText('No recommendations yet').isVisible();
    const hasError = await page.getByRole('alert').isVisible();

    expect(hasError).toBe(false);
    expect(hasCards || hasEmpty).toBe(true);
  });

  test('loading state shows skeleton cards before data arrives', async ({ page }) => {
    // Intercept the recommendations API to delay response so skeleton is visible
    await page.route('**/api/events/recommended**', async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.continue();
    });

    await page.goto('/recommended');
    // Skeleton grid should be present initially
    await expect(page.locator('[aria-busy="true"]')).toBeVisible();
    // And eventually resolve
    await expect(page.locator('[aria-busy="true"]')).not.toBeVisible({ timeout: 10000 });
  });

  test('error state is shown when the API fails', async ({ page }) => {
    await page.route('**/api/events/recommended**', (route) =>
      route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal error' }) }),
    );

    await page.goto('/recommended');
    await expect(page.getByRole('alert')).toBeVisible({ timeout: 10000 });
  });
});

// ---------------------------------------------------------------------------
// Navigation
// ---------------------------------------------------------------------------

test.describe('Recommended page — navigation', () => {
  test('"Recommended" nav link is visible in signed-in menu and navigates to /recommended', async ({ page }) => {
    const email = uniqueEmail('rec-nav');
    await registerAndLogin(page, email);

    await page.click('[aria-label="Open menu"]');
    const link = page.getByRole('link', { name: 'Recommended' });
    await expect(link).toBeVisible();

    await link.click();
    await expect(page).toHaveURL('/recommended');
    await expect(page.getByRole('heading', { name: 'Recommended for You' })).toBeVisible();
  });

  test('"Recommended" nav link is absent from the signed-out menu', async ({ page }) => {
    await page.goto('/');
    await page.click('[aria-label="Open menu"]');
    await expect(page.getByRole('link', { name: 'Recommended' })).not.toBeVisible();
  });

  test('event cards link to /events/:id', async ({ page }) => {
    const email = uniqueEmail('rec-link');
    await registerAndLogin(page, email);

    // Stub one event so we have a card to click
    await page.route('**/api/events/recommended**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 'evt-stub-1',
            title: 'Stubbed Event',
            startAt: new Date(Date.now() + 86400_000).toISOString(),
            timezone: 'Europe/Oslo',
            venue: { city: 'Oslo' },
            coverImageUrl: null,
            tags: [],
            attendeeCount: 0,
            maxAttendees: null,
          },
        ]),
      }),
    );

    await page.goto('/recommended');
    // Wait for card
    await expect(page.locator('.event-card').first()).toBeVisible({ timeout: 10000 });

    const href = await page.locator('.event-card').first().getAttribute('href');
    expect(href).toBe('/events/evt-stub-1');
  });
});
