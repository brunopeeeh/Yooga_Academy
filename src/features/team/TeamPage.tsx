import { Chip } from '@/components/Chip/Chip';
import { catalog, catalogIndex } from '@/data/catalog';
import { approvedQuizCount, essentialDoneTotal, RULES } from '@/domain/rules';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { useTeamOverview } from './useTeamOverview';
import styles from './TeamPage.module.css';

interface TeamMember {
  /** Identificador estável: vira a chave da linha na tabela. */
  readonly id: string;
  readonly initials: string;
  readonly name: string;
  readonly since: string;
  readonly seals: number;
  /** Índice do grupo atual; -1 representa onboarding concluído. */
  readonly current: number;
  readonly essentials: number;
  readonly quizzes: string;
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
    quizzes: '9 aprovados',
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
    quizzes: '3 aprovados',
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
    quizzes: '2 aprovados',
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
    quizzes: '0 aprovados',
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
    quizzes: '1 aprovado',
    last: 'há 4 dias úteis',
    stalled: true,
  },
];

export function TeamPage() {
  const progress = useProgressStore();
  const authUser = useAuthStore((state) => state.user);
  const overview = useTeamOverview();
  const totalEssentials = catalogIndex.totals.essentials;
  const mySeals = Object.keys(progress.selos).length;
  const myApprovedQuizzes = catalog.grupos.reduce(
    (total, group) => total + approvedQuizCount(catalogIndex, group, progress),
    0,
  );
  const myCurrent = catalog.grupos.findIndex((group) => progress.selos[group.id] !== true);

  const ana: TeamMember = {
    id: authUser?.id ?? 'usuario-atual',
    initials: authUser?.initials ?? 'AN',
    name: authUser?.name.split(' ')[0] ?? 'Ana',
    since: 'desde 3 nov',
    seals: mySeals,
    current: myCurrent,
    essentials: essentialDoneTotal(catalogIndex, progress),
    quizzes: `${myApprovedQuizzes} ${myApprovedQuizzes === 1 ? 'aprovado' : 'aprovados'}`,
    last: 'agora',
  };

  const exampleTeam = EXAMPLE_TEAM.map((member) => (member.name === ana.name ? ana : member));

  const fallbackTeam = exampleTeam.some((member) => member.name === ana.name)
    ? exampleTeam
    : [EXAMPLE_TEAM[0] as TeamMember, ana, ...EXAMPLE_TEAM.slice(1)];

  const team: readonly TeamMember[] = overview.members
    ? overview.members.map((member) => ({
        id: member.id,
        initials: member.initials,
        name: member.name,
        since: member.since,
        seals: member.seals,
        current: member.current,
        essentials: member.essentials,
        quizzes: `${member.quizzesApproved} ${
          member.quizzesApproved === 1 ? 'aprovado' : 'aprovados'
        }`,
        last: member.lastActivity,
        stalled: member.stalled,
      }))
    : fallbackTeam;

  const stalled = team.filter((member) => member.stalled);
  const essentialsDone = team.reduce((total, member) => total + member.essentials, 0);
  const where = team.reduce<Record<string, number>>((counts, member) => {
    const key = String(member.current);
    counts[key] = (counts[key] ?? 0) + 1;
    return counts;
  }, {});

  const groupName = (index: number) =>
    index >= 0 && index < catalog.grupos.length
      ? (catalog.grupos[index]?.nome ?? 'Concluído')
      : 'Concluído';

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        <header className={styles.head}>
          <div>
            <span className="cap">Líder · semana de 2 a 8 nov</span>
            <h1>Onboarding do time</h1>
          </div>
          <Chip tone={overview.source === 'api' ? 'done' : 'next'}>
            {overview.source === 'api'
              ? 'Dados da API · visão de time em tempo real'
              : 'Dados de exemplo · a linha da Ana reflete o que você fizer no app'}
          </Chip>
        </header>

        <div className={styles.kpis}>
          <div className={styles.kpi}>
            <span className="cap">Em onboarding</span>
            <b>{team.length}</b>
            <span>2 entraram esta semana</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Aulas essenciais concluídas</span>
            <b>{essentialsDone}</b>
            <span>soma do time</span>
          </div>
          <div className={styles.kpi}>
            <span className="cap">Aprovação no 1º quiz</span>
            <b>78%</b>
            <span>mínimo para passar: {Math.round(RULES.approvalRate * 100)}%</span>
          </div>
          <div className={`${styles.kpi} ${styles.kpiAlert}`}>
            <span className="cap">Sem atividade há 3+ dias úteis</span>
            <b>{stalled.length}</b>
            <span>{stalled.map((member) => member.name).join(', ') || 'Ninguém'}</span>
          </div>
        </div>

        <div className={styles.layout}>
          <section className={styles.tableCard} aria-labelledby="team-title">
            <div className={styles.tableHead}>
              <h2 id="team-title">Analistas</h2>
              <span className={styles.legend} aria-label="Legenda do grid de grupos">
                <span>
                  <i className={styles.legendSeal} aria-hidden="true" />
                  Selo
                </span>
                <span>
                  <i className={styles.legendCurrent} aria-hidden="true" />
                  Grupo atual
                </span>
                <span>
                  <i className={styles.legendEmpty} aria-hidden="true" />
                  Não iniciado
                </span>
              </span>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Analista</th>
                    <th scope="col">{catalog.grupos.length} grupos</th>
                    <th scope="col">Grupo atual</th>
                    <th scope="col">Essenciais</th>
                    <th scope="col">Quizzes</th>
                    <th scope="col">Última atividade</th>
                  </tr>
                </thead>
                <tbody>
                  {team.map((member) => (
                    <tr key={member.id} className={member.stalled ? styles.rowStalled : undefined}>
                      <td>
                        <div className={styles.member}>
                          <span className={styles.avatar} aria-hidden="true">
                            {member.initials}
                          </span>
                          <div>
                            <b>{member.name}</b>
                            <span>{member.since}</span>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div
                          className={styles.groupGrid}
                          role="img"
                          aria-label={`${member.name}: ${member.seals} selos`}
                        >
                          {catalog.grupos.map((group, index) => (
                            <i
                              key={group.id}
                              className={
                                index < member.seals
                                  ? styles.cellSeal
                                  : index === member.current
                                    ? styles.cellCurrent
                                    : ''
                              }
                            />
                          ))}
                        </div>
                      </td>
                      <td>{groupName(member.current)}</td>
                      <td>
                        <b>{member.essentials}</b>
                        <span className={styles.soft}> / {totalEssentials}</span>
                      </td>
                      <td>{member.quizzes}</td>
                      <td>
                        {member.stalled ? (
                          <span className={styles.stalled}>{member.last}</span>
                        ) : (
                          <span className={styles.muted}>{member.last}</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <aside className={styles.aside}>
            <section className={styles.mistakes} aria-labelledby="mistakes-title">
              <h2 id="mistakes-title">Perguntas com mais erro</h2>

              <div className={styles.mistake}>
                <div>
                  <b>Copiar complementos substitui os existentes</b>
                  <span>4 de 6</span>
                </div>
                <span className={styles.mistakePath}>PDV › Cardápio</span>
              </div>

              <div className={styles.mistake}>
                <div>
                  <b>Quem pode criar produtos</b>
                  <span>3 de 6</span>
                </div>
                <span className={styles.mistakePath}>PDV › Cardápio</span>
              </div>

              <p className="slab">Pode ser a aula pedindo reforço ou a pergunta confusa.</p>
            </section>

            <section className={styles.where} aria-labelledby="where-title">
              <h2 id="where-title">Onde o time está</h2>

              {Object.keys(where)
                .map(Number)
                .sort((a, b) => a - b)
                .map((index) => (
                  <div key={index} className={styles.whereRow}>
                    <span>{groupName(index)}</span>
                    <span>{where[String(index)]}</span>
                  </div>
                ))}

              <p>O analista vê no próprio perfil o mesmo que o líder vê sobre ele.</p>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
