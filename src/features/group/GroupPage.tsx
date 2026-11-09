import { Link, useParams } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import { GroupIcon } from '@/components/GroupIcon/GroupIcon';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { SealIcon } from '@/components/SealIcon/SealIcon';
import { catalogIndex } from '@/data/catalog';
import {
  approvedQuizCount,
  essentialDoneCount,
  groupEssentialDone,
  groupStatus,
  isQuizUnlocked,
  lessonComplete,
  RULES,
} from '@/domain/rules';
import { essentialsOf, quizModulesOfGroup, supportOf } from '@/domain/selectors';
import type { Group, Module, ProgressData } from '@/domain/types';
import { MissingEntity } from '@/features/placeholder/MissingEntity';
import { useProgressStore } from '@/stores/progress';
import styles from './GroupPage.module.css';

function resolveModule(
  group: Group,
  moduleId: string | undefined,
  progress: ProgressData,
): Module | null {
  if (moduleId) {
    return group.modulos.find((item) => item.id === moduleId) ?? null;
  }

  return (
    group.modulos.find((item) => {
      const essentials = essentialsOf(catalogIndex, item);
      const done = essentialDoneCount(catalogIndex, item, progress);
      const pendingQuiz = item.tem_quiz && progress.quiz[item.id]?.aprovado !== true;
      return done < essentials.length || pendingQuiz;
    }) ??
    group.modulos[0] ??
    null
  );
}

