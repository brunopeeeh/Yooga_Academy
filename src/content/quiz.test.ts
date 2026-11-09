import { describe, expect, it } from 'vitest';
import { catalogIndex } from '@/data/catalog';
import { getLessonContent } from './lessons';
import { curatedQuizzes, FINAL_QUIZ_ID, getQuiz, quizzes } from './quizzes';
import { generatedQuizzes } from './quizzes.generated';
import type { LessonContent } from './types';

describe('conteúdo dos quizzes', () => {
  it('registra o quiz de PDV · Cardápio com as 6 perguntas do protótipo', () => {
    const quiz = getQuiz('pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio');

    expect(quiz?.questions).toHaveLength(6);
    expect(quiz?.questions[0]?.prompt).toBe('Como o cliente organiza isso?');
  });

  it('tem um quiz final de revisão', () => {
    const final = getQuiz(FINAL_QUIZ_ID);

    expect(final?.moduleId).toBe('final');
    expect(final?.questions.length).toBeGreaterThanOrEqual(5);
  });

  it('aponta para módulos existentes e com quiz', () => {
    for (const quiz of quizzes) {
      if (quiz.moduleId === FINAL_QUIZ_ID) continue;

      const module = catalogIndex.moduleById.get(quiz.moduleId);
      expect(module, quiz.moduleId).toBeDefined();
      expect(module?.tem_quiz).toBe(true);
    }
  });

  it('mantém perguntas válidas e ids únicos por quiz', () => {
    for (const quiz of quizzes) {
      const ids = quiz.questions.map((question) => question.id);
      expect(new Set(ids).size).toBe(ids.length);

      for (const question of quiz.questions) {
        expect(question.scene.length).toBeGreaterThan(0);
        expect(question.prompt.length).toBeGreaterThan(0);
        expect(question.options.length).toBeGreaterThanOrEqual(2);
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(question.options.length);
        expect(question.explanation.length).toBeGreaterThan(0);
        expect(question.review.length).toBeGreaterThan(0);
        expect(question.lessonLabel.length).toBeGreaterThan(0);
      }
    }
  });

  it('liga as perguntas às aulas quando o conteúdo já foi migrado', () => {
    for (const quiz of quizzes) {
      for (const question of quiz.questions) {
        if (!question.lessonId) continue;
        expect(catalogIndex.lessonById.get(question.lessonId), question.lessonId).toBeDefined();
      }
    }
  });

  it('devolve undefined para módulo sem quiz migrado', () => {
    expect(getQuiz('modulo-inexistente')).toBeUndefined();
  });
});

