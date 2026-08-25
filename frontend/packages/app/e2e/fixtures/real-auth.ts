import { expect, type Page, test } from "@playwright/test";

// Real-environment login (NO mocking). Drives the actual `/login` form on the
// deployed app with credentials from the gitignored `.env.test.local` (loaded
// into `process.env` by playwright.config). Used only by `@real` specs, which
// run when `SICO_E2E_URL` is set.
//
// The probe (2026-08) confirmed test.sico serves a first-party email/password
// form (NOT Azure AD SSO): one email box, a password box, and a "Continue"
// button; a successful sign-in lands on `/digital-worker`.

export type RealRole = "admin" | "user";

type Creds = { user: string; pass: string };

// Role → its env-var pair, centralised so a new role can't silently misroute
// through a scattered ternary.
const ROLE_ENV: Record<RealRole, { userVar: string; passVar: string }> = {
  admin: { userVar: "SICO_ADMIN_USER", passVar: "SICO_ADMIN_PASS" },
  user: { userVar: "SICO_USER_USER", passVar: "SICO_USER_PASS" },
};

// Resolve a role to its credentials. Missing creds → undefined, so callers can
// `test.skip` instead of failing when a dev has no `.env.test.local`.
export function realCreds(role: RealRole): Creds | undefined {
  const { userVar, passVar } = ROLE_ENV[role];
  const user = process.env[userVar];
  const pass = process.env[passVar];
  return user && pass ? { user, pass } : undefined;
}

// Skip the whole describe/test when creds for `role` are absent (local runs
// without `.env.test.local`, or a partially-configured CI secret).
export function skipWithoutCreds(role: RealRole): void {
  test.skip(
    !realCreds(role),
    `Missing real creds for "${role}" — set ${ROLE_ENV[role].userVar}/${ROLE_ENV[role].passVar}`,
  );
}

// Log in for real and wait until the operator home renders. Throws (fails the
// test) if creds are missing — guard with `skipWithoutCreds` first.
export async function realLogin(page: Page, role: RealRole): Promise<void> {
  const creds = realCreds(role);
  if (!creds) {
    throw new Error(`realLogin("${role}") called without credentials`);
  }

  await page.goto("/login", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).first().fill(creds.user);
  // First password box; the second match is the "show password" toggle.
  await page
    .getByLabel(/password/i)
    .first()
    .fill(creds.pass);
  await page
    .getByRole("button", { name: /continue|sign in|log in/i })
    .first()
    .click();

  // A successful sign-in bounces to the operator landing.
  await page.waitForURL(/\/digital-worker/, { timeout: 30_000 });
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Digital Workers",
      exact: true,
    }),
  ).toBeVisible({ timeout: 30_000 });
}

// Like `realLogin`, but starts from a caller-supplied login URL (e.g. one
// carrying `?next=…`) instead of the bare `/login`, and does NOT assert the
// landing — the caller owns the post-login URL assertion, since `?next` and
// malicious-`?next` land on different paths. Fills + submits the real form only,
// and returns the trusted pre-submit origin for redirect-safety assertions.
export async function realLoginTo(
  page: Page,
  role: RealRole,
  loginUrl: string,
): Promise<string> {
  const creds = realCreds(role);
  if (!creds) {
    throw new Error(`realLoginTo("${role}") called without credentials`);
  }

  await page.goto(loginUrl, { waitUntil: "networkidle" });
  const trustedOrigin = new URL(page.url()).origin;
  await page.getByLabel(/email/i).first().fill(creds.user);
  await page
    .getByLabel(/password/i)
    .first()
    .fill(creds.pass);
  await page
    .getByRole("button", { name: /continue|sign in|log in/i })
    .first()
    .click();
  // No landing assertion here — the caller asserts the resolved URL.
  await page.waitForURL(/^(?!.*\/login(?:\?|$)).*$/, { timeout: 30_000 });
  return trustedOrigin;
}
