import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { GroupIcon } from '@/components/GroupIcon/GroupIcon';
import { generatedChecks } from '@/content/checks';
import { curatedContent } from '@/content/curated';
import { catalog, catalogIndex } from '@/data/catalog';
import {
  CHECKS_BADGE_LABEL,
  curationQueue,
  curationSummary,
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
  const reviewLesson = useCurationStore((state) => state.reviewLesson);
  const reopenLesson = useCurationStore((state) => state.reopenLesson);
  const user = useAuthStore((state) => state.user);
  const [filtro, setFiltro] = useState<Filtro>('pendentes');
  const [groupId, setGroupId] = useState<string | null>(null);

  // Só as perguntas (≈100 kB) — a fila não precisa do texto das aulas.
  const generated = useMemo(
    () => new Map([...generatedChecks].map(([lessonId, checks]) => [lessonId, checks.length])),
    [],
  );

  const curated = useMemo(() => new Set(curatedContent.map((content) => content.lessonId)), []);

  const input = useMemo(
    () => ({
      index: catalogIndex,
      generated,
      curated,
      approvals: new Map(Object.entries(approvals)),
    }),
    [approvals, curated, generated],
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

  return (
    <div className={styles.page}>
      <header className={styles.head}>
        <div className={`wrap ${styles.headInner}`}>
          <span className="cap">Curadoria de conteúdo</span>
          <h1>Fila de revisão das perguntas</h1>
          <p className="slab">
            As perguntas de &ldquo;confere rápido&rdquo; são geradas a partir do artigo da Central
            de Ajuda. Confira se cada uma faz sentido e registre a decisão — o time de conteúdo
            acompanha o progresso por aqui.
          </p>
        </div>
      </header>

      <div className={`wrap ${styles.stack}`}>
        <section className={styles.kpis} aria-label="Resumo da curadoria">
          <div className={styles.kpi}>
            <span className="cap">Aguardando revisão</span>
            <b>{summary.pending}</b>
            <span>aulas na fila</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Aprovadas</span>
            <b>{summary.approved}</b>
            <span>de {summary.total} aulas com perguntas geradas</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Precisam de ajuste</span>
            <b>{summary.needsAdjustment}</b>
            <span>pedem correção no texto</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Curadas à mão</span>
            <b>{summary.curated}</b>
            <span>aulas fora da fila</span>
          </div>
        </section>

        <section className={styles.panel} aria-labelledby="curation-title">
          <div className={styles.panelHead}>
            <div>
              <h2 id="curation-title">
                {items.length} {items.length === 1 ? 'aula' : 'aulas'}
              </h2>
              <span className="slab">
                {summary.questionCount} perguntas geradas no total · {summary.percent}% da fila
                aprovada
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
                ? 'Nenhuma aula aguardando revisão. A fila está em dia.'
                : 'Nenhuma aula nesse filtro.'}
            </p>
          ) : null}

          <ul className={styles.list}>
            {items.map((item) => {
              const decision = item.approval?.decision;
              const checks = generatedChecks.get(item.lesson.id) ?? [];

              return (
                <li key={item.lesson.id} className={styles.item}>
                  <span className={styles.itemIcon}>
                    <GroupIcon index={item.groupPosition} size={28} />
                  </span>

                  <div className={styles.itemBody}>
                    <Link to={`/aula/${item.lesson.id}`} className={styles.itemTitle}>
                      {item.lesson.titulo}
                    </Link>
                    <span className={styles.itemPath}>
                      {item.group.nome} › {item.module.nome} · {item.questionCount}{' '}
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
                        <Chip tone="info">{CHECKS_BADGE_LABEL.rascunho}</Chip>
                      )}
                    </span>

                    <div className={styles.questions}>
                      {checks.map((check) => (
                        <p key={check.id} className={styles.question}>
                          <b>{check.prompt}</b>
                          <span className={styles.answer}>
                            Resposta: {check.options[check.correctIndex]}
                          </span>
                        </p>
                      ))}
                    </div>
                  </div>

                  <div className={styles.itemActions}>
                    <Button
                      type="button"
                      variant="light"
                      onClick={() => reviewLesson(item.lesson.id, 'aprovado', by)}
                    >
                      Aprovar
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => reviewLesson(item.lesson.id, 'ajuste', by)}
                    >
                      Pedir ajuste
                    </Button>
                    {item.approval ? (
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={() => reopenLesson(item.lesson.id)}
                      >
                        Reabrir
                      </Button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
