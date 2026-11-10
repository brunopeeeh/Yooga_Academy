import { chromium } from '@playwright/test';

/**
 * Captura de telas para a conferência visual do conteúdo reescrito por IA.
 *
 *   npm run shots
 *
 * As imagens ficam em `e2e/__screenshots__` (fora do git).
 *
 * A Fase 14 acrescenta as telas do **quiz** reescrito (situação de atendimento
 * + enunciado em formato de decisão) e a fila de curadoria com o quiz do módulo
 * ao lado das aulas.
 */

const LESSON = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';
const MODULE = 'primeiros-passos--acesso-ao-sistema';
const OUT = 'e2e/__screenshots__';

/** Aulas essenciais do módulo: sem elas o quiz fica bloqueado. */
const ESSENTIALS = [
  'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel',
  'primeiros-passos--acesso-ao-sistema--como-baixar-o-app-yooga',
  'primeiros-passos--acesso-ao-sistema--como-acesso-minha-area-de-gestao',
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// Destrava o quiz do módulo.
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
        log: [],
      },
      version: 1,
    }),
  );
}, ESSENTIALS);

// 1. A tela de aula com as perguntas reescritas.
await page.goto(`http://localhost:5173/aula/${LESSON}`);
await page.getByRole('heading', { name: 'Confere rápido' }).waitFor();
await page
  .locator('section')
  .filter({ hasText: 'Confere rápido' })
  .first()
  .scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/01-aula-perguntas-ia.png`, fullPage: false });

// 2. A mesma tela com uma resposta errada (o gating em ação).
const groups = page.getByRole('group');
await groups
  .nth(0)
  .getByRole('button', { name: /Disponível na Google Play/ })
  .click();
await groups.nth(0).scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/02-aula-resposta-errada.png` });

// 3. A tela com as respostas certas e o feedback da IA.
await groups
  .nth(0)
  .getByRole('button', { name: /painel de relatórios/ })
  .click();
await groups
  .nth(1)
  .getByRole('button', { name: /aplicativo de vendas/ })
  .click();
await groups.nth(0).scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/03-aula-respostas-certas.png` });

// 4. A fila de curadoria.
await page.goto('http://localhost:5173/curadoria');
await page.getByRole('heading', { name: 'Fila de revisão das perguntas' }).waitFor();
await page.screenshot({ path: `${OUT}/04-curadoria-fila.png` });

// 5. O quiz do módulo, com a situação de atendimento reescrita.
await page.goto(`http://localhost:5173/quiz/${MODULE}`);
await page.getByRole('heading', { level: 1 }).waitFor();
await page.screenshot({ path: `${OUT}/05-quiz-ia.png` });

// 6. O quiz com o feedback da IA (resposta errada).
await page.getByRole('radio').nth(1).click();
await page.getByRole('button', { name: 'Responder' }).click();
await page.getByText('Quase.').waitFor();
await page.screenshot({ path: `${OUT}/06-quiz-resposta-errada.png` });

// 7. A fila de curadoria com o quiz do módulo (situação + enunciado + resposta).
await page.goto('http://localhost:5173/curadoria');
await page.getByRole('heading', { name: 'Fila de revisão das perguntas' }).waitFor();
const quizItem = page.locator('li').filter({ hasText: 'Quiz · Acesso ao sistema' });
await quizItem.scrollIntoViewIfNeeded();
await page.screenshot({ path: `${OUT}/07-curadoria-quiz.png` });

// 8. A busca da Biblioteca (o conteúdo reescrito não afeta, mas confirma que
//    o texto continua indexável).
await page.goto('http://localhost:5173/biblioteca');
await page.getByRole('searchbox', { name: 'Buscar aulas' }).fill('impressora');
await page.waitForTimeout(2500);
await page.screenshot({ path: `${OUT}/08-biblioteca-busca.png` });

await browser.close();

console.log('Screenshots salvos em', OUT);
