import { effectiveGeneratedQuizzes } from './quizzes.effective';
import type { Quiz } from './types';

const CARDAPIO_LESSON = 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio';

const PRODUCTS_LESSON = `${CARDAPIO_LESSON}--cadastro-de-produtos-no-pdv`;
const COMPLEMENTS_LESSON = `${CARDAPIO_LESSON}--cadastro-de-complementos-pdv`;

/**
 * Perguntas escritas no protótipo para o quiz de PDV › Cardápio e para a
 * revisão final. São a referência de qualidade: os quizzes gerados a partir
 * da Central de Ajuda (`npm run content:quizzes`) nunca substituem este
 * texto.
 */
export const curatedQuizzes: readonly Quiz[] = [
  {
    moduleId: CARDAPIO_LESSON,
    origin: 'curado',
    questions: [
      {
        id: 'q1',
        scene: '"Quero separar os molhos dos adicionais no meu lanche."',
        prompt: 'Como o cliente organiza isso?',
        options: [
          'Criando duas categorias de complemento no produto',
          'Criando dois produtos diferentes',
          'Usando o campo Favorito',
          'Não é possível separar',
        ],
        correctIndex: 0,
        explanation:
          'Categorias de complemento agrupam as escolhas por tipo: uma para molhos, outra para adicionais.',
        review: 'Separar molhos e adicionais em categorias',
        lessonLabel: 'Complementos',
        lessonId: COMPLEMENTS_LESSON,
      },
      {
        id: 'q2',
        scene: '"Estou logado como Caixa e não acho onde criar produto."',
        prompt: 'O que explica isso?',
        options: [
          'O plano não inclui cadastro',
          'Só Administrador ou Gerente criam produtos',
          'Precisa criar pelo app do celular',
          'Falta cadastrar uma categoria',
        ],
        correctIndex: 1,
        explanation:
          'Criar produto depende da permissão do usuário. Caixa e Garçom não criam nem alteram preço.',
        review: 'Por que o Caixa não acha onde criar produto',
        lessonLabel: 'Produtos',
        lessonId: PRODUCTS_LESSON,
      },
      {
        id: 'q3',
        scene: '"Tenho integração com o iFood. Preciso mesmo preencher o Código PDV?"',
        prompt: 'Para que serve o Código PDV?',
        options: [
          'Só para imprimir na comanda',
          'Controle interno e manter vendas, estoque e relatórios certos com o iFood',
          'Define a ordem no cardápio',
          'É obrigatório só para pesáveis',
        ],
        correctIndex: 1,
        explanation:
          'O Código PDV identifica o item e é especialmente importante com a integração iFood.',
        review: 'Para que serve o Código PDV com iFood',
        lessonLabel: 'Produtos e Complementos',
        lessonId: PRODUCTS_LESSON,
      },
      {
        id: 'q4',
        scene:
          '"Copiei os complementos do Açaí 500ml para o Açaí 300ml. O de 300 já tinha a categoria Caldas. Cadê minhas caldas?"',
        prompt: 'O que aconteceu com as caldas do Açaí 300ml?',
        options: [
          'Foram somadas aos complementos copiados',
          'Foram substituídas pelos complementos copiados',
          'Ficaram inativas até confirmar a cópia',
          'O sistema só copia as categorias que faltam',
        ],
        correctIndex: 1,
        explanation:
          'Copiar complementos apaga os que o produto de destino já tinha. Para ajudar, recadastre a categoria Caldas.',
        review: 'Copiar complementos para produto que já tinha caldas',
        lessonLabel: 'Complementos',
        lessonId: COMPLEMENTS_LESSON,
      },
      {
        id: 'q5',
        scene: '"Vendo açaí no quilo. Como cadastro?"',
        prompt: 'O que o cliente faz no produto?',
        options: [
          'Cria um complemento "por quilo"',
          'Marca Pesável e coloca o preço do kg no valor de venda',
          'Cadastra um produto para cada peso',
          'Usa o campo Estoque',
        ],
        correctIndex: 1,
        explanation:
          'Com Pesável ativo, o valor de venda é o preço do quilo e a balança informa o peso.',
        review: 'Açaí vendido por quilo',
        lessonLabel: 'Produtos',
        lessonId: PRODUCTS_LESSON,
      },
      {
        id: 'q6',
        scene: '"Quero que o cliente escolha no máximo 2 molhos, mas pode não escolher nenhum."',
        prompt: 'Como configurar a categoria de molhos?',
        options: [
          'Preenchimento Obrigatório com mínimo 2',
          'Sem Preenchimento Obrigatório e máximo 2',
          'Obrigatório com mínimo 1 e máximo 2',
          'Não dá para limitar',
        ],
        correctIndex: 1,
        explanation:
          'Se a escolha é opcional, não marque o obrigatório. O máximo limita a quantidade.',
        review: 'Máximo de 2 molhos, opcional',
        lessonLabel: 'Complementos',
        lessonId: COMPLEMENTS_LESSON,
      },
    ],
  },
  {
    moduleId: 'final',
    origin: 'curado',
    questions: [
      {
        id: 'final-1',
        scene: '"Quero separar os molhos dos adicionais no meu lanche."',
        prompt: 'Como o cliente organiza isso?',
        options: [
          'Criando duas categorias de complemento no produto',
          'Criando dois produtos diferentes',
          'Usando o campo Favorito',
          'Não é possível separar',
        ],
        correctIndex: 0,
        explanation:
          'Categorias de complemento agrupam as escolhas por tipo: uma para molhos, outra para adicionais.',
        review: 'Separar molhos e adicionais em categorias',
        lessonLabel: 'Complementos',
        lessonId: COMPLEMENTS_LESSON,
      },
      {
        id: 'final-2',
        scene: '"Estou logado como Caixa e não acho onde criar produto."',
        prompt: 'O que explica isso?',
        options: [
          'O plano não inclui cadastro',
          'Só Administrador ou Gerente criam produtos',
          'Precisa criar pelo app do celular',
          'Falta cadastrar uma categoria',
        ],
        correctIndex: 1,
        explanation:
          'Criar produto depende da permissão do usuário. Caixa e Garçom não criam nem alteram preço.',
        review: 'Por que o Caixa não acha onde criar produto',
        lessonLabel: 'Produtos',
        lessonId: PRODUCTS_LESSON,
      },
      {
        id: 'final-3',
        scene: '"Copiei os complementos do Açaí 500ml para o Açaí 300ml. Cadê minhas caldas?"',
        prompt: 'O que aconteceu com as caldas do Açaí 300ml?',
        options: [
          'Foram somadas aos complementos copiados',
          'Foram substituídas pelos complementos copiados',
          'Ficaram inativas até confirmar a cópia',
          'O sistema só copia as categorias que faltam',
        ],
        correctIndex: 1,
        explanation:
          'Copiar complementos apaga os que o produto de destino já tinha. Recadastre a categoria Caldas.',
        review: 'Copiar complementos para produto que já tinha caldas',
        lessonLabel: 'Complementos',
        lessonId: COMPLEMENTS_LESSON,
      },
      {
        id: 'final-4',
        scene: '"Vendo açaí no quilo. Como cadastro?"',
        prompt: 'O que o cliente faz no produto?',
        options: [
          'Cria um complemento "por quilo"',
          'Marca Pesável e coloca o preço do kg no valor de venda',
          'Cadastra um produto para cada peso',
          'Usa o campo Estoque',
        ],
        correctIndex: 1,
        explanation:
          'Com Pesável ativo, o valor de venda é o preço do quilo e a balança informa o peso.',
        review: 'Açaí vendido por quilo',
        lessonLabel: 'Produtos',
        lessonId: PRODUCTS_LESSON,
      },
      {
        id: 'final-5',
        scene: '"Quero que o cliente escolha no máximo 2 molhos, mas pode não escolher nenhum."',
        prompt: 'Como configurar a categoria de molhos?',
        options: [
          'Preenchimento Obrigatório com mínimo 2',
          'Sem Preenchimento Obrigatório e máximo 2',
          'Obrigatório com mínimo 1 e máximo 2',
          'Não dá para limitar',
        ],
        correctIndex: 1,
        explanation:
          'Se a escolha é opcional, não marque o obrigatório. O máximo limita a quantidade.',
        review: 'Máximo de 2 molhos, opcional',
        lessonLabel: 'Complementos',
        lessonId: COMPLEMENTS_LESSON,
      },
      {
        id: 'final-6',
        scene: '"Tenho integração com o iFood. Preciso mesmo preencher o Código PDV?"',
        prompt: 'Para que serve o Código PDV?',
        options: [
          'Só para imprimir na comanda',
          'Controle interno e manter vendas, estoque e relatórios certos com o iFood',
          'Define a ordem no cardápio',
          'É obrigatório só para pesáveis',
        ],
        correctIndex: 1,
        explanation:
          'O Código PDV identifica o item e é especialmente importante com a integração iFood.',
        review: 'Para que serve o Código PDV com iFood',
        lessonLabel: 'Produtos e Complementos',
        lessonId: PRODUCTS_LESSON,
      },
    ],
  },
];

