import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * A fila de curadoria (`/curadoria`) é onde o time de conteúdo aprova ou pede
 * ajuste nas perguntas. A fila mostra as perguntas **efetivas** — as reescritas
 * por IA — e o revisor precisa conseguir aprovar sem sair da tela.
 *
 * As perguntas ficam em um accordion fechado por padrão (um item aberto por
 * vez) e a revisão exige sessão: visitante vê a fila, mas não decide.
 */

const LESSON_TITLE = 'Acesso do sistema · App e painel';

/** A fila é read-only para visitante: revisão exige sessão (conta demo). */
async function loginAsReviewer(page: Page) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar como Fábio Ribeiro · Líder' }).click();
  await expect(page.locator('header').getByText('Fábio Ribeiro')).toBeVisible();
}

test.describe('Fila de curadoria', () => {
  test('visitante vê a fila, mas sem os botões de decisão', async ({ page }) => {
    await page.goto('/curadoria');
    await expect(
      page.getByRole('heading', { name: 'Fila de revisão das perguntas' }),
    ).toBeVisible();

    await expect(page.getByText(/vendo a fila como visitante/)).toBeVisible();
    await expect(page.getByRole('button', { name: 'Aprovar' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Ver perguntas' }).first()).toBeVisible();
  });

  test('lista as aulas com o selo de reescrita por IA', async ({ page }) => {
    await page.goto('/curadoria');
    await expect(
      page.getByRole('heading', { name: 'Fila de revisão das perguntas' }),
    ).toBeVisible();

    const badge = page.getByText('reformuladas com IA · aguardando revisão').first();

    await expect(badge).toBeVisible();
  });

  test('mostra o enunciado reescrito e a resposta na própria tela', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/curadoria');
    await expect(
      page.getByRole('heading', { name: 'Fila de revisão das perguntas' }),
    ).toBeVisible();

    const item = page.locator('li').filter({ hasText: LESSON_TITLE });
    await item.getByRole('button', { name: 'Ver perguntas' }).click();

    await expect(
      item.getByText(/^Um cliente com permissão de administrador/).first(),
    ).toBeVisible();
    await expect(item.getByText(/Resposta:/).first()).toBeVisible();
  });

  test('registra a aprovação e move a aula para o filtro "Aprovadas"', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/curadoria');
    await expect(
      page.getByRole('heading', { name: 'Fila de revisão das perguntas' }),
    ).toBeVisible();

    const item = page.locator('li').filter({ hasText: LESSON_TITLE });
    await item.getByRole('button', { name: 'Aprovar' }).click();

    // A decisão é local-first: fica no navegador.
    await page.reload();

    await page.getByRole('button', { name: 'Aprovadas' }).click();

    await expect(page.locator('li').filter({ hasText: LESSON_TITLE })).toBeVisible();
  });
});
