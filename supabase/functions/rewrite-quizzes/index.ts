/**
 * Reescreve a **situação**, o **enunciado**, o **feedback** e o **rótulo de
 * revisão** das perguntas de quiz dos módulos usando uma LLM.
 *
 * A ideia central é a mesma da Fase 13 (`rewrite-checks`), com uma
 * diferença importante: o quiz já tem uma **situação de cliente** — só que
 * hoje ela sai de um template robótico ("Tô com uma dúvida sobre criar um
 * usuário."). É a situação que mais denuncia a origem automática do texto,
 * então ela é o principal alvo da reescrita.
 *
 * O que a LLM **não** pode mexer: as alternativas, o índice da resposta, o
 * tipo da pergunta, a âncora, a seção e o vínculo com a aula. As alternativas
 * são trechos literais do artigo, e é isso que mantém a verificabilidade
 * automática (`src/content/quiz.test.ts`) de pé depois da reescrita.
 *
 * A função também recusa qualquer reescrita que:
 * - copie uma alternativa (entregaria a resposta);
 * - perca o trecho citado (âncora) da pergunta de sequência;
 * - volte a falar de "aula", "texto" ou "trecho";
 * - não tenha sido realmente reescrita.
 *
 * SEGREDOS
 * ---------
 * A função procura quatro valores em duas fontes, nesta ordem:
 *
 * 1. `Deno.env` — quando o secret foi configurado pelo painel do Supabase
 *    (`supabase secrets set AI_API_KEY=...`);
 * 2. o **Vault** do projeto (`vault.decrypted_secrets`), lido por uma RPC
 *    `ai_runtime_secret` que só o `service_role` pode executar.
 *
 * O `REWRITE_TOKEN` protege a função: a chave `anon` do Supabase é pública
 * (viaja no bundle do navegador), então sozinha ela não pode liberar o uso do
 * provedor de LLM.
 */

import 'jsr:@supabase/functions-js/edge-runtime.d.ts';

const SYSTEM_PROMPT = `Você é designer de conteúdo do Yooga Academy, uma trilha de treinamento para analistas de suporte de um SaaS de delivery de comida.

Tarefa: reescrever a SITUAÇÃO, o ENUNCIADO, o FEEDBACK e o RÓTULO DE REVISÃO de cada pergunta de um quiz de módulo.

REGRA DE OURO
As ALTERNATIVAS são imutáveis. São trechos literais do artigo da Central de Ajuda e a resposta correta já está definida. Você não pode alterá-las, reordenar nem "resolver" a questão. Você reescreve o ENVELOPE da pergunta: a situação, o enunciado, o feedback e o rótulo.

REGRAS INEGOCIÁVEIS
1. A SITUAÇÃO ("cena") é a fala da cliente — Dona Lúcia, uma fictícia que fala como cliente de restaurante. Primeira pessoa, português do Brasil, natural, com o problema concreto. Entre 30 e 220 caracteres. NÃO é uma pergunta sobre o material: é uma situação de vida. Bom tom: "Copiei os complementos do Açaí 500ml para o Açaí 300ml. O de 300 já tinha a categoria Caldas. Cadê minhas caldas?" / "Tenho integração com o iFood. Preciso mesmo preencher o Código PDV?"
2. O ENUNCIADO ("enunciado") é a pergunta que o analista precisa responder, no formato de DECISÃO. Entre 20 e 220 caracteres. Comece direto (sem "Isso:", "Certo:", "Bom dia"). Não pode mencionar "aula", "texto" ou "trecho".
3. Nunca revele qual alternativa é a correta. Não copie nenhuma alternativa — nem um trecho de 8 palavras ou mais — para dentro do enunciado ou da situação.
4. O FEEDBACK ("feedback") explica POR QUE a alternativa escolhida está certa, em UMA frase. Entre 10 e 240 caracteres. Comece direto (sem "Correto:", "Isso:", "Exato:"). Não pode repetir o enunciado nem mencionar "aula" ou "texto".
5. O RÓTULO DE REVISÃO ("rotulo") é um título curto, até 60 caracteres, sem ponto final, que resume o que a pergunta treina. Exemplo: "Cadastro de produto no PDV", "Fila de impressão", "Primeiro acesso ao app".
6. Não use "aula", "texto" ou "trecho" como critério da resposta em nenhum dos campos.
7. Se a pergunta for do tipo SEQUÊNCIA, mantenha o trecho do campo "trecho_para_citar" entre aspas, copiando-o LITERALMENTE (inclusive a pontuação), e pergunte o que vem a seguir.
8. Escreva para o analista (use "você"), a partir da situação da cliente. A situação deve explicar por que a resposta importa.

TIPOS DE PERGUNTA
- "sequencia": a resposta é o passo que vem logo DEPOIS do trecho citado. Mantenha a âncora entre aspas e pergunte o que vem a seguir.
- "reconhecimento": a resposta é uma ação (ou uma informação) que existe na aula citada. Escreva uma situação em que o analista precisa saber exatamente aquilo para atender a cliente.
- "ordem": a resposta é o PRIMEIRO passo. Pergunte pelo primeiro passo a seguir.

FORMATO DA RESPOSTA
Responda SOMENTE com um JSON, sem texto antes ou depois:
{"questions":[{"id":"<id original>","scene":"...","prompt":"...","explanation":"...","review":"..."}]}
Devolva exatamente uma entrada por pergunta, na mesma ordem e com os mesmos ids recebidos.`;

