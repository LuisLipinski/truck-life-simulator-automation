import {
  expect,
  test as base,
  type APIRequestContext,
  type APIResponse,
} from '@playwright/test';
import { ApiClient } from '../helpers/api-client.js';
import { frontendOrigin } from '../helpers/session-security.js';

type AccessTokenResponse = {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
};

type CsrfTokenResponse = {
  token: string;
  headerName: string;
};

export type AuthenticatedApiSession = {
  api: ApiClient;
  accessToken: string;
  expiresIn: number;
  me: () => Promise<APIResponse>;
  refresh: () => Promise<{ response: APIResponse; rotated: boolean }>;
  logout: () => Promise<APIResponse>;
  hasRefreshCookie: () => Promise<boolean>;
};

type AuthenticatedFixtures = {
  authenticatedSession: AuthenticatedApiSession;
};

const REFRESH_COOKIE_NAME = 'TLS_REFRESH_TOKEN';

function requiredSecret(name: 'E2E_TEST_EMAIL' | 'E2E_TEST_PASSWORD'): string {
  const value = process.env[name];
  if (!value || !value.trim()) {
    throw new Error(`${name} must be configured for authenticated session tests`);
  }
  return value;
}

async function cookieValue(
  request: APIRequestContext,
  cookieName: string,
): Promise<string | undefined> {
  const state = await request.storageState();
  return state.cookies.find((cookie) => cookie.name === cookieName)?.value;
}

export const test = base.extend<AuthenticatedFixtures>({
  authenticatedSession: async ({ request }, use) => {
    const email = requiredSecret('E2E_TEST_EMAIL').trim();
    const password = requiredSecret('E2E_TEST_PASSWORD');
    const api = new ApiClient(request);

    const loginResponse = await api.postJson('/api/v1/auth/login', {
      email,
      password,
    });
    expect(loginResponse.status()).toBe(200);
    expect(loginResponse.headers()['cache-control']).toContain('no-store');

    const login = await api.json<AccessTokenResponse>(loginResponse);
    expect(login.tokenType).toBe('Bearer');
    expect(login.expiresIn).toBeGreaterThan(0);
    expect(login.accessToken.length).toBeGreaterThan(20);

    const csrfResponse = await api.get('/api/v1/auth/csrf');
    expect(csrfResponse.status()).toBe(200);
    const csrf = await api.json<CsrfTokenResponse>(csrfResponse);
    expect(csrf.headerName).toBe('X-CSRF-TOKEN');
    expect(csrf.token).toMatch(/^[A-Za-z0-9_-]{43}$/);

    let currentAccessToken = login.accessToken;
    let loggedOut = false;

    const session: AuthenticatedApiSession = {
      api,
      accessToken: currentAccessToken,
      expiresIn: login.expiresIn,
      me: () =>
        api.get('/api/v1/me', {
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        }),
      refresh: async () => {
        const before = await cookieValue(request, REFRESH_COOKIE_NAME);
        if (!before) {
          throw new Error('Refresh cookie is missing before rotation');
        }

        const response = await api.post('/api/v1/auth/refresh', {
          headers: {
            Origin: frontendOrigin,
            [csrf.headerName]: csrf.token,
          },
        });

        if (response.status() === 200) {
          const refreshed = await api.json<AccessTokenResponse>(response);
          currentAccessToken = refreshed.accessToken;
          session.accessToken = currentAccessToken;
        }

        const after = await cookieValue(request, REFRESH_COOKIE_NAME);
        return {
          response,
          rotated: Boolean(after) && after !== before,
        };
      },
      logout: async () => {
        const response = await api.post('/api/v1/auth/logout', {
          headers: {
            Origin: frontendOrigin,
            [csrf.headerName]: csrf.token,
          },
        });
        if (response.status() === 204) {
          loggedOut = true;
        }
        return response;
      },
      hasRefreshCookie: async () =>
        Boolean(await cookieValue(request, REFRESH_COOKIE_NAME)),
    };

    try {
      await use(session);
    } finally {
      if (!loggedOut) {
        const cleanup = await session.logout();
        if (cleanup.status() !== 204) {
          throw new Error(`Authenticated session cleanup failed with HTTP ${cleanup.status()}`);
        }
      }
    }
  },
});

export { expect } from '@playwright/test';
