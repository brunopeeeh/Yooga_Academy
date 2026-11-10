import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import { ChecksBadge } from '@/components/ChecksBadge/ChecksBadge';
import { ContentSteps } from '@/content/ContentSteps';
import { getLessonContent } from '@/content/lessons';
import { InlineContent } from '@/content/InlineContent';
import { catalogIndex } from '@/data/catalog';
import { checksBadge } from '@/domain/curation';
import { internalsEnabled, withInternals } from '@/domain/internals';
import { isQuizUnlocked, lessonComplete, levelProgress, RULES } from '@/domain/rules';
import { essentialsOf } from '@/domain/selectors';
import { MissingEntity } from '@/features/placeholder/MissingEntity';
import { useCurationStore } from '@/stores/curation';
import { useProgressStore } from '@/stores/progress';
import { toast } from '@/stores/toast';
import { FavoriteButton } from './FavoriteButton';
import { LessonNote } from './LessonNote';
import styles from './LessonPage.module.css';

function WarningIcon() {
  return (
    <svg
      aria-hidden="true"
      width={22}
      height={22}
      viewBox="0 0 24 24"
      fill="none"
      stroke="#c25e14"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ flex: 'none' }}
    >
      <path d="M12 3l10 18H2zM12 10v5M12 18h.01" />
    </svg>
  );
}

