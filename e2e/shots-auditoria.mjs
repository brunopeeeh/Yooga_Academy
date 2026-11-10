import { chromium } from '@playwright/test';

/**
 * Roteiro de auditoria UX/UI — captura TODAS as telas do app.
 *
 *   node e2e/shots-auditoria.mjs
 *
 * Saída: e2e/__screenshots__/auditoria/*.png (fullPage, desktop + mobile).
 */

const OUT = 'e2e/__screenshots__/auditoria';
const BASE = 'http://localhost:5173';

const GRUPO = 'primeiros-passos';
const MODULO = 'primeiros-passos--acesso-ao-sistema';
const AULA = 'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel';

const browser = await chromium.launch();

// ---------- desktop, analista "zerado" (primeira sessão) ----------
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

// 1. Home zerada.
await page.goto(BASE);
await page.getByRole('heading', { level: 1 }).first().waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/01-home-zerada.png`, fullPage: true });

// 2. Login.
await page.goto(`${BASE}/entrar`);
await page.getByRole('heading', { level: 1 }).first().waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/02-entrar.png`, fullPage: true });

// 3. Grupo.
await page.goto(`${BASE}/grupo/${GRUPO}`);
await page.getByRole('heading', { level: 1 }).first().waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/03-grupo.png`, fullPage: true });

// 4. Módulo.
await page.goto(`${BASE}/grupo/${GRUPO}/${MODULO}`);
await page.getByRole('heading', { level: 1 }).first().waitFor();
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/04-modulo.png`, fullPage: true });

// 5. Aula completa (topo).
await page.goto(`${BASE}/aula/${AULA}`);
await page.getByRole('heading', { level: 1 }).first().waitFor();
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/05-aula-topo.png`, fullPage: false });
await page.screenshot({ path: `${OUT}/06-aula-toda.png`, fullPage: true });

// 6. Biblioteca.
await page.goto(`${BASE}/biblioteca`);
await page.getByRole('searchbox', { name: 'Buscar aulas' }).waitFor();
await page.screenshot({ path: `${OUT}/07-biblioteca.png`, fullPage: true });

// 7. Conquistas.
await page.goto(`${BASE}/conquistas`);
await page.waitForTimeout(800);
await page.screenshot({ path: `${OUT}/08-conquistas.png`, fullPage: true });

// 8. Curadoria.
await page.goto(`${BASE}/curadoria`);
await page.waitForTimeout(1000);
await page.screenshot({ path: `${OUT}/09-curadoria.png`, fullPage: true });

// 9. 404.
await page.goto(`${BASE}/rota-inexistente`);
await page.waitForTimeout(500);
await page.screenshot({ path: `${OUT}/10-404.png`, fullPage: true });

// 10. Login como líder → HOME + tela do líder.
await page.goto(`${BASE}/entrar`);
const login = page.locator('form').first();
await login.locator('input[type="email"]').first().fill('lider@demo.local');
await login.locator('input[type="password"]').first().fill('demo');
await login.getByRole('button', { name: /entrar/i }).first().click();
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/11-pos-login.png`, fullPage: false });

// 11. Líder.
await page.goto(`${BASE}/lider`);
await page.waitForTimeout(1500);
await page.screenshot({ path: `${OUT}/12-lider.png`, fullPage: true });
await page.screenshot({ path: `${OUT}/13-lider-topo.png`, fullPage: false });

await page.close();

// ---------- desktop, analista com progresso (meio da trilha) ----------
const page2 = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page2.addInitScript((lessons) => {
  localStorage.setItem(
    'yooga.academy.progress',
    JSON.stringify({
      state: {
        concluidas: Object.fromEntries(lessons.map((id) => [id, true])),
        checks: {},
        quiz: {},
        selos: {},
        xp: 60,
        sequencia: 0,
        log: [],
      },
      version: 1,
    }),
  );
}, [
  'primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel',
  'primeiros-passos--acesso-ao-sistema--como-baixar-o-app-yooga',
  'primeiros-passos--acesso-ao-sistema--como-acesso-minha-area-de-gestao',
  'primeiros-passos--configuracoes-iniciais--como-criar-minha-empresa',
  'primeiros-passos--configuracoes-iniciais--como-criar-o-cadastro-de-clientes',
]);

await page2.goto(BASE);
await page2.waitForTimeout(800);
await page2.screenshot({ path: `${OUT}/14-home-progresso.png`, fullPage: true });

await page2.goto(`${BASE}/grupo/${GRUPO}`);
await page2.waitForTimeout(800);
await page2.screenshot({ path: `${OUT}/15-grupo-progresso.png`, fullPage: true });

await page2.close();

// ---------- mobile (390×844), shell + home + aula ----------
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.goto(BASE);
await mob.waitForTimeout(800);
await mob.screenshot({ path: `${OUT}/16-mobile-home.png`, fullPage: true });

await mob.goto(`${BASE}/aula/${AULA}`);
await mob.waitForTimeout(1000);
await mob.screenshot({ path: `${OUT}/17-mobile-aula.png`, fullPage: false });

await mob.goto(`${BASE}/biblioteca`);
await mob.waitForTimeout(800);
await mob.screenshot({ path: `${OUT}/18-mobile-biblioteca.png`, fullPage: true });

await mob.close();

await browser.close();
console.log('Auditoria salva em', OUT);
