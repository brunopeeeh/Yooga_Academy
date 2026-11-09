# Yooga Academy

Migração do protótipo `yooga-academy-onboarding-prototipo.html` para React + TypeScript.

## Fases 0 a 11 concluídas

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
- Testes de regras, catálogo, store, shell, Home, conteúdo, grupo, aula, quiz, resultado,
  biblioteca, conquistas, time, auth, API, curadoria e navegação por deep link.

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
npm run content:quizzes # gera os quizzes dos módulos a partir do texto extraído
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
- usa como alternativa correta um passo que existe literalmente na aula citada; as
  distratoras vêm de **outras aulas do módulo** (e, quando o módulo é pequeno demais, do
  restante do grupo) e não aparecem no texto citado;
- enquadra cada pergunta numa situação de atendimento da cliente fictícia, com o tema
  tirado do resumo do artigo (ou do título, quando o resumo é genérico demais);
- embaralha as alternativas de forma determinística (PRNG semeado pelo `moduleId`), então o
  arquivo gerado não muda entre execuções;
- aceita `--only=<termo>` para inspecionar um módulo sem sobrescrever o arquivo.

Os quizzes curados à mão (`src/content/quizzes.ts`) têm **prioridade**: o gerador nem
sequer produz o quiz de PDV · Cardápio, que é a referência de qualidade. Os quizzes gerados
entram como `rascunho` — a tela do quiz mostra o selo "gerado a partir dos artigos" para a
equipe de conteúdo revisar.

A corretude é garantida por teste (`src/content/quiz.test.ts`): todo módulo com `tem_quiz`
tem quiz, a alternativa correta aparece na aula citada, as distratoras não, a pergunta de
sequência aponta o passo seguinte, a de ordem aponta o primeiro passo e um quiz nunca repete
a mesma resposta. Hoje são **179 perguntas em 31 módulos** (o 32º é o curado), com 28 quizzes
completos de 6 perguntas e 3 módulos mais enxutos (3 e 4 perguntas).

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
  ajuste";
- **Fila de curadoria** em `/curadoria`: as 99 aulas cujas perguntas foram geradas, na
  ordem da trilha, com as perguntas e as respostas na própria tela (o revisor não precisa
  sair para conferir), filtro por grupo e por situação, e os botões **Aprovar**, **Pedir
  ajuste** e **Reabrir**;
- **KPIs** de acompanhamento: aguardando revisão, aprovadas, precisando de ajuste e
  curadas à mão (que ficam fora da fila);
- **Decisão local-first**: o time registra a decisão no navegador
  (`yooga.academy.curation`, versão 1) — o mesmo padrão de store do progresso e da
  sessão. A regra pura mora em `src/domain/curation.ts` (sem React), com testes próprios.

As aulas curadas à mão (2 no catálogo) não entram na fila: já nasceram revisadas. O
conteúdo curado foi movido para `src/content/curated.ts` para que a fila carregue só as
perguntas geradas (≈100 kB) e não o texto das 170 aulas (≈700 kB).

A rota `/curadoria` é `lazy` e carregada sob demanda, então o payload das perguntas
geradas não entra no bundle inicial.

## Estrutura

```
src/
  api/         contrato da API (Zod), cliente HTTP e endpoints (auth, progresso, time)
  app/         AppLayout, router, guarda de papel, sync de progresso e efeitos de rota
  components/  primitivos e shell (ButtonLink, Chip, ChecksBadge, GroupIcon, SealIcon,
               StatusChip, ProgressBar, UserMenu, Toast, LiveRegion)
  content/     tipos, parser de inline, conteúdo curado (curated.ts), conteúdo extraído
               da Central (lessons.generated.json + schema Zod), perguntas de
               conferência geradas (checks.generated.json + schema Zod), quizzes
               gerados dos módulos (quizzes.generated.json + schema Zod) e renderizadores
  data/        seed.json, schema Zod e catálogo validado
  domain/      types, selectors, rules, progress, auth, busca no texto, curadoria e
               merge (puro, sem React)
  features/    Home, grupo, aula, quiz, resultado, biblioteca, conquistas, curadoria,
               time, login
  services/    sincronização de progresso entre navegador e API
  stores/      Zustand (progress, quizResult, auth, curation, toast, liveRegion)
  styles/      tokens e global
  test/        setup e factories
```

## Decisões

- **CSS Modules + tokens**: o CSS do protótipo vira tokens e módulos por componente.
- **Zustand + persist**: progresso em `yooga.academy.progress` (versão 1), sessão em
  `yooga.academy.auth` (versão 1) e curadoria em `yooga.academy.curation` (versão 1).
  O resultado do quiz é só em memória.
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
  carregamento inicial continua em ~515 kB (~152 kB gzip). As rotas de quiz e de resultado
  também são `lazy`, então as perguntas geradas (~158 kB) não entram no bundle inicial.
  A rota `/curadoria` é `lazy` pelo mesmo motivo — as perguntas de conferência (~100 kB)
  ficam num chunk à parte.
- **Busca no conteúdo (Fase 10)**: a Biblioteca busca dentro do texto das aulas, com o
  trecho encontrado destacado. O índice do conteúdo (~820 kB) fica num chunk compartilhado
  entre a Biblioteca e a tela de aula, baixado sob demanda — o carregamento inicial do app
  não muda.
- **Perguntas de conferência (Fase 9)**: as 170 aulas já têm o texto da Central de Ajuda, e
  as perguntas de "confere rápido" são geradas a partir desse texto
  (`npm run content:checks`). Elas são verificáveis por construção — a resposta existe
  literalmente na aula — e a curadoria manual tem prioridade. As perguntas geradas entram
  como `rascunho`, sinalizadas na tela para revisão do time de conteúdo.
- **Quizzes dos módulos**: os 32 módulos com `tem_quiz` têm quiz — 1 curado à mão e 31
  gerados a partir dos artigos do módulo (`npm run content:quizzes`). As alternativas
  corretas existem literalmente na aula citada e as distratoras não, então a resposta é
  verificável por construção. Os quizzes gerados entram como `rascunho`, sinalizados na
  tela do quiz.
- **Curadoria das perguntas (Fase 11)**: a origem das perguntas fica explícita na tela da
  aula (selo com quatro estados) e o time de conteúdo trabalha a fila em `/curadoria`. A
  decisão (aprovado / precisa de ajuste) é registrada local-first em
  `yooga.academy.curation`, com a regra pura em `src/domain/curation.ts`. Aulas curadas à
  mão (`src/content/curated.ts`) nunca entram na fila.

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
  "gerado a partir dos artigos".
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