describe('quizzes gerados a partir dos artigos', () => {
  /** Compara textos sem acentos, caixa e pontuação. */
  function normalize(value: string): string {
    return value
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, ' ')
      .trim();
  }

  /** Texto de um passo, sem imagens. */
  function textOf(tokens: readonly { type: string; value: string }[]): string {
    return tokens
      .filter((token) => token.type !== 'image')
      .map((token) => token.value)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Passos do artigo na ordem de leitura: sem imagens, sem o sumário
   * ("Tópicos") e sem os títulos dos blocos (repetem o sumário).
   */
  function readingBlocks(content: LessonContent): { title: string; steps: string[] }[] {
    const titles = new Set(
      content.blocks.map((block) => normalize(block.title)).filter((title) => title.length > 0),
    );

    const blocks: { title: string; steps: string[] }[] = [];

    for (const block of content.blocks) {
      if (normalize(block.title) === 'topicos') continue;

      const steps: string[] = [];

      for (const step of block.steps) {
        if (step.kind === 'imagem') continue;

        const text = textOf(step.tokens);

        if (text.length < 18) continue;
        if (titles.has(normalize(text))) continue;

        steps.push(text);
      }

      if (steps.length > 0) blocks.push({ title: block.title, steps });
    }

    return blocks;
  }

  /** Texto corrido da aula, normalizado. */
  function lessonText(lessonId: string): string {
    const content = getLessonContent(lessonId);

    if (!content) return '';

    return normalize(
      content.blocks
        .flatMap((block) => block.steps)
        .map((step) => textOf(step.tokens))
        .join(' '),
    );
  }

  /** Prefixo usado para comparar um trecho (a alternativa pode estar truncada). */
  function prefix(text: string): string {
    return normalize(text).split(' ').slice(0, 6).join(' ');
  }

  const quizModules = [...catalogIndex.moduleById.values()].filter((module) => module.tem_quiz);

  it('cobre todos os módulos que declaram ter quiz', () => {
    for (const module of quizModules) {
      expect(getQuiz(module.id), module.id).toBeDefined();
    }

    // Todo módulo tem quiz: os curados à mão ou os gerados a partir dos artigos.
    expect(generatedQuizzes.length + curatedQuizzes.length - 1).toBe(quizModules.length);
  });

  it('a alternativa correta aparece na aula citada', () => {
    for (const quiz of generatedQuizzes) {
      for (const question of quiz.questions) {
        if (!question.lessonId) continue;

        const text = lessonText(question.lessonId);
        const answer = question.options[question.correctIndex];

        expect(text, `${quiz.moduleId}/${question.id}: ${answer}`).toContain(prefix(answer));
      }
    }
  });

  it('as alternativas erradas não aparecem na aula citada', () => {
    for (const quiz of generatedQuizzes) {
      for (const question of quiz.questions) {
        if (!question.lessonId) continue;

        const text = lessonText(question.lessonId);

        for (const [index, option] of question.options.entries()) {
          if (index === question.correctIndex) continue;

          expect(text, `${quiz.moduleId}/${question.id}: ${option}`).not.toContain(prefix(option));
        }
      }
    }
  });

  it('a pergunta de sequência aponta o passo seguinte ao citado', () => {
    for (const quiz of generatedQuizzes) {
      for (const question of quiz.questions) {
        if (!question.lessonId || !question.prompt.includes('depois de')) continue;

        const content = getLessonContent(question.lessonId);

        if (!content) continue;

        const quoted = question.prompt.match(/depois de "(.+)", qual/);

        expect(quoted, `${quiz.moduleId}/${question.id}`).not.toBeNull();

        // A pergunta pode citar a seção (o mesmo passo aparece em várias).
        const section = question.prompt.match(/^Na seção "(.+?)", depois de "/);
        const blocks = readingBlocks(content);

        const scope = section
          ? blocks.filter((block) => normalize(block.title) === normalize(section[1] ?? ''))
          : blocks;

        expect(scope.length, `${quiz.moduleId}/${question.id}: seção "${section?.[1]}"`).toBe(
          section ? 1 : blocks.length,
        );

        const steps = scope.flatMap((block) => block.steps);
        const anchor = normalize((quoted?.[1] ?? '').replace(/’/g, '"'));
        let index = steps.findIndex((step) => normalize(step) === anchor);

        if (index === -1) index = steps.findIndex((step) => normalize(step).startsWith(anchor));

        expect(
          index,
          `${quiz.moduleId}/${question.id}: âncora "${quoted?.[1]}"`,
        ).toBeGreaterThanOrEqual(0);

        const answer = question.options[question.correctIndex];
        const next = normalize(steps[index + 1] ?? '');

        expect(next, `${quiz.moduleId}/${question.id}: "${answer}"`).toContain(prefix(answer));
      }
    }
  });

  it('a pergunta de ordem aponta o primeiro passo da aula', () => {
    for (const quiz of generatedQuizzes) {
      for (const question of quiz.questions) {
        if (!question.lessonId || !question.prompt.includes('vem primeiro')) continue;

        const content = getLessonContent(question.lessonId);

        if (!content) continue;

        const first = normalize(readingBlocks(content)[0]?.steps[0] ?? '');
        const answer = question.options[question.correctIndex];

        expect(first, `${quiz.moduleId}/${question.id}: "${answer}"`).toContain(prefix(answer));
      }
    }
  });

  it('não repete a mesma resposta dentro do mesmo quiz', () => {
    for (const quiz of generatedQuizzes) {
      const answers = quiz.questions.map((question) =>
        normalize(question.options[question.correctIndex]),
      );

      expect(new Set(answers).size, quiz.moduleId).toBe(answers.length);
    }
  });

  it('mantém o quiz curado quando existe uma versão gerada', () => {
    for (const curated of curatedQuizzes) {
      if (curated.moduleId === FINAL_QUIZ_ID) continue;

      expect(getQuiz(curated.moduleId), curated.moduleId).toEqual(curated);
      expect(getQuiz(curated.moduleId)?.origin).toBe('curado');
    }
  });

  it('marca os quizzes gerados como rascunho', () => {
    for (const quiz of quizzes) {
      const curated = curatedQuizzes.find((item) => item.moduleId === quiz.moduleId);

      if (curated) {
        expect(quiz.origin, quiz.moduleId).toBe('curado');
        continue;
      }

      expect(quiz.origin, quiz.moduleId).toBe('rascunho');
    }
  });
});
