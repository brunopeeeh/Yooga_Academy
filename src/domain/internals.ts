/**
 * Modo interno do app.
 *
 * As telas do analista não precisam (e não devem) mostrar o estado de curadoria
 * das perguntas — "geradas a partir do artigo", "reformuladas com IA",
 * "revisadas pelo time de conteúdo". Esse vocabulário é do time de conteúdo e
 * confunde quem está estudando.
 *
 * O modo interno liga esses estados com `?internals=1` na URL: quem reviewa
 * conteúdo abre a tela assim e enxerga tudo.
 *
 * A regra é pura (sem React) para ser testada em `src/domain/internals.test.ts`.
 */

/** O modo interno está ligado? Só `?internals=1` liga (valores diferentes não). */
export function internalsEnabled(search: string): boolean {
  return new URLSearchParams(search).get('internals') === '1';
}

/**
 * Mantém o modo interno ao navegar dentro do app.
 *
 * Sem isso, o revisor perde o flag ao clicar em "Próxima aula" e o selo
 * some no meio da revisão.
 */
export function withInternals(path: string, enabled: boolean): string {
  if (!enabled) return path;
  if (path.includes('internals=1')) return path;

  return `${path}${path.includes('?') ? '&' : '?'}internals=1`;
}
