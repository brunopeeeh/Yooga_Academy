# Yooga Academy · Análise de UX/UI

Nov 10, 2026 · @Kawê

## Resumo

O visual não está poluído. A estrutura por grupos funciona e o fluxo aula → quiz → resultado é claro. **O maior problema hoje é o conteúdo das perguntas, não a interface:** a maioria pede para decorar "qual frase vem depois" no artigo da Central, em vez de testar se o analista sabe resolver o caso do cliente.

Três prioridades:

1. **Reescrever o padrão das perguntas** antes de abrir para o time. Das 373 na fila de curadoria, nenhuma foi aprovada, e boa parte usa "Depois de '...', qual é o próximo passo?".
2. **Tirar da tela do analista o que é do bastidor:** o selo "reformuladas com IA · aguardando revisão", as notas de curadoria dos módulos e os links "Zerar progresso local" na home.
3. **Corrigir 5 falhas de interface** que quebram a confiança: a sequência mostra 0 dias mesmo com atividade hoje, o nome "Ana Nascimento" aparece sem login, o texto "dias seguidos" sobrepõe o card de nível, a letra da alternativa fica azul depois de responder e a busca de exemplo "sangria" volta 0 resultados.

## Pontos bons

A base está certa e deve ficar como está:

- **Estrutura igual à da Central.** Grupo → módulo → aula com os mesmos nomes do atendimento. O analista aprende onde vai procurar depois.
- **"Continue de onde parou"** leva direto à próxima aula e atualizou certo depois do quiz (foi para Cadastro de categorias no PDV).
- **Aulas com o texto e as imagens reais da Central**, com crédito e link "Abrir na Central".
- **Avanço automático** para a próxima aula ao concluir, com toast de +10 XP.
- **Quiz com situação de atendimento** (fala da Dona Lúcia). As cenas são boas e realistas, como a do plano Básico sem acesso ao Painel Gestor.
- **Feedback por pergunta** com "Correta" e "Sua resposta" escritos, não só cor.
- **Resultado completo:** anel com 5/6, XP detalhado, selo e revisão com a aula de origem de cada pergunta.
- **Biblioteca forte:** busca no texto das aulas, sem acento ("impressao" achou 14), com trecho destacado e filtros com contagem.
- **Separação Essencial × Leitura de apoio** clara na página do grupo.
- **Visual limpo e consistente:** uma paleta, duas fontes, ícones em linha, sem emoji na interface.

## Poluição visual

O app não está poluído no geral. O excesso está em pequenas repetições e em informação de bastidor que não é para o analista.

| Tela | O que está sobrando | Sugestão |
| --- | --- | --- |
| Início | "Nível 1 · Aprendiz · 85 XP" aparece no topo e de novo no card "Seu onboarding" | Deixar só no topo |
| Início | Links "Zerar progresso local" e "Apagar favoritos e anotações" no card principal | Mover para um menu do avatar ou para Configurações |
| Início | Grade de 3 colunas deixa um buraco na última linha (3, 3, 2) | Usar 4 colunas no desktop (2 linhas de 4) |
| Aula | Selo "reformuladas com IA · aguardando revisão" em todas as perguntas | Mostrar só na Curadoria |
| Aula | Bloco "Sua nota" sempre aberto no fim de cada aula | Botão "Anotar" que abre o campo |
| Grupo | Chip "Essencial" em todas as 7 linhas de uma lista que já é só de essenciais | Tirar o chip; manter só "Começar" e "Concluída" |
| Grupo | Chip "Concluída · +10 XP" repetido em cada aula feita | Só o check verde |
| Grupo | Nota interna "Primeira metade da seção da Central" | Trocar por uma frase para o analista ("Tudo que monta o cardápio") |
| Quiz | Duas barras no topo: menu principal + barra do quiz | Esconder o menu principal no quiz, como modo foco |
| Quiz | Selo "reformulado com IA" ao lado do título | Tirar |
| Conquistas | Faixas de nível, sequência e % de acerto disputando a mesma linha | Separar nível e estatísticas em dois blocos |