interface IncomingQuestion {
  id: string;
  type?: 'sequencia' | 'reconhecimento' | 'ordem';
  scene: string;
  prompt: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  review: string;
  anchor?: string;
  /** Trecho exato que a LLM deve citar entre aspas (o mesmo do gerador). */
  anchorQuote?: string;
  section?: string;
  lessonId?: string;
}

interface IncomingLesson {
  id: string;
  title: string;
  text: string;
}

interface Payload {
  module: { id: string; name: string };
  lessons: IncomingLesson[];
  questions: IncomingQuestion[];
}

interface RewrittenQuestion {
  id: string;
  scene: string;
  prompt: string;
  explanation: string;
  review: string;
}

const MIN_SCENE = 30;
const MAX_SCENE = 220;
const MIN_PROMPT = 20;
const MAX_PROMPT = 220;
const MIN_EXPLANATION = 10;
const MAX_EXPLANATION = 240;
const MIN_REVIEW = 3;
const MAX_REVIEW = 60;
const MAX_LESSON_TEXT = 3000;
/** Quantas palavras seguidas vindas de uma alternativa já contam como vazamento. */
const LEAK_WORDS = 8;
/** Quantos caracteres normalizados de um trecho literal ainda contam como âncora. */
const ANCHOR_CHARS = 30;

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
 * O enunciado (ou a situação) não pode repetir a alternativa — isso
 * entregaria a resposta.
 *
 * Além da repetição literal, checamos uma sequência de palavras: uma
 * paráfrase muito próxima ("clique em ajustes e fila de impressao") também
 * entrega a resposta.
 */
function leaksOption(text: string, option: string): boolean {
  const haystack = normalize(text);
  const target = normalize(option);

  if (!target) return false;
  if (haystack.includes(target)) return true;

  const words = target.split(' ');

  if (words.length < LEAK_WORDS) return false;

  return haystack.includes(words.slice(0, LEAK_WORDS).join(' '));
}

/**
 * O texto continua falando do material ("qual ação aparece nesta aula?").
 *
 * É exatamente o defeito que a reescrita existe para corrigir — por isso a
 * checagem é ampla: qualquer menção a "aula", "texto" ou "trecho" é recusada.
 */
function asksAboutTheText(text: string): boolean {
  return /\baula\b|\btextos?\b|\btrechos?\b/i.test(text);
}

/**
 * O enunciado precisa continuar citando a âncora — é ela que diz **qual
 * passo** o analista acabou de seguir.
 *
 * A âncora pode ser longa e não faz sentido exigir que a LLM reproduza o
 * pedaço *inicial* dela: citar um trecho no meio identifica o mesmo passo.
 * Por isso procuramos **qualquer** trecho literal da âncora dentro do
 * enunciado.
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

/** O feedback abre direto na explicação — sem "Correto:"/"Isso:" de prefixo. */
function hasConfirmationPrefix(text: string): boolean {
  return /^(correto|isso|exato|certo|perfeito|sim|boa|claro)\b[:,.]/i.test(text);
}