/**
 * Todos os quizzes: o texto curado à mão tem prioridade sobre o gerado
 * automaticamente a partir dos artigos do módulo.
 *
 * Os quizzes gerados têm duas camadas, como as perguntas de conferência:
 *
 * 1. `curado` — escritos à mão pela equipe de conteúdo (este arquivo);
 * 2. `ia` — textos reescritos por uma LLM (`npm run content:quizzes:ai`),
 *    ainda aguardando curadoria humana;
 * 3. `rascunho` — gerados pelo template determinístico
 *    (`npm run content:quizzes`).
 *
 * As alternativas nunca são reescritas: em todas as camadas elas são trechos
 * literais do artigo, o que torna a resposta verificável automaticamente.
 */
export const quizzes: readonly Quiz[] = [
  ...curatedQuizzes,
  ...effectiveGeneratedQuizzes.filter(
    (quiz) => !curatedQuizzes.some((curated) => curated.moduleId === quiz.moduleId),
  ),
];

const quizByModuleId: ReadonlyMap<string, Quiz> = new Map(
  quizzes.map((quiz) => [quiz.moduleId, quiz]),
);

export function getQuiz(moduleId: string): Quiz | undefined {
  return quizByModuleId.get(moduleId);
}

export const FINAL_QUIZ_ID = 'final';
