import { useEffect, useRef } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { ButtonLink } from '@/components/ButtonLink/ButtonLink';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { SealIcon } from '@/components/SealIcon/SealIcon';
import { FINAL_QUIZ_ID, getQuiz } from '@/content/quizzes';
import { catalogIndex } from '@/data/catalog';
import { approvedQuizCount, levelProgress, RULES } from '@/domain/rules';
import { essentialsOf, quizModulesOfGroup, supportOf } from '@/domain/selectors';
import { MissingEntity } from '@/features/placeholder/MissingEntity';
import { useProgressStore } from '@/stores/progress';
import { useQuizResultStore } from '@/stores/quizResult';
import { toast } from '@/stores/toast';
import styles from './ResultPage.module.css';

export function ResultPage() {
  const { moduleId = '' } = useParams();
  const progress = useProgressStore();
  const result = useQuizResultStore((state) => state.result);
  const toasted = useRef<string | null>(null);

  const module = moduleId === FINAL_QUIZ_ID ? undefined : catalogIndex.moduleById.get(moduleId);
  const group = module ? catalogIndex.groupOfModule.get(module.id) : undefined;
  const isFinal = moduleId === FINAL_QUIZ_ID;

  useEffect(() => {
    if (!result || toasted.current === result.moduleId) return;
    toasted.current = result.moduleId;

    if (result.sealAwarded) toast(`Selo conquistado: ${group?.nome ?? 'grupo'}`, 'success');

    if (result.leveledUp) {
      const level = levelProgress(useProgressStore.getState().xp);
      toast(`Subiu para o nível ${level.level + 1} · ${level.name}`, 'success');
    }
  }, [group?.nome, result]);

  if (!result || result.moduleId !== moduleId) {
    return <Navigate to={moduleId === FINAL_QUIZ_ID ? '/' : `/quiz/${moduleId}`} replace />;
  }

  if (!isFinal && !module) {
    return (
      <MissingEntity
        title="Resultado sem módulo"
        description="Não foi possível localizar o módulo deste resultado no catálogo."
      />
    );
  }

  const questions = getQuiz(moduleId)?.questions ?? [];
  const hasReview = questions.length > 0 && result.answers.length === questions.length;
  const percent = result.total > 0 ? Math.round((result.correct / result.total) * 100) : 0;
  const approval = Math.round(RULES.approvalRate * 100);
  const passScore = Math.ceil(result.total * RULES.approvalRate);
  const level = levelProgress(progress.xp);
  const title = isFinal ? 'Revisão final' : (module?.nome ?? '');
  const shortTitle = title.split('·').pop()?.trim() ?? title;
  const groupName = group?.nome ?? 'Revisão final';
  const groupQuizzes = group ? quizModulesOfGroup(catalogIndex, group) : [];
  const approvedQuizzes = group ? approvedQuizCount(catalogIndex, group, progress) : 0;
  const sealed = group ? progress.selos[group.id] === true : false;
  const modulePosition = group && module ? group.modulos.indexOf(module) : -1;
  const nextModule =
    group && modulePosition >= 0
      ? group.modulos
          .slice(modulePosition + 1)
          .find((item) => essentialsOf(catalogIndex, item).length > 0)
      : undefined;
  const supportCount = module ? supportOf(catalogIndex, module).length : 0;
  const previousXp = Math.min(result.previousBest, result.correct) * RULES.correctAnswerXp;
  const totalXp = result.answerXp + result.sealXp;

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        <nav className={styles.crumbs} aria-label="Trilha de navegação">
          <Link to="/">Onboarding</Link>
          <span aria-hidden="true"> › </span>
          {isFinal ? (
            <span aria-current="page">Quiz final</span>
          ) : (
            <>
              <Link to={`/grupo/${group?.id ?? ''}`}>{groupName}</Link>
              <span aria-hidden="true"> › </span>
              <Link to={`/grupo/${group?.id ?? ''}/${module?.id ?? ''}`}>{module?.nome}</Link>
              <span aria-hidden="true"> › </span>
              <span aria-current="page">Quiz</span>
            </>
          )}
        </nav>

        <div className={styles.layout}>
          <div className={styles.main}>
            <section className={styles.score} aria-labelledby="score-title">
              <div
                className={styles.ring}
                aria-hidden="true"
                style={{
                  background: `conic-gradient(${
                    result.approved ? '#7ccbf0' : '#fdba74'
                  } 0 ${percent}%, rgba(255, 255, 255, 0.15) 0)`,
                }}
              >
                <div className={styles.ringInner}>
                  <div>
                    <b>
                      {result.correct}/{result.total}
                    </b>
                    <span>acertos</span>
                  </div>
                </div>
              </div>
              <div className={styles.scoreBody}>
                <span
                  className={`${styles.badge} ${
                    result.approved ? styles.badgeOk : styles.badgeBad
                  }`}
                >
                  {result.approved ? 'Aprovado' : 'Ainda não'} · mínimo {approval}%
                </span>
                <h1 id="score-title">
                  {result.approved
                    ? isFinal
                      ? 'Revisão concluída.'
                      : `${shortTitle} dominado.`
                    : 'Faltou pouco.'}
                </h1>
                <p className="slab">
                  {result.approved
                    ? isFinal
                      ? 'Você fechou o onboarding e revisou os pontos principais.'
                      : 'Você já consegue guiar um cliente nesse assunto.'
                    : `Você precisa de ${passScore} acertos. Revise as aulas marcadas e tente de novo: vale a melhor tentativa.`}
                </p>
              </div>
            </section>

            {hasReview ? (
              <section className={styles.review} aria-labelledby="review-title">
                <h2 id="review-title">Revisão das respostas</h2>
                {questions.map((question, index) => {
                  const correct = result.answers[index] === question.correctIndex;

                  return (
                    <div key={question.id} className={styles.reviewRow}>
                      <span
                        className={`${styles.reviewCheck} ${
                          correct ? styles.reviewCheckOk : styles.reviewCheckBad
                        }`}
                        aria-label={correct ? 'Certa' : 'Errada'}
                      >
                        {correct ? '✓' : '✕'}
                      </span>
                      <div className={styles.reviewBody}>
                        <b>{question.review}</b>
                        {correct ? null : <span className="slab">{question.explanation}</span>}
                      </div>
                      {question.lessonId ? (
                        <Link to={`/aula/${question.lessonId}`} className={styles.reviewLesson}>
                          {question.lessonLabel}
                        </Link>
                      ) : (
                        <span className={styles.reviewLesson}>{question.lessonLabel}</span>
                      )}
                    </div>
                  );
                })}
              </section>
            ) : null}

            {isFinal ? null : (
              <p className={`slab ${styles.supportNote}`}>
                {supportCount > 0
                  ? `${supportCount} ${
                      supportCount === 1 ? 'leitura de apoio' : 'leituras de apoio'
                    } deste módulo continuam disponíveis para consulta.`
                  : 'Este módulo não tem leituras de apoio.'}
              </p>
            )}
          </div>

          <aside className={styles.aside}>
            <section className={styles.xpPanel} aria-labelledby="xp-title">
              <h2 id="xp-title" className="cap">
                XP desta tentativa
              </h2>

              <div className={styles.xpRow}>
                <span>
                  {result.correct} acertos · {RULES.correctAnswerXp} XP cada
                </span>
                <b>{result.correct * RULES.correctAnswerXp}</b>
              </div>

              {result.previousBest > 0 ? (
                <div className={styles.xpRow}>
                  <span>Já ganho na melhor tentativa anterior</span>
                  <b>−{previousXp}</b>
                </div>
              ) : null}

              {result.sealAwarded ? (
                <div className={styles.xpRow}>
                  <span>Selo {groupName}</span>
                  <b>+{RULES.sealXp}</b>
                </div>
              ) : null}

              <div className={`${styles.xpRow} ${styles.xpTotal}`}>
                <b>Total</b>
                <b>+{totalXp} XP</b>
              </div>

              <div className={styles.levelBlock}>
                <div className={styles.levelLine}>
                  <b>
                    Nível {level.level + 1} · {level.name}
                  </b>
                  <span>
                    {level.isMax ? `${progress.xp} XP` : `${progress.xp} / ${level.nextXp} XP`}
                  </span>
                </div>
                <ProgressBar
                  value={level.percent}
                  label={`Progresso do nível ${level.level + 1}`}
                  height={8}
                />
                <span className="slab">Refazer o quiz conta só a melhor tentativa.</span>
              </div>
            </section>

            {isFinal ? null : (
              <section className={styles.sealPanel} aria-labelledby="seal-title">
                <SealIcon
                  size={52}
                  color={sealed ? 'var(--green)' : 'var(--blue)'}
                  checked={sealed}
                />
                <div className={styles.sealBody}>
                  <h2 id="seal-title">
                    {sealed
                      ? `Selo conquistado: ${groupName}`
                      : `Selo ${groupName} · ${approvedQuizzes} de ${groupQuizzes.length} quizzes`}
                  </h2>
                  <ProgressBar
                    value={
                      groupQuizzes.length > 0 ? (approvedQuizzes / groupQuizzes.length) * 100 : 0
                    }
                    tone={sealed ? 'green' : 'blue'}
                    label={`Quizzes aprovados em ${groupName}`}
                  />
                </div>
              </section>
            )}

            <div className={styles.actions}>
              {isFinal ? (
                result.approved ? (
                  <>
                    <ButtonLink to="/">Voltar ao início</ButtonLink>
                    <ButtonLink to="/quiz/final" variant="ghost">
                      Refazer o quiz final
                    </ButtonLink>
                  </>
                ) : (
                  <>
                    <ButtonLink to="/quiz/final">Tentar de novo</ButtonLink>
                    <ButtonLink to="/" variant="ghost">
                      Voltar ao início
                    </ButtonLink>
                  </>
                )
              ) : (
                <>
                  {result.approved ? (
                    nextModule ? (
                      <ButtonLink to={`/grupo/${group?.id ?? ''}/${nextModule.id}`}>
                        Próximo módulo · {nextModule.nome}
                      </ButtonLink>
                    ) : (
                      <ButtonLink to="/">Voltar ao início</ButtonLink>
                    )
                  ) : (
                    <ButtonLink to={`/grupo/${group?.id ?? ''}/${module?.id ?? ''}`}>
                      Revisar as aulas
                    </ButtonLink>
                  )}
                  <ButtonLink to={`/quiz/${moduleId}`} variant="ghost">
                    Refazer o quiz
                  </ButtonLink>
                </>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}
