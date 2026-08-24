import type { APIRequestContext } from '@playwright/test';

const READINESS_PATH = '/actuator/health/readiness';
const READINESS_ATTEMPTS = 6;
const READINESS_REQUEST_TIMEOUT_MS = 20_000;
const READINESS_RETRY_DELAY_MS = 5_000;

type ReadinessPayload = {
  status?: string;
};

const delay = (milliseconds: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, milliseconds));

export async function waitForApiReadiness(request: APIRequestContext): Promise<void> {
  let lastObservation = 'no response received';

  for (let attempt = 1; attempt <= READINESS_ATTEMPTS; attempt += 1) {
    try {
      const response = await request.get(READINESS_PATH, {
        timeout: READINESS_REQUEST_TIMEOUT_MS,
      });

      const status = response.status();
      let applicationStatus: string | undefined;

      if (response.headers()['content-type']?.includes('application/json')) {
        const payload = (await response.json()) as ReadinessPayload;
        applicationStatus = payload.status;
      }

      if (status === 200 && applicationStatus === 'UP') {
        return;
      }

      lastObservation = `HTTP ${status}, readiness status ${applicationStatus ?? 'unknown'}`;
    } catch (error) {
      lastObservation = error instanceof Error ? error.message : 'unknown readiness error';
    }

    if (attempt < READINESS_ATTEMPTS) {
      await delay(READINESS_RETRY_DELAY_MS);
    }
  }

  throw new Error(
    `API did not become ready after ${READINESS_ATTEMPTS} attempts: ${lastObservation}`,
  );
}
