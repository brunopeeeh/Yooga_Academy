import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import { catalog, catalogIndex } from '@/data/catalog';
import {
  DEFAULT_COHORT_PLAN,
  loadCohortPlan,
  saveCohortPlan,
  type CohortPlan,
} from '@/domain/pacing';
import { approvedQuizCount, essentialDoneTotal } from '@/domain/rules';
import { useProgressStore } from '@/stores/progress';
import { toast } from '@/stores/toast';
import { useTeamOverview } from './useTeamOverview';
import styles from './CohortPacingPage.module.css';

interface TeamMember {
  readonly id: string;
  readonly initials: string;
  readonly name: string;
  readonly since: string;
  readonly seals: number;
  readonly current: number;
  readonly essentials: number;
  readonly last: string;
  readonly stalled?: boolean;
}

const EXAMPLE_TEAM: readonly TeamMember[] = [
  {
    id: 'exemplo-fabio',
    initials: 'FA',
    name: 'Fábio',
    since: 'desde 13 out',
    seals: 2,
    current: 2,
    essentials: 41,
    last: 'hoje',
  },
  {
    id: 'exemplo-carla',
    initials: 'CA',
    name: 'Carla',
    since: 'desde 27 out',
    seals: 1,
    current: 1,
    essentials: 22,
    last: 'ontem',
  },
  {
    id: 'exemplo-elis',
    initials: 'EL',
    name: 'Elis',
    since: 'desde 27 out',
    seals: 1,
    current: 1,
    essentials: 18,
    last: 'ontem',
  },
  {
    id: 'exemplo-bruno',
    initials: 'BR',
    name: 'Bruno',
    since: 'desde 5 nov',
    seals: 0,
    current: 0,
    essentials: 2,
    last: 'hoje',
  },
  {
    id: 'exemplo-diego',
    initials: 'DI',
    name: 'Diego',
    since: 'desde 20 out',
    seals: 1,
    current: 1,
    essentials: 6,
    last: 'há 4 dias úteis',
    stalled: true,
  },
];

