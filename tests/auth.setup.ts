import { test as setup, expect } from '@playwright/test';

/**
 * Auto-Login Setup
 * ----------------
 * User only provides ERZA_EMAIL + ERZA_PASSWORD (via env / .env / GitHub secret).
 * Behavior:
 *   1. Try to sign-in via Better Auth API (/api/auth/sign-in/email)
 *   2. If account not found / wrong password -> 401
 *      -> attempt auto sign-up via /api/auth/sign-up/email
 *      -> if sign-up succeeds, sign-in again
 *      -> if sign-up blocked (422 "Email not allowed" = domain allowlist),
 *         fail with a clear, actionable message
 *   3. Persist authenticated session to playwright/.auth/storageState.json
 *      so all E2E specs run logged-in without re-authenticating.
 *
 * Run: npx playwright test  (auth.setup auto-runs via global setup / project dependency)
 */

const BASE = process.env.ERZA_BASE_URL || 'https://dev.erza.ai';
const ORIGIN = new URL(BASE).origin;

const EMAIL = process.env.ERZA_EMAIL || '';
const PASSWORD = process.env.ERZA_PASSWORD || '';
const STORAGE_STATE = 'playwright/.auth/storageState.json';

const AUTH_HEADERS = {
  'Content-Type': 'application/json',
  Origin: ORIGIN,
  Referer: `${ORIGIN}/`,
};

function readSessionCookieFrom(setCookie: string): string {
  const m = setCookie.match(/better-auth\.session_token=([^;]+)/);
  return m ? m[1] : '';
}

setup('auto-login: sign-in (or auto sign-up) and persist session', async ({ request }) => {
  expect(EMAIL, 'ERZA_EMAIL must be set (env / .env / GitHub secret)').not.toBe('');
  expect(PASSWORD, 'ERZA_PASSWORD must be set').not.toBe('');

  // 1) Try sign-in
  let signIn = await request.post(`${BASE}/api/auth/sign-in/email`, {
    headers: AUTH_HEADERS,
    data: { email: EMAIL, password: PASSWORD },
  });

  // 2) If auth failed, attempt auto sign-up
  if (signIn.status() === 401 || signIn.status() === 403) {
    const signUp = await request.post(`${BASE}/api/auth/sign-up/email`, {
      headers: AUTH_HEADERS,
      data: { email: EMAIL, password: PASSWORD, name: EMAIL.split('@')[0] },
    });

    // 422 = domain allowlist blocked, 403 = origin/WAF block
    if (signUp.status() === 422 || signUp.status() === 403) {
      const body = await signUp.text().catch(() => '');
      throw new Error(
        `[auto-login] Sign-up for ${EMAIL} was rejected by the backend (HTTP ${signUp.status()}). ` +
          `Response: ${body.slice(0, 200)}\n` +
          `The API uses a domain allowlist — use an email from an allowed domain ` +
          `(e.g. company email) or an already-existing account.`
      );
    }

    // Sign-up succeeded -> sign-in again with the fresh account
    expect(
      signUp.status(),
      `sign-up returned ${signUp.status()}: ${(await signUp.text().catch(() => '')).slice(0, 200)}`,
    ).toBe(200);

    signIn = await request.post(`${BASE}/api/auth/sign-in/email`, {
      headers: AUTH_HEADERS,
      data: { email: EMAIL, password: PASSWORD },
    });
  }

  expect(
    signIn.status(),
    `sign-in failed: HTTP ${signIn.status()} ${(await signIn.text().catch(() => '')).slice(0, 200)}`,
  ).toBe(200);

  // 3) Establish cookies in this context and save storage state
  const sessionCookie = readSessionCookieFrom(signIn.headers['set-cookie'] || '');
  if (sessionCookie) {
    await request.context().addCookies([
      { name: 'better-auth.session_token', value: sessionCookie, url: BASE },
    ]);
  }

  await request.context().storageState({ path: STORAGE_STATE });
  console.log(`[auto-login] session saved for ${EMAIL} -> ${STORAGE_STATE}`);
});
