import rawChecks from './checks.ai.generated.json';
import { parseAiChecksByLesson } from './schema';

/**
 * Perguntas de conferência reescritas por uma LLM
 * (`src/content/checks.ai.generated.json`).
 *
 * Arquivo gerado por `npm run content:checks:ai` — não editar à mão.
 *
 * A camada de IA troca **apenas** o enunciado e o feedback: as alternativas,
 * o índice da resposta, a âncora e a seção são os mesmos do gerador
 * determinístico, que é o que mantém a verificabilidade automática.
 *
 * O arquivo começa vazio (`{}`) e só ganha entradas quando o script roda
 * contra a Edge Function `rewrite-checks`.
 */
export const aiChecks = parseAiChecksByLesson(rawChecks);
