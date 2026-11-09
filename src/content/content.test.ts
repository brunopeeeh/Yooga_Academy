import { describe, expect, it } from 'vitest';
import { catalogIndex } from '@/data/catalog';
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

      if (!check || !check.prompt.includes('depois de')) continue;

      const quoted = check.prompt.match(/depois de "(.+)", qual/);

      expect(quoted, lessonId).not.toBeNull();

      // A pergunta pode citar a seção (o mesmo passo aparece em várias).
      const section = check.prompt.match(/^Na seção "(.+?)", depois de "/);
      const blocks = readingBlocks(content);

      const scope = section
        ? blocks.filter((block) => normalize(block.title) === normalize(section[1] ?? ''))
        : blocks;

      expect(scope.length, `${lessonId}: seção "${section?.[1]}"`).toBe(
        section ? 1 : blocks.length,
      );

      const steps = scope.flatMap((block) => block.steps);
      const anchor = normalize((quoted?.[1] ?? '').replace(/’/g, '"'));
      let index = steps.findIndex((step) => normalize(step) === anchor);

      if (index === -1) index = steps.findIndex((step) => normalize(step).startsWith(anchor));

      expect(index, `${lessonId}: âncora "${quoted?.[1]}"`).toBeGreaterThanOrEqual(0);

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

      expect(content.checks, lessonId).toEqual(checks);
      expect(content.checksOrigin, lessonId).toBe('rascunho');
    }
  });
});
