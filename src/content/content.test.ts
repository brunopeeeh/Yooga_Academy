import { describe, expect, it } from 'vitest';
import { catalogIndex } from '@/data/catalog';
import { aiChecks } from './checks.ai.generated';
import { generatedChecks } from './checks';
import { generatedContent } from './generated';
import { curatedContent, getLessonContent, lessonsContent } from './lessons';
import { inline } from './inline';
import type { LessonContent } from './types';

describe('inline', () => {
  it('converte texto puro em um único token', () => {
    expect(inline('Salve o produto')).toEqual([{ type: 'text', value: 'Salve o produto' }]);
  });

  it('separa texto, teclas e negritos na ordem original', () => {
    expect(
      inline('Acesse <kbd>Ajustes</kbd> › <kbd>Produtos</kbd> e marque <b>Favorito</b>.'),
    ).toEqual([
      { type: 'text', value: 'Acesse ' },
      { type: 'key', value: 'Ajustes' },
      { type: 'text', value: ' › ' },
      { type: 'key', value: 'Produtos' },
      { type: 'text', value: ' e marque ' },
      { type: 'strong', value: 'Favorito' },
      { type: 'text', value: '.' },
    ]);
  });

  it('mantém marcação não suportada como texto, sem interpretar HTML', () => {
    expect(inline('Use <script>alert(1)</script> com cuidado')).toEqual([
      { type: 'text', value: 'Use <script>alert(1)</script> com cuidado' },
    ]);
  });

  it('não perde o texto depois da última marcação', () => {
    expect(inline('Clique em <kbd>Salvar</kbd> agora')).toEqual([
      { type: 'text', value: 'Clique em ' },
      { type: 'key', value: 'Salvar' },
      { type: 'text', value: ' agora' },
    ]);
  });
});

