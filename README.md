# Yooga Academy

Migração do protótipo `yooga-academy-onboarding-prototipo.html` para React + TypeScript.

## Fases 0 a 14 concluídas

- Vite + React 19 + TypeScript strict, aliases `@/*`, ESLint, Prettier e Vitest.
- Design tokens e estilos globais herdados do protótipo (Poppins / Roboto Slab).
- Catálogo extraído do HTML para `src/data/seed.json` e validado com Zod.
- Domínio puro: tipos, índices derivados, regras de XP, níveis, gating de quiz e selos.
- Store Zustand com `persist` (local-first) e ações de aula, quick check e quiz.
- Shell com browser router, sessão real (Fase 8), guarda de `/lider`, toasts, live region,
  skip link e foco/scroll gerenciados a cada navegação.
- Início definitivo com hero de continuidade, resumo do onboarding, grade dos 8 grupos
  e card do quiz final.
- Grupo definitivo com navegação por módulos, progresso, quiz bloqueado/liberado e
  leituras de apoio.
- Aula definitiva com conteúdo migrado, passos seguros (`kbd`/`strong`), aviso de
  atendimento, perguntas de conferência e rodapé de conclusão.
- Conteúdo das 170 aulas extraído automaticamente da Central de Ajuda (texto, links,
  listas, caixas de destaque e 769 imagens). O conteúdo curado à mão tem prioridade
  sobre o texto extraído.
- Quiz de módulo com situação de atendimento, alternativas, feedback por pergunta,
  progresso e revisão; simulação de tentativa nos quizzes ainda não migrados.
- Resultado com acertos, aprovação, revisão das respostas, XP da tentativa, selo do
  grupo, nível e próximos passos.
- Quiz final de revisão liberado com os 8 selos e registrado no progresso.
- Biblioteca com busca sem acento, filtros por tipo/grupo/status, destaque e limite de 60.
- Conquistas com perfil, níveis, selos e histórico de XP.
- Meu time com KPIs, tabela de analistas, mini-grid de grupos, perguntas com mais erro
  e a distribuição do time.
- Camada de API tipada (contrato validado com Zod) + sessão real com token, login,
  logout e guarda de papel; o app continua funcionando 100% local quando a API está
  desligada.
- Perguntas de conferência geradas a partir do texto extraído da Central de Ajuda
  (Fase 9), busca dentro do texto das aulas na Biblioteca (Fase 10) e selo de origem +
  fila de curadoria das perguntas (Fase 11).
- Favoritos e anotações do analista (Fase 12): marcar aulas como favoritas, escrever uma
  nota por aula e encontrar as duas coisas na Biblioteca.
- Reescrita das perguntas de conferência por IA (Fase 13): Edge Function no Supabase que
  reescreve o enunciado e o feedback a partir do artigo, com arquivo próprio e selo
  "reformuladas com IA · aguardando revisão".
- Reescrita dos quizzes dos módulos por IA (Fase 14): a situação de atendimento, o enunciado,
  o feedback e o rótulo de revisão viram uma pergunta de decisão, com contrato de dados
  estruturado (`type`/`anchor`/`section`), arquivo de overlay próprio e curadoria dos quizzes
  na **mesma** tela `/curadoria`.
- Testes de regras, catálogo, store, shell, Home, conteúdo, grupo, aula, quiz, resultado,
  biblioteca, conquistas, curadoria, favoritos, time, auth, API e navegação por deep link.

## Comandos

```bash
npm install
npm run dev            # http://localhost:5173
npm run test           # Vitest (uma execução)
npm run test:watch     # Vitest em watch
npm run typecheck      # tsc -b
npm run lint
npm run check          # typecheck + lint + testes
npm run build
npm run seed:extract   # regenera src/data/seed.json a partir do HTML de referência
npm run content:extract # extrai o texto das aulas da Central de Ajuda
npm run content:checks  # gera as perguntas de conferência a partir do texto extraído
npm run content:checks:ai # reescreve os enunciados das perguntas com a IA (Fase 13)
npm run content:quizzes # gera os quizzes dos módulos a partir do texto extraído
npm run content:quizzes:ai # reescreve os quizzes dos módulos com a IA (Fase 14)
npm run test:e2e       # Playwright: fluxo crítico no navegador
npm run shots          # captura de telas para a conferência visual
```

### Extração do conteúdo da Central

`npm run content:extract` percorre as 170 URLs em `src/data/seed.json`, baixa os artigos
de `ajuda.yooga.com.br` e gera `src/content/lessons.generated.json` (arquivo gerado —
**nunca editar à mão**). O script:

- não usa dependências: faz o parse do HTML do Help Center (HubSpot) por conta própria;
- guarda o HTML baixado em `.cache/central/` (use `--refresh` para invalidar o cache);
- transforma `<p>`, `<li>`, `<h3>`–`<h6>`, `<a>`, `<img>`, `<strong>` e as caixas de
  destaque (`hs-callout-type-*`) em tokens (`text`, `strong`, `key`, `link`, `image`) e
  passos tipados (`paragrafo`, `item`, `imagem`, `nota`, `dica`, `aviso`);
