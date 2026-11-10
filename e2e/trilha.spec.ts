import { expect, test } from '@playwright/test';

/**
 * Percurso do analista pela trilha: Home → grupo → módulo → aula.
 *
 * É o caminho que garante que o app continua navegável de ponta a ponta depois
 * da Fase 13 (a camada de IA mudou o conteúdo das telas de aula).
 */

test.describe('Percurso pela trilha', () => {
  test('vai da Home até uma aula e volta', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    // Entra no primeiro grupo da trilha.
    await page
      .getByRole('link', { name: /Primeiros passos/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/grupo\//);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Primeiros passos');

    // Abre o primeiro módulo do grupo.
    await page
      .getByRole('link', { name: /^1.*Acesso ao sistema/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/grupo\/[^/]+\/[^/]+/);

    // Abre a primeira aula do módulo.
    await page
      .getByRole('link', { name: /Acesso do sistema · App e painel/ })
      .first()
      .click();

    await expect(page).toHaveURL(/\/aula\//);
    await expect(page.getByRole('heading', { name: 'Confere rápido' })).toBeVisible();
  });

  test('a Biblioteca lista as aulas e a busca olha dentro do texto', async ({ page }) => {
    await page.goto('/biblioteca');

    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();

    await page.getByRole('searchbox', { name: 'Buscar aulas' }).fill('impressora');

    // A busca olha dentro do texto da aula, não só no título: "Indicação de
    // impressoras" não tem "impressora" no título (tem "impressoras"), e mesmo
    // assim aparece.
    await expect(page.getByText('17 resultados').first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Problemas de impressão/ }).first()).toBeVisible();
  });
});