## Problemas por prioridade

Alta = atrapalha o aprendizado ou passa informação errada. Média = confunde ou quebra a confiança. Baixa = acabamento.

| Prioridade | Tela | Problema | Sugestão |
| --- | --- | --- | --- |
| Alta | Aula e Quiz | A maioria das perguntas é "Depois de '\<frase do artigo>', qual é o próximo passo?". Isso testa memória da ordem do texto, não o atendimento. No quiz de Acesso ao sistema, 2 de 6 são assim | Perguntar pelo resultado: "o cliente quer X, o que ele faz?" ou "por que aconteceu Y?" |
| Alta | Aula e Quiz | Alternativas são frases copiadas do artigo, com restos de formatação: "- Disponível na Google Play…", "Clique aqui para saber mais", "N ova Categoria", "Usuári o", emojis e frases cortadas no meio ("R$ 35,00.") | Alternativas curtas, reescritas, do mesmo tamanho e no mesmo formato |
| Alta | Aula e Quiz | A resposta certa repete as palavras da pergunta ("aplicativo de vendas" na pergunta e na alternativa A). Dá para acertar sem saber | Distratores plausíveis com o mesmo vocabulário |
| Alta | Quiz | O quiz cobra leitura de apoio: a pergunta 4 de Acesso ao sistema é sobre "Adicionar App Yooga em iPhone", que não é essencial | Quiz só com aulas essenciais, como diz a regra da tela |
| Alta | Quiz | 3 das 6 perguntas de Acesso ao sistema são sobre a mesma aula (Como baixar o app) | No máximo 2 perguntas por aula |
| Alta | Curadoria | Aberta para qualquer pessoa sem login, com botões Aprovar e Pedir ajuste | Só para quem tem papel de curador ou líder |
| Média | Conquistas | Mostra "0 dias seguidos" logo depois de 3 aulas e 1 quiz no mesmo dia | Contar o dia de hoje assim que houver atividade |
| Média | Conquistas | Nome "Ana Nascimento" e "entrou em 3 nov" aparecem sem login | Sem login: "Visitante" e um convite para entrar e salvar o progresso |
| Média | Conquistas | O texto "dias seguidos" fica em cima do card "5 · Especialista" | Corrigir o layout da linha |
| Média | Quiz | Depois de responder, a letra da alternativa escolhida continua azul, mesmo em verde ou vermelho | A cor de certo ou errado vence a de selecionado |
| Média | Aula | No "Confere rápido", errar só pinta a opção de bege, sem dizer qual foi a sua; o feedback das certas fica escondido atrás do rodapé fixo | Mesmo padrão do quiz ("Sua resposta") e espaço no fim da página para o rodapé |
| Média | Biblioteca | O exemplo do campo de busca "sangria" volta 0 resultados | Trocar por termos que existem ("impressao, ifood, complemento") |
| Média | Início | Ao começar do zero, os 8 grupos aparecem como "A fazer" e nenhum como próximo | Primeiro grupo como "Comece aqui" |
| Média | Geral | Sem login, todo o progresso fica só no navegador e não há aviso | Faixa discreta: "Entre para salvar seu progresso" |
| Baixa | Grupo | Cabeçalho colado no menu do topo, sem respiro | Mais espaço acima do cabeçalho |
| Baixa | Biblioteca | Coluna de filtros começa colada no banner escuro | Mesmo respiro da lista ao lado |
| Baixa | Geral | Plural: "0/1 quizzes", "passe nos 1 quiz", "1 leitura de apoio deste módulo continuam" | Ajustar singular e plural |
| Baixa | Resultado | A aba do navegador continua com o título "Quiz · …" | Título "Resultado · …" |
| Baixa | Aula | O toast de +10 XP aparece em cima do botão "Concluir aula" | Toast no topo ou acima do rodapé |

