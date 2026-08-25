import type { APIRequestContext, APIResponse } from '@playwright/test';
import { expect, test as base } from './api-test.js';
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
  reusePreviousRefresh: () => Promise<APIResponse>;
  refreshCurrentAfterReuse: () => Promise<APIResponse>;
  logout: () => Promise<APIResponse>;
  hasRefreshCookie: () => Promise<boolean>;
};

type AuthenticatedFixtures = {
  authenticatedSession: AuthenticatedApiSession;
};

const REFRESH_COOKIE_NAME = 'TLS_REFRESH_TOKEN';
const CSRF_COOKIE_NAME = 'TLS_CSRF_TOKEN';

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

function requireSessionToken(value: string | undefined, message: string): string {
  if (!value) {
    throw new Error(message);
  }
  return value;
}

function sessionCookieHeader(refreshToken: string, csrfToken: string): string {
  return `${REFRESH_COOKIE_NAME}=${refreshToken}; ${CSRF_COOKIE_NAME}=${csrfToken}`;
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
    let previousRefreshToken: string | undefined;
    let currentRefreshToken = await cookieValue(request, REFRESH_COOKIE_NAME);
    let loggedOut = false;

    requireSessionToken(currentRefreshToken, 'Refresh cookie is missing after login');

    const postRefreshWithExplicitToken = async (refreshToken: string): Promise<APIResponse> => {
      const csrfCookie = requireSessionToken(
        await cookieValue(request, CSRF_COOKIE_NAME),
        'CSRF cookie is missing before refresh',
      );

      return api.post('/api/v1/auth/refresh', {
        headers: {
          Origin: frontendOrigin,
          [csrf.headerName]: csrf.token,
          Cookie: sessionCookieHeader(refreshToken, csrfCookie),
        },
      });
    };

    const session: AuthenticatedApiSession = {
      api,
      accessToken: currentAccessToken,
      expiresIn: login.expiresIn,
      me: () =>
        api.get('/api/v1/me', {
          headers: { Authorization: `Bearer ${currentAccessToken}` },
        }),
      refresh: async () => {
        const before = requireSessionToken(
          await cookieValue(request, REFRESH_COOKIE_NAME),
          'Refresh cookie is missing before rotation',
        );

        const response = await api.post('/api/v1/auth/refresh', {
          headers: {
            Origin: frontendOrigin,
            [csrf.headerName]: csrf.token,
          },
        });

        const after = await cookieValue(request, REFRESH_COOKIE_NAME);
        if (response.status() === 200) {
          const refreshed = await api.json<AccessTokenResponse>(response);
          currentAccessToken = refreshed.accessToken;
          session.accessToken = currentAccessToken;
          previousRefreshToken = before;
          currentRefreshToken = after;
        }

        return {
          response,
          rotated: Boolean(after) && after !== before,
        };
      },
      reusePreviousRefresh: async () => {
        const previous = requireSessionToken(
          previousRefreshToken,
          'Previous refresh token is unavailable; rotate the session before testing reuse',
        );
        return postRefreshWithExplicitToken(previous);
      },
      refreshCurrentAfterReuse: async () => {
        const current = requireSessionToken(
          currentRefreshToken,
          'Current refresh token is unavailable after rotation',
        );
        return postRefreshWithExplicitToken(current);
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

    await use(session);

    if (!loggedOut) {
      const cleanup = await session.logout();
      expect(cleanup.status()).toBe(204);
    }
  },
});

export { expect };
