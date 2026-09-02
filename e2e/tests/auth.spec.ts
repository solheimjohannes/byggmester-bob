import { test, expect } from '@playwright/test';

// Each test gets a unique email to avoid conflicts from prior runs.
function uniqueEmail(label: string) {
  return `e2e-${label}-${Date.now()}@example.com`;
}

// ---------------------------------------------------------------------------
// Register
// ---------------------------------------------------------------------------

test.describe('Register', () => {
  test('new user can register and is redirected home', async ({ page }) => {
    const email = uniqueEmail('register');
    await page.goto('/register');

    await page.fill('#name', 'E2E User');
    await page.fill('#email', email);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
  });

  test('hamburger shows signed-in menu after registration', async ({ page }) => {
    const email = uniqueEmail('register-nav');
    await page.goto('/register');

    await page.fill('#email', email);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.click('[aria-label="Open menu"]');
    await expect(page.getByRole('link', { name: 'Log out' }).or(page.getByRole('button', { name: 'Log out' }))).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Events' })).toBeVisible();
  });

  test('duplicate email shows EMAIL_TAKEN error', async ({ page }) => {
    const email = uniqueEmail('dup');

    // Register first time
    await page.goto('/register');
    await page.fill('#email', email);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Register again with same email
    await page.goto('/register');
    await page.fill('#email', email);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toContainText('already exists');
  });

  test('mismatched passwords show inline error', async ({ page }) => {
    await page.goto('/register');
    await page.fill('#email', uniqueEmail('mismatch'));
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'different!');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toContainText('do not match');
    await expect(page).toHaveURL('/register');
  });

  test('missing required fields show error', async ({ page }) => {
    await page.goto('/register');
    // Leave email and password blank, only fill confirm
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/register');
  });
});

// ---------------------------------------------------------------------------
// Login
// ---------------------------------------------------------------------------

test.describe('Login', () => {
  // Seed a user once before the login tests run.
  let seededEmail: string;
  const seededPassword = 'Password123!';

  test.beforeAll(async ({ browser }) => {
    seededEmail = uniqueEmail('login-seed');
    const page = await browser.newPage();
    await page.goto('/register');
    await page.fill('#email', seededEmail);
    await page.fill('#password', seededPassword);
    await page.fill('#confirm', seededPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');
    // Log out so the login tests start from a clean slate.
    await page.click('[aria-label="Open menu"]');
    await page.click('button:has-text("Log out")');
    await page.close();
  });

  test('valid credentials log in and redirect home', async ({ page }) => {
    await page.goto('/login');

    await page.fill('#email', seededEmail);
    await page.fill('#password', seededPassword);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL('/');
  });

  test('hamburger shows signed-in menu after login', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', seededEmail);
    await page.fill('#password', seededPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    await page.click('[aria-label="Open menu"]');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Profile' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'My Events' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Calendar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Browse Events' })).toBeVisible();
  });

  test('wrong password shows INVALID_CREDENTIALS error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', seededEmail);
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
    await expect(page).toHaveURL('/login');
  });

  test('unknown email shows INVALID_CREDENTIALS error', async ({ page }) => {
    await page.goto('/login');
    await page.fill('#email', 'nobody@nowhere.example.com');
    await page.fill('#password', 'Password123!');
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toContainText('Invalid email or password');
  });

  test('missing fields show inline error', async ({ page }) => {
    await page.goto('/login');
    // Submit with empty fields
    await page.click('button[type="submit"]');

    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page).toHaveURL('/login');
  });
});

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

test.describe('Logout', () => {
  test('log out switches menu to signed-out state', async ({ page }) => {
    const email = uniqueEmail('logout');
    // Register a fresh user
    await page.goto('/register');
    await page.fill('#email', email);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Open menu and log out
    await page.click('[aria-label="Open menu"]');
    await page.click('button:has-text("Log out")');

    // Menu should now show signed-out items without a page reload
    await page.click('[aria-label="Open menu"]');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Register' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).not.toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// Session persistence
// ---------------------------------------------------------------------------

test.describe('Session persistence', () => {
  test('session survives a page reload', async ({ page }) => {
    const email = uniqueEmail('persist');
    await page.goto('/register');
    await page.fill('#email', email);
    await page.fill('#password', 'Password123!');
    await page.fill('#confirm', 'Password123!');
    await page.click('button[type="submit"]');
    await page.waitForURL('/');

    // Reload — AuthProvider calls fetchSession() on mount
    await page.reload();

    await page.click('[aria-label="Open menu"]');
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible();
  });

  test('signed-out state is correct on a fresh page load', async ({ page }) => {
    await page.goto('/');
    await page.click('[aria-label="Open menu"]');
    await expect(page.getByRole('link', { name: 'Log in' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Log out' })).not.toBeVisible();
  });
});