/**
 * Lê um secret do Vault do projeto.
 *
 * A RPC `ai_runtime_secret` só pode ser executada pelo `service_role`, e a
 * chave de serviço já vem no ambiente da Edge Function.
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
  const lessonById = new Map(payload.lessons.map((lesson) => [lesson.id, lesson]));

  return {
    modulo: {
      id: payload.module.id,
      nome: payload.module.name,
    },
    aulas: payload.lessons.map((lesson) => ({
      id: lesson.id,
      titulo: lesson.title,
      texto: lesson.text.slice(0, MAX_LESSON_TEXT),
    })),
    perguntas: payload.questions.map((question) => {
      const lesson = question.lessonId ? lessonById.get(question.lessonId) : undefined;

      return {
        id: question.id,
        tipo: question.type ?? 'reconhecimento',
        aula_citada: question.lessonId ?? null,
        texto_da_aula: lesson ? lesson.text.slice(0, MAX_LESSON_TEXT) : null,
        cena_atual: question.scene,
        enunciado_atual: question.prompt,
        ancora: question.anchor ?? null,
        trecho_para_citar: question.anchorQuote ?? null,
        secao: question.section ?? null,
        alternativas: question.options.map((option, index) => ({
          texto: option,
          correta: index === question.correctIndex,
        })),
      };
    }),
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
      temperature: 0.5,
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
    const item = questions[index] as {
      id?: unknown;
      scene?: unknown;
      prompt?: unknown;
      explanation?: unknown;
      review?: unknown;
    };

    if (item?.id !== source.id) throw new Error(`id fora de ordem em ${source.id}`);

    const scene = typeof item.scene === 'string' ? item.scene.trim() : '';
    const prompt = typeof item.prompt === 'string' ? item.prompt.trim() : '';
    const explanation = typeof item.explanation === 'string' ? item.explanation.trim() : '';
    const review = typeof item.review === 'string' ? item.review.trim() : '';

    if (scene.length < MIN_SCENE || scene.length > MAX_SCENE) {
      throw new Error(`situacao fora do tamanho (${scene.length}) em ${source.id}`);
    }

    if (prompt.length < MIN_PROMPT || prompt.length > MAX_PROMPT) {
      throw new Error(`enunciado fora do tamanho (${prompt.length}) em ${source.id}`);
    }

    if (explanation.length < MIN_EXPLANATION || explanation.length > MAX_EXPLANATION) {
      throw new Error(`feedback fora do tamanho (${explanation.length}) em ${source.id}`);
    }

    if (review.length < MIN_REVIEW || review.length > MAX_REVIEW) {
      throw new Error(`rotulo fora do tamanho (${review.length}) em ${source.id}`);
    }

    for (const option of source.options) {
      if (leaksOption(prompt, option)) {
        throw new Error(`enunciado entrega a alternativa em ${source.id}`);
      }

      if (leaksOption(scene, option)) {
        throw new Error(`situacao entrega a alternativa em ${source.id}`);
      }
    }

    if (asksAboutTheText(prompt)) {
      throw new Error(`enunciado ainda fala de "aula" em ${source.id}`);
    }

    if (asksAboutTheText(scene)) {
      throw new Error(`situacao ainda fala de "aula" em ${source.id}`);
    }

    if (asksAboutTheText(explanation)) {
      throw new Error(`feedback ainda fala de "aula" em ${source.id}`);
    }

    if (asksAboutTheText(review)) {
      throw new Error(`rotulo ainda fala de "aula" em ${source.id}`);
    }

    if (hasConfirmationPrefix(explanation)) {
      throw new Error(`feedback com prefixo de confirmacao em ${source.id}`);
    }

    // A âncora citada precisa continuar no enunciado — é ela que diz qual
    // passo o analista acabou de seguir. A validação usa o trecho exato que
    // pedimos para citar (`ancora_para_citar`), que é o mesmo do gerador
    // determinístico.
    const cited = source.anchorQuote ?? source.anchor;

    if (cited && !preservesAnchor(prompt, cited)) {
      throw new Error(`enunciado perdeu a ancora citada em ${source.id}`);
    }

    if (normalize(prompt) === normalize(source.prompt)) {
      throw new Error(`enunciado nao foi reescrito em ${source.id}`);
    }

    if (normalize(scene) === normalize(source.scene)) {
      throw new Error(`situacao nao foi reescrita em ${source.id}`);
    }

    return { id: source.id, scene, prompt, explanation, review };
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

  if (!payload?.module?.id || !Array.isArray(payload.questions) || payload.questions.length === 0) {
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
