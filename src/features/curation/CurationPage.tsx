import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { GroupIcon } from '@/components/GroupIcon/GroupIcon';
import { effectiveChecks, hasAiRewrite } from '@/content/checks.effective';
import { curatedContent } from '@/content/curated';
import { curatedQuizzes, FINAL_QUIZ_ID, quizzes } from '@/content/quizzes';
import { catalog, catalogIndex } from '@/data/catalog';
import {
  CHECKS_BADGE_LABEL,
  curationQueue,
  curationSummary,
  QUIZ_BADGE_LABEL,
  type CurationItem,
} from '@/domain/curation';
import { useAuthStore } from '@/stores/auth';
import { useCurationStore } from '@/stores/curation';
import styles from './CurationPage.module.css';

type Filtro = 'pendentes' | 'aprovadas' | 'ajustes' | 'todas';

const FILTROS: readonly { id: Filtro; label: string }[] = [
  { id: 'pendentes', label: 'Pendentes' },
  { id: 'aprovadas', label: 'Aprovadas' },
  { id: 'ajustes', label: 'Precisam de ajuste' },
  { id: 'todas', label: 'Todas' },
];

function matchesFiltro(item: CurationItem, filtro: Filtro): boolean {
  if (filtro === 'todas') return true;
  if (filtro === 'pendentes') return item.approval === undefined;
  if (filtro === 'aprovadas') return item.approval?.decision === 'aprovado';
  return item.approval?.decision === 'ajuste';
}

