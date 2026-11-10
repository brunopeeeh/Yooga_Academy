import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

/**
 * Fase 14 — os quizzes dos módulos reescritos por IA.
 *
 * O quiz continua funcionando como antes (as alternativas são trechos literais
 * do artigo), mas o **envelope** da pergunta — situação de atendimento,
 * enunciado, feedback e rótulo — foi reescrito por uma LLM.
 *
 * Estes testes são a rede de segurança da Fase 14:
 *
 * 1. o app continua **funcionando** com a camada de IA no lugar;
 * 2. o texto novo aparece **inteiro** na tela (situação, enunciado e feedback);
 * 3. o time de conteúdo consegue **aprovar** o quiz pela fila de curadoria,
 *    sem sair da tela.
 */

const MODULE = 'primeiros-passos--acesso-ao-sistema';
const MODULE_NAME = 'Acesso ao sistema';

/** Aulas essenciais do módulo: sem elas o quiz fica bloqueado. */
const ESSENTIALS = [
  'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel',
  'primeiros-passos--acesso-ao-sistema--como-baixar-o-app-yooga',
  'primeiros-passos--acesso-ao-sistema--como-acesso-minha-area-de-gestao',
];

const SCENE =
  'Uso o Yooga no celular, mas agora quero lançar meus pedidos pelo computador. Por onde eu entro no aplicativo de vendas?';

/** Destrava o quiz: conclui as aulas essenciais do módulo. */
async function unlockQuiz(page: Page) {
  await page.addInitScript((lessons) => {
    localStorage.setItem(
      'yooga.academy.progress',
      JSON.stringify({
        state: {
          concluidas: Object.fromEntries(lessons.map((id) => [id, true])),
          checks: {},
          quiz: {},
          selos: {},
          xp: 30,
          sequencia: 0,
          ultimoDiaAtivo: null,
          log: [],
        },
        version: 1,
      }),
    );
  }, ESSENTIALS);
}

/** A fila é read-only para visitante: revisão exige sessão (conta demo). */
async function loginAsReviewer(page: Page) {
  await page.goto('/entrar');
  await page.getByRole('button', { name: 'Entrar como Fábio Ribeiro · Líder' }).click();
  await expect(page.locator('header').getByText('Fábio Ribeiro')).toBeVisible();
}

test.describe('Quiz reescrito por IA', () => {
  test.beforeEach(async ({ page }) => {
    await unlockQuiz(page);
    await page.goto(`/quiz/${MODULE}`);
  });

  test('mostra a situação de atendimento e o selo só no modo interno', async ({ page }) => {
    // A situação é a fala da cliente — não o template robótico do gerador.
    const scene = page.getByText(SCENE);

    await expect(scene).toBeVisible();

    // E o texto não é cortado no meio da frase.
    const box = await scene.boundingBox();

    expect(box).not.toBeNull();
    expect(box?.height ?? 0).toBeGreaterThan(10);

    // O selo de origem é vocabulário do time de conteúdo: escondido por padrão.
    await expect(page.getByText('reformulado com IA · aguardando revisão')).toHaveCount(0);

    await page.goto(`/quiz/${MODULE}?internals=1`);

    await expect(page.getByText('reformulado com IA · aguardando revisão')).toBeVisible();
  });

  test('mostra o enunciado reformulado em formato de decisão', async ({ page }) => {
    await expect(
      page.getByRole('heading', {
        level: 1,
        name: 'A cliente quer fazer pedidos pelo computador. Qual informação sobre o acesso ao aplicativo de vendas você confirma para ela?',
      }),
    ).toBeVisible();

    // O template antigo ("Qual destas informações aparece na aula?") sumiu.
    await expect(page.getByText(/aparece na aula/i)).toHaveCount(0);
  });

  test('revela a resposta e o feedback reescrito', async ({ page }) => {
    const options = page.getByRole('radio');

    await expect(options).toHaveCount(4);

    // Resposta errada: o feedback explica por que não.
    await options.nth(1).click();
    await page.getByRole('button', { name: 'Responder' }).click();

    await expect(page.getByText('Quase.')).toBeVisible();
    await expect(page.getByText('Correta')).toBeVisible();

    // A alternativa correta é a do gerador determinístico (trecho do artigo).
    await expect(
      page.getByText(/Para acessar o aplicativo de vendas, visite o site app\.yooga\.com\.br/),
    ).toBeVisible();
  });
});

test.describe('Curadoria dos quizzes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/curadoria');
    await expect(
      page.getByRole('heading', { name: 'Fila de revisão das perguntas' }),
    ).toBeVisible();
  });

  test('lista o quiz do módulo com situação, enunciado e resposta', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/curadoria');
    await page.getByRole('heading', { name: 'Fila de revisão das perguntas' }).waitFor();

    const item = page.locator('li').filter({ hasText: `Quiz · ${MODULE_NAME}` });
    await item.getByRole('button', { name: 'Ver perguntas' }).click();

    await expect(item).toBeVisible();
    await expect(item.getByText('reformulado com IA · aguardando revisão')).toBeVisible();
    await expect(item.getByText(SCENE)).toBeVisible();
    await expect(item.getByText(/Resposta:/).first()).toBeVisible();
  });

  test('registra a aprovação do quiz e move o item para o filtro "Aprovadas"', async ({ page }) => {
    await loginAsReviewer(page);
    await page.goto('/curadoria');
    await page.getByRole('heading', { name: 'Fila de revisão das perguntas' }).waitFor();

    const item = page.locator('li').filter({ hasText: `Quiz · ${MODULE_NAME}` });
    await item.getByRole('button', { name: 'Aprovar' }).click();

    // A decisão é local-first: fica no navegador.
    await page.reload();

    await page.getByRole('button', { name: 'Aprovadas' }).click();

    await expect(page.locator('li').filter({ hasText: `Quiz · ${MODULE_NAME}` })).toBeVisible();
  });
});
