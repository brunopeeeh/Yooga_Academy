import { expect, test } from '@playwright/test';

/**
 * A fila de curadoria (`/curadoria`) é onde o time de conteúdo aprova ou pede
 * ajuste nas perguntas. Com a Fase 13, a fila mostra as perguntas **efetivas**
 * — as reescritas por IA — e o revisor precisa conseguir aprovar sem sair da
 * tela.
 */

test.describe('Fila de curadoria', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/curadoria');
    await expect(
      page.getByRole('heading', { name: 'Fila de revisão das perguntas' }),
    ).toBeVisible();
  });

  test('lista as aulas com o selo de reescrita por IA', async ({ page }) => {
    const badge = page.getByText('reformuladas com IA · aguardando revisão').first();

    await expect(badge).toBeVisible();
  });

  test('mostra o enunciado reescrito e a resposta na própria tela', async ({ page }) => {
    // O revisor não precisa sair da fila para conferir a pergunta.
    await expect(
      page.getByText('Um cliente com permissão de administrador quer acompanhar os relatórios'),
    ).toBeVisible();

    await expect(page.getByText(/Resposta:/).first()).toBeVisible();
  });

  test('registra a aprovação e move a aula para o filtro "Aprovadas"', async ({ page }) => {
    const item = page
      .locator('li')
      .filter({ hasText: 'Um cliente com permissão de administrador' });

    await item.getByRole('button', { name: 'Aprovar' }).click();

    // A decisão é local-first: fica no navegador.
    await page.reload();

    await page.getByRole('button', { name: 'Aprovadas' }).click();

    await expect(
      page.locator('li').filter({ hasText: 'Um cliente com permissão de administrador' }),
    ).toBeVisible();
  });
});
