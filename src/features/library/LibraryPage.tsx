import { Fragment, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import { GroupIcon } from '@/components/GroupIcon/GroupIcon';
import { catalog, catalogIndex } from '@/data/catalog';
import { formatNoteDate, isFavorite, notePreview, sortedNotes } from '@/domain/annotations';
import { searchContent, type ContentIndex } from '@/domain/search';
import { normalizeText, highlightText, type HighlightSegment } from '@/domain/text';
import type { Group, Lesson, Module } from '@/domain/types';
import { useAnnotationsStore } from '@/stores/annotations';
import { useProgressStore } from '@/stores/progress';
import styles from './LibraryPage.module.css';

interface LessonHit {
  readonly lesson: Lesson;
  readonly module: Module;
  readonly group: Group;
  readonly groupPosition: number;
  /** Onde o termo foi encontrado: no título da aula ou dentro do texto. */
  readonly source: 'titulo' | 'texto';
  /** Trecho do texto com o termo destacado (só nas buscas no conteúdo). */
  readonly segments?: readonly HighlightSegment[];
}

const ALL_LESSONS: readonly LessonHit[] = catalog.grupos.flatMap((group) =>
  group.modulos.flatMap((module) =>
    module.aulas.map((lesson) => ({
      lesson,
      module,
      group,
      groupPosition: catalogIndex.positionOfGroup.get(group.id) ?? 0,
      source: 'titulo' as const,
    })),
  ),
);

const HIT_BY_LESSON = new Map(ALL_LESSONS.map((hit) => [hit.lesson.id, hit]));

const RESULT_LIMIT = 60;

/** A busca dentro do texto começa com 3 letras — antes disso o resultado fica ruidoso. */
const MIN_CONTENT_TERM = 3;

type TypeFilter = Record<Lesson['tipo'], boolean>;

function Highlighted({ segments }: { segments: readonly HighlightSegment[] }) {
  return (
    <>
      {segments.map((segment, index) =>
        segment.match ? (
          <mark key={index} className={styles.mark}>
            {segment.text}
          </mark>
        ) : (
          <Fragment key={index}>{segment.text}</Fragment>
        ),
      )}
    </>
  );
}

function SearchIcon() {
  return (
    <svg
      aria-hidden="true"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#5a6b85"
      strokeWidth={2}
      strokeLinecap="round"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4" />
    </svg>
  );
}

function StarIcon() {
  return (
    <svg
      aria-hidden="true"
      width={14}
      height={14}
      viewBox="0 0 24 24"
      fill="currentColor"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinejoin="round"
    >
      <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z" />
    </svg>
  );
}

export function LibraryPage() {
  const progress = useProgressStore();
  const favorites = useAnnotationsStore((state) => state.favorites);
  const notes = useAnnotationsStore((state) => state.notes);
  const [query, setQuery] = useState('');
  const [types, setTypes] = useState<TypeFilter>({
    essencial: true,
    consulta: true,
  });
  const [groupFilter, setGroupFilter] = useState<ReadonlySet<string>>(new Set());
  const [onlyUnseen, setOnlyUnseen] = useState(false);
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [contentIndex, setContentIndex] = useState<ContentIndex | null>(null);
  const [contentLoading, setContentLoading] = useState(false);
  const contentRequested = useRef(false);

  const term = normalizeText(query.trim());
  const searchesContent = term.length >= MIN_CONTENT_TERM;

  // O índice do conteúdo (~820 kB) só é baixado quando a busca realmente
  // precisa dele — o app abre leve e o texto entra sob demanda.
  useEffect(() => {
    if (contentRequested.current || !searchesContent) return;

    contentRequested.current = true;
    setContentLoading(true);

    void import('@/content/searchIndex')
      .then((module) => {
        setContentIndex(module.contentIndex);
        setContentLoading(false);
      })
      .catch(() => {
        contentRequested.current = false;
        setContentLoading(false);
      });
  }, [searchesContent]);

  const contentMatches = useMemo(
    () => (contentIndex && searchesContent ? searchContent(contentIndex, query) : []),
    [contentIndex, query, searchesContent],
  );

  // Título/módulo primeiro; depois as aulas cujo texto cita o termo.
  const ranked = useMemo<readonly LessonHit[]>(() => {
    if (!term) return ALL_LESSONS;

    const hits: LessonHit[] = [];
    const seen = new Set<string>();

    for (const hit of ALL_LESSONS) {
      const inTitle =
        normalizeText(hit.lesson.titulo).includes(term) ||
        normalizeText(hit.module.nome).includes(term);

      if (!inTitle) continue;

      seen.add(hit.lesson.id);
      hits.push({ ...hit, source: 'titulo' });
    }

    for (const match of contentMatches) {
      if (seen.has(match.lessonId)) continue;

      const hit = HIT_BY_LESSON.get(match.lessonId);

      if (!hit) continue;

      seen.add(match.lessonId);
      hits.push({ ...hit, source: 'texto', segments: match.segments });
    }

    return hits;
  }, [term, contentMatches]);

  const results = ranked.filter(
    (hit) =>
      types[hit.lesson.tipo] &&
      (groupFilter.size === 0 || groupFilter.has(hit.group.id)) &&
      (!onlyUnseen || progress.concluidas[hit.lesson.id] !== true) &&
      (!onlyFavorites || isFavorite(favorites, hit.lesson.id)),
  );

  /** Minhas anotações, da mais editada para a menos editada. */
  const myNotes = useMemo(
    () =>
      sortedNotes({ favorites, notes }).flatMap(({ lessonId, note }) => {
        const hit = HIT_BY_LESSON.get(lessonId);

        return hit ? [{ ...hit, note }] : [];
      }),
    [favorites, notes],
  );

  const typeCount = (kind: Lesson['tipo']) =>
    ranked.filter((hit) => hit.lesson.tipo === kind).length;

  const groupCount = (groupId: string) => ranked.filter((hit) => hit.group.id === groupId).length;

  const toggleType = (kind: Lesson['tipo']) => {
    setTypes((current) => ({ ...current, [kind]: !current[kind] }));
  };

  const toggleGroup = (groupId: string) => {
    setGroupFilter((current) => {
      const next = new Set(current);
      if (next.has(groupId)) next.delete(groupId);
      else next.add(groupId);
      return next;
    });
  };

  const searchHint = contentLoading
    ? 'Carregando o texto das aulas para buscar dentro…'
    : term && !searchesContent
      ? `Digite ${MIN_CONTENT_TERM} ou mais letras para buscar também dentro do texto das aulas.`
      : 'Busca no título e no texto das aulas, com ou sem acento.';

  return (
    <div className={styles.page}>
      <section className={styles.search}>
        <div className={`wrap ${styles.searchInner}`}>
          <h1>Cliente na linha? Ache a aula certa.</h1>

          <label className={styles.searchBox}>
            <SearchIcon />
            <span className="sr">Buscar aulas</span>
            <input
              type="search"
              aria-label="Buscar aulas"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Ex.: impressao, complemento, ifood"
              autoComplete="off"
            />
            <span className={styles.searchCount}>{results.length} resultados</span>
          </label>

          <span className={styles.searchHint}>{searchHint}</span>
        </div>
      </section>

      <div className={`wrap ${styles.layout}`}>
        <aside className={styles.filters} aria-label="Filtros">
          <fieldset className={styles.fieldset}>
            <legend className="cap">Tipo</legend>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={types.essencial}
                onChange={() => toggleType('essencial')}
              />
              Essencial
              <span className={styles.count}>{typeCount('essencial')}</span>
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={types.consulta}
                onChange={() => toggleType('consulta')}
              />
              Leitura de apoio
              <span className={styles.count}>{typeCount('consulta')}</span>
            </label>
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className="cap">Grupo</legend>
            {catalog.grupos.map((group) => {
              const count = groupCount(group.id);

              return (
                <label
                  key={group.id}
                  className={`${styles.check} ${count === 0 ? styles.checkMuted : ''}`}
                >
                  <input
                    type="checkbox"
                    checked={groupFilter.has(group.id)}
                    onChange={() => toggleGroup(group.id)}
                  />
                  {group.nome}
                  <span className={styles.count}>{count}</span>
                </label>
              );
            })}
          </fieldset>

          <fieldset className={styles.fieldset}>
            <legend className="cap">Status</legend>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={onlyUnseen}
                onChange={() => setOnlyUnseen((current) => !current)}
              />
              Só o que ainda não vi
            </label>
            <label className={styles.check}>
              <input
                type="checkbox"
                checked={onlyFavorites}
                onChange={() => setOnlyFavorites((current) => !current)}
              />
              Só as favoritas
              <span className={styles.count}>{Object.keys(favorites).length}</span>
            </label>
          </fieldset>
        </aside>

        <section className={styles.results} aria-label="Resultados">
          <header className={styles.resultsHead}>
            <span>
              <b>
                {results.length} {results.length === 1 ? 'resultado' : 'resultados'}
              </b>
              {query.trim() ? ` para "${query.trim()}"` : ''}
            </span>
          </header>

          {results.slice(0, RESULT_LIMIT).map((hit) => {
            const done = progress.concluidas[hit.lesson.id] === true;
            const favorite = isFavorite(favorites, hit.lesson.id);
            const hasNote = notes[hit.lesson.id] !== undefined;

            return (
              <Link key={hit.lesson.id} to={`/aula/${hit.lesson.id}`} className={styles.hit}>
                <span className={styles.hitIcon}>
                  <GroupIcon index={hit.groupPosition} size={32} />
                </span>

                <div className={styles.hitBody}>
                  <b>
                    <Highlighted segments={highlightText(hit.lesson.titulo, query)} />
                  </b>
                  <span className={styles.hitPath}>
                    {hit.group.nome} › {hit.module.nome}
                  </span>
                  {hit.source === 'texto' && hit.segments ? (
                    <p className={styles.snippet}>
                      <span className={styles.hitSource}>no texto</span>
                      <Highlighted segments={hit.segments} />
                    </p>
                  ) : null}
                </div>

                <div className={styles.hitMeta}>
                  {favorite ? (
                    <span className={styles.favoriteTag}>
                      <StarIcon />
                      Favorita
                    </span>
                  ) : null}
                  {hasNote ? <span className={styles.noteTag}>Tem nota</span> : null}
                  <Chip tone={hit.lesson.tipo === 'essencial' ? 'doing' : 'todo'}>
                    {hit.lesson.tipo === 'essencial' ? 'Essencial' : 'Leitura de apoio'}
                  </Chip>
                  {done ? <span className={styles.done}>Concluída</span> : null}
                </div>
              </Link>
            );
          })}

          {results.length === 0 ? (
            <p className={`slab ${styles.empty}`}>
              Nada encontrado. Tente outra palavra ou limpe os filtros.
            </p>
          ) : null}

          {results.length > RESULT_LIMIT ? (
            <p className={styles.limit}>
              Mostrando {RESULT_LIMIT} de {results.length}. Refine a busca.
            </p>
          ) : null}
        </section>
      </div>

      {myNotes.length > 0 ? (
        <section className={`wrap ${styles.notesSection}`} aria-labelledby="my-notes-title">
          <div className={styles.notesHead}>
            <h2 id="my-notes-title">Suas anotações</h2>
            <span className="slab">
              {myNotes.length} {myNotes.length === 1 ? 'nota' : 'notas'} · salvas neste navegador
            </span>
          </div>

          <ul className={styles.notesList}>
            {myNotes.map((item) => (
              <li key={item.lesson.id}>
                <Link to={`/aula/${item.lesson.id}`} className={styles.noteItem}>
                  <span className={styles.noteItemTitle}>{item.lesson.titulo}</span>
                  <span className={styles.noteItemPath}>
                    {item.group.nome} › {item.module.nome} · {formatNoteDate(item.note.updatedAt)}
                  </span>
                  <span className={styles.noteItemText}>{notePreview(item.note.text)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
