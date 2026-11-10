/**
 * Reescreve o **enunciado** e o **feedback** das perguntas de conferência
 * ("confere rápido") usando uma LLM.
 *
 * A ideia central: as alternativas das perguntas são trechos literais do
 * artigo e a resposta correta já está verificada pelo gerador determinístico
 * (`scripts/generate-checks.mjs`). Por isso a LLM **não recebe poder sobre as
 * alternativas** — ela só devolve `prompt` e `success`. É o que mantém a
 * verificabilidade automática (`src/content/content.test.ts`) de pé depois da
 * reescrita.
 *
 * A função também recusa qualquer enunciado que:
 * - copie uma alternativa (entregaria a resposta);
 * - perca o trecho citado (âncora) da pergunta de sequência;
 * - volte a perguntar "o que aparece nesta aula?";
 * - não tenha sido realmente reescrito.
 *
 * SEGREDOS
 * ---------
 * A função lê quatro valores: `AI_API_KEY`, `AI_BASE_URL`, `AI_MODEL` e
 * `REWRITE_TOKEN`. Cada um é procurado em duas fontes, nesta ordem:
 *
 * 1. `Deno.env` — quando o secret foi configurado pelo painel do Supabase
 *    (`supabase secrets set AI_API_KEY=...`);
 * 2. o **Vault** do projeto (`vault.decrypted_secrets`), lido por uma RPC
 *    `ai_runtime_secret` que só o `service_role` pode executar. É o caminho
 *    usado por padrão porque o painel não expõe os secrets de Edge Function
 *    para automação.
 *
 * O `REWRITE_TOKEN` protege a função: a chave `anon` do Supabase é pública
 * (viaja no bundle do navegador), então sozinha ela não pode liberar o uso do
 * provedor de LLM.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SYSTEM_PROMPT = `Você é designer de conteúdo do Yooga Academy, uma trilha de treinamento para analistas de suporte de um SaaS de delivery de comida.

Tarefa: reescrever o ENUNCIADO e o FEEDBACK de sucesso de perguntas de conferência ("confere rápido") que aparecem no fim de uma aula.

REGRAS INEGOCIÁVEIS
1. As ALTERNATIVAS são imutáveis. São trechos literais do artigo e a resposta correta já está definida. Você não pode alterá-las, reordenar, nem "resolver" a questão.
2. Nunca revele qual alternativa é a correta. Não copie nenhuma alternativa — nem um trecho de 8 palavras ou mais — para dentro do enunciado.
3. Não use "nesta aula" (nem "aqui", "no texto", "o artigo") como critério da resposta. O defeito que estamos corrigindo é justamente esse: hoje a pergunta pede "qual frase aparece nesta aula?". O objetivo é testar DECISÃO e CONHECIMENTO de produto.
4. Escreva para o analista (use "você"), a partir de uma SITUAÇÃO de cliente quando couber na conta. A situação deve explicar por que a resposta importa.
5. O enunciado tem entre 20 e 220 caracteres. O feedback tem entre 10 e 200 caracteres.
6. Se a pergunta citar um trecho da aula (campo "ancora"), mantenha esse trecho entre aspas, copiando-o LITERALMENTE do campo "ancora" (pode ser um pedaço dele, mas as palavras precisam ser idênticas). Reformule apenas o resto.
7. O feedback explica POR QUE a alternativa escolhida está certa, em UMA frase. Comece direto (sem "Correto:", "Isso:" ou "Exato:"), não pode mencionar "nesta aula" e não pode repetir o enunciado.
8. Português do Brasil, natural, sem jargão, sem vício de "a partir do texto".

TIPOS DE PERGUNTA
- "reconhecimento": a resposta é uma ação (ou uma informação) que existe na aula. Escreva uma situação em que o analista precisa saber exatamente aquilo para atender o cliente.
- "sequencia": a resposta é o passo que vem logo DEPOIS do trecho citado. Mantenha a âncora entre aspas e pergunte o que vem a seguir.

FORMATO DA RESPOSTA
Responda SOMENTE com um JSON, sem texto antes ou depois:
{"questions":[{"id":"<id original>","prompt":"...","success":"..."}]}
Devolva exatamente uma entrada por pergunta, na mesma ordem e com os mesmos ids recebidos.`;

interface IncomingQuestion {
  id: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  success: string;
  anchor?: string;
  section?: string;
}

interface Payload {
  lesson: { id: string; title: string; text: string };
  questions: IncomingQuestion[];
}

interface RewrittenQuestion {
  id: string;
  prompt: string;
  success: string;
}

const MAX_PROMPT = 220;
const MIN_PROMPT = 20;
const MAX_SUCCESS = 200;
const MIN_SUCCESS = 10;
const MAX_LESSON_TEXT = 6000;
/** Quantas palavras seguidas vindas de uma alternativa já contam como vazamento. */
const LEAK_WORDS = 8;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', Connection: 'keep-alive' },
  });
}

