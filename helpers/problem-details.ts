import { expect, type APIResponse } from '@playwright/test';
import { ApiClient } from './api-client.js';

export interface ApiProblemDetails {
  type?: string;
  title?: string;
  status?: number;
  detail?: string;
  instance?: string;
  code?: string;
  timestamp?: string;
  correlationId?: string;
  violations?: Array<{ field?: string; message?: string }>;
}

export async function expectProblemDetails(
  api: ApiClient,
  response: APIResponse,
  expectedStatus: number,
  expectedCode: string,
): Promise<ApiProblemDetails> {
  expect(response.status()).toBe(expectedStatus);
  expect(api.contentType(response)).toContain('application/problem+json');

  const headerCorrelationId = api.correlationId(response);
  expect(headerCorrelationId).toBeTruthy();

  const problem = await api.json<ApiProblemDetails>(response);

  expect(problem.status).toBe(expectedStatus);
  expect(problem.code).toBe(expectedCode);
  expect(problem.correlationId).toBe(headerCorrelationId);
  expect(problem.timestamp).toBeTruthy();
  expect(problem.type).toContain(expectedCode.toLowerCase());

  const serialized = JSON.stringify(problem);
  expect(serialized).not.toContain('java.');
  expect(serialized).not.toContain('org.springframework');

  return problem;
}
