import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import { catalog, catalogIndex } from '@/data/catalog';
import { approvedQuizCount, essentialDoneTotal, RULES } from '@/domain/rules';
import { normalizeText } from '@/domain/text';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { toast } from '@/stores/toast';
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
  readonly quizzesApprovedCount?: number;
  readonly last: string;
  readonly stalled?: boolean;
}

type FilterTab = 'todos' | 'travados' | 'andamento' | 'concluidos';
type SortColumn = 'name' | 'seals' | 'current' | 'essentials' | 'quizzes' | 'last';
type SortDirection = 'asc' | 'desc';

const LEADER_NOTES_KEY = 'yooga.academy.leader_notes';

function loadLeaderNotes(): Record<string, string> {
  try {
    const raw = localStorage.getItem(LEADER_NOTES_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function persistLeaderNote(memberId: string, note: string): Record<string, string> {
  try {
    const current = loadLeaderNotes();
    const trimmed = note.trim();
    if (!trimmed) {
      delete current[memberId];
    } else {
      current[memberId] = trimmed;
    }
    localStorage.setItem(LEADER_NOTES_KEY, JSON.stringify(current));
    return current;
  } catch {
    return {};
  }
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
    quizzesApprovedCount: 9,
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
    quizzesApprovedCount: 3,
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
    quizzesApprovedCount: 2,
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
    quizzesApprovedCount: 0,
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
    quizzesApprovedCount: 1,
    last: 'há 4 dias úteis',
    stalled: true,
  },
];

interface MemberDossierModalProps {
  readonly member: TeamMember;
  readonly initialNote: string;
  readonly totalEssentials: number;
  readonly onClose: () => void;
  readonly onSaveNote: (memberId: string, note: string) => void;
}

function MemberDossierModal({
  member,
  initialNote,
  totalEssentials,
  onClose,
  onSaveNote,
}: MemberDossierModalProps) {
  const [noteDraft, setNoteDraft] = useState(initialNote);
  const [hasSaved, setHasSaved] = useState(!!initialNote);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSave = () => {
    onSaveNote(member.id, noteDraft);
    setHasSaved(!!noteDraft.trim());
    toast('Anotação de 1:1 salva!', 'success');
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.modalDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-member-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.modalHeader}>
          <div className={styles.modalMemberInfo}>
            <span className={styles.modalAvatar} aria-hidden="true">
              {member.initials}
            </span>
            <div className={styles.modalTitleGroup}>
              <h3 id="modal-member-title">Dossiê: {member.name}</h3>
              <p>
                {member.since} ·{' '}
                {member.stalled ? (
                  <span className={styles.stalled}>Sem atividade há 3+ dias</span>
                ) : member.current === -1 || member.seals >= catalog.grupos.length ? (
                  <span>Onboarding Concluído</span>
                ) : (
                  <span>No ritmo previsto</span>
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            className={styles.modalCloseBtn}
            onClick={onClose}
            aria-label="Fechar modal de dossiê"
          >
            ✕
          </button>
        </div>

        <div className={styles.modalBody}>
          <div className={styles.modalStatsGrid}>
            <div className={styles.modalStatCard}>
              <span>Selos</span>
              <b>
                {member.seals} / {catalog.grupos.length}
              </b>
            </div>
            <div className={styles.modalStatCard}>
              <span>Aulas Essenciais</span>
              <b>
                {member.essentials} / {totalEssentials}
              </b>
            </div>
            <div className={styles.modalStatCard}>
              <span>Quizzes</span>
              <b>{member.quizzes}</b>
            </div>
          </div>

          <div>
            <h4 className={styles.modalSectionTitle}>Trilha de Conhecimento (8 Grupos)</h4>
            <div className={styles.modalTrackList}>
              {catalog.grupos.map((group, idx) => {
                const isDone = idx < member.seals;
                const isCurrent = idx === member.current;
                return (
                  <div key={group.id} className={styles.modalTrackItem}>
                    <div className={styles.modalTrackName}>
                      <span
                        className={
                          isDone
                            ? styles.trackIconDone
                            : isCurrent
                              ? styles.trackIconCurrent
                              : styles.trackIconTodo
                        }
                        aria-hidden="true"
                      >
                        {isDone ? '✓' : isCurrent ? '▶' : '○'}
                      </span>
                      <span>
                        {idx + 1}. {group.nome}
                      </span>
                    </div>
                    <Chip tone={isDone ? 'done' : isCurrent ? 'doing' : 'todo'}>
                      {isDone ? 'Selo Conquistado' : isCurrent ? 'Grupo Atual' : 'A Iniciar'}
                    </Chip>
                  </div>
                );
              })}
            </div>
          </div>

          <div className={styles.notesWrapper}>
            <h4 className={styles.modalSectionTitle}>Pauta de 1:1 e Observações do Líder</h4>
            <textarea
              className={styles.notesTextarea}
              placeholder="Escreva pontos de atenção, facilidades do analista e tópicos para alinhar no próximo 1:1..."
              value={noteDraft}
              onChange={(e) => setNoteDraft(e.target.value)}
              aria-label="Pauta de 1:1 e observações do líder"
            />
            <div className={styles.notesFooter}>
              <span className={styles.notesSavedHint}>
                {hasSaved ? '✓ Observação salva para este analista' : 'Nenhuma observação salva ainda'}
              </span>
              <button type="button" className={styles.saveNotesBtn} onClick={handleSave}>
                Salvar anotação
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '12px', borderTop: '1px solid var(--line2)' }}>
            <Link
              to={`/lider/analista/${member.id}`}
              className={styles.viewActionBtn}
              style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', padding: '6px 12px' }}
            >
              Abrir dossiê completo (histórico de quizzes e metas) →
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

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

  const [activeFilter, setActiveFilter] = useState<FilterTab>('todos');
  const [searchQuery, setSearchQuery] = useState('');
  const [sortColumn, setSortColumn] = useState<SortColumn>('name');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);
  const [leaderNotes, setLeaderNotes] = useState<Record<string, string>>(() => loadLeaderNotes());

  const ana: TeamMember = {
    id: authUser?.id ?? 'usuario-atual',
    initials: authUser?.initials ?? 'AN',
    name: authUser?.name.split(' ')[0] ?? 'Ana',
    since: 'desde 3 nov',
    seals: mySeals,
    current: myCurrent,
    essentials: essentialDoneTotal(catalogIndex, progress),
    quizzes: `${myApprovedQuizzes} ${myApprovedQuizzes === 1 ? 'aprovado' : 'aprovados'}`,
    quizzesApprovedCount: myApprovedQuizzes,
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
        quizzesApprovedCount: member.quizzesApproved,
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

  // Contagens para os filtros
  const filterCounts = useMemo(() => {
    return {
      todos: team.length,
      travados: stalled.length,
      andamento: team.filter((m) => m.current >= 0 && !m.stalled).length,
      concluidos: team.filter((m) => m.current === -1 || m.seals >= catalog.grupos.length).length,
    };
  }, [team, stalled.length]);

  // Lista filtrada e ordenada
  const filteredAndSortedTeam = useMemo(() => {
    let result = team.filter((member) => {
      if (activeFilter === 'travados') return !!member.stalled;
      if (activeFilter === 'andamento') return member.current >= 0 && !member.stalled;
      if (activeFilter === 'concluidos')
        return member.current === -1 || member.seals >= catalog.grupos.length;
      return true;
    });

    if (searchQuery.trim()) {
      const term = normalizeText(searchQuery.trim());
      result = result.filter(
        (m) => normalizeText(m.name).includes(term) || normalizeText(m.initials).includes(term),
      );
    }

    return [...result].sort((a, b) => {
      let comp = 0;
      switch (sortColumn) {
        case 'name':
          comp = a.name.localeCompare(b.name, 'pt-BR');
          break;
        case 'seals':
          comp = a.seals - b.seals;
          break;
        case 'current': {
          const aCur = a.current === -1 ? 999 : a.current;
          const bCur = b.current === -1 ? 999 : b.current;
          comp = aCur - bCur;
          break;
        }
        case 'essentials':
          comp = a.essentials - b.essentials;
          break;
        case 'quizzes': {
          const aQ = a.quizzesApprovedCount ?? parseInt(a.quizzes, 10) ?? 0;
          const bQ = b.quizzesApprovedCount ?? parseInt(b.quizzes, 10) ?? 0;
          comp = aQ - bQ;
          break;
        }
        case 'last':
          comp = (a.stalled ? 1 : 0) - (b.stalled ? 1 : 0);
          if (comp === 0) comp = a.last.localeCompare(b.last, 'pt-BR');
          break;
      }
      return sortDirection === 'asc' ? comp : -comp;
    });
  }, [team, activeFilter, searchQuery, sortColumn, sortDirection]);

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const handleExportCsv = () => {
    const headers = [
      'Nome',
      'Início',
      'Selos Conquistados',
      'Grupo Atual',
      'Aulas Essenciais',
      'Quizzes Aprovados',
      'Última Atividade',
      'Situação',
    ];

    const rows = filteredAndSortedTeam.map((m) => [
      `"${m.name.replace(/"/g, '""')}"`,
      `"${m.since.replace(/"/g, '""')}"`,
      m.seals,
      `"${groupName(m.current).replace(/"/g, '""')}"`,
      m.essentials,
      `"${m.quizzes.replace(/"/g, '""')}"`,
      `"${m.last.replace(/"/g, '""')}"`,
      m.stalled
        ? '"Sem atividade (3+ dias)"'
        : m.current === -1 || m.seals >= catalog.grupos.length
          ? '"Concluído"'
          : '"Em andamento"',
    ]);

    const csvContent =
      '\uFEFF' + [headers.join(';'), ...rows.map((r) => r.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `yooga-academy-time-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast('Relatório CSV exportado com sucesso', 'success');
  };

  const handleSaveNote = (memberId: string, note: string) => {
    const updated = persistLeaderNote(memberId, note);
    setLeaderNotes(updated);
  };

  const selectedMember = useMemo(
    () => (selectedMemberId ? team.find((m) => m.id === selectedMemberId) ?? null : null),
    [team, selectedMemberId],
  );

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        <header className={styles.head}>
          <div>
            <span className="cap">Líder · semana de 2 a 8 nov</span>
            <h1>Onboarding do time</h1>
          </div>
          <div className={styles.headActions}>
            <Link
              to="/lider/metas"
              className={styles.exportBtn}
              title="Abrir gestão de turmas, pacing e metas"
            >
              Turmas & Metas
            </Link>
            <Link
              to="/lider/diagnostico"
              className={styles.exportBtn}
              title="Abrir diagnóstico de gaps de conteúdo e quizzes"
            >
              Diagnóstico de Gaps
            </Link>
            <button
              type="button"
              className={styles.exportBtn}
              onClick={handleExportCsv}
              title="Baixar planilha com dados do time"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Exportar CSV
            </button>
            <Chip tone={overview.source === 'api' ? 'done' : 'next'}>
              {overview.source === 'api'
                ? 'Dados da API · visão de time em tempo real'
                : 'Dados de exemplo · a linha da Ana reflete o que você fizer no app'}
            </Chip>
          </div>
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
          <div
            className={`${styles.kpi} ${styles.kpiAlert} ${styles.kpiInteractive}`}
            onClick={() => setActiveFilter('travados')}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                setActiveFilter('travados');
              }
            }}
            title="Clique para filtrar analistas estagnados"
          >
            <span className="cap">Sem atividade há 3+ dias úteis</span>
            <b>{stalled.length}</b>
            <span>{stalled.map((member) => member.name).join(', ') || 'Ninguém'}</span>
          </div>
        </div>

        {stalled.length > 0 && (
          <div className={styles.priorityAlert} role="alert">
            <div className={styles.priorityText}>
              <b>Atenção Prioritária:</b>{' '}
              {stalled.length === 1
                ? '1 analista está com o onboarding travado por inatividade.'
                : `${stalled.length} analistas estão com o onboarding travado por inatividade.`}
            </div>
            <div className={styles.priorityActions}>
              {stalled.map((member) => (
                <button
                  key={member.id}
                  type="button"
                  className={styles.priorityBadge}
                  onClick={() => setSelectedMemberId(member.id)}
                >
                  Ver dossiê de {member.name} →
                </button>
              ))}
            </div>
          </div>
        )}

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

            {/* Barra de Ferramentas: Filtros rápidos e Busca */}
            <div className={styles.toolbar}>
              <div className={styles.filterChips} role="tablist" aria-label="Filtrar analistas">
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'todos'}
                  className={`${styles.filterBtn} ${
                    activeFilter === 'todos' ? styles.filterBtnActive : ''
                  }`}
                  onClick={() => setActiveFilter('todos')}
                >
                  Todos <span className={styles.filterCount}>{filterCounts.todos}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'travados'}
                  className={`${styles.filterBtn} ${
                    activeFilter === 'travados' ? styles.filterBtnActive : ''
                  }`}
                  onClick={() => setActiveFilter('travados')}
                >
                  Travados (+3 dias){' '}
                  <span className={styles.filterCount}>{filterCounts.travados}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'andamento'}
                  className={`${styles.filterBtn} ${
                    activeFilter === 'andamento' ? styles.filterBtnActive : ''
                  }`}
                  onClick={() => setActiveFilter('andamento')}
                >
                  Em andamento <span className={styles.filterCount}>{filterCounts.andamento}</span>
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeFilter === 'concluidos'}
                  className={`${styles.filterBtn} ${
                    activeFilter === 'concluidos' ? styles.filterBtnActive : ''
                  }`}
                  onClick={() => setActiveFilter('concluidos')}
                >
                  Concluídos <span className={styles.filterCount}>{filterCounts.concluidos}</span>
                </button>
              </div>

              <div className={styles.searchBox}>
                <input
                  type="search"
                  className={styles.searchInput}
                  placeholder="Buscar analista por nome..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label="Buscar analista"
                />
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th
                      scope="col"
                      aria-sort={
                        sortColumn === 'name'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.sortHeaderBtn}
                        onClick={() => handleSort('name')}
                      >
                        Analista
                        {sortColumn === 'name' && (
                          <span className={styles.sortIcon}>
                            {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortColumn === 'seals'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.sortHeaderBtn}
                        onClick={() => handleSort('seals')}
                      >
                        {catalog.grupos.length} grupos
                        {sortColumn === 'seals' && (
                          <span className={styles.sortIcon}>
                            {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortColumn === 'current'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.sortHeaderBtn}
                        onClick={() => handleSort('current')}
                      >
                        Grupo atual
                        {sortColumn === 'current' && (
                          <span className={styles.sortIcon}>
                            {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortColumn === 'essentials'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.sortHeaderBtn}
                        onClick={() => handleSort('essentials')}
                      >
                        Essenciais
                        {sortColumn === 'essentials' && (
                          <span className={styles.sortIcon}>
                            {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortColumn === 'quizzes'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.sortHeaderBtn}
                        onClick={() => handleSort('quizzes')}
                      >
                        Quizzes
                        {sortColumn === 'quizzes' && (
                          <span className={styles.sortIcon}>
                            {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th
                      scope="col"
                      aria-sort={
                        sortColumn === 'last'
                          ? sortDirection === 'asc'
                            ? 'ascending'
                            : 'descending'
                          : undefined
                      }
                    >
                      <button
                        type="button"
                        className={styles.sortHeaderBtn}
                        onClick={() => handleSort('last')}
                      >
                        Última atividade
                        {sortColumn === 'last' && (
                          <span className={styles.sortIcon}>
                            {sortDirection === 'asc' ? ' ▲' : ' ▼'}
                          </span>
                        )}
                      </button>
                    </th>
                    <th scope="col">
                      <span className="sr">Ações</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAndSortedTeam.length === 0 ? (
                    <tr>
                      <td colSpan={7} className={styles.emptyFilter}>
                        Nenhum analista encontrado para este filtro ou busca.
                      </td>
                    </tr>
                  ) : (
                    filteredAndSortedTeam.map((member) => (
                      <tr
                        key={member.id}
                        className={`${member.stalled ? styles.rowStalled : ''} ${
                          styles.rowClickable
                        }`}
                        onClick={() => setSelectedMemberId(member.id)}
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedMemberId(member.id);
                          }
                        }}
                      >
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
                        <td>
                          <button
                            type="button"
                            className={styles.viewActionBtn}
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedMemberId(member.id);
                            }}
                            title={`Ver dossiê de ${member.name}`}
                          >
                            Dossiê
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
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

      {/* Modal / Dossiê do Analista */}
      {selectedMember && (
        <MemberDossierModal
          key={selectedMember.id}
          member={selectedMember}
          initialNote={leaderNotes[selectedMember.id] ?? ''}
          totalEssentials={totalEssentials}
          onClose={() => setSelectedMemberId(null)}
          onSaveNote={handleSaveNote}
        />
      )}
    </div>
  );
}