describe('conteúdo curado das aulas', () => {
  it('aponta apenas para aulas essenciais existentes no catálogo', () => {
    for (const content of curatedContent) {
      const lesson = catalogIndex.lessonById.get(content.lessonId);

      expect(lesson, content.lessonId).toBeDefined();
      expect(lesson?.tipo).toBe('essencial');
    }
  });

  it('mantém ids de aula únicos', () => {
    const ids = curatedContent.map((content) => content.lessonId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tem blocos, passos e perguntas de conferência válidas', () => {
    for (const content of curatedContent) {
      expect(content.minutes).toBeGreaterThan(0);
      expect(content.intro.length).toBeGreaterThan(0);
      expect(content.blocks.length).toBeGreaterThan(0);

      for (const block of content.blocks) {
        expect(block.title.length).toBeGreaterThan(0);
        expect(block.steps.length).toBeGreaterThan(0);
        expect(block.steps.every((step) => step.tokens.length > 0)).toBe(true);
      }

      const checkIds = content.checks.map((check) => check.id);
      expect(new Set(checkIds).size).toBe(checkIds.length);

      for (const check of content.checks) {
        expect(check.options.length).toBeGreaterThanOrEqual(2);
        expect(check.correctIndex).toBeGreaterThanOrEqual(0);
        expect(check.correctIndex).toBeLessThan(check.options.length);
        expect(check.success.length).toBeGreaterThan(0);
      }
    }
  });

  it('encontra o conteúdo pelo id da aula', () => {
    const id =
      'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio--cadastro-de-produtos-no-pdv';

    expect(getLessonContent(id)?.minutes).toBe(8);
    expect(getLessonContent('aula-inexistente')).toBeUndefined();
  });
});

describe('conteúdo extraído da Central de Ajuda', () => {
  it('cobre todas as aulas do catálogo', () => {
    expect(generatedContent.length).toBe(catalogIndex.totals.lessons);
  });

  it('aponta apenas para aulas existentes no catálogo', () => {
    for (const content of generatedContent) {
      expect(catalogIndex.lessonById.get(content.lessonId), content.lessonId).toBeDefined();
    }
  });

  it('mantém ids de aula únicos', () => {
    const ids = generatedContent.map((content) => content.lessonId);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('tem resumo, blocos e passos com tokens válidos', () => {
    for (const content of generatedContent) {
      expect(content.minutes, content.lessonId).toBeGreaterThan(0);
      expect(content.intro.length, content.lessonId).toBeGreaterThan(0);
      expect(content.blocks.length, content.lessonId).toBeGreaterThan(0);
      expect(content.sourceUrl, content.lessonId).toContain('ajuda.yooga.com.br');
      expect(content.sourceTitle?.length, content.lessonId).toBeGreaterThan(0);

      for (const block of content.blocks) {
        expect(block.steps.length, content.lessonId).toBeGreaterThan(0);

        for (const step of block.steps) {
          expect(step.tokens.length, content.lessonId).toBeGreaterThan(0);

          for (const token of step.tokens) {
            if (token.type === 'link') {
              expect(token.href, content.lessonId).toMatch(/^https?:\/\//);
              expect(token.value.length, content.lessonId).toBeGreaterThan(0);
            }

            if (token.type === 'image') {
              expect(token.value, content.lessonId).toMatch(/^https:\/\//);
              expect(token.alt.length, content.lessonId).toBeGreaterThan(0);
            }
          }
        }
      }
    }
  });

  it('mantém o conteúdo curado com prioridade sobre o extraído', () => {
    for (const content of curatedContent) {
      expect(getLessonContent(content.lessonId)).toEqual(content);
    }
  });

  it('disponibiliza conteúdo para todas as aulas do catálogo', () => {
    for (const lessonId of catalogIndex.lessonById.keys()) {
      expect(getLessonContent(lessonId), lessonId).toBeDefined();
    }

    expect(lessonsContent.length).toBe(catalogIndex.totals.lessons);
  });
});

describe('perguntas de conferência geradas', () => {
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
  function readingSteps(content: LessonContent): string[] {
    return readingBlocks(content).flatMap((block) => block.steps);
  }

  /** Seções do artigo com seus passos (mesmos filtros do gerador). */
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

  /** Prefixo usado para comparar um trecho (a alternativa pode estar truncada). */
  function prefix(text: string): string {
    return normalize(text).split(' ').slice(0, 6).join(' ');
  }

  const generatedById = new Map(generatedContent.map((content) => [content.lessonId, content]));

  it('só cobre aulas essenciais existentes no catálogo', () => {
    for (const [lessonId] of generatedChecks) {
      const lesson = catalogIndex.lessonById.get(lessonId);

      expect(lesson, lessonId).toBeDefined();
      expect(lesson?.tipo, lessonId).toBe('essencial');
    }
  });

  it('cobre a grande maioria das aulas essenciais', () => {
    const essentials = [...catalogIndex.lessonById.values()].filter(
      (lesson) => lesson.tipo === 'essencial',
    );

    expect(generatedChecks.size).toBeGreaterThanOrEqual(essentials.length - 2);
  });

  it('tem alternativas válidas e resposta dentro do intervalo', () => {
    for (const [lessonId, checks] of generatedChecks) {
      expect(checks.length, lessonId).toBeGreaterThan(0);

      const ids = checks.map((check) => check.id);
      expect(new Set(ids).size, lessonId).toBe(ids.length);

      for (const check of checks) {
        expect(check.options.length, lessonId).toBeGreaterThanOrEqual(3);
        expect(new Set(check.options).size, lessonId).toBe(check.options.length);
        expect(check.correctIndex, lessonId).toBeGreaterThanOrEqual(0);
        expect(check.correctIndex, lessonId).toBeLessThan(check.options.length);
        expect(check.prompt.length, lessonId).toBeGreaterThan(0);
        expect(check.success.length, lessonId).toBeGreaterThan(0);
      }
    }
  });

  it('tem no máximo duas perguntas por aula', () => {
    // Mais que isso a aula vira um interrogatório: o analista decora as
    // respostas em vez de entender o passo a passo.
    for (const [lessonId, checks] of generatedChecks) {
      expect(checks.length, lessonId).toBeLessThanOrEqual(2);
    }
  });

  it('as alternativas não têm pontuação solta', () => {
    // A extração do artigo às vezes separa a pontuação do texto
    // ("panel.yooga.com.br ."); o gerador cola antes de exibir.
    for (const [lessonId, checks] of generatedChecks) {
      for (const check of checks) {
        for (const option of check.options) {
          expect(option, `${lessonId}: ${option}`).not.toMatch(/\s+[.,;:!?]/);
        }
      }
    }
  });

  it('a alternativa correta aparece no texto da aula', () => {
    for (const [lessonId, checks] of generatedChecks) {
      const content = generatedById.get(lessonId);

      if (!content) continue;

      const text = normalize(
        content.blocks
          .flatMap((block) => block.steps)
          .map((step) => textOf(step.tokens))
          .join(' '),
      );

      for (const check of checks) {
        const answer = check.options[check.correctIndex];

        expect(text, `${lessonId}: ${answer}`).toContain(prefix(answer));
      }
    }
  });

  it('as alternativas erradas não aparecem na aula', () => {
    for (const [lessonId, checks] of generatedChecks) {
      const content = generatedById.get(lessonId);

      if (!content) continue;

      const text = normalize(
        content.blocks
          .flatMap((block) => block.steps)
          .map((step) => textOf(step.tokens))
          .join(' '),
      );

      for (const check of checks) {
        // A pergunta de sequência usa outros passos da própria aula como
        // alternativas — nesse caso a checagem não se aplica.
        if (check.id === 'q2') continue;

        for (const [index, option] of check.options.entries()) {
          if (index === check.correctIndex) continue;

          expect(text, `${lessonId}: ${option}`).not.toContain(prefix(option));
        }
      }
    }
  });

  it('a pergunta de sequência aponta o passo seguinte ao citado', () => {
    for (const [lessonId, checks] of generatedChecks) {
      const content = generatedById.get(lessonId);

      if (!content) continue;

      const check = checks.find((item) => item.id === 'q2');

      if (!check || !check.anchor) continue;

      const blocks = readingBlocks(content);

      // A seção citada fica em campo próprio (`section`), para a auditoria
      // continuar valendo mesmo depois de o enunciado ser reescrito por IA.
      const scope = check.section
        ? blocks.filter((block) => normalize(block.title) === normalize(check.section ?? ''))
        : blocks;

      expect(scope.length, `${lessonId}: seção "${check.section}"`).toBe(
        check.section ? 1 : blocks.length,
      );

      const steps = scope.flatMap((block) => block.steps);
      const anchor = normalize(check.anchor);
      let index = steps.findIndex((step) => normalize(step) === anchor);

      if (index === -1) index = steps.findIndex((step) => normalize(step).startsWith(anchor));

      expect(index, `${lessonId}: âncora "${check.anchor}"`).toBeGreaterThanOrEqual(0);

      const answer = check.options[check.correctIndex];
      const next = normalize(steps[index + 1] ?? '');

      expect(next, `${lessonId}: "${answer}"`).toContain(prefix(answer));
    }
  });

  it('a pergunta de ordem aponta o primeiro passo da aula', () => {
    for (const [lessonId, checks] of generatedChecks) {
      const content = generatedById.get(lessonId);

      if (!content) continue;

      const check = checks.find((item) => item.id === 'q2');

      if (!check || !check.prompt.includes('vem primeiro')) continue;

      const first = normalize(readingSteps(content)[0] ?? '');
      const answer = check.options[check.correctIndex];

      expect(first, `${lessonId}: "${answer}"`).toContain(prefix(answer));
    }
  });

  it('não repete a mesma resposta nas duas perguntas da aula', () => {
    for (const [lessonId, checks] of generatedChecks) {
      if (checks.length < 2) continue;

      const answers = checks.map((check) => normalize(check.options[check.correctIndex]));

      expect(new Set(answers).size, lessonId).toBe(answers.length);
    }
  });

  it('entra no app como rascunho, sem sobrescrever as perguntas curadas', () => {
    for (const [lessonId, checks] of generatedChecks) {
      const content = getLessonContent(lessonId);

      if (!content) continue;

      const curated = curatedContent.find((item) => item.lessonId === lessonId);

      if (curated) {
        expect(content.checks, lessonId).toEqual(curated.checks);
        expect(content.checksOrigin, lessonId).toBe('curado');
        continue;
      }

      // A camada de IA tem prioridade sobre o rascunho do template.
      const ai = aiChecks.get(lessonId);

      if (ai && ai.length > 0) {
        expect(content.checks, lessonId).toEqual(ai);
        expect(content.checksOrigin, lessonId).toBe('ia');
        continue;
      }

      expect(content.checks, lessonId).toEqual(checks);
      expect(content.checksOrigin, lessonId).toBe('rascunho');
    }
  });

  it('a camada de IA só troca o enunciado e o feedback', () => {
    // A garantia de verificabilidade vem de as ALTERNATIVAS continuarem
    // literais do artigo: a LLM não pode mexer nelas.
    for (const [lessonId, checks] of aiChecks) {
      const generated = generatedChecks.get(lessonId);

      if (!generated) continue;

      expect(checks.length, lessonId).toBe(generated.length);

      for (const [index, check] of checks.entries()) {
        const original = generated[index];

        expect(check.id, lessonId).toBe(original.id);
        expect(check.options, lessonId).toEqual(original.options);
        expect(check.correctIndex, lessonId).toBe(original.correctIndex);
        expect(check.anchor, lessonId).toBe(original.anchor);
        expect(check.section, lessonId).toBe(original.section);
      }
    }
  });

  it('a camada de IA cobre a maioria das aulas geradas', () => {
    const generated = new Set(generatedChecks.keys());
    const rewritten = [...aiChecks.keys()].filter((lessonId) => generated.has(lessonId));

    // As 2 aulas curadas à mão não entram na fila; a reescrita cobre o resto.
    expect(rewritten.length).toBeGreaterThanOrEqual(generated.size - 3);
  });

  it('a camada de IA não entrega a resposta no enunciado', () => {
    for (const [lessonId, checks] of aiChecks) {
      const original = generatedChecks.get(lessonId);

      if (!original) continue;

      for (const [index, check] of checks.entries()) {
        const text = normalize(check.prompt);

        for (const option of original[index].options) {
          const target = normalize(option);

          if (!target) continue;

          expect(text, `${lessonId}: ${option}`).not.toContain(target);
        }
      }
    }
  });

  it('a camada de IA não pergunta "nesta aula"', () => {
    for (const [lessonId, checks] of aiChecks) {
      for (const check of checks) {
        expect(check.prompt, lessonId).not.toMatch(/nesta aula|no texto da aula|no artigo/i);
        expect(check.success, lessonId).not.toMatch(/nesta aula|no texto da aula|no artigo/i);
      }
    }
  });
});
