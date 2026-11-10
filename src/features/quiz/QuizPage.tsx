import { useEffect, useRef, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/Button/Button';
import { Chip } from '@/components/Chip/Chip';
import { FINAL_QUIZ_ID, getQuiz } from '@/content/quizzes';
import type { Quiz } from '@/content/types';
import { catalogIndex } from '@/data/catalog';
import { QUIZ_BADGE_LABEL } from '@/domain/curation';
import { isQuizUnlocked, passesQuiz, quizXpGain, RULES } from '@/domain/rules';
import { quizModulesOfGroup } from '@/domain/selectors';
import type { Group } from '@/domain/types';
import { MissingEntity } from '@/features/placeholder/MissingEntity';
import { useProgressStore } from '@/stores/progress';
import { useQuizResultStore } from '@/stores/quizResult';
import styles from './QuizPage.module.css';

interface FinishTarget {
  readonly moduleId: string;
  readonly moduleName: string;
  readonly group: Group | null;
  readonly groupName: string;
  readonly isFinal: boolean;
}

/**
 * Consolida a tentativa na store de progresso e guarda o resumo para a tela
 * de resultado. O selo é elegível apenas quando este quiz fecha o grupo.
 */
function useFinalizeAttempt(target: FinishTarget) {
  const recordQuizAttempt = useProgressStore((state) => state.recordQuizAttempt);
  const setResult = useQuizResultStore((state) => state.setResult);
  const navigate = useNavigate();

  return (correct: number, total: number, answers: readonly number[]) => {
    const progress = useProgressStore.getState();
    const previous = progress.quiz[target.moduleId];
    const previousBest = previous?.melhor ?? 0;
    const approved = passesQuiz(correct, total) || previous?.aprovado === true;
    const sealEligible =
      !target.isFinal &&
      target.group !== null &&
      quizModulesOfGroup(catalogIndex, target.group).every((item) =>
        item.id === target.moduleId ? approved : progress.quiz[item.id]?.aprovado === true,
      );

    const outcome = recordQuizAttempt({
      moduleId: target.moduleId,
      moduleName: target.moduleName,
      groupId: target.group?.id ?? FINAL_QUIZ_ID,
      groupName: target.groupName,
      correct,
      total,
      sealEligible,
    });

    setResult({
      moduleId: target.moduleId,
      correct,
      total,
      approved,
      answers,
      previousBest,
      answerXp: quizXpGain(correct, previousBest),
      sealXp: outcome.sealAwarded ? RULES.sealXp : 0,
      sealAwarded: outcome.sealAwarded,
      leveledUp: outcome.leveledUp,
    });

    navigate(`/resultado/${target.moduleId}`);
  };
}

interface QuizSessionProps {
  readonly quiz: Quiz;
  readonly target: FinishTarget;
  readonly title: string;
  readonly exitHref: string;
}

function QuizSession({ quiz, target, title, exitHref }: QuizSessionProps) {
  const questions = quiz.questions;
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [checked, setChecked] = useState(false);
  const [answers, setAnswers] = useState<readonly number[]>([]);
  const nextRef = useRef<HTMLButtonElement>(null);
  const finalize = useFinalizeAttempt(target);

  const question = questions[index];

  useEffect(() => {
    if (checked) nextRef.current?.focus();
  }, [checked]);

  if (!question) return null;

  const isCorrect = selected === question.correctIndex;
  const isLast = index + 1 === questions.length;

  const answer = () => {
    if (selected === null) return;
    setAnswers((previous) => [...previous, selected]);
    setChecked(true);
  };

  const advance = () => {
    if (!isLast) {
      setIndex((current) => current + 1);
      setSelected(null);
      setChecked(false);
      window.scrollTo(0, 0);
      return;
    }

    const correct = questions.reduce(
      (sum, item, position) => sum + (answers[position] === item.correctIndex ? 1 : 0),
      0,
    );
    finalize(correct, questions.length, answers);
  };

  return (
    <div className={styles.page}>
      <div className={styles.toolbar}>
        <div className={`wrap ${styles.toolbarInner}`}>
          <Link to={exitHref} className={styles.exit}>
            ✕ Sair do quiz
          </Link>
          <b className={styles.toolbarTitle}>{title}</b>
          {quiz.origin === 'ia' ? (
            <span className={styles.origin}>{QUIZ_BADGE_LABEL.ia}</span>
          ) : quiz.origin === 'rascunho' ? (
            <span className={styles.origin}>gerado a partir dos artigos</span>
          ) : null}
          <div
            className={styles.progress}
            aria-label={`Pergunta ${index + 1} de ${questions.length}`}
          >
            <span className={styles.dots} aria-hidden="true">
              {questions.map((item, position) => {
                const answered = answers[position];
                const tone =
                  answered !== undefined
                    ? answered === item.correctIndex
                      ? styles.dotOk
                      : styles.dotBad
                    : position === index
                      ? styles.dotCurrent
                      : '';
                return <i key={item.id} className={`${styles.dot} ${tone}`} />;
              })}
            </span>
            <span>
              {index + 1} de {questions.length}
            </span>
          </div>
        </div>
      </div>

      <div className={`wrap ${styles.body}`}>
        <div className={styles.quizWrap}>
          <section className={styles.scene} aria-label="Situação de atendimento">
            <span className={styles.avatar} aria-hidden="true">
              DL
            </span>
            <div className={styles.sceneBody}>
              <span className="cap">Situação de atendimento</span>
              <p className="slab">{question.scene}</p>
              <span className={styles.sceneBy}>Dona Lúcia, cliente fictícia</span>
            </div>
          </section>

          <h1 id="quiz-question" className={styles.question}>
            {question.prompt}
          </h1>

          <div className={styles.options} role="radiogroup" aria-labelledby="quiz-question">
            {question.options.map((option, position) => {
              const isPicked = selected === position;
              const showRight = checked && position === question.correctIndex;
              const showWrong = checked && isPicked && !isCorrect;
              const dim = checked && !showRight && !showWrong;

              return (
                <button
                  key={option}
                  type="button"
                  role="radio"
                  aria-checked={isPicked}
                  className={`${styles.option} ${showRight ? styles.optionOk : ''} ${
                    showWrong ? styles.optionBad : ''
                  } ${dim ? styles.optionDim : ''}`}
                  disabled={checked}
                  onClick={() => setSelected(position)}
                >
                  <span className={styles.letter} aria-hidden="true">
                    {String.fromCharCode(65 + position)}
                  </span>
                  <span className={styles.optionText}>{option}</span>
                  {showWrong ? (
                    <span className={`${styles.optionTag} ${styles.tagBad}`}>Sua resposta</span>
                  ) : null}
                  {showRight ? (
                    <span className={`${styles.optionTag} ${styles.tagOk}`}>Correta</span>
                  ) : null}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <section
        className={`${styles.feedback} ${
          checked ? (isCorrect ? styles.feedbackOk : styles.feedbackBad) : styles.feedbackIdle
        }`}
        role="status"
      >
        <div className={`wrap ${styles.feedbackInner}`}>
          {checked ? (
            <>
              <div className={styles.feedbackText}>
                <b>{isCorrect ? `Isso! +${RULES.correctAnswerXp} XP` : 'Quase.'}</b>
                <span>{question.explanation}</span>
              </div>
              <Button ref={nextRef} variant="dark" onClick={advance}>
                {isLast ? 'Ver resultado' : 'Próxima pergunta'}
              </Button>
            </>
          ) : (
            <>
              <span className={styles.feedbackHint}>Escolha uma alternativa.</span>
              <Button type="button" onClick={answer} disabled={selected === null}>
                Responder
              </Button>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

interface QuizFallbackProps {
  readonly target: FinishTarget;
  readonly title: string;
  readonly exitHref: string;
}

/**
 * Módulos cujo quiz ainda não foi migrado da Central de Ajuda.
 * Mantém a simulação do protótipo para exercitar XP, selo e nível.
 */
function QuizFallback({ target, title, exitHref }: QuizFallbackProps) {
  const finalize = useFinalizeAttempt(target);
  const total = 6;

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.fallbackWrap}`}>
        <Link to={exitHref} className={styles.exit}>
          ‹ Voltar ao módulo
        </Link>
        <Chip tone="next">Conteúdo em migração</Chip>
        <h1 className={styles.fallbackTitle}>{title}</h1>
        <p className={`slab ${styles.fallbackText}`}>
          As perguntas deste quiz ainda não foram migradas da Central de Ajuda. Enquanto isso, use a
          simulação abaixo para testar XP, selo e nível.
        </p>
        <div className={styles.simButtons}>
          <Button type="button" onClick={() => finalize(6, total, [])}>
            Simular 6/6
          </Button>
          <Button type="button" variant="ghost" onClick={() => finalize(5, total, [])}>
            Simular 5/6
          </Button>
          <Button type="button" variant="ghost" onClick={() => finalize(3, total, [])}>
            Simular 3/6 (reprova)
          </Button>
        </div>
      </div>
    </div>
  );
}

export function QuizPage() {
  const { moduleId = '' } = useParams();
  const progress = useProgressStore();

  if (moduleId === FINAL_QUIZ_ID) {
    const seals = Object.keys(progress.selos).length;
    if (seals < catalogIndex.totals.groups) return <Navigate to="/" replace />;

    const quiz = getQuiz(FINAL_QUIZ_ID);
    if (!quiz) {
      return (
        <MissingEntity
          title="Quiz final indisponível"
          description="As perguntas da revisão final ainda não foram migradas."
        />
      );
    }

    return (
      <QuizSession
        key={FINAL_QUIZ_ID}
        quiz={quiz}
        title="Quiz final de revisão"
        exitHref="/"
        target={{
          moduleId: FINAL_QUIZ_ID,
          moduleName: 'Revisão final',
          group: null,
          groupName: 'Revisão final',
          isFinal: true,
        }}
      />
    );
  }

  const module = catalogIndex.moduleById.get(moduleId);

  if (!module || !module.tem_quiz) {
    return (
      <MissingEntity
        title="Quiz não encontrado"
        description="O módulo deste quiz não existe no catálogo atual ou não tem quiz."
      />
    );
  }

  const group = catalogIndex.groupOfModule.get(module.id);
  if (!group) {
    return (
      <MissingEntity
        title="Quiz sem grupo"
        description="Não foi possível localizar o grupo deste módulo no catálogo."
      />
    );
  }

  if (!isQuizUnlocked(module, progress)) {
    return <Navigate to={`/grupo/${group.id}/${module.id}`} replace />;
  }

  const quiz = getQuiz(module.id);
  const title = `Quiz · ${module.nome}`;
  const exitHref = `/grupo/${group.id}/${module.id}`;
  const target: FinishTarget = {
    moduleId: module.id,
    moduleName: module.nome,
    group,
    groupName: group.nome,
    isFinal: false,
  };

  if (!quiz) {
    return <QuizFallback key={module.id} target={target} title={title} exitHref={exitHref} />;
  }

  return (
    <QuizSession key={module.id} quiz={quiz} target={target} title={title} exitHref={exitHref} />
  );
}