export function LessonPage() {
  const { lessonId } = useParams();
  const [searchParams] = useSearchParams();
  const progress = useProgressStore();
  const completeLesson = useProgressStore((state) => state.completeLesson);
  const answerCheck = useProgressStore((state) => state.answerCheck);
  const approval = useCurationStore((state) => (lessonId ? state.approvals[lessonId] : undefined));
  const navigate = useNavigate();

  const lesson = lessonId ? catalogIndex.lessonById.get(lessonId) : undefined;

  if (!lesson) {
    return (
      <MissingEntity
        title="Aula não encontrada"
        description="A aula não existe no catálogo atual. Abra um grupo da trilha para escolher outra."
      />
    );
  }

  const module = catalogIndex.moduleOfLesson.get(lesson.id);
  const group = module ? catalogIndex.groupOfModule.get(module.id) : undefined;

  if (!module || !group) {
    return (
      <MissingEntity
        title="Aula sem módulo"
        description="Não foi possível localizar o módulo e o grupo desta aula no catálogo."
      />
    );
  }

  const content = getLessonContent(lesson.id);
  const essentials = essentialsOf(catalogIndex, module);
  const position = essentials.findIndex((item) => item.id === lesson.id);
  const previous = position > 0 ? essentials[position - 1] : undefined;
  const nextLesson = position >= 0 ? essentials[position + 1] : undefined;
  const isEssential = lesson.tipo === 'essencial';
  const isDone = lessonComplete(progress, lesson.id);
  const quizUnlocked = isQuizUnlocked(module, progress);
  const answers = progress.checks[lesson.id] ?? {};
  const checks = content?.checks ?? [];
  const checksOk = checks.every((check) => answers[check.id] === check.correctIndex);
  const canComplete = !isEssential || checksOk;
  const badge = checksBadge(content?.checksOrigin, approval);
  /**
   * O estado de curadoria das perguntas é vocabulário do time de conteúdo:
   * o analista vê o selo só no modo interno (`?internals=1`).
   */
  const showInternals = internalsEnabled(searchParams.toString());
  const href = (path: string) => withInternals(path, showInternals);

  const nextHref = nextLesson
    ? `/aula/${nextLesson.id}`
    : quizUnlocked && module.tem_quiz
      ? `/quiz/${module.id}`
      : `/grupo/${group.id}/${module.id}`;
  const nextLabel = nextLesson
    ? 'Próxima aula'
    : quizUnlocked && module.tem_quiz
      ? 'Ir para o quiz'
      : 'Voltar ao módulo';

  const handleComplete = () => {
    const outcome = completeLesson({ id: lesson.id, titulo: lesson.titulo });

    if (outcome.xpGained > 0) {
      if (outcome.leveledUp) {
        const level = levelProgress(useProgressStore.getState().xp);
        toast(`Subiu para o nível ${level.level + 1} · ${level.name}`, 'success');
      } else {
        toast(`+${outcome.xpGained} XP · aula concluída`, 'success');
      }
    }

    if (nextLesson) {
      navigate(href(`/aula/${nextLesson.id}`));
      return;
    }

    navigate(href(`/grupo/${group.id}/${module.id}`));
  };

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.layout}`}>
        <nav className={styles.side} aria-label="Aulas do módulo">
          <Link to={href(`/grupo/${group.id}/${module.id}`)} className={styles.back}>
            ‹ {group.nome}
          </Link>
          <span className={`cap ${styles.sideTitle}`}>{module.nome}</span>

          <ol className={styles.sideList}>
            {essentials.map((item) => {
              const isCurrent = item.id === lesson.id;
              const itemDone = lessonComplete(progress, item.id);

              return (
                <li key={item.id}>
                  <Link
                    to={href(`/aula/${item.id}`)}
                    className={`${styles.sideLink} ${isCurrent ? styles.sideLinkCurrent : ''} ${
                      itemDone && !isCurrent ? styles.sideLinkDone : ''
                    }`}
                    aria-current={isCurrent ? 'page' : undefined}
                  >
                    <span
                      className={`${styles.sideCheck} ${itemDone ? styles.sideCheckDone : ''}`}
                      aria-hidden="true"
                    >
                      {itemDone ? '✓' : ''}
                    </span>
                    <span>{item.titulo}</span>
                  </Link>
                </li>
              );
            })}
          </ol>

          {module.tem_quiz ? (
            <Link
              to={href(quizUnlocked ? `/quiz/${module.id}` : `/grupo/${group.id}/${module.id}`)}
              className={styles.sideQuiz}
            >
              <span className={styles.sideQuizMark} aria-hidden="true">
                ?
              </span>
              Quiz do módulo
            </Link>
          ) : null}
        </nav>

        <article className={styles.article}>
          <header className={styles.head}>
            <div className={styles.headBody}>
              <span className="cap" style={{ color: isEssential ? 'var(--blue-ink)' : undefined }}>
                {isEssential ? 'Essencial' : 'Leitura de apoio'}
                {content ? ` · ${content.minutes} min` : ''}
                {isEssential && position >= 0
                  ? ` · aula ${position + 1} de ${essentials.length}`
                  : ''}
              </span>
              <h1>{lesson.titulo}</h1>
              {content ? <p className={`slab ${styles.intro}`}>{content.intro}</p> : null}
            </div>
            <div className={styles.headActions}>
              <FavoriteButton lessonId={lesson.id} lessonTitle={lesson.titulo} />
              <a
                href={lesson.url_central}
                target="_blank"
                rel="noreferrer"
                className={styles.centralLink}
              >
                Abrir na Central
              </a>
            </div>
          </header>

          {content ? (
            <>
              <div className={`${styles.steps} ${content.sourceUrl ? styles.stepsFlow : ''}`}>
                {content.blocks.map((block, blockIndex) => (
                  <section key={`${block.title}-${blockIndex}`} className={styles.block}>
                    {block.title ? <h2>{block.title}</h2> : null}
                    <ContentSteps steps={block.steps} />
                  </section>
                ))}
              </div>

              {content.sourceUrl ? (
                <p className={styles.source}>
                  Texto e imagens extraídos de{' '}
                  <a href={content.sourceUrl} target="_blank" rel="noreferrer">
                    {content.sourceTitle ?? 'Central de Ajuda'}
                  </a>
                  .
                </p>
              ) : null}

              {content.warning ? (
                <div className={styles.warning}>
                  <WarningIcon />
                  <p className="slab">
                    <b>Na hora do atendimento:</b> <InlineContent tokens={content.warning} />
                  </p>
                </div>
              ) : null}

              {isEssential && checks.length === 0 ? (
                <p className={styles.pending}>
                  As perguntas de conferência desta aula ainda não foram migradas — você já pode
                  concluir a aula normalmente.
                </p>
              ) : null}

              {isEssential && checks.length > 0 ? (
                <section className={styles.checksSection} aria-labelledby="checks-title">
                  <div className={styles.checksHead}>
                    <h2 id="checks-title">Confere rápido</h2>
                    <span>{checks.length} perguntas · não valem nota</span>
                    {badge && showInternals ? <ChecksBadge badge={badge} /> : null}
                  </div>

                  <div className={styles.checkGrid}>
                    {checks.map((check) => {
                      const answer = answers[check.id];
                      const correct = answer === check.correctIndex;

                      return (
                        <div key={check.id} className={styles.checkQuestion}>
                          <b id={`${lesson.id}-${check.id}`}>{check.prompt}</b>
                          <div
                            className={styles.options}
                            role="group"
                            aria-labelledby={`${lesson.id}-${check.id}`}
                          >
                            {check.options.map((option, index) => {
                              const selected = answer === index;
                              const isRight = index === check.correctIndex;
                              const wrong = selected && !isRight;
                              const reveal = answer !== undefined && !correct && isRight;

                              return (
                                <button
                                  key={option}
                                  type="button"
                                  className={`${styles.option} ${
                                    selected && isRight ? styles.optionOk : ''
                                  } ${reveal ? styles.optionOk : ''} ${wrong ? styles.optionBad : ''}`}
                                  aria-pressed={selected}
                                  disabled={correct}
                                  onClick={() => answerCheck(lesson.id, check.id, index)}
                                >
                                  {option}
                                  {wrong ? (
                                    <span className={styles.optionTag}>Sua resposta</span>
                                  ) : null}
                                  {reveal ? (
                                    <span className={styles.optionTag}>Correta</span>
                                  ) : null}
                                </button>
                              );
                            })}
                          </div>

                          {answer !== undefined ? (
                            <span
                              className={`slab ${styles.feedback} ${
                                correct ? styles.feedbackOk : styles.feedbackBad
                              }`}
                              aria-live="polite"
                            >
                              {correct
                                ? check.success
                                : 'Ainda não. Releia os passos acima e tente de novo.'}
                            </span>
                          ) : null}
                        </div>
                      );
                    })}
                  </div>
                </section>
              ) : null}
            </>
          ) : (
            <div className={styles.noContent}>
              <b>Conteúdo desta aula</b>
              <p className="slab">
                O texto desta aula ainda não foi extraído da Central de Ajuda. O artigo original
                continua disponível.
              </p>
              <a href={lesson.url_central} target="_blank" rel="noreferrer">
                Ler o artigo na Central de Ajuda
              </a>
            </div>
          )}

          <LessonNote lessonId={lesson.id} lessonTitle={lesson.titulo} />
        </article>
      </div>

      {isEssential ? (
        <div className={styles.footer}>
          <div className={`wrap ${styles.footerInner}`}>
            {previous ? (
              <Link to={href(`/aula/${previous.id}`)} className={styles.previous}>
                ‹ {previous.titulo}
              </Link>
            ) : (
              <span />
            )}

            <span className={styles.footerHint}>
              {isDone ? 'Aula concluída' : canComplete ? '' : 'Responda as perguntas para concluir'}
            </span>

            {isDone ? (
              <ButtonLink to={href(nextHref)}>{nextLabel}</ButtonLink>
            ) : (
              <Button type="button" onClick={handleComplete} disabled={!canComplete}>
                Concluir aula · +{RULES.lessonXp} XP
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