export function CurationPage() {
  const approvals = useCurationStore((state) => state.approvals);
  const quizApprovals = useCurationStore((state) => state.quizApprovals);
  const reviewLesson = useCurationStore((state) => state.reviewLesson);
  const reopenLesson = useCurationStore((state) => state.reopenLesson);
  const reviewQuiz = useCurationStore((state) => state.reviewQuiz);
  const reopenQuiz = useCurationStore((state) => state.reopenQuiz);
  const user = useAuthStore((state) => state.user);
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [groupId, setGroupId] = useState<string | null>(null);
  /** Item com as perguntas abertas — um por vez (fila fechada por padrão). */
  const [openKey, setOpenKey] = useState<string | null>(null);

  // Só as perguntas (≈100 kB) e os quizzes (≈160 kB) — a fila não precisa do
  // texto das aulas.
  const generated = useMemo(
    () => new Map([...effectiveChecks].map(([lessonId, checks]) => [lessonId, checks.length])),
    [],
  );

  const curated = useMemo(() => new Set(curatedContent.map((content) => content.lessonId)), []);

  // Quizzes: os curados à mão ficam fora da fila; os gerados entram.
  const curatedQuizModules = useMemo(
    () =>
      new Set(
        curatedQuizzes
          .filter((quiz) => quiz.moduleId !== FINAL_QUIZ_ID)
          .map((quiz) => quiz.moduleId),
      ),
    [],
  );

  const generatedQuizzes = useMemo(
    () =>
      new Map(
        quizzes
          .filter((quiz) => !curatedQuizModules.has(quiz.moduleId))
          .map((quiz) => [quiz.moduleId, quiz.questions.length]),
      ),
    [curatedQuizModules],
  );

  const input = useMemo(
    () => ({
      index: catalogIndex,
      generated,
      curated,
      approvals: new Map(Object.entries(approvals)),
      generatedQuizzes,
      curatedQuizModules,
      quizApprovals: new Map(Object.entries(quizApprovals)),
    }),
    [approvals, curated, curatedQuizModules, generated, generatedQuizzes, quizApprovals],
  );

  const queue = useMemo(() => curationQueue(input), [input]);
  const summary = useMemo(() => curationSummary(input), [input]);

  const items = useMemo(
    () =>
      queue.filter(
        (item) => (groupId === null || item.group.id === groupId) && matchesFiltro(item, filtro),
      ),
    [filtro, groupId, queue],
  );

  const groupsInQueue = useMemo(() => {
    const ids = new Set(queue.map((item) => item.group.id));
    return catalog.grupos.filter((group) => ids.has(group.id));
  }, [queue]);

  const by = user?.name;
  /** Visitante vê a fila, mas não decide — só o revisor com sessão aprova. */
  const canReview = user !== null;

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={`wrap ${styles.headInner}`}>
          <span className="cap">Curadoria de conteúdo</span>
          <h1>Fila de revisão das perguntas</h1>
          <p className="slab">
            As perguntas de &ldquo;confere rápido&rdquo; e os quizzes dos módulos são reescritos por
            uma IA a partir dos artigos da Central de Ajuda. Confira se cada uma faz sentido e
            registre a decisão — o time de conteúdo acompanha o progresso por aqui.
          </p>
        </div>
      </header>

      <div className={`wrap ${styles.stack}`}>
        <section className={styles.kpis} aria-label="Resumo da curadoria">
          <div className={styles.kpi}>
            <span className="cap">Aguardando revisão</span>
            <b>{summary.pending}</b>
            <span>itens na fila</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Aprovadas</span>
            <b>{summary.approved}</b>
            <span>de {summary.total} itens gerados</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Precisam de ajuste</span>
            <b>{summary.needsAdjustment}</b>
            <span>pedem correção no texto</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Curadas à mão</span>
            <b>{summary.curated}</b>
            <span>itens fora da fila</span>
          </div>
        </section>

        {!canReview ? (
          <p className={styles.login}>
            Você está vendo a fila como visitante. <Link to="/entrar">Entre</Link> para aprovar ou
            pedir ajuste.
          </p>
        ) : null}

        <section className={styles.panel} aria-labelledby="curation-title">
          <div className={styles.panelHead}>
            <div>
              <h2 id="curation-title">
                {items.length} {items.length === 1 ? 'item' : 'itens'}
              </h2>
              <span className="slab">
                {summary.questionCount} perguntas na fila · {summary.percent}% da fila aprovada
              </span>
            </div>

            <div className={styles.filters}>
              <label className={styles.select}>
                <span className="sr">Filtrar por grupo</span>
                <select
                  value={groupId ?? ''}
                  onChange={(event) => setGroupId(event.target.value || null)}
                >
                  <option value="">Todos os grupos</option>
                  {groupsInQueue.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.nome}
                    </option>
                  ))}
                </select>
              </label>

              <div className={styles.tabs} role="group" aria-label="Filtrar por situação">
                {FILTROS.map((option) => (
                  <button
                    key={option.id}
                    type="button"
                    className={filtro === option.id ? styles.tabActive : styles.tab}
                    aria-pressed={filtro === option.id}
                    onClick={() => setFiltro(option.id)}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {items.length === 0 ? (
            <p className={`slab ${styles.empty}`}>
              {filtro === 'pendentes'
                ? 'Nenhum item aguardando revisão. A fila está em dia.'
                : 'Nenhum item nesse filtro.'}
            </p>
          ) : null}

          <ul className={styles.list}>
            {items.map((item) => {
              const decision = item.approval?.decision;
              const isQuiz = item.kind === 'quiz';
              const key = isQuiz ? item.module.id : item.lesson.id;
              const itemKey = `${item.kind}:${key}`;
              const open = openKey === itemKey;
              const questionsId = `perguntas-${item.kind}-${key}`;
              const checks = isQuiz ? [] : (effectiveChecks.get(item.lesson.id) ?? []);
              const quiz = isQuiz
                ? quizzes.find((entry) => entry.moduleId === item.module.id)
                : null;
              const rewritten = isQuiz ? quiz?.origin === 'ia' : hasAiRewrite(item.lesson.id);
              const canOpen = !isQuiz ? checks.length > 0 : (quiz?.questions.length ?? 0) > 0;

              return (
                <li key={itemKey} className={styles.item}>
                  <div className={styles.itemMain}>
                    <span className={styles.itemIcon}>
                      <GroupIcon index={item.groupPosition} size={28} />
                    </span>

                    <div className={styles.itemBody}>
                      <Link
                        to={isQuiz ? `/quiz/${item.module.id}` : `/aula/${item.lesson.id}`}
                        className={styles.itemTitle}
                      >
                        {isQuiz ? `Quiz · ${item.module.nome}` : item.lesson.titulo}
                      </Link>
                      <span className={styles.itemPath}>
                        {item.group.nome} › {item.module.nome} ·{' '}
                        {isQuiz ? 'quiz do módulo' : 'aula'} · {item.questionCount}{' '}
                        {item.questionCount === 1 ? 'pergunta' : 'perguntas'}
                      </span>

                      <span className={styles.itemMeta}>
                        {item.approval ? (
                          <>
                            <Chip tone={decision === 'aprovado' ? 'done' : 'next'}>
                              {decision === 'aprovado' ? 'Aprovada' : 'Precisa de ajuste'}
                            </Chip>
                            {item.approval.by ? <span>por {item.approval.by}</span> : null}
                          </>
                        ) : (
                          <Chip tone="info">
                            {isQuiz
                              ? rewritten
                                ? QUIZ_BADGE_LABEL.ia
                                : QUIZ_BADGE_LABEL.rascunho
                              : rewritten
                                ? CHECKS_BADGE_LABEL.ia
                                : CHECKS_BADGE_LABEL.rascunho}
                          </Chip>
                        )}
                      </span>
                    </div>

                    <div className={styles.itemActions}>
                      {canOpen ? (
                        <button
                          type="button"
                          className={styles.toggle}
                          aria-expanded={open}
                          aria-controls={questionsId}
                          onClick={() =>
                            setOpenKey((current) => (current === itemKey ? null : itemKey))
                          }
                        >
                          {open ? 'Fechar perguntas' : 'Ver perguntas'}
                        </button>
                      ) : null}

                      {canReview ? (
                        <>
                          <Button
                            type="button"
                            variant="light"
                            onClick={() =>
                              isQuiz
                                ? reviewQuiz(item.module.id, 'aprovado', by)
                                : reviewLesson(item.lesson.id, 'aprovado', by)
                            }
                          >
                            Aprovar
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() =>
                              isQuiz
                                ? reviewQuiz(item.module.id, 'ajuste', by)
                                : reviewLesson(item.lesson.id, 'ajuste', by)
                            }
                          >
                            Pedir ajuste
                          </Button>
                          {item.approval ? (
                            <Button
                              type="button"
                              variant="ghost"
                              onClick={() =>
                                isQuiz ? reopenQuiz(item.module.id) : reopenLesson(item.lesson.id)
                              }
                            >
                              Reabrir
                            </Button>
                          ) : null}
                        </>
                      ) : null}
                    </div>
                  </div>

                  {canOpen && open ? (
                    <div id={questionsId} className={styles.questions}>
                      {isQuiz
                        ? (quiz?.questions ?? []).map((question) => (
                            <p key={question.id} className={styles.question}>
                              <span className={styles.scene}>{question.scene}</span>
                              <b>{question.prompt}</b>
                              <span className={styles.answer}>
                                Resposta: {question.options[question.correctIndex]}
                              </span>
                            </p>
                          ))
                        : checks.map((check) => (
                            <p key={check.id} className={styles.question}>
                              <b>{check.prompt}</b>
                              <span className={styles.answer}>
                                Resposta: {check.options[check.correctIndex]}
                              </span>
                            </p>
                          ))}
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