export function CohortPacingPage() {
  const localProgress = useProgressStore();
  const { members: remoteMembers } = useTeamOverview();

  const [cohortPlan, setCohortPlan] = useState<CohortPlan>(() => loadCohortPlan());
  const [selectedWeek, setSelectedWeek] = useState<number>(() => cohortPlan.currentWeek);
  const [leaderMessageDraft, setLeaderMessageDraft] = useState<string>(() => cohortPlan.leaderMessage);

  // Time completo incluindo o analista local
  const team = useMemo<readonly TeamMember[]>(() => {
    if (remoteMembers) {
      return remoteMembers.map((m) => ({
        id: m.id,
        initials: m.initials,
        name: m.name,
        since: m.since,
        seals: m.seals,
        current: m.current,
        essentials: m.essentials,
        last: m.lastActivity,
        stalled: m.stalled,
      }));
    }

    const anaSeals = Object.keys(localProgress.selos).length;
    const anaEssentials = essentialDoneTotal(catalogIndex, localProgress);
    const anaQuizzesApproved = catalog.grupos.reduce(
      (sum, g) => sum + approvedQuizCount(catalogIndex, g, localProgress),
      0,
    );
    const anaFirstPending = catalog.grupos.findIndex((g) => localProgress.selos[g.id] !== true);

    const ana: TeamMember = {
      id: 'exemplo-ana',
      initials: 'AN',
      name: 'Ana',
      since: 'desde 20 out',
      seals: anaSeals,
      current: anaFirstPending,
      essentials: anaEssentials,
      last: anaQuizzesApproved > 0 || anaEssentials > 0 ? 'hoje' : 'ontem',
    };

    return [ana, ...EXAMPLE_TEAM];
  }, [remoteMembers, localProgress]);

  const activeWeekGoal = useMemo(() => {
    return (
      cohortPlan.weeks.find((w) => w.weekNumber === selectedWeek) ??
      cohortPlan.weeks[0] ??
      DEFAULT_COHORT_PLAN.weeks[0]!
    );
  }, [cohortPlan, selectedWeek]);

  const handleSavePlan = () => {
    const updated: CohortPlan = {
      ...cohortPlan,
      currentWeek: selectedWeek,
      leaderMessage: leaderMessageDraft.trim(),
    };
    saveCohortPlan(updated);
    setCohortPlan(updated);
    toast('Meta da semana e recado atualizados com sucesso!', 'success');
  };

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        <div>
          <Link to="/lider" className={styles.backLink}>
            ← Voltar para o Dashboard do Líder
          </Link>
        </div>

        <header className={styles.header}>
          <div className={styles.titleArea}>
            <h1>Gestão de Turmas & Pacing</h1>
            <span className={styles.subtitle}>
              Conduza o ritmo de aprendizado do time, defina marcos semanais e acompanhe quem está no prazo.
            </span>
          </div>

          <nav className={styles.navTabs} aria-label="Navegação da liderança">
            <Link to="/lider" className={styles.navTab}>
              Dashboard do Time
            </Link>
            <Link to="/lider/diagnostico" className={styles.navTab}>
              Diagnóstico de Gaps
            </Link>
            <Link to="/lider/metas" className={`${styles.navTab} ${styles.navTabActive}`}>
              Gestão de Turmas & Metas
            </Link>
          </nav>
        </header>

        {/* Card de Configuração da Turma */}
        <section className={styles.cohortCard} aria-labelledby="cohort-config-title">
          <div className={styles.cohortHeader}>
            <div className={styles.cohortTitle}>
              <h2 id="cohort-config-title">{cohortPlan.name}</h2>
              <Chip tone="next">Turma Ativa</Chip>
            </div>
            <span className={styles.cohortDates}>
              Início: <b>{cohortPlan.startDate}</b> · Alvo de Conclusão: <b>{cohortPlan.targetDate}</b>
            </span>
          </div>

          <div className={styles.weekSelectorSection}>
            <label id="week-selector-label">Selecione a Semana Vigente para a Turma</label>
            <div className={styles.weekButtons} role="radiogroup" aria-labelledby="week-selector-label">
              {cohortPlan.weeks.map((week) => {
                const isActive = week.weekNumber === selectedWeek;
                return (
                  <button
                    key={week.weekNumber}
                    type="button"
                    role="radio"
                    aria-checked={isActive}
                    className={`${styles.weekBtn} ${isActive ? styles.weekBtnActive : ''}`}
                    onClick={() => setSelectedWeek(week.weekNumber)}
                  >
                    <span className={styles.weekBtnNumber}>Semana {week.weekNumber}</span>
                    <span className={styles.weekBtnTitle}>{week.title}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className={styles.messageSection}>
            <label htmlFor="leader-message">Recado do Líder para esta Semana (Exibido na Home do Analista)</label>
            <textarea
              id="leader-message"
              className={styles.messageTextarea}
              rows={3}
              value={leaderMessageDraft}
              onChange={(e) => setLeaderMessageDraft(e.target.value)}
              placeholder="Ex: Pessoal, foco total nas aulas de contingência fiscal e configurações de impressora esta semana!"
            />
          </div>

          <div className={styles.cohortActions}>
            <button type="button" className={styles.saveBtn} onClick={handleSavePlan}>
              Publicar Meta & Recado para o Time
            </button>
          </div>
        </section>

        {/* Grade do Roadmap de 4 Semanas */}
        <section aria-labelledby="roadmap-title">
          <h2 id="roadmap-title" style={{ fontSize: '1.25rem', color: '#102a43', marginBottom: 12 }}>
            Roadmap Sugerido de Pacing (4 Semanas)
          </h2>
          <div className={styles.roadmapGrid}>
            {cohortPlan.weeks.map((week) => {
              const isCurrent = week.weekNumber === cohortPlan.currentWeek;
              return (
                <div
                  key={week.weekNumber}
                  className={`${styles.weekCard} ${isCurrent ? styles.weekCardActive : ''}`}
                >
                  <div className={styles.weekCardHeader}>
                    <span className={styles.weekNumber}>Semana {week.weekNumber}</span>
                    {isCurrent && <Chip tone="next">Semana Atual</Chip>}
                  </div>
                  <h3 className={styles.weekCardTitle}>{week.title}</h3>
                  <p className={styles.weekDescription}>{week.description}</p>
                  <div className={styles.weekGroups}>
                    {week.groupIds.map((gid) => {
                      const group = catalogIndex.groupById.get(gid);
                      return (
                        <span key={gid} className={styles.groupBadge}>
                          {group?.nome ?? gid}
                        </span>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Tabela de Acompanhamento dos Analistas */}
        <section className={styles.tableCard} aria-labelledby="tracking-title">
          <header className={styles.tableHeader}>
            <h3 id="tracking-title">Status da Turma na Semana {selectedWeek}: {activeWeekGoal.title}</h3>
            <p>
              Acompanhamento individual dos analistas em relação aos grupos definidos para esta semana.
            </p>
          </header>

          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Analista</th>
                  <th>Status na Semana</th>
                  <th>Selos Conquistados</th>
                  <th>Última Atividade</th>
                  <th>Ações</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => {
                  // Determina status na semana
                  let statusTone: 'done' | 'next' | 'todo' = 'next';
                  let statusLabel = 'No ritmo ⚡';

                  const weekGroupIndices = activeWeekGoal.groupIds.map((gid) =>
                    catalog.grupos.findIndex((g) => g.id === gid),
                  );
                  const minWeekGroupIndex = Math.min(...weekGroupIndices);
                  const maxWeekGroupIndex = Math.max(...weekGroupIndices);

                  if (member.stalled) {
                    statusTone = 'todo';
                    statusLabel = 'Travado ⚠️';
                  } else if (member.current > maxWeekGroupIndex || member.current === -1) {
                    statusTone = 'done';
                    statusLabel = 'Concluído ✅';
                  } else if (member.current < minWeekGroupIndex) {
                    statusTone = 'todo';
                    statusLabel = 'Atrasado 🔴';
                  }

                  return (
                    <tr key={member.id}>
                      <td>
                        <div className={styles.memberCell}>
                          <span className={styles.memberAvatar}>{member.initials}</span>
                          <Link to={`/lider/analista/${member.id}`} className={styles.memberName}>
                            {member.name}
                          </Link>
                        </div>
                      </td>
                      <td>
                        <Chip tone={statusTone}>{statusLabel}</Chip>
                      </td>
                      <td>
                        <b>{member.seals}</b> de {catalog.grupos.length} selos
                      </td>
                      <td>{member.last}</td>
                      <td>
                        <Link to={`/lider/analista/${member.id}`} className={styles.actionLink}>
                          Ver dossiê completo →
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

