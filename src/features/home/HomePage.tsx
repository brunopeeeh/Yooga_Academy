import { Link } from 'react-router-dom';
import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import { Chip } from '@/components/Chip/Chip';
import { GroupIcon } from '@/components/GroupIcon/GroupIcon';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { SealIcon } from '@/components/SealIcon/SealIcon';
import { StatusChip } from '@/components/StatusChip/StatusChip';
import { catalog, catalogIndex } from '@/data/catalog';
import {
  approvedQuizCount,
  essentialDoneCount,
  essentialDoneTotal,
  groupEssentialDone,
  groupStatus,
  levelProgress,
  resolveNextItem,
} from '@/domain/rules';
import { essentialsOf, quizModulesOfGroup } from '@/domain/selectors';
import { useAnnotationsStore } from '@/stores/annotations';
import { useProgressStore } from '@/stores/progress';
import { toast } from '@/stores/toast';
import styles from './HomePage.module.css';

function firstSentence(text: string): string {
  const [first] = text.split('. ');
  if (!first) return text;
  return first.endsWith('.') ? first : `${first}.`;
}

export function HomePage() {
  const progress = useProgressStore();
  const resetProgress = useProgressStore((state) => state.resetProgress);
  const resetAnnotations = useAnnotationsStore((state) => state.resetAnnotations);
  const level = levelProgress(progress.xp);

  const totals = catalogIndex.totals;
  const doneEssentials = essentialDoneTotal(catalogIndex, progress);
  const approvedQuizzes = catalog.grupos.reduce(
    (total, group) => total + approvedQuizCount(catalogIndex, group, progress),
    0,
  );
  const seals = Object.keys(progress.selos).length;
  const nextItem = resolveNextItem(catalogIndex, progress);
  const essentialsPercent = totals.essentials > 0 ? (doneEssentials / totals.essentials) * 100 : 0;
  const finalUnlocked = totals.groups > 0 && seals >= totals.groups;
  const finalDone = progress.quiz.final?.aprovado === true;

  const continueMeta = (() => {
    if (!nextItem) return null;

    const groupPosition = catalogIndex.positionOfGroup.get(nextItem.group.id) ?? 0;
    const moduleEssentials = essentialsOf(catalogIndex, nextItem.module);
    const moduleDone = essentialDoneCount(catalogIndex, nextItem.module, progress);
    const modulePercent =
      moduleEssentials.length > 0 ? (moduleDone / moduleEssentials.length) * 100 : 0;

    if (nextItem.kind === 'lesson') {
      const lessonPosition = moduleEssentials.findIndex(
        (lesson) => lesson.id === nextItem.lesson.id,
      );

      return {
        groupPosition,
        moduleDone,
        modulePercent,
        moduleTotal: moduleEssentials.length,
        title: nextItem.lesson.titulo,
        detail: `${nextItem.group.nome} › ${nextItem.module.nome} · aula ${
          lessonPosition + 1
        } de ${moduleEssentials.length}`,
        to: `/aula/${nextItem.lesson.id}`,
        cta: 'Continuar aula',
      };
    }

    return {
      groupPosition,
      moduleDone,
      modulePercent,
      moduleTotal: moduleEssentials.length,
      title: `Quiz · ${nextItem.module.nome}`,
      detail: `${nextItem.group.nome} › ${nextItem.module.nome}`,
      to: `/quiz/${nextItem.module.id}`,
      cta: 'Fazer o quiz',
    };
  })();

  const handleReset = () => {
    if (window.confirm('Zerar todo o progresso salvo neste navegador?')) {
      resetProgress();
      toast('Progresso local zerado.', 'success');
    }
  };

  const handleResetAnnotations = () => {
    if (window.confirm('Apagar todos os favoritos e anotações salvos neste navegador?')) {
      resetAnnotations();
      toast('Favoritos e anotações apagados.', 'success');
    }
  };

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        <div className={styles.hero}>
          {continueMeta ? (
            <section className={styles.continue} aria-labelledby="continue-title">
              <span className={styles.continueIcon}>
                <GroupIcon index={continueMeta.groupPosition} size={64} color="#7ccbf0" />
              </span>

              <div className={styles.continueBody}>
                <span className="cap" style={{ color: '#9fc9e6' }}>
                  Continue de onde parou
                </span>
                <h1 id="continue-title">{continueMeta.title}</h1>
                <span className={`slab ${styles.continueDetail}`}>{continueMeta.detail}</span>

                <div className={styles.continueProgress}>
                  <ProgressBar
                    value={continueMeta.modulePercent}
                    tone="sky"
                    trackTone="onDark"
                    label={`Progresso do módulo em ${continueMeta.title}`}
                  />
                  <span>
                    {continueMeta.moduleDone} de {continueMeta.moduleTotal}
                  </span>
                </div>
              </div>

              <ButtonLink to={continueMeta.to} variant="light" className={styles.continueCta}>
                {continueMeta.cta}
              </ButtonLink>
            </section>
          ) : (
            <section className={styles.continue} aria-labelledby="continue-title">
              <div className={styles.continueBody}>
                <span className="cap" style={{ color: '#9fc9e6' }}>
                  Tudo concluído
                </span>
                <h1 id="continue-title">Você fechou o onboarding.</h1>
              </div>
            </section>
          )}

          <section className={styles.summary} aria-labelledby="summary-title">
            <header className={styles.summaryHeader}>
              <h2 id="summary-title">Seu onboarding</h2>
              <span className={`slab ${styles.level}`}>
                Nível {level.level + 1} · {level.name} · {progress.xp} XP
              </span>
            </header>

            <dl className={styles.stats}>
              <div>
                <dt>aulas essenciais</dt>
                <dd>
                  <b>
                    {doneEssentials}
                    <small> / {totals.essentials}</small>
                  </b>
                </dd>
              </div>
              <div>
                <dt>quizzes</dt>
                <dd>
                  <b>
                    {approvedQuizzes}
                    <small> / {totals.quizModules}</small>
                  </b>
                </dd>
              </div>
              <div>
                <dt>selos</dt>
                <dd>
                  <b>
                    {seals}
                    <small> / {totals.groups}</small>
                  </b>
                </dd>
              </div>
            </dl>

            <ProgressBar
              value={essentialsPercent}
              tone="green"
              height={8}
              label="Progresso das aulas essenciais"
            />

            <p className={`slab ${styles.summaryNote}`}>
              Leituras de apoio não contam no progresso. Ficam na Biblioteca.
            </p>

            <button type="button" className={styles.reset} onClick={handleReset}>
              Zerar progresso local
            </button>
            <button type="button" className={styles.reset} onClick={handleResetAnnotations}>
              Apagar favoritos e anotações
            </button>
          </section>
        </div>

        <section aria-labelledby="groups-title">
          <header className={styles.sectionHeader}>
            <h2 id="groups-title">Grupos do onboarding</h2>
            <span className="slab">Na ordem sugerida. Você pode abrir qualquer um.</span>
          </header>

          <div className={styles.groups}>
            {catalog.grupos.map((group, position) => {
              const status = groupStatus(catalogIndex, group, progress);
              const done = groupEssentialDone(catalogIndex, group, progress);
              const total = group.modulos.reduce(
                (sum, module) => sum + essentialsOf(catalogIndex, module).length,
                0,
              );
              const quizTotal = quizModulesOfGroup(catalogIndex, group).length;
              const quizDone = approvedQuizCount(catalogIndex, group, progress);
              const percent = total > 0 ? (done / total) * 100 : 0;

              return (
                <Link
                  key={group.id}
                  to={`/grupo/${group.id}`}
                  className={`${styles.groupCard} ${status === 'doing' ? styles.groupCardDoing : ''}`}
                >
                  <StatusChip status={status} className={styles.groupChip} />

                  <span
                    className={`${styles.groupIcon} ${
                      status === 'done' ? styles.groupIconDone : ''
                    }`}
                  >
                    <GroupIcon index={position} size={52} />
                  </span>

                  <div className={styles.groupTitle}>
                    <span className="cap">
                      Grupo {position + 1}
                      {status === 'done' ? ' · selo conquistado' : ''}
                    </span>
                    <h3>{group.nome}</h3>
                  </div>

                  <p className={`slab ${styles.groupDescription}`}>
                    {firstSentence(group.descricao)}
                  </p>

                  <ProgressBar
                    value={percent}
                    tone={status === 'done' ? 'green' : 'blue'}
                    label={`Progresso em ${group.nome}`}
                  />

                  <span className={styles.groupMeta}>
                    {done} de {total} aulas essenciais · {group.modulos.length}{' '}
                    {group.modulos.length > 1 ? 'módulos' : 'módulo'}
                    {quizTotal > 0 ? ` · ${quizDone}/${quizTotal} quizzes` : ''}
                  </span>
                </Link>
              );
            })}
          </div>

          <section className={styles.final} aria-labelledby="final-title">
            <SealIcon
              size={34}
              color={finalDone ? '#12805c' : finalUnlocked ? '#1d9bd7' : '#8796ab'}
              checked={finalDone || finalUnlocked}
            />
            <span className={styles.finalBody}>
              <b id="final-title">Quiz final de revisão</b>
              <span className="slab">
                {finalDone
                  ? ' · concluído. Você fechou o onboarding.'
                  : ` · libera quando você concluir os ${totals.groups} grupos e fecha o onboarding`}
              </span>
            </span>
            <Chip tone={finalDone ? 'done' : finalUnlocked ? 'next' : 'todo'}>
              {finalDone ? 'Concluído' : finalUnlocked ? 'Liberado' : 'Bloqueado'}
            </Chip>
            {finalUnlocked ? (
              <ButtonLink to="/quiz/final" variant="ghost">
                {finalDone ? 'Refazer o quiz final' : 'Fazer o quiz final'}
              </ButtonLink>
            ) : null}
          </section>
        </section>
      </div>
    </div>
  );
}