- resolve URLs relativas e de protocolo (`//`) e dá `alt` às imagens que não têm um;
- aceita `--only=<trecho>` para extrair e inspecionar uma aula só, sem sobrescrever o
  arquivo gerado.

O conteúdo curado à mão (`src/content/curated.ts`) tem **prioridade** sobre o extraído.
As imagens continuam sendo servidas pelo CDN da Central (`loading="lazy"`); o texto das
aulas é todo local.

### Perguntas de conferência (Fase 9)

`npm run content:checks` gera `src/content/checks.generated.json` (arquivo gerado —
**nunca editar à mão**): perguntas de "confere rápido" derivadas do próprio texto da aula.
O script:

- cria duas perguntas por aula essencial — **reconhecimento** ("qual destas ações é
  descrita nesta aula?") e **sequência** ("depois de X, qual é o próximo passo?");
- usa como alternativa correta um trecho que existe literalmente na aula, e as
  distratoras vêm de outras aulas do mesmo grupo (que não aparecem no texto);
- cita a seção do artigo quando o mesmo passo se repete em várias seções
  (`Na seção "Como criar", depois de "...", qual é o próximo passo?`);
- embaralha as alternativas de forma determinística (PRNG semeado pelo `lessonId`), então
  o arquivo gerado não muda entre execuções;
- aceita `--only=<tremo>` para inspecionar uma aula sem sobrescrever o arquivo.

As perguntas curadas à mão (`src/content/curated.ts`) têm **prioridade**: o app só usa as
geradas nas aulas sem curadoria e marca essas como `checksOrigin: 'rascunho'` — a tela da
aula mostra o selo "geradas a partir do artigo" para a equipe de conteúdo revisar.

A corretude é garantida por teste (`src/content/content.test.ts`): toda alternativa correta
aparece no texto da aula, as distratoras não, a sequência aponta o passo seguinte e as duas
perguntas de uma aula nunca têm a mesma resposta. Hoje são **198 perguntas em 101 das 102
aulas essenciais** (a única sem perguntas tem artigo só com imagem).

### Quizzes dos módulos

`npm run content:quizzes` gera `src/content/quizzes.generated.json` (arquivo gerado —
**nunca editar à mão**): o quiz de cada módulo que declara `tem_quiz` no catálogo, com as
perguntas derivadas do texto dos artigos do próprio módulo. O script:

- monta **6 perguntas por módulo** com três formatos — **sequência** ("depois de X, qual é o
  próximo passo?"), **reconhecimento** ("qual destas ações é descrita na aula X?") e
  **ordem** ("qual destes passos vem primeiro?");
- grava o formato da pergunta em campos **estruturados** (`type`, `anchor`, `section`) — e
  não só no enunciado — para que a auditoria continue funcionando depois que a IA reescrever
  o texto (ver Fase 14);
- usa como alternativa correta um passo que existe literalmente na aula citada; as
  distratoras vêm de **outras aulas do módulo** (e, quando o módulo é pequeno demais, do
  restante do grupo) e não aparecem no texto citado;
- enquadra cada pergunta numa situação de atendimento da cliente fictícia, com o tema
  tirado do resumo do artigo (ou do título, quando o resumo é genérico demais);
- **só cita aulas essenciais** — a leitura de apoio é consulta e não entra na trilha de
  progresso, então o quiz do módulo não pode depender de uma aula que o analista talvez
  não tenha visto (módulo sem essencial capaz de gerar pergunta cai para o apoio, para não
  perder o quiz);
- **no máximo 2 perguntas por aula** — três perguntas da mesma aula transformariam o quiz
  num interrogatório daquela aula e deixariam as outras do módulo de fora;
- embaralha as alternativas de forma determinística (PRNG semeado pelo `moduleId`), então o
  arquivo gerado não muda entre execuções;
- aceita `--only=<termo>` para inspecionar um módulo sem sobrescrever o arquivo.

Os quizzes curados à mão (`src/content/quizzes.ts`) têm **prioridade**: o gerador nem
sequer produz o quiz de PDV · Cardápio, que é a referência de qualidade. Os quizzes gerados
entram como `rascunho` — a tela do quiz mostra o selo "gerado a partir dos artigos" para a
equipe de conteúdo revisar — ou como `ia`, quando a Fase 14 reescreveu todas as perguntas do
módulo.

A corretude é garantida por teste (`src/content/quiz.test.ts`): todo módulo com `tem_quiz`
tem quiz, a alternativa correta aparece na aula citada, as distratoras não, a pergunta de
sequência aponta o passo seguinte, a de ordem aponta o primeiro passo e um quiz nunca repete
a mesma resposta. Hoje são **134 perguntas em 31 módulos** (o 32º é o curado), com 12 quizzes
completos de 6 perguntas e os demais entre 2 e 5 — o tamanho acompanha o material essencial
que o módulo tem.

As telas de quiz e de resultado também são carregadas sob demanda: as rotas
`/quiz/:moduleId` e `/resultado/:moduleId` são `lazy`, então as ~158 kB de perguntas geradas
ficam num chunk separado e não pesam no carregamento inicial.

### Busca dentro do texto das aulas (Fase 10)

A Biblioteca não busca só no título: a busca olha **dentro do texto** das 170 aulas e
mostra o trecho encontrado com o termo destacado.

- o índice do conteúdo (`src/content/searchIndex.ts`) é carregado **sob demanda** — só
  quando o usuário digita 3 ou mais letras. O app abre leve e o texto entra depois;
- o índice é o mesmo JSON que a tela de aula usa, então o navegador baixa uma vez só e
  reaproveita em cache (o build extrai um chunk compartilhado para os dois);
- as aulas com o termo no título/módulo aparecem primeiro; depois vêm as aulas cujo texto
  cita o termo, ordenadas pela quantidade de ocorrências;
- o snippet respeita as palavras (não corta no meio) e começa na frase anterior quando ela
  está perto;
- as regras de busca são puras e testáveis em `src/domain/search.ts` (sem React).

### Curadoria das perguntas (Fase 11)

As perguntas de "confere rápido" geradas pela Central ainda precisam da revisão do time
de conteúdo. A Fase 11 dá esse fluxo:

- **Selo de origem** em toda aula com perguntas (`src/components/ChecksBadge`): "curadas à
  mão", "geradas a partir do artigo", "revisadas pelo time de conteúdo" ou "precisam de
  ajuste" — **visível só no modo interno** (veja "Modo interno" abaixo);
- **Fila de curadoria** em `/curadoria`: as 99 aulas cujas perguntas foram geradas, na
  ordem da trilha, com as perguntas e as respostas na própria tela (o revisor não precisa
  sair para conferir), filtro por grupo e por situação, e os botões **Aprovar**, **Pedir
  ajuste** e **Reabrir**;
- **KPIs** de acompanhamento: aguardando revisão, aprovadas, precisando de ajuste e
  curadas à mão (que ficam fora da fila);
- **Decisão local-first**: o time registra a decisão no navegador
  (`yooga.academy.curation`, versão 2 desde a Fase 14) — o mesmo padrão de store do
  progresso e da sessão. A regra pura mora em `src/domain/curation.ts` (sem React), com
  testes próprios.

As aulas curadas à mão (2 no catálogo) não entram na fila: já nasceram revisadas. O
conteúdo curado foi movido para `src/content/curated.ts` para que a fila carregue só as
perguntas geradas (≈100 kB) e não o texto das 170 aulas (≈700 kB).

Desde a Fase 14 a fila é **unificada**: ela lista também os **quizzes dos módulos**
(31 módulos), com a situação, o enunciado e a resposta na tela. O item da fila virou uma
união discriminada (`kind: 'aula' | 'quiz'`) e os KPIs passaram de "aulas" para "itens".

A rota `/curadoria` é `lazy` e carregada sob demanda, então o payload das perguntas
geradas não entra no bundle inicial.

### Modo interno (`?internals=1`)

O estado de curadoria das perguntas — "geradas a partir do artigo", "reformuladas com IA",
"revisadas pelo time de conteúdo", "precisam de ajuste" — é vocabulário do **time de
conteúdo**. Para quem está estudando, esse rótulo só confunde: por isso as telas do
analista (aula e quiz) **não mostram o selo por padrão**.

Quem revisa conteúdo abre a tela com `?internals=1`:

```
/aula/primeiros-passos--acesso-ao-sistema--acesso-do-sistema-app-e-painel?internals=1
/quiz/primeiros-passos--acesso-ao-sistema?internals=1
```

- a regra é pura e testada em `src/domain/internals.ts` (`internalsEnabled`, `withInternals`);
- o parâmetro **atravessa a navegação interna** (próxima aula, quiz, tela de resultado), para
  o revisor não perder o flag no meio da revisão;
- a **fila de curadoria** (`/curadoria`) é a ferramenta do time de conteúdo: ela mostra os
  selos sempre, com ou sem o parâmetro.

### Favoritos e anotações (Fase 12)

O caderno do analista: marcar as aulas que ele quer revisitar e guardar o que precisa
lembrar de cada uma.

- **Favoritar**: o botão de estrela no topo da tela de aula alterna a marca (é um
  `aria-pressed`, então leitores de tela anunciam o estado). A aula favoritada aparece
  com a etiqueta "Favorita" nos resultados da Biblioteca;
- **Anotar**: cada aula tem um caderno com uma nota livre (até 2.000 caracteres). O
  rascunho fica na tela e só vai para o navegador quando o analista clica em "Salvar nota"
  — digitar não escreve no disco a cada tecla. A nota pode ser apagada;
- **Encontrar**: a Biblioteca ganha o filtro "Só as favoritas" e uma seção "Suas anotações"
  com as notas da mais editada para a menos editada;
- **Limpar**: a Home tem "Apagar favoritos e anotações", ao lado de "Zerar progresso local".

Como o resto do app, é **local-first**: favoritos e anotações ficam no `localStorage`
(`yooga.academy.annotations`, versão 1) e não são enviados para a API. A regra pura mora
em `src/domain/annotations.ts` (sem React), com testes próprios.

### Reescrita das perguntas por IA (Fase 13)

O gerador determinístico (`npm run content:checks`) produz enunciados que testam **leitura
do artigo** — "Qual destas ações é descrita nesta aula?" — e isso confunde o analista: ele
precisa adivinhar qual das frases pertence à aula, não saber fazer o trabalho. A Fase 13
coloca uma LLM no meio do caminho para reescrever o enunciado como uma **situação de
cliente** que exige a mesma resposta.

**A ideia que mantém tudo verificável:** a LLM só reescreve o `prompt` (enunciado) e o
`success` (feedback). As **alternativas**, o `correctIndex`, a `anchor` e a `section`
continuam sendo os do gerador determinístico — que são trechos literais do artigo. Por isso
toda a auditoria de `src/content/content.test.ts` (alternativa certa existe na aula,
distratoras não existem, a sequência aponta o passo seguinte, as duas perguntas nunca
têm a mesma resposta) continua valendo **de graça** depois da reescrita.

**O contraste, na prática:**

|           | Antes (template)                           | Depois (IA)                                                                                                                                    |
| --------- | ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Enunciado | "Qual destas ações é descrita nesta aula?" | "Um cliente trocou a bobina da impressora térmica e as impressões do delivery estão saindo cortadas. Qual ajuste feito pelo App resolve isso?" |
| Feedback  | "Isso. Essa ação aparece nesta aula."      | "A largura da bobina é um dos ajustes de impressão disponíveis no App, então basta definir o tamanho do papel que ele usa."                    |

**Arquitetura:**

```
scripts/generate-checks.mjs      → checks.generated.json   (determinístico, alternativas + âncora)
scripts/rewrite-checks-ai.mjs    → checks.ai.generated.json (só prompt + success reescritos)
supabase/functions/rewrite-checks → a Edge Function que chama o provedor de LLM
```

- **A Edge Function** (`supabase/functions/rewrite-checks`) é a única que fala com o
  provedor de LLM. Ela tem `verify_jwt: true` **e** exige o header `x-rewrite-token` — a
  chave `anon` do Supabase é pública (viaja no bundle do navegador), então sozinha ela não
  pode liberar o uso do provedor;
- **A função recusa** qualquer reescrita que copie uma alternativa (entregaria a resposta),
  que perca a âncora citada, que volte a perguntar "nesta aula", ou que não tenha sido
  reescrita. Se a LLM errar, a aula fica com o enunciado do template — nunca fica quebrada;
- **O arquivo de saída é separado** (`src/content/checks.ai.generated.json`): o
  `npm run content:checks` continua determinístico e não joga fora o trabalho da IA. As
  reescritas ficam **incrementais** — rodar o script de novo só refaz o que falta;
- **Precedência no runtime**: `curado` → `ia` → `rascunho` (`src/content/lessons.ts`). As
  2 aulas curadas à mão não entram na reescrita; as outras 99 têm reescrita por IA;
- **O selo** ganha um estado novo: "reformuladas com IA · aguardando revisão" (tom
  laranja, como o rascunho). A fila de curadoria mostra as perguntas **efetivas** (as
  reescritas) e a decisão do time continua valendo para elas.

**Segredos.** A função procura quatro valores em duas fontes, nesta ordem: `Deno.env`
(quando o secret foi configurado pelo painel) e o **Vault** do projeto
(`vault.decrypted_secrets`), lido por uma RPC `ai_runtime_secret` que só o `service_role`
pode executar:

| Nome            | Para que serve                                                       |
| --------------- | -------------------------------------------------------------------- |
| `AI_API_KEY`    | chave do provedor de LLM (obrigatória)                               |
| `AI_BASE_URL`   | endpoint compatível com OpenAI (padrão: `https://api.openai.com/v1`) |
| `AI_MODEL`      | modelo (padrão: `gpt-4o-mini`)                                       |
| `REWRITE_TOKEN` | token que o script local envia no header `x-rewrite-token`           |

Para configurar pelo painel do Supabase (o caminho padrão):

```bash
supabase secrets set AI_API_KEY=... AI_BASE_URL=... AI_MODEL=... REWRITE_TOKEN=...
```

O `REWRITE_TOKEN` também precisa estar no `.env` local, porque é ele que o
`scripts/rewrite-checks-ai.mjs` envia no header:

```bash
# .env (raiz)
REWRITE_TOKEN=o-mesmo-valor-do-secret
```

**Rodando:**

```bash
npm run content:checks:ai -- --dry-run              # testa sem gravar
npm run content:checks:ai -- --only=fila-de-impressao # uma aula só
npm run content:checks:ai -- --limit=10              # um lote pequeno
npm run content:checks:ai                            # todas as aulas pendentes
npm run content:checks:ai -- --force                 # refaz tudo do zero
```

O script carrega o `.env` sozinho (sem dependência externa), roda com pool de
concorrência (4 por padrão) e no fim mescla o resultado no arquivo, mantendo o que já
tinha dado certo. Uma aula que falha (provedor ocupado, reescrita rejeitada) é reportada
no console e fica com o enunciado do template.

**Auditoria.** O arquivo `src/content/content.test.ts` ganhou uma bateria específica da
camada de IA: as alternativas e a âncora são idênticas às do gerador determinístico, o
enunciado não entrega a resposta, ninguém pergunta "nesta aula" e a cobertura chega a
99 das 101 aulas com perguntas.

### Reescrita dos quizzes por IA (Fase 14)

O quiz de módulo já tinha uma situação de atendimento, mas ela saía de um template
robótico ("Tô com uma dúvida sobre operar pelo Caixa.") e o enunciado perguntava "qual
destas ações é descrita na aula?". A Fase 14 coloca uma LLM no meio do caminho para
reescrever o **envelope** da pergunta como uma **decisão a tomar** a partir da fala da
cliente.

**O contrato de dados mudou.** A auditoria dos quizzes (`src/content/quiz.test.ts`) antes
deduzia o tipo da pergunta por regex sobre o enunciado (`"depois de"`, `"vem primeiro"`).
Isso quebraria assim que a IA reescrevesse o texto. Agora o tipo é um **campo
estruturado**:

| Campo     | Valores                                    | Para que serve                                              |
| --------- | ------------------------------------------ | ----------------------------------------------------------- |
| `type`    | `sequencia` \| `reconhecimento` \| `ordem` | o formato da pergunta — a auditoria lê o campo, não o texto |
| `anchor`  | trecho literal da aula                     | o passo citado (pergunta de sequência)                      |
| `section` | título da seção                            | onde o passo citado está                                    |

**A ideia que mantém tudo verificável:** a LLM só reescreve os **textos** — `scene`
(situação), `prompt` (enunciado), `explanation` (feedback) e `review` (rótulo). As
**alternativas**, o `correctIndex`, o `type`, a `anchor`, a `section` e o vínculo com a aula
continuam sendo os do gerador determinístico.

E o arquivo de saída é um **overlay puro** (`src/content/quizzes.ai.generated.json`): ele
guarda **só** `{ id, scene, prompt, explanation, review }` por pergunta. As alternativas e
os campos de verificação **não existem no arquivo** — é estruturalmente impossível a
camada de IA corromper o que sustenta a auditabilidade.

**Arquitetura:**

```
scripts/generate-quizzes.mjs      → quizzes.generated.json    (determinístico: alternativas + type/anchor/section)
scripts/rewrite-quizzes-ai.mjs    → quizzes.ai.generated.json  (overlay: só os 4 textos)
supabase/functions/rewrite-quizzes → a Edge Function que chama o provedor de LLM
```

- **A Edge Function** (`supabase/functions/rewrite-quizzes`) é a única que fala com o
  provedor de LLM. Ela tem `verify_jwt: true` **e** exige o header `x-rewrite-token` — a
  chave `anon` do Supabase é pública (viaja no bundle do navegador), então sozinha ela não
  pode liberar o uso do provedor. Os segredos vêm do `Deno.env` ou do **Vault** do projeto,
  lido pela RPC `ai_runtime_secret` (só `service_role` executa);
- **A função recusa** qualquer reescrita que copie uma alternativa (entregaria a resposta),
  que perca o trecho citado, que volte a falar de "aula"/"texto"/"trecho", que comece o
  feedback com "Correto:"/"Isso:", ou que não tenha sido reescrita. Se a LLM errar, a
  pergunta fica com o texto do template — nunca fica quebrada;
- **Os quizzes curados à mão** (PDV · Cardápio e o quiz final) **não entram** na reescrita:
  eles são a referência de qualidade do app;
- **Precedência no runtime**: `curado` → `ia` → `rascunho` (`src/content/quizzes.ts`).
  Um módulo só entra como `ia` quando **todas** as perguntas foram reescritas — um quiz
  meio reescrito é meio template, e dizer o contrário esconderia isso do time;
- **O selo** do quiz ganha o estado "reformulado com IA · aguardando revisão";
- **A curadoria dos quizzes** acontece na **mesma** tela `/curadoria`: a fila lista as
  aulas do módulo e **depois** o quiz do módulo, com a situação, o enunciado e a resposta
  na própria tela. O store de curadoria foi para a **versão 2** (com `migrate`, então as
  revisões das aulas da v1 continuam valendo) e ganhou `quizApprovals` por `moduleId`.

**Rodando:**

```bash
npm run content:quizzes:ai -- --dry-run               # testa sem gravar
npm run content:quizzes:ai -- --only=historico-de-vendas # um módulo só
npm run content:quizzes:ai -- --limit=3               # um lote pequeno
npm run content:quizzes:ai                            # todos os módulos pendentes
npm run content:quizzes:ai -- --force                 # refaz tudo do zero
```

O script carrega o `.env` sozinho, roda com pool de concorrência (3 por padrão) e é
**incremental**: rodar de novo só refaz o que falta, então uma falha no meio do caminho não
joga trabalho fora. Hoje os **31 módulos (134 perguntas)** estão reescritos.

Quando o gerador determinístico muda (novas regras de seleção, texto limpo), o overlay
precisa ser refeito com `--force`: ele guarda o texto reescrito por pergunta, e a pergunta
`q1` de hoje pode ser outra pergunta de amanhã.

**Auditoria.** `src/content/quiz.test.ts` ganhou a bateria da camada de IA: o overlay cobre
todos os quizzes gerados, o quiz efetivo mantém alternativas, índice da resposta, tipo,
âncora, seção e vínculo com a aula **idênticos** ao gerador determinístico, o enunciado e
a situação não entregam a resposta, ninguém fala de "aula"/"texto"/"trecho", a situação
não é um template genérico e o enunciado foi realmente reescrito.

### Testes end-to-end (Playwright)

O Playwright é a **rede de segurança** das Fases 13 e 14: ele não reescreve pergunta nenhuma,
mas confere no navegador que a camada de IA não quebrou nada e que o texto novo é legível.

- `e2e/lesson-checks.spec.ts` — a tela de aula com as perguntas reescritas: o selo novo
  aparece, o enunciado está íntegro (não truncado), **erro na pergunta bloqueia a conclusão**
  e acerto em todas libera; a conclusão sobrevive ao reload (o app é local-first);
- `e2e/curation.spec.ts` — a fila de curadoria mostra as perguntas **efetivas** (as
  reescritas) com a resposta na tela, e o botão **Aprovar** move a aula para o filtro
  "Aprovadas" depois do reload;
- `e2e/quiz-ia.spec.ts` — o quiz do módulo com a situação e o enunciado reescritos, o selo
  novo e o feedback da IA; e a curadoria do quiz (situação + enunciado + "Resposta:" na
  tela, e **Aprovar** movendo o quiz para "Aprovadas" depois do reload);
- `e2e/trilha.spec.ts` — o percurso Home → grupo → módulo → aula, e a busca da Biblioteca
  que olha **dentro** do texto das aulas.

```bash
npm run test:e2e        # sobe o dev server e roda os 4 cenários
npm run test:e2e:ui     # abre o modo visual
npm run shots           # screenshots em e2e/__screenshots__
```

O `npm run shots` foi o que mostrou, na prática, um defeito que os testes unitários não
pegavam: na fila de curadoria, o texto "Resposta:" ficava colado no enunciado (o `span` era
inline). O Playwright é a rede de segurança — e o screenshot é a lente.

## Estrutura

```
src/
  api/         contrato da API (Zod), cliente HTTP e endpoints (auth, progresso, time)
  app/         AppLayout, router, guarda de papel, sync de progresso e efeitos de rota
  components/  primitivos e shell (ButtonLink, Chip, ChecksBadge, GroupIcon, SealIcon,
               StatusChip, ProgressBar, UserMenu, Toast, LiveRegion)
  content/     tipos, parser de inline, conteúdo curado (curated.ts), conteúdo extraído
               da Central (lessons.generated.json + schema Zod), perguntas de
               conferência geradas (checks.generated.json + schema Zod), perguntas
               reescritas por IA (checks.ai.generated.json + schema Zod), quizzes
               gerados dos módulos (quizzes.generated.json + schema Zod), quizzes
               reescritos por IA (quizzes.ai.generated.json + schema Zod) e renderizadores
  data/        seed.json, schema Zod e catálogo validado
  domain/      types, selectors, rules, progress, auth, busca no texto, curadoria,
               favoritos/anotações e merge (puro, sem React)
  features/    Home, grupo, aula, quiz, resultado, biblioteca, conquistas, curadoria,
               time, login
  services/    sincronização de progresso entre navegador e API
  stores/      Zustand (progress, quizResult, auth, curation, annotations, toast,
               liveRegion)
  styles/      tokens e global
  test/        setup e factories
```

## Decisões

- **CSS Modules + tokens**: o CSS do protótipo vira tokens e módulos por componente.
- **Zustand + persist**: progresso em `yooga.academy.progress` (versão 1), sessão em
  `yooga.academy.auth` (versão 1), curadoria em `yooga.academy.curation` (versão 2) e
  favoritos/anotações em `yooga.academy.annotations` (versão 1). O resultado do quiz é
  só em memória.
- **Browser router**: URLs limpas e deep links. Em produção, o host precisa do fallback
  de SPA para `index.html` (Vite dev/preview já fazem).
- **Sessão real (Fase 8)**: `src/stores/auth.ts` guarda token e usuário; `/lider` exige
  papel de líder e redireciona para `/entrar` quando não há sessão. O seletor de papel
  demo foi removido.
- **Local-first**: sem `VITE_API_MODE=api` nenhuma chamada de rede é feita — o login
  usa as contas de demonstração e o progresso vive no `localStorage`.
- **API (Fase 8)**: com `VITE_API_MODE=api` e `VITE_API_URL` configurado, o app entra,
  valida a sessão, sincroniza o progresso e carrega a visão de time. Falhas de rede
  nunca quebram a experiência: o app volta ao modo local.
- **Conteúdo**: as aulas migradas usam tokens (`text`, `strong`, `key`, `link`, `image`)
  em vez de HTML cru, sem `dangerouslySetInnerHTML`. O texto das 170 aulas é extraído
  automaticamente da Central de Ajuda (`npm run content:extract`) e o conteúdo curado à
  mão tem prioridade. Aulas sem texto extraído mostram um aviso curto e o link da Central
  de Ajuda, mas continuam podendo ser concluídas. Os quizzes seguem a mesma regra: o de
  PDV · Cardápio é curado à mão e os demais são gerados a partir dos artigos do módulo
  (`npm run content:quizzes`); um módulo que ainda não tenha quiz mantém a simulação da
  tentativa para exercitar XP, selo e nível.
- **Chunk da aula**: a rota `/aula/:lessonId` é carregada sob demanda (`lazy`), então o
  texto e as imagens das 170 aulas (~700 kB, ~118 kB gzip) ficam num chunk separado e o
  carregamento inicial continua em ~519 kB (~153 kB gzip). As rotas de quiz e de resultado
  também são `lazy`, então as perguntas geradas (~158 kB) não entram no bundle inicial.
  A rota `/curadoria` é `lazy` pelo mesmo motivo — as perguntas de conferência (~100 kB)
  ficam num chunk à parte. A camada de IA das perguntas (~137 kB) entra nesse mesmo chunk
  sob demanda: o bundle inicial não muda.
- **Busca no conteúdo (Fase 10)**: a Biblioteca busca dentro do texto das aulas, com o
  trecho encontrado destacado. O índice do conteúdo (~820 kB) fica num chunk compartilhado
  entre a Biblioteca e a tela de aula, baixado sob demanda — o carregamento inicial do app
  não muda.
- **Perguntas de conferência (Fase 9)**: as 170 aulas já têm o texto da Central de Ajuda, e
  as perguntas de "confere rápido" são geradas a partir desse texto
  (`npm run content:checks`). Elas são verificáveis por construção — a resposta existe
  literalmente na aula — e a curadoria manual tem prioridade. As perguntas geradas entram
  como `rascunho`, sinalizadas na tela para revisão do time de conteúdo.
- **Reescrita por IA (Fase 13)**: a LLM reescreve **apenas** o enunciado e o feedback; as
  alternativas, o índice da resposta, a âncora e a seção são os do gerador determinístico.
  É isso que mantém a verificabilidade automática de pé. A reescrita mora em um arquivo
  próprio (`checks.ai.generated.json`), com precedência `curado` → `ia` → `rascunho`, e a
  chave do provedor fica no servidor (Edge Function), nunca no navegador.
- **Quizzes dos módulos**: os 32 módulos com `tem_quiz` têm quiz — 1 curado à mão e 31
  gerados a partir dos artigos do módulo (`npm run content:quizzes`). As alternativas
  corretas existem literalmente na aula citada e as distratoras não, então a resposta é
  verificável por construção. Os quizzes gerados entram como `rascunho`, sinalizados na
  tela do quiz.
- **Reescrita dos quizzes por IA (Fase 14)**: a LLM reescreve **apenas** os textos (situação,
  enunciado, feedback e rótulo). As alternativas, o índice da resposta, o tipo, a âncora e a
  seção ficam no gerador determinístico — e o arquivo de overlay
  (`quizzes.ai.generated.json`) nem guarda esses campos, então a camada de IA não consegue
  corromper a verificabilidade. O tipo da pergunta virou **campo estruturado** (`type`,
  `anchor`, `section`): a auditoria lê o campo, não o enunciado, e continua valendo depois
  da reescrita.
- **Curadoria das perguntas (Fase 11)**: a origem das perguntas fica explícita na tela da
  aula (selo com quatro estados) e o time de conteúdo trabalha a fila em `/curadoria`. A
  decisão (aprovado / precisa de ajuste) é registrada local-first em
  `yooga.academy.curation`, com a regra pura em `src/domain/curation.ts`. Aulas curadas à
  mão (`src/content/curated.ts`) nunca entram na fila. Desde a Fase 14 a mesma tela cura os
  **quizzes dos módulos** (fila unificada: aulas do módulo e, depois, o quiz do módulo), e
  o store foi para a versão 2 com `migrate` — as revisões das aulas da v1 continuam valendo.
- **Favoritos e anotações (Fase 12)**: o que é pessoal do analista fica no navegador, como
  o progresso e a curadoria. Nada de favoritos ou anotações vai para a API por enquanto.
  A nota só é gravada quando o analista pede ("Salvar nota"), para não escrever no
  `localStorage` a cada tecla.

## Contrato da API (Fase 8)

| Método | Rota             | Payload / resposta                                  |
| ------ | ---------------- | --------------------------------------------------- |
| POST   | `/auth/login`    | `{ email, password }` → `{ token, user }`           |
| GET    | `/auth/me`       | header `Authorization: Bearer <token>` → `{ user }` |
| POST   | `/auth/logout`   | header `Authorization: Bearer <token>` → `204`      |
| GET    | `/progress`      | → `{ progress }` (mesma forma de `ProgressData`)    |
| PUT    | `/progress`      | `{ progress }` → `204`                              |
| GET    | `/team/overview` | → `{ members }` (visão de time do líder)            |

Todas as respostas são validadas com Zod em `src/api/schemas.ts`; erros viram
`ApiError` com `kind` (`rede`, `nao_autorizado`, `nao_encontrado`, `servidor`,
`resposta`).

### Sincronização do progresso

- Ao entrar (ou recuperar a sessão), o app busca `GET /progress` e **mescla** com o
  progresso local: união das aulas, melhor nota dos quizzes, aprovação "sticky",
  união dos selos, maior XP e histórico sem duplicar.
- Cada mudança local agenda um `PUT /progress` (debounce de 1,2 s).
- A mescla nunca perde conquistas locais nem remotas.

### Modos de operação

- `VITE_API_MODE=offline` (padrão): nenhuma chamada de rede. Login pelas contas de
  demonstração (`analista@demo.local` / `lider@demo.local`, senha `demo`) e progresso
  só no navegador.
- `VITE_API_MODE=api`: usa `VITE_API_URL`. Se a API cair, a sessão em cache continua
  válida e o progresso local segue funcionando.

## Comportamentos do shell

- Cada navegação atualiza o título do documento, volta ao topo, foca o `<main>` e
  anuncia a tela na live region — sem roubar foco no carregamento inicial.
- O título e o anúncio usam o nome real do grupo, módulo, aula ou quiz quando a rota é
  um deep link do catálogo.
- Toasts usam `role="status"`, fecham sozinhos em 3,2 s e também podem ser fechados
  manualmente.
- Um skip link leva direto ao conteúdo para navegação por teclado.
- Rotas desconhecidas caem no 404; deep links de telas ainda não migradas mostram o
  placeholder da fase correspondente.

## Início, grupo, aula, quiz e resultado

- O hero de continuidade resolve a próxima aula ou quiz pendente com `resolveNextItem`
  e mostra o progresso do módulo.
- O resumo usa as mesmas regras do protótipo: essenciais contam progresso, leituras de
  apoio não, e o selo só aparece quando todos os quizzes do grupo são aprovados.
- Cada card de grupo leva para `/grupo/:groupId`; o módulo abre em
  `/grupo/:groupId/:moduleId`, a aula em `/aula/:lessonId` e o quiz em `/quiz/:moduleId`.
- `/grupo/:groupId` resolve o primeiro módulo pendente (ou o primeiro módulo do grupo);
  `/grupo/:groupId/:moduleId` abre o módulo explícito.
- A página do grupo mostra módulos com progresso, aulas essenciais, leituras de apoio e o
  quiz bloqueado até todas as essenciais serem concluídas.
- A página da aula renderiza o conteúdo migrado (parágrafos, listas, imagens, caixas de
  destaque e links), valida as perguntas de conferência antes de liberar a conclusão e
  encadeia a próxima aula, o quiz ou a volta ao módulo. Aulas essenciais cujo texto veio
  da Central ainda não têm perguntas de conferência — nesse caso a conclusão fica livre
  e a tela avisa que a curadoria das perguntas está pendente.
- A página do quiz só abre com todas as essenciais concluídas. Ela mostra a situação do
  atendimento, uma pergunta por vez e o feedback imediato; o rodapé fixo conduz até o
  resultado. Quando o quiz foi gerado a partir dos artigos, a barra superior mostra o selo
  "gerado a partir dos artigos"; quando os textos foram reescritos por IA (Fase 14), mostra
  "reformulado com IA · aguardando revisão".
- A página de resultado consolida a melhor tentativa, revisa as respostas, detalha o XP
  (incluindo o delta da melhor tentativa e o selo) e aponta o próximo módulo.
- `/quiz/final` usa as perguntas migradas como revisão final, só abre com os 8 selos e
  grava o resultado em `progress.quiz.final`.
- `/quiz/:moduleId` de um módulo que ainda não tem quiz oferece a simulação do protótipo
  (6/6, 5/6, 3/6) para testar XP, selo e nível sem bloquear as próximas fases.

## Biblioteca, conquistas e time

- **Biblioteca** (`/biblioteca`): busca sem acento em título e módulo, filtros por tipo
  (essencial/leitura de apoio), grupo e status (só o que ainda não vi), destaque do
  trecho encontrado e limite de 60 resultados.
- **Conquistas** (`/conquistas`): perfil do usuário (nome e papel da sessão), nível e
  barra de progresso, trilha dos cinco níveis, selos por grupo e histórico de XP.
- **Meu time** (`/lider`, só para líder): KPIs do time, tabela de analistas com mini-grid
  de 8 grupos, marcação de quem está sem atividade, perguntas com mais erro e a
  distribuição "onde o time está". Usa `GET /team/overview` quando há API e cai para os
  dados de exemplo do protótipo caso contrário (o chip no topo mostra a origem).
- **Curadoria** (`/curadoria`): fila de revisão das perguntas geradas, com as perguntas
  na própria tela, filtro por grupo e por situação, KPIs de acompanhamento e as decisões
  (aprovar, pedir ajuste, reabrir).
- **Favoritos e anotações** (na tela de aula e na Biblioteca): favoritar uma aula pela
  estrela no topo, escrever uma nota por aula no caderno da própria aula, e encontrar
  tudo na Biblioteca — pelo filtro "Só as favoritas" e pela seção "Suas anotações".

## Regras portadas do protótipo

| Regra                 | Valor                                                    |
| --------------------- | -------------------------------------------------------- |
| XP por aula essencial | 10                                                       |
| XP por acerto         | 5                                                        |
| XP por selo           | 30                                                       |
| Aprovação no quiz     | 70%                                                      |
| XP por nível          | 250                                                      |
| Níveis                | Aprendiz, Praticante, Analista, Referência, Especialista |

O cálculo de XP do quiz usa apenas o delta sobre a melhor tentativa anterior. O selo é
concedido quando todos os módulos com quiz do grupo estão aprovados.
