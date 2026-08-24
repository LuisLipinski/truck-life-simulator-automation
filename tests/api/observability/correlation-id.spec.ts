import { expect, test } from '@playwright/test';
import { ApiClient } from '../../../helpers/api-client.js';

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

async function csrfWithCorrelationId(
  api: ApiClient,
  correlationId?: string,
) {
  return api.get('/api/v1/auth/csrf', {
    headers: correlationId ? { 'X-Correlation-ID': correlationId } : {},
  });
}

test.describe('Correlation ID @api @observability @security @p1', () => {
  test('QA-OBS-003 | resposta deve possuir X-Correlation-ID', async ({ request }) => {
    const api = new ApiClient(request);
    const response = await csrfWithCorrelationId(api);

    expect(response.status()).toBe(200);
    expect(api.correlationId(response)).toMatch(UUID_PATTERN);
  });

  test('QA-OBS-004 | correlation ID seguro enviado pelo cliente deve ser preservado', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await csrfWithCorrelationId(api, 'teste-qa-123');

    expect(response.status()).toBe(200);
    expect(api.correlationId(response)).toBe('teste-qa-123');
  });

  test('QA-OBS-005 | correlation ID acima de 128 caracteres deve ser substituído por UUID', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await csrfWithCorrelationId(api, 'a'.repeat(129));

    expect(response.status()).toBe(200);
    expect(api.correlationId(response)).toMatch(UUID_PATTERN);
  });

  test('QA-OBS-006 | correlation ID com caracteres inválidos deve ser substituído por UUID', async ({
    request,
  }) => {
    const api = new ApiClient(request);
    const response = await csrfWithCorrelationId(api, 'qa invalid@id');

    expect(response.status()).toBe(200);
    expect(api.correlationId(response)).toMatch(UUID_PATTERN);
  });
});
