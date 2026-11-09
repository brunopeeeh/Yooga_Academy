import { Link } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import { ProgressBar } from '@/components/ProgressBar/ProgressBar';
import { SealIcon } from '@/components/SealIcon/SealIcon';
import { catalog, catalogIndex } from '@/data/catalog';
import { roleLabel } from '@/domain/auth';
import { approvedQuizCount, groupStatus, LEVELS, levelProgress, RULES } from '@/domain/rules';
import { quizModulesOfGroup } from '@/domain/selectors';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import styles from './AchievementsPage.module.css';

export function AchievementsPage() {
  const progress = useProgressStore();
  const user = useAuthStore((state) => state.user);
  const level = levelProgress(progress.xp);
  const seals = Object.keys(progress.selos).length;
  const history = progress.log.slice(0, 8);

  const quizResults = Object.entries(progress.quiz).filter(([id]) => id !== 'final');
  const quizCorrect = quizResults.reduce((total, [, result]) => total + result.melhor, 0);
  const quizTotal = quizResults.reduce((total, [, result]) => total + result.total, 0);
  const accuracy = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 100) : 0;
  const toNextLevel = Math.max(0, level.nextXp - progress.xp);

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        <section className={styles.profile} aria-labelledby="profile-title">
          <div className={styles.identity}>
            <span className={styles.avatar} aria-hidden="true">
              {user?.initials ?? 'AN'}
            </span>
            <div>
              <h1 id="profile-title">{user?.name ?? 'Ana Nascimento'}</h1>
              <span className={styles.role}>
                {user
                  ? `${roleLabel(user.role)} de suporte · sessão online`
                  : 'Analista de suporte · entrou em 3 nov'}
              </span>
            </div>
          </div>

          <div className={styles.levelBlock}>
            <div className={styles.levelLine}>
              <b>
                Nível {level.level + 1} · {level.name}
              </b>
              <span>
                <b>{progress.xp}</b> XP
                {level.isMax ? ' · nível máximo' : ` · ${toNextLevel} para o próximo`}
              </span>
            </div>
            <ProgressBar
              value={level.percent}
              label={`Progresso do nível ${level.level + 1}`}
              height={8}
            />
            <div className={styles.levels}>
              {LEVELS.map((name, index) => (
                <div
                  key={name}
                  className={`${styles.level} ${index === level.level ? styles.levelCurrent : ''}`}
                >
                  <b>
                    {index + 1} · {name}
                  </b>
                  {index * RULES.levelXp} XP
                </div>
              ))}
            </div>
          </div>

          <div className={styles.stats}>
            <div>
              <b className={styles.streak}>{progress.sequencia}</b>
              <span>dias seguidos</span>
            </div>
            <div>
              <b>{accuracy}%</b>
              <span>acerto nos quizzes</span>
            </div>
          </div>
        </section>

        <div className={styles.grid}>
          <section className={styles.sealsPanel} aria-labelledby="seals-title">
            <div className={styles.panelHead}>
              <h2 id="seals-title">
                Selos de grupo · {seals} de {catalog.grupos.length}
              </h2>
              <span className="slab">
                Passe em todos os quizzes de um grupo para ganhar o selo e +{RULES.sealXp} XP.
              </span>
            </div>

            <div className={styles.seals}>
              {catalog.grupos.map((group) => {
                const sealed = progress.selos[group.id] === true;
                const status = groupStatus(catalogIndex, group, progress);
                const quizTotal = quizModulesOfGroup(catalogIndex, group).length;
                const quizDone = approvedQuizCount(catalogIndex, group, progress);
                const inProgress = !sealed && status === 'doing';

                return (
                  <Link
                    key={group.id}
                    to={`/grupo/${group.id}`}
                    className={`${styles.seal} ${sealed ? styles.sealDone : ''} ${
                      inProgress ? styles.sealDoing : ''
                    }`}
                  >
                    <SealIcon
                      size={64}
                      color={sealed ? 'var(--green)' : inProgress ? 'var(--blue)' : '#b4c1d1'}
                      fill={sealed ? '#ddf2e8' : 'none'}
                      checked={sealed}
                    />
                    <b>{group.nome}</b>
                    {sealed ? (
                      <Chip tone="done">Conquistado</Chip>
                    ) : (
                      <span className={styles.sealMeta}>
                        {quizDone} de {quizTotal} {quizTotal === 1 ? 'quiz' : 'quizzes'}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </section>

          <section className={styles.history} aria-labelledby="history-title">
            <h2 id="history-title">Últimas conquistas</h2>

            {history.length > 0 ? (
              history.map((entry) => (
                <div key={entry.id} className={styles.activity}>
                  <span className={styles.dot} aria-hidden="true" />
                  <span className={styles.activityText}>
                    {entry.text}
                    <span className={styles.activityWhen}>{entry.when}</span>
                  </span>
                  <b className={styles.activityXp}>+{entry.xp} XP</b>
                </div>
              ))
            ) : (
              <p className={`slab ${styles.empty}`}>
                Nenhuma conquista ainda. Conclua uma aula ou um quiz para começar o histórico.
              </p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