export function GroupPage() {
  const { groupId, moduleId } = useParams();
  const progress = useProgressStore();

  const group = groupId ? catalogIndex.groupById.get(groupId) : undefined;
  if (!group) {
    return (
      <MissingEntity
        title="Grupo não encontrado"
        description="O grupo não existe no catálogo atual. Ele pode ter sido renomeado na Central de Ajuda."
      />
    );
  }

  const module = resolveModule(group, moduleId, progress);
  if (!module) {
    return (
      <MissingEntity
        title="Módulo não encontrado"
        description="O módulo não existe neste grupo do catálogo."
      />
    );
  }

  const position = catalogIndex.positionOfGroup.get(group.id) ?? 0;
  const status = groupStatus(catalogIndex, group, progress);
  const essentials = essentialsOf(catalogIndex, module);
  const support = supportOf(catalogIndex, module);
  const done = essentialDoneCount(catalogIndex, module, progress);
  const groupDone = groupEssentialDone(catalogIndex, group, progress);
  const groupTotal = group.modulos.reduce(
    (sum, item) => sum + essentialsOf(catalogIndex, item).length,
    0,
  );
  const quizTotal = quizModulesOfGroup(catalogIndex, group).length;
  const quizDone = approvedQuizCount(catalogIndex, group, progress);
  const groupPercent = groupTotal > 0 ? (groupDone / groupTotal) * 100 : 0;
  const sealed = progress.selos[group.id] === true;

  const nextEssential = essentials.find((lesson) => !lessonComplete(progress, lesson.id));
  const quizResult = progress.quiz[module.id];
  const quizApproved = quizResult?.aprovado === true;
  const quizUnlocked = isQuizUnlocked(module, progress);
  const missingEssentials = essentials.length - done;
  const approval = Math.round(RULES.approvalRate * 100);

  const quizContent = module.tem_quiz ? (
    <>
      <span
        className={`${styles.check} ${quizApproved ? styles.checkDone : styles.checkQuiz}`}
        aria-hidden="true"
      >
        {quizApproved ? '✓' : '?'}
      </span>
      <span className={styles.quizBody}>
        <b>Quiz do módulo</b>
        <span className="slab">
          Aprovação a partir de {approval}%
          {quizApproved
            ? ` · melhor ${quizResult?.melhor}/${quizResult?.total}`
            : quizUnlocked
              ? ' · todas as essenciais concluídas'
              : ` · conclua ${missingEssentials} ${
                  missingEssentials === 1 ? 'aula essencial' : 'aulas essenciais'
                } para liberar`}
        </span>
      </span>
      {quizApproved ? (
        <Chip tone="done">Aprovado</Chip>
      ) : quizUnlocked ? (
        <span className={styles.quizCta}>Fazer o quiz</span>
      ) : (
        <Chip tone="todo">{missingEssentials} para liberar</Chip>
      )}
    </>
  ) : null;

  return (
    <div className={styles.page}>
      <section className={styles.groupHeader}>
        <div className={`wrap ${styles.groupHeaderInner}`}>
          <span className={styles.groupIcon}>
            <GroupIcon index={position} size={64} />
          </span>

          <div className={styles.groupIntro}>
            <span className={styles.crumbs}>
              <Link to="/">Onboarding</Link> › Grupo {position + 1}
            </span>
            <h1>{group.nome}</h1>
            <p className="slab">{group.descricao}</p>
          </div>

          <div className={styles.groupAside}>
            <div className={styles.groupNumbers}>
              <b>
                {groupDone} de {groupTotal} aulas essenciais
              </b>
              <span>
                {quizDone} de {quizTotal} quizzes
              </span>
            </div>
            <ProgressBar
              value={groupPercent}
              tone={status === 'done' ? 'green' : 'blue'}
              height={8}
              label={`Progresso em ${group.nome}`}
            />
            <span className={styles.sealLine}>
              <SealIcon
                size={20}
                color={sealed ? 'var(--green)' : 'var(--soft)'}
                checked={sealed}
              />
              {sealed
                ? 'Selo conquistado'
                : `Selo ${group.nome}: passe nos ${quizTotal} ${
                    quizTotal === 1 ? 'quiz' : 'quizzes'
                  } · +${RULES.sealXp} XP`}
            </span>
          </div>
        </div>
      </section>

      <div className={`wrap ${styles.layout}`}>
        <nav className={styles.modules} aria-label="Módulos">
          <span className="cap">Módulos · {group.modulos.length}</span>

          {group.modulos.map((item, index) => {
            const itemEssentials = essentialsOf(catalogIndex, item);
            const itemDone = essentialDoneCount(catalogIndex, item, progress);
            const itemPercent =
              itemEssentials.length > 0 ? (itemDone / itemEssentials.length) * 100 : 0;

            return (
              <Link
                key={item.id}
                to={`/grupo/${group.id}/${item.id}`}
                className={`${styles.moduleLink} ${
                  item.id === module.id ? styles.moduleLinkCurrent : ''
                }`}
                aria-current={item.id === module.id ? 'page' : undefined}
              >
                <span className={styles.moduleRow}>
                  <span className={styles.moduleNumber}>{index + 1}</span>
                  <b>{item.nome}</b>
                  <span className={styles.moduleCount}>
                    {itemEssentials.length > 0 ? `${itemDone}/${itemEssentials.length}` : 'apoio'}
                  </span>
                </span>
                {itemEssentials.length > 0 ? (
                  <span className={styles.moduleBar}>
                    <ProgressBar
                      value={itemPercent}
                      tone={progress.quiz[item.id]?.aprovado ? 'green' : 'blue'}
                      height={4}
                      label={`Progresso do módulo ${item.nome}`}
                    />
                  </span>
                ) : null}
              </Link>
            );
          })}

          <div className={styles.note}>
            <b>Essencial ou leitura de apoio?</b>
            <span className="slab">
              Essenciais contam para o quiz e o selo. Leituras de apoio ficam aqui para consulta
              quando um cliente perguntar.
            </span>
          </div>
        </nav>

        <div className={styles.moduleContent}>
          <header className={styles.moduleHead}>
            <span className="cap">Módulo {module.ordem}</span>
            <h2>{module.nome}</h2>
          </header>

          {module.observacao ? (
            <p className={`slab ${styles.observation}`}>{module.observacao}</p>
          ) : null}

          {essentials.length > 0 ? (
            <section className={styles.lessonList} aria-label="Aulas essenciais">
              <div className={styles.listHeader}>
                <span>
                  <b>
                    {done} de {essentials.length} essenciais
                  </b>
                </span>
                <span>+{RULES.lessonXp} XP por aula concluída</span>
              </div>

              {essentials.map((lesson, index) => {
                const isDone = lessonComplete(progress, lesson.id);
                const isNow = lesson.id === nextEssential?.id;

                return (
                  <Link
                    key={lesson.id}
                    to={`/aula/${lesson.id}`}
                    className={`${styles.row} ${isNow ? styles.rowNow : ''}`}
                  >
                    <span
                      className={`${styles.check} ${isDone ? styles.checkDone : ''} ${
                        isNow ? styles.checkNow : ''
                      }`}
                      aria-hidden="true"
                    >
                      {isDone ? '✓' : ''}
                    </span>
                    <span className={styles.rowNumber}>{index + 1}</span>
                    <span className={styles.rowTitle}>{lesson.titulo}</span>
                    {isDone ? (
                      <Chip tone="done">Concluída · +{RULES.lessonXp} XP</Chip>
                    ) : isNow ? (
                      <span className={styles.startChip}>Começar</span>
                    ) : (
                      <Chip tone="todo">Essencial</Chip>
                    )}
                  </Link>
                );
              })}

              {module.tem_quiz ? (
                quizUnlocked || quizApproved ? (
                  <Link
                    to={`/quiz/${module.id}`}
                    className={`${styles.quizRow} ${quizApproved ? styles.quizDone : ''}`}
                  >
                    {quizContent}
                  </Link>
                ) : (
                  <div className={`${styles.quizRow} ${styles.quizLocked}`}>{quizContent}</div>
                )
              ) : null}
            </section>
          ) : (
            <p className={`slab ${styles.emptyModule}`}>
              Módulo só de consulta, sem quiz. Abra quando o cliente precisar.
            </p>
          )}

          {support.length > 0 ? (
            <section className={styles.supportBlock} aria-labelledby="support-title">
              <h2 id="support-title">Leituras de apoio · {support.length}</h2>
              <div className={styles.pills}>
                {support.map((lesson) => (
                  <Link key={lesson.id} to={`/aula/${lesson.id}`} className={styles.pill}>
                    {lesson.titulo}
                  </Link>
                ))}
              </div>
            </section>
          ) : null}
        </div>
      </div>
    </div>
  );
}
