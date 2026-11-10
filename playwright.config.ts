import { defineConfig, devices } from '@playwright/test';

/**
 * Testes end-to-end do fluxo crítico do Yooga Academy.
 *
 * O app é local-first: sem `VITE_API_MODE=api` nenhuma chamada de rede é feita,
 * então o Playwright sobe o dev server do Vite e roda contra ele.
 *
 * O foco da Fase 13 é verificar visualmente as perguntas reescritas por IA e
 * garantir que o gating da aula continua funcionando (a aula só conclui
 * quando todas as perguntas de conferência são acertadas).
 */
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? 'github' : [['list']],
  use: {
    baseURL: 'http://localhost:5173',
    trace: 'on-first-retry',
    locale: 'pt-BR',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:5173',
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