/** Normaliza como a auditoria do app: sem acento, sem pontuação. */
function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/**
 * O enunciado não pode repetir a alternativa — isso entregaria a resposta.
 *
 * Além da repetição literal, checamos uma sequência de palavras: uma
 * paráfrase muito próxima ("clique em ajustes e fila de impressao") também
 * entrega a resposta.
 */
function leaksOption(prompt: string, option: string): boolean {
  const text = normalize(prompt);
  const target = normalize(option);

  if (!target) return false;
  if (text.includes(target)) return true;

  const words = target.split(' ');

  if (words.length < LEAK_WORDS) return false;

  return text.includes(words.slice(0, LEAK_WORDS).join(' '));
}

/** Perguntas que continuam perguntando "o que aparece nesta aula?". */
function asksAboutTheText(text: string): boolean {
  return /nesta aula|esta aula|no texto da aula|o texto da aula|no artigo|esta pagina/i.test(text);
}

/** Quantos caracteres normalizados de um trecho literal ainda contam como âncora. */
const ANCHOR_CHARS = 30;

/**
 * O enunciado precisa continuar citando a âncora — é ela que diz **qual
 * passo** o analista acabou de seguir.
 *
 * A âncora pode ser longa (às vezes passa de 200 caracteres) e não faz
 * sentido exigir que a LLM reproduza o pedaço *inicial* dela: citar o final
 * ("...basta clicar em 'Salvar'") identifica o mesmo passo. Por isso
 * procuramos **qualquer** trecho literal da âncora dentro do enunciado.
 */
function preservesAnchor(prompt: string, anchor: string): boolean {
  const needle = normalize(anchor);
  const text = normalize(prompt);

  if (!needle) return true;
  if (needle.length <= ANCHOR_CHARS) return text.includes(needle);

  for (let start = 0; start + ANCHOR_CHARS <= needle.length; start += 1) {
    if (text.includes(needle.slice(start, start + ANCHOR_CHARS))) return true;
  }

  return false;
}

/**
 * Lê um secret do Vault do projeto.
 *
 * A RPC `ai_runtime_secret` só pode ser executada pelo `service_role`, e a
 * chave de serviço já vem no ambiente da Edge Function — o mesmo caminho usado
 * pelo próprio Supabase para expor secrets do Vault ao runtime.
 */
