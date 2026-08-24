import { randomBytes } from 'node:crypto';
import { environment } from '../config/environment.js';

export const frontendOrigin = new URL(environment.frontendBaseUrl).origin;

export function csrfToken(): string {
  return randomBytes(32).toString('base64url');
}

export function csrfHeaders(
  headerToken: string,
  cookieToken = headerToken,
  origin = frontendOrigin,
): Record<string, string> {
  return {
    Origin: origin,
    'X-CSRF-TOKEN': headerToken,
    Cookie: `TLS_CSRF_TOKEN=${cookieToken}`,
  };
}