## Sugestões de melhoria

### Perguntas: um padrão para a IA e para a curadoria

Uma pergunta boa parte de um problema do cliente e tem uma única resposta certa, que exige entender a aula.

|  | Antes | Depois |
| --- | --- | --- |
| Pergunta | Depois de "Visite o site yooga.com.br/download e selecione:", qual opção aparece logo em seguida? | A cliente quer usar o Yooga no computador do caixa. Onde ela baixa? |
| Certa | Baixe agora para Windows se deseja instalar em seu computador ou notebook | Em yooga.com.br/download, na opção para Windows |
| Erradas | Frases de outras partes do artigo | Na App Store · Em app.yooga.com.br · Na Google Play |

Regras para o prompt de geração e para quem aprova:

- Nada de "depois de '...', qual o próximo passo".
- Alternativas reescritas, com até \~12 palavras, sem "Clique aqui", emoji ou frase cortada.
- A certa não pode repetir palavras-chave da pergunta que as erradas não têm.
- Só aulas essenciais no quiz, no máximo 2 perguntas por aula.
- Na Curadoria, um botão "Editar" ao lado de "Aprovar", para corrigir sem pedir ajuste.

### Início

- Card "Continue" com o tempo da aula ("2 min") para baixar a barreira.
- Quando o grupo atual terminar, um momento de celebração com o selo e o próximo grupo.

### Aula

- Rodapé com "Próxima: \<aula>" para o analista saber o que vem.
- Em aulas longas, um índice dos passos no topo.

### Quiz e resultado

- Modo foco: só a barra do quiz no topo.
- No resultado reprovado, "Revisar só o que errei": abre as aulas das perguntas erradas.

### Conquistas

- Mostrar o que falta para o próximo selo ("PDV: faltam 7 quizzes") em vez de só "0 de 7".

## Novas features

Ordenadas pelo que eu faria primeiro. Nenhuma complica a tela principal.

| Feature | O que é | Por que ajuda | Esforço |
| --- | --- | --- | --- |
| Revisão do que errei | Uma fila com as perguntas que o analista errou, que volta 2 e 7 dias depois | Fixa o conteúdo sem refazer quizzes inteiros | Médio |
| Atalho "Cliente na linha" | Busca da Biblioteca aberta de qualquer tela, com `/` ou `Ctrl+K` | O analista usa a Academy durante o atendimento, não só no onboarding | Baixo |
| Plano da semana | Meta sugerida pelo líder (ex.: terminar PDV · Cardápio até sexta) no card do Início | Dá ritmo e um prazo claro | Baixo |
| Avisar aula desatualizada | Botão "Isso mudou no sistema" em cada aula, que cai na Curadoria | Mantém o conteúdo alinhado ao produto, com ajuda do time | Baixo |
| Simulado de atendimento | Casos da Dona Lúcia com várias etapas (a ideia da Cantina) | Treina o raciocínio do atendimento, não só o passo a passo | Alto |
| Certificado do onboarding | Ao fechar os 8 selos e o quiz final, um certificado para o perfil | Marca o fim do onboarding e dá um motivo para terminar | Baixo |
| Novidades do produto | Quando a Central publica ou muda um artigo, a aula aparece como "Atualizada" para quem já fez | Mantém o time atualizado depois do onboarding | Médio |

## Como testei

Testei em [yoogaacademy.vercel.app](https://yoogaacademy.vercel.app/), no desktop, sem fazer login, como analista. Concluí as 3 aulas de Primeiros passos e o quiz do módulo (5/6, errando a 1ª de propósito). Ficaram registrados 85 XP e o selo Primeiros passos neste navegador; dá para apagar em "Zerar progresso local" no Início.

Abri também o grupo PDV, a Biblioteca (buscas "sangria", "impressao" e "ifood"), Conquistas e Curadoria. Não testei a visão do líder nem o celular.
