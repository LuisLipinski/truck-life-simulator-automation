import { expect, test } from '@playwright/test';
import { environment } from '../../../config/environment.js';

function isExpectedAnonymousRefresh(status: number, url: string): boolean {
  return status === 401 && new URL(url).pathname.endsWith('/api/v1/auth/refresh');
}

function isExpectedChromium401ConsoleNoise(message: string): boolean {
  return message.includes('Failed to load resource') && message.includes('401');
}

test.describe('Frontend home smoke @ui @smoke @p0', () => {
  test('AUTO-015 | home publicada deve carregar sem erro fatal', async ({ page }) => {
    test.setTimeout(150_000);

    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];
    const unexpectedHttpErrors: string[] = [];

    page.on('console', (message) => {
      if (
        message.type() === 'error'
        && !isExpectedChromium401ConsoleNoise(message.text())
      ) {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (networkResponse) => {
      const status = networkResponse.status();
      if (status < 400 || isExpectedAnonymousRefresh(status, networkResponse.url())) {
        return;
      }
      unexpectedHttpErrors.push(`${status} ${networkResponse.url()}`);
    });

    const response = await page.goto(environment.frontendBaseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    expect(response, 'a navegação deve produzir resposta HTTP').not.toBeNull();
    expect(response?.ok(), 'a home publicada deve responder 2xx').toBe(true);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Truck Life Simulator' }),
    ).toBeVisible();

    await expect(
      page.locator('html'),
      'o bootstrap de autenticação deve resolver mesmo após cold start do backend',
    ).toHaveAttribute('data-auth-resolved', 'true', { timeout: 120_000 });

    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();

    expect(
      await page.locator('.game-card').count(),
      'a home deve exibir ao menos um jogo disponível',
    ).toBeGreaterThan(0);

    expect(pageErrors, 'a página não deve lançar exceções JavaScript').toEqual([]);
    expect(consoleErrors, 'a home não deve registrar erros reais no console').toEqual([]);
    expect(
      unexpectedHttpErrors,
      'a home não deve carregar recursos/endpoints com 4xx/5xx inesperado',
    ).toEqual([]);
  });
});