async function readVaultSecret(name: string): Promise<string | null> {
  const url = Deno.env.get('SUPABASE_URL');
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

  if (!url || !serviceKey) return null;

  try {
    const response = await fetch(`${url}/rest/v1/rpc/ai_runtime_secret`, {
      method: 'POST',
      headers: {
        apikey: serviceKey,
        Authorization: `Bearer ${serviceKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ secret_name: name }),
    });

    if (!response.ok) return null;

    const body = (await response.json()) as unknown;

    if (typeof body === 'string') return body;
    if (Array.isArray(body) && typeof body[0] === 'string') return body[0];

    return null;
  } catch {
    return null;
  }
}

/** Procura o secret no ambiente e, se não achar, no Vault. */
async function readSecret(name: string): Promise<string | null> {
  const fromEnv = Deno.env.get(name);

  if (fromEnv) return fromEnv;

  return await readVaultSecret(name);
}

function buildUserMessage(payload: Payload) {
  return {
    aula: {
      id: payload.lesson.id,
      titulo: payload.lesson.title,
      texto: payload.lesson.text.slice(0, MAX_LESSON_TEXT),
    },
    perguntas: payload.questions.map((question) => ({
      id: question.id,
      tipo: question.id === 'q2' ? 'sequencia' : 'reconhecimento',
      enunciado_atual: question.prompt,
      ancora: question.anchor ?? null,
      secao: question.section ?? null,
      alternativas: question.options.map((option, index) => ({
        texto: option,
        correta: index === question.correctIndex,
      })),
    })),
  };
}

async function callProvider(payload: Payload): Promise<string> {
  const apiKey = await readSecret('AI_API_KEY');
  const baseUrl = ((await readSecret('AI_BASE_URL')) ?? 'https://api.openai.com/v1').replace(
    /\/+$/,
    '',
  );
  const model = (await readSecret('AI_MODEL')) ?? 'gpt-4o-mini';

  if (!apiKey) throw new Error('AI_API_KEY nao configurada');

  const messages = [
    { role: 'system', content: SYSTEM_PROMPT },
    { role: 'user', content: JSON.stringify(buildUserMessage(payload)) },
  ];

  const send = async (withJsonMode: boolean) => {
    const body: Record<string, unknown> = {
      model,
      temperature: 0.4,
      messages,
    };

    if (withJsonMode) body.response_format = { type: 'json_object' };

    return fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
  };

  let response = await send(true);

  // Nem todo provedor compatível com OpenAI aceita `response_format`.
  if (response.status === 400) {
    response = await send(false);
  }

  if (!response.ok) {
    const detail = (await response.text()).slice(0, 300);
    throw new Error(`provedor respondeu ${response.status}: ${detail}`);
  }

  const data = await response.json();
  const content = data?.choices?.[0]?.message?.content;

  if (typeof content !== 'string' || content.trim().length === 0) {
    throw new Error('provedor devolveu resposta sem conteudo');
  }

  return content;
}

function validate(original: readonly IncomingQuestion[], raw: string): RewrittenQuestion[] {
  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error('provedor devolveu JSON invalido');
  }

  const questions = (parsed as { questions?: unknown })?.questions;

  if (!Array.isArray(questions) || questions.length !== original.length) {
    throw new Error('a quantidade de perguntas reescritas nao bate com a entrada');
  }

  return original.map((source, index) => {
    const item = questions[index] as { id?: unknown; prompt?: unknown; success?: unknown };

    if (item?.id !== source.id) throw new Error(`id fora de ordem em ${source.id}`);

    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
    const success = typeof item.success === 'string' ? item.success.trim() : '';

    if (prompt.length < MIN_PROMPT || prompt.length > MAX_PROMPT) {
      throw new Error(`enunciado fora do tamanho (${prompt.length}) em ${source.id}`);
    }

    if (success.length < MIN_SUCCESS || success.length > MAX_SUCCESS) {
      throw new Error(`feedback fora do tamanho (${success.length}) em ${source.id}`);
    }

    for (const option of source.options) {
      if (leaksOption(prompt, option)) {
        throw new Error(`enunciado entrega a alternativa em ${source.id}`);
      }
    }

    if (asksAboutTheText(prompt)) {
      throw new Error(`enunciado ainda pergunta "nesta aula" em ${source.id}`);
    }

    if (asksAboutTheText(success)) {
      throw new Error(`feedback ainda menciona "nesta aula" em ${source.id}`);
    }

    // O feedback abre direto na explicação — sem "Correto:"/"Isso:" de prefixo.
    if (/^(correto|isso|exato|certo|perfeito|sim)\b[:,.]/i.test(success)) {
      throw new Error(`feedback com prefixo de confirmacao em ${source.id}`);
    }

    if (source.anchor && !preservesAnchor(prompt, source.anchor)) {
      throw new Error(`enunciado perdeu a ancora citada em ${source.id}`);
    }

    if (normalize(prompt) === normalize(source.prompt)) {
      throw new Error(`enunciado nao foi reescrito em ${source.id}`);
    }

    return { id: source.id, prompt, success };
  });
}

Deno.serve(async (request: Request) => {
  if (request.method !== 'POST') {
    return json({ error: 'metodo nao permitido' }, 405);
  }

  const expectedToken = await readSecret('REWRITE_TOKEN');

  if (!expectedToken) {
    return json({ error: 'REWRITE_TOKEN nao configurada' }, 500);
  }

  if (request.headers.get('x-rewrite-token') !== expectedToken) {
    return json({ error: 'token invalido' }, 401);
  }

  let payload: Payload;

  try {
    payload = (await request.json()) as Payload;
  } catch {
    return json({ error: 'corpo invalido' }, 400);
  }

  if (!payload?.lesson?.id || !Array.isArray(payload.questions) || payload.questions.length === 0) {
    return json({ error: 'payload invalido' }, 400);
  }

  try {
    const raw = await callProvider(payload);
    const questions = validate(payload.questions, raw);

    return json({ questions });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'erro desconhecido';

    return json({ error: message }, 422);
  }
});
