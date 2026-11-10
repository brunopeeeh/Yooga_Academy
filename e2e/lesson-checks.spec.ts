import { expect, test } from '@playwright/test';

/**
 * Fluxo crítico do Yooga Academy — o caminho que o analista percorre todo dia:
 * abrir uma aula, responder as perguntas de conferência e concluir.
 *
 * A Fase 13 reescreveu os enunciados dessas perguntas por IA, então estes testes
 * verificam duas coisas ao mesmo tempo:
 *
 * 1. o app continua **funcionando** com a camada de IA no lugar (gating intacto);
 * 2. o texto novo é **legível na tela** — nada truncado, nada vazando a resposta.
 */

const LESSON = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';

test.describe('Aula com perguntas reescritas por IA', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`/aula/${LESSON}`);
    await expect(page.getByRole('heading', { name: 'Confere rápido' })).toBeVisible();
  });

  test('mostra o selo de reescrita por IA e o enunciado reformulado', async ({ page }) => {
    // O selo novo da Fase 13.
    await expect(page.getByText('reformuladas com IA · aguardando revisão')).toBeVisible();

    // O enunciado não é mais o template ("Qual destas informações aparece na aula?").
    const prompt = page.getByText(
      'Um cliente com permissão de administrador quer acompanhar os relatórios de vendas',
    );

    await expect(prompt).toBeVisible();

    // E o texto não é cortado no meio da frase.
    const box = await prompt.boundingBox();

    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThan(10);
  });

  test('bloqueia a conclusão até todas as perguntas serem acertadas', async ({ page }) => {
    const complete = page.getByRole('button', { name: /Concluir aula/ });

    await expect(complete).toBeDisabled();
    await expect(page.getByText('Responda as perguntas para concluir')).toBeVisible();

    const groups = page.getByRole('group');

    await expect(groups).toHaveCount(2);

    // Resposta errada na primeira pergunta: a aula continua bloqueada.
    await groups
      .nth(0)
      .getByRole('button', { name: /Disponível na Google Play/ })
      .click();

    await expect(page.getByText(/Ainda não. Releia os passos acima/)).toBeVisible();
    await expect(complete).toBeDisabled();

    // Resposta certa na primeira: ainda bloqueada, falta a segunda.
    await groups
      .nth(0)
      .getByRole('button', { name: /painel de relatórios/ })
      .click();

    await expect(page.getByText(/Os relatórios ficam em painel\.yooga\.com\.br/)).toBeVisible();
    await expect(complete).toBeDisabled();

    // Resposta certa na segunda: agora libera.
    await groups
      .nth(1)
      .getByRole('button', { name: /aplicativo de vendas/ })
      .click();

    await expect(complete).toBeEnabled();

    await complete.click();

    // Concluir leva para a próxima aula do módulo.
    await expect(page).toHaveURL(/como-baixar-o-app-yooga/);
  });

  test('o progresso da aula fica salvo no navegador', async ({ page }) => {
    const groups = page.getByRole('group');

    await groups
      .nth(0)
      .getByRole('button', { name: /painel de relatórios/ })
      .click();
    await groups
      .nth(1)
      .getByRole('button', { name: /aplicativo de vendas/ })
      .click();

    await page.getByRole('button', { name: /Concluir aula/ }).click();

    // Concluir leva para a próxima aula do módulo.
    await expect(page).toHaveURL(/como-baixar-o-app-yooga/);

    // Recarrega: o app é local-first, então a conclusão continua lá.
    await page.goto(`/aula/${LESSON}`);

    await expect(page.getByRole('heading', { name: 'Confere rápido' })).toBeVisible();
    await expect(page.getByText('Aula concluída')).toBeVisible();
  });
});
