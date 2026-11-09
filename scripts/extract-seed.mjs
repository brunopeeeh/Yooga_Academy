import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname } from 'node:path';

const SOURCE = 'yooga-academy-onboarding-prototipo.html';
const TARGET = 'src/data/seed.json';

const html = await readFile(SOURCE, 'utf8');
const match = html.match(/const SEED = (\{.*?\});\s*\/\* Conteúdo/s);

if (!match) {
  throw new Error(`Não foi possível encontrar o SEED em ${SOURCE}.`);
}

const seed = JSON.parse(match[1]);
await mkdir(dirname(TARGET), { recursive: true });
await writeFile(TARGET, `${JSON.stringify(seed, null, 2)}\n`, 'utf8');

const totals = seed.grupos.reduce(
  (acc, group) => {
    acc.groups += 1;
    acc.modules += group.modulos.length;
    for (const module of group.modulos) {
      acc.lessons += module.aulas.length;
      acc.essentials += module.aulas.filter((lesson) => lesson.tipo === 'essencial').length;
      acc.quizModules += module.tem_quiz ? 1 : 0;
    }
    return acc;
  },
  { groups: 0, modules: 0, lessons: 0, essentials: 0, quizModules: 0 },
);

console.log(
  `seed.json gerado · ${totals.groups} grupos, ${totals.modules} módulos, ` +
    `${totals.lessons} aulas (${totals.essentials} essenciais), ${totals.quizModules} quizzes`,
);
