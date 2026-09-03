import { test, expect, type Page } from '@playwright/test';

function uniqueEmail(label: string) {
  return `e2e-myevents-${label}-${Date.now()}@example.com`;
}

const PASSWORD = 'Password123!';

async function registerAndLogin(page: Page, email: string) {
  await page.goto('/register');
  await page.fill('#email', email);
  await page.fill('#password', PASSWORD);
  await page.fill('#confirm', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL('/');
}

async function createEvent(page: Page, title: string): Promise<string> {
  await page.goto('/events/create');
  await page.fill('#ef-title', title);
  await page.fill('#ef-date', '2027-09-15');
  await page.fill('#ef-startTime', '10:00');
  await page.fill('#ef-endTime', '12:00');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/[^/]+$/);
  return page.url().split('/events/')[1];
}

// ---------------------------------------------------------------------------
// Auth guard
// ---------------------------------------------------------------------------

test.describe('My Events auth guard', () => {
  test('unauthenticated visit redirects to /login', async ({ page }) => {
    await page.goto('/my-events');
    await page.waitForURL('/login');
  });
});

// ---------------------------------------------------------------------------
// Hamburger menu navigation
// ---------------------------------------------------------------------------

test.describe('My Events navigation', () => {
  test('hamburger menu "My Events" link navigates to /my-events', async ({ page }) => {
    await registerAndLogin(page, uniqueEmail('nav'));
    await page.click('[aria-label="Open menu"]');
    await page.getByRole('link', { name: 'My Events' }).click();
    await expect(page).toHaveURL('/my-events');
  });
});

// ---------------------------------------------------------------------------
// Empty state
// ---------------------------------------------------------------------------

test.describe('My Events empty state', () => {
  test('shows empty message and create CTA when user has no events', async ({ page }) => {
    await registerAndLogin(page, uniqueEmail('empty'));
    await page.goto('/my-events');

    await expect(page.getByText("You haven't created any events yet.")).toBeVisible();
    await expect(page.getByRole('link', { name: /Create Your First Event/i })).toBeVisible();
  });

  test('Create Your First Event CTA links to /events/create', async ({ page }) => {
    await registerAndLogin(page, uniqueEmail('empty-cta'));
    await page.goto('/my-events');
    await page.getByRole('link', { name: /Create Your First Event/i }).click();
    await expect(page).toHaveURL('/events/create');
  });
});

// ---------------------------------------------------------------------------
// Loading skeleton
// ---------------------------------------------------------------------------

test.describe('My Events loading state', () => {
  test('skeleton cards are rendered while events are loading', async ({ page }) => {
    // Delay the API response so the skeleton is visible long enough to assert.
    await page.route('**/api/events/created**', async (route) => {
      await new Promise((r) => setTimeout(r, 600));
      await route.continue();
    });

    await registerAndLogin(page, uniqueEmail('skeleton'));
    await page.goto('/my-events');

    await expect(page.getByLabel('Loading events')).toBeVisible();
    // Wait for skeleton to disappear once data arrives.
    await expect(page.getByLabel('Loading events')).not.toBeVisible({ timeout: 5000 });
  });
});

// ---------------------------------------------------------------------------
// Event cards
// ---------------------------------------------------------------------------

test.describe('My Events card list', () => {
  test('lists an event the user created', async ({ page }) => {
    const email = uniqueEmail('list');
    await registerAndLogin(page, email);
    const title = `My Listed Event ${Date.now()}`;
    await createEvent(page, title);

    await page.goto('/my-events');
    await expect(page.getByRole('heading', { name: title })).toBeVisible();
  });

  test('Edit button on a card navigates to /events/:id/edit', async ({ page }) => {
    const email = uniqueEmail('edit-link');
    await registerAndLogin(page, email);
    const eventId = await createEvent(page, `Edit Link Test ${Date.now()}`);

    await page.goto('/my-events');
    // Find the Edit button within the card section and click it.
    await page.getByRole('link', { name: 'Edit' }).first().click();
    await page.waitForURL(`/events/${eventId}/edit`);
  });

  test('card shows event title and status badge', async ({ page }) => {
    const email = uniqueEmail('badges');
    await registerAndLogin(page, email);
    const title = `Badge Test Event ${Date.now()}`;
    await createEvent(page, title);

    await page.goto('/my-events');
    const card = page.locator('.my-event-card').first();
    await expect(card.getByRole('heading', { name: title })).toBeVisible();
    // Newly created events are 'draft' by default.
    await expect(card.locator('.my-event-card__badge--draft')).toBeVisible();
  });

  test('upcoming events appear under the Upcoming heading', async ({ page }) => {
    const email = uniqueEmail('upcoming');
    await registerAndLogin(page, email);
    await createEvent(page, `Upcoming Event ${Date.now()}`);

    await page.goto('/my-events');
    await expect(page.getByRole('heading', { name: 'Upcoming' })).toBeVisible();
  });

  test('user only sees their own events — not those of another user', async ({ browser }) => {
    const ownerEmail = uniqueEmail('isolation-owner');
    const otherEmail = uniqueEmail('isolation-other');

    // Owner creates an event.
    const ownerPage = await browser.newPage();
    await registerAndLogin(ownerPage, ownerEmail);
    const secretTitle = `Owner Secret Event ${Date.now()}`;
    await createEvent(ownerPage, secretTitle);
    await ownerPage.close();

    // Other user visits My Events — should NOT see owner's event.
    const otherPage = await browser.newPage();
    await registerAndLogin(otherPage, otherEmail);
    await otherPage.goto('/my-events');
    await expect(otherPage.getByText(secretTitle)).not.toBeVisible();
    await otherPage.close();
  });
});

// ---------------------------------------------------------------------------
// Error state
// ---------------------------------------------------------------------------

test.describe('My Events error state', () => {
  test('shows an error message when the API fails', async ({ page }) => {
    await page.route('**/api/events/created**', (route) => {
      void route.fulfill({ status: 500, body: JSON.stringify({ error: 'Internal error' }) });
    });

    await registerAndLogin(page, uniqueEmail('error'));
    await page.goto('/my-events');

    await expect(page.getByRole('alert')).toBeVisible();
  });
});
