import { test, expect, type Page } from '@playwright/test';

function uniqueEmail(label: string) {
  return `e2e-edit-${label}-${Date.now()}@example.com`;
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

/** Creates an event via the UI and returns its ID (extracted from the URL). */
async function createEventViaUI(page: Page, title: string): Promise<string> {
  await page.goto('/events/create');
  await page.fill('#ef-title', title);
  await page.fill('#ef-date', '2027-06-15');
  await page.fill('#ef-startTime', '10:00');
  await page.fill('#ef-endTime', '12:00');
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/events\/[^/]+$/);
  const url = page.url();
  return url.split('/events/')[1];
}

// ---------------------------------------------------------------------------
// Edit Event button visibility
// ---------------------------------------------------------------------------

test.describe('Edit Event button', () => {
  test('owner sees Edit Event button on event detail page', async ({ page }) => {
    const email = uniqueEmail('owner-btn');
    await registerAndLogin(page, email);
    await createEventViaUI(page, 'Owner Visibility Test');

    await expect(page.getByRole('link', { name: 'Edit Event' })).toBeVisible();
  });

  test('non-owner does not see Edit Event button on event detail page', async ({ browser }) => {
    const ownerEmail = uniqueEmail('non-owner-creator');
    const visitorEmail = uniqueEmail('non-owner-visitor');

    // Owner creates the event
    const ownerPage = await browser.newPage();
    await registerAndLogin(ownerPage, ownerEmail);
    const eventId = await createEventViaUI(ownerPage, 'Non-Owner Visibility Test');
    await ownerPage.close();

    // Register visitor (different user)
    const visitorPage = await browser.newPage();
    await registerAndLogin(visitorPage, visitorEmail);
    await visitorPage.goto(`/events/${eventId}`);

    await expect(visitorPage.getByRole('link', { name: 'Edit Event' })).not.toBeVisible();
    await visitorPage.close();
  });

  test('unauthenticated user does not see Edit Event button', async ({ page }) => {
    const email = uniqueEmail('anon-btn');
    // Register + create event, then log out
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'Anon Visibility Test');

    await page.click('[aria-label="Open menu"]');
    await page.click('button:has-text("Log out")');

    await page.goto(`/events/${eventId}`);
    await expect(page.getByRole('link', { name: 'Edit Event' })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Edit Event page — navigation
// ---------------------------------------------------------------------------

test.describe('Edit Event page navigation', () => {
  test('clicking Edit Event navigates to /events/:id/edit', async ({ page }) => {
    const email = uniqueEmail('nav-edit');
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'Navigation Test Event');

    await page.getByRole('link', { name: 'Edit Event' }).click();
    await page.waitForURL(`/events/${eventId}/edit`);
  });

  test('unauthenticated visit to /events/:id/edit redirects to /login', async ({ browser }) => {
    const email = uniqueEmail('unauth-edit');
    const setupPage = await browser.newPage();
    await registerAndLogin(setupPage, email);
    const eventId = await createEventViaUI(setupPage, 'Unauth Redirect Test');
    await setupPage.close();

    // Fresh page — no session cookie
    const anonPage = await browser.newPage();
    await anonPage.goto(`/events/${eventId}/edit`);
    await anonPage.waitForURL('/login');
    await anonPage.close();
  });

  test('non-owner navigating directly to /events/:id/edit is redirected to detail page', async ({ browser }) => {
    const ownerEmail = uniqueEmail('redirect-owner');
    const nonOwnerEmail = uniqueEmail('redirect-visitor');

    const ownerPage = await browser.newPage();
    await registerAndLogin(ownerPage, ownerEmail);
    const eventId = await createEventViaUI(ownerPage, 'Redirect Non-Owner Test');
    await ownerPage.close();

    const visitorPage = await browser.newPage();
    await registerAndLogin(visitorPage, nonOwnerEmail);
    await visitorPage.goto(`/events/${eventId}/edit`);
    await visitorPage.waitForURL(`/events/${eventId}`);
    await visitorPage.close();
  });
});

// ---------------------------------------------------------------------------
// Edit Event form — pre-fill
// ---------------------------------------------------------------------------

test.describe('Edit Event form pre-fill', () => {
  test('form is pre-filled with existing event values', async ({ page }) => {
    const email = uniqueEmail('prefill');
    await registerAndLogin(page, email);

    // Create with a known title
    const title = `Prefill Test ${Date.now()}`;
    await createEventViaUI(page, title);

    await page.getByRole('link', { name: 'Edit Event' }).click();
    await page.waitForURL(/\/events\/[^/]+\/edit$/);

    await expect(page.locator('#ef-title')).toHaveValue(title);
    await expect(page.locator('#ef-date')).toHaveValue('2027-06-15');
    await expect(page.locator('#ef-startTime')).toHaveValue('10:00');
    await expect(page.locator('#ef-endTime')).toHaveValue('12:00');
  });
});

// ---------------------------------------------------------------------------
// Edit Event form — save
// ---------------------------------------------------------------------------

test.describe('Edit Event form save', () => {
  test('saving with a new title updates the event and redirects to detail page', async ({ page }) => {
    const email = uniqueEmail('save');
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'Original Title');

    await page.goto(`/events/${eventId}/edit`);
    await page.waitForURL(`/events/${eventId}/edit`);

    const updatedTitle = `Updated Title ${Date.now()}`;
    await page.fill('#ef-title', updatedTitle);
    await page.click('button:has-text("Save Changes")');

    await page.waitForURL(`/events/${eventId}`);
    await expect(page.getByRole('heading', { name: updatedTitle })).toBeVisible();
  });

  test('"Save Changes" button is disabled while saving', async ({ page }) => {
    const email = uniqueEmail('disable-btn');
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'Disable Button Test');

    await page.goto(`/events/${eventId}/edit`);
    await page.waitForURL(`/events/${eventId}/edit`);

    // Intercept the PATCH to delay it so we can observe the disabled state
    await page.route(`**/api/events/${eventId}`, async (route) => {
      await new Promise((r) => setTimeout(r, 300));
      await route.continue();
    });

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await page.waitForURL(`/events/${eventId}`);
  });
});

// ---------------------------------------------------------------------------
// Edit Event form — cancel
// ---------------------------------------------------------------------------

test.describe('Edit Event form cancel', () => {
  test('clicking Cancel returns to event detail without saving', async ({ page }) => {
    const email = uniqueEmail('cancel');
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'Cancel Test Event');

    await page.goto(`/events/${eventId}/edit`);
    await page.waitForURL(`/events/${eventId}/edit`);

    // Change title but then cancel
    await page.fill('#ef-title', 'Should Not Be Saved');
    await page.getByRole('link', { name: 'Cancel' }).click();

    await page.waitForURL(`/events/${eventId}`);
    await expect(page.getByRole('heading', { name: 'Cancel Test Event' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Should Not Be Saved' })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Edit Event form — client-side validation
// ---------------------------------------------------------------------------

test.describe('Edit Event form validation', () => {
  test('clearing the title shows a validation error without submitting', async ({ page }) => {
    const email = uniqueEmail('validation');
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'Validation Test Event');

    await page.goto(`/events/${eventId}/edit`);
    await page.waitForURL(`/events/${eventId}/edit`);

    await page.fill('#ef-title', '');
    await page.click('button:has-text("Save Changes")');

    await expect(page.getByRole('alert')).toContainText('title is required');
    await expect(page).toHaveURL(`/events/${eventId}/edit`);
  });

  test('end time before start time shows a validation error', async ({ page }) => {
    const email = uniqueEmail('endtime');
    await registerAndLogin(page, email);
    const eventId = await createEventViaUI(page, 'End Time Validation Test');

    await page.goto(`/events/${eventId}/edit`);
    await page.waitForURL(`/events/${eventId}/edit`);

    await page.fill('#ef-startTime', '14:00');
    await page.fill('#ef-endTime', '10:00');
    await page.click('button:has-text("Save Changes")');

    await expect(page.getByRole('alert')).toContainText('End time must be after start time');
    await expect(page).toHaveURL(`/events/${eventId}/edit`);
  });
});
