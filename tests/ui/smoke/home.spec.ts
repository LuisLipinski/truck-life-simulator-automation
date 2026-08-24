import { expect, test } from '@playwright/test';
import { environment } from '../../../config/environment.js';

test.describe('Frontend home smoke @ui @smoke @p0', () => {
  test('AUTO-015 | home publicada deve carregar sem erro fatal', async ({ page }) => {
    const consoleErrors: string[] = [];
    const pageErrors: string[] = [];

    page.on('console', (message) => {
      if (message.type() === 'error') {
        consoleErrors.push(message.text());
      }
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));

    const response = await page.goto(environment.frontendBaseUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });

    expect(response, 'a navegação deve produzir resposta HTTP').not.toBeNull();
    expect(response?.ok(), 'a home publicada deve responder 2xx').toBe(true);

    await expect(
      page.getByRole('heading', { level: 1, name: 'Truck Life Simulator' }),
    ).toBeVisible();
    await expect(page.getByRole('link', { name: 'Entrar' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Criar conta' })).toBeVisible();

    expect(
      await page.locator('.game-card').count(),
      'a home deve exibir ao menos um jogo disponível',
    ).toBeGreaterThan(0);

    expect(pageErrors, 'a página não deve lançar exceções JavaScript').toEqual([]);
    expect(consoleErrors, 'a home não deve registrar erros no console').toEqual([]);
  });
});
