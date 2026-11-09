import { inline } from './inline';
import type { LessonContent } from './types';

/**
 * Conteúdo curado à mão (vem do protótipo).
 *
 * Fica num módulo separado de propósito: a fila de curadoria precisa saber
 * quais aulas já têm perguntas escritas pelo time — sem carregar o texto
 * extraído das 170 aulas (~700 kB).
 *
 * As aulas sem curadoria manual usam o texto extraído automaticamente da
 * Central de Ajuda e as perguntas geradas a partir desse texto.
 */
export const curatedContent: readonly LessonContent[] = [
  {
    lessonId:
      'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-produtos-no-pdv',
    minutes: 8,
    intro:
      'Produto é o que o cliente vende. Antes de cadastrar, a categoria já precisa existir. Só usuários Administrador ou Gerente conseguem criar produtos.',
    blocks: [
      {
        title: '1. Criar o produto',
        steps: [
          {
            tokens: inline(
              'Acesse <kbd>Ajustes</kbd> › <kbd>Produtos</kbd> e clique em <kbd>Criar novo produto</kbd>.',
            ),
          },
          {
            tokens: inline(
              'Preencha <b>Nome</b>, <b>Categoria</b>, <b>Código PDV</b>, <b>Valor de venda</b> e <b>Valor de custo</b>.',
            ),
          },
          { tokens: inline('Clique em <kbd>Salvar</kbd>.') },
        ],
      },
      {
        title: '2. Opções do produto',
        steps: [
          {
            tokens: inline('<b>Estoque</b> e <b>Favorito</b> (aparece primeiro na tela de venda).'),
          },
          {
            tokens: inline('<b>Pesável</b>: o valor de venda passa a ser o preço do quilo.'),
          },
          { tokens: inline('<b>Foto</b> em 400x400 ou 800x800.') },
        ],
      },
    ],
    warning: inline(
      'Se o cliente não acha onde criar o produto, confira a permissão do usuário. Caixa e Garçom não criam nem alteram preço.',
    ),
    checksOrigin: 'curado',
    checks: [
      {
        id: 'q1',
        prompt: 'O cliente logado como Caixa não acha o botão de criar produto. Por quê?',
        options: [
          'O plano dele não tem cadastro de produtos',
          'Só Administrador ou Gerente criam produtos',
        ],
        correctIndex: 1,
        success: 'Isso. É permissão do usuário, não do plano.',
      },
      {
        id: 'q2',
        prompt: 'Açaí vendido por quilo. O que o cliente marca?',
        options: [
          'Pesável, com o preço do quilo no valor de venda',
          'Um complemento chamado "quilo"',
        ],
        correctIndex: 0,
        success: 'Isso. Com Pesável ativo, o valor de venda vira o preço do kg.',
      },
    ],
  },
  {
    lessonId:
      'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-complementos-pdv',
    minutes: 7,
    intro:
      'Complementos são as escolhas do cliente dentro de um produto: molhos, adicionais, frutas do açaí. Primeiro você cria o complemento, depois vincula ao produto dentro de uma categoria.',
    blocks: [
      {
        title: '1. Criar o complemento',
        steps: [
          {
            tokens: inline(
              'Acesse <kbd>Ajustes</kbd> › <kbd>Produtos</kbd>, aba <kbd>Complementos</kbd>, e clique em <kbd>+ Novo complemento</kbd>.',
            ),
          },
          {
            tokens: inline(
              'Preencha nome, estoque, valor de venda, valor de custo e <b>Código PDV</b>. O código importa para quem integra com o iFood.',
            ),
          },
          { tokens: inline('Clique em <kbd>Salvar</kbd>.') },
        ],
      },
      {
        title: '2. Vincular ao produto',
        steps: [
          {
            tokens: inline(
              'No produto, aba <kbd>Complemento</kbd>, clique em <kbd>+ Adicionar Categoria</kbd>. Ex.: uma para molhos, outra para adicionais.',
            ),
          },
          {
            tokens: inline(
              'Se a escolha for obrigatória, marque <b>Preenchimento Obrigatório</b> e defina <b>mínimo</b> e <b>máximo</b>.',
            ),
          },
          { tokens: inline('Marque os complementos, adicione ao produto e <kbd>Salvar</kbd>.') },
        ],
      },
    ],
    warning: inline(
      'Copiar complementos de outro produto <b>substitui</b> os que já existem no produto de destino. Confirme com o cliente antes de salvar.',
    ),
    checksOrigin: 'curado',
    checks: [
      {
        id: 'q1',
        prompt: 'O cliente quer que o açaí exija escolher de 1 a 3 frutas. O que ele marca?',
        options: ['Preenchimento Obrigatório, mínimo 1 e máximo 3', 'Só máximo 3, sem obrigatório'],
        correctIndex: 0,
        success: 'Isso. Sem o obrigatório, o cliente pode pular as frutas.',
      },
      {
        id: 'q2',
        prompt: 'Onde se cria um complemento novo?',
        options: ['Na tela de venda, ao lançar o produto', 'Ajustes › Produtos › aba Complementos'],
        correctIndex: 1,
        success: 'Isso. Depois ele é vinculado ao produto.',
      },
    ],
  },
];
