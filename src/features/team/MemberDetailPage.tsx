import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Chip } from '@/components/Chip/Chip';
import { catalog, catalogIndex } from '@/data/catalog';
import { approvedQuizCount, essentialDoneTotal } from '@/domain/rules';
import { useAuthStore } from '@/stores/auth';
import { useProgressStore } from '@/stores/progress';
import { toast } from '@/stores/toast';
import { useTeamOverview } from './useTeamOverview';
import styles from './MemberDetailPage.module.css';

interface TeamMember {
  readonly id: string;
  readonly initials: string;
  readonly name: string;
  readonly since: string;
  readonly seals: number;
  readonly current: number;
  readonly essentials: number;
  readonly quizzes: string;
  readonly quizzesApprovedCount?: number;
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

interface NoteRecord {
  readonly id: string;
  readonly category: 'alinhamento' | 'atencao' | 'elogio';
  readonly text: string;
  readonly date: string;
}

export function MemberDetailPage() {
  const { memberId } = useParams<{ memberId: string }>();
  const overview = useTeamOverview();
  const progress = useProgressStore();
  const authUser = useAuthStore((state) => state.user);
  const totalEssentials = catalogIndex.totals.essentials;

  const [activeTab, setActiveTab] = useState<'grupos' | 'quizzes' | 'pauta'>('grupos');

  // Recupera o analista
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

  const member = team.find((m) => m.id === memberId);

  // Notas e PDI do analista
  const notesStorageKey = member ? `yooga.academy.pdi_${member.id}` : '';
  const goalStorageKey = member ? `yooga.academy.goal_${member.id}` : '';

  const [notes, setNotes] = useState<NoteRecord[]>(() => {
    if (!notesStorageKey) return [];
    try {
      const raw = localStorage.getItem(notesStorageKey);
      return raw ? (JSON.parse(raw) as NoteRecord[]) : [];
    } catch {
      return [];
    }
  });

  const [currentGoal, setCurrentGoal] = useState<string>(() => {
    if (!goalStorageKey) return '';
    try {
      return localStorage.getItem(goalStorageKey) ?? '';
    } catch {
      return '';
    }
  });

  const [goalDraft, setGoalDraft] = useState<string>(() => {
    if (!goalStorageKey) return '';
    try {
      return localStorage.getItem(goalStorageKey) ?? '';
    } catch {
      return '';
    }
  });
  const [newNoteText, setNewNoteText] = useState('');
  const [newNoteCategory, setNewNoteCategory] = useState<'alinhamento' | 'atencao' | 'elogio'>(
    'alinhamento',
  );

  const handleAddNote = () => {
    if (!newNoteText.trim() || !notesStorageKey) return;
    const item: NoteRecord = {
      id: String(Date.now()),
      category: newNoteCategory,
      text: newNoteText.trim(),
      date: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }),
    };
    const updated = [item, ...notes];
    setNotes(updated);
    try {
      localStorage.setItem(notesStorageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
    setNewNoteText('');
    toast('Anotação adicionada à pauta de 1:1', 'success');
  };

  const handleDeleteNote = (id: string) => {
    if (!notesStorageKey) return;
    const updated = notes.filter((n) => n.id !== id);
    setNotes(updated);
    try {
      localStorage.setItem(notesStorageKey, JSON.stringify(updated));
    } catch {
      // ignore
    }
    toast('Anotação removida', 'default');
  };

  const handleSaveGoal = () => {
    if (!goalStorageKey) return;
    const trimmed = goalDraft.trim();
    setCurrentGoal(trimmed);
    try {
      if (trimmed) {
        localStorage.setItem(goalStorageKey, trimmed);
      } else {
        localStorage.removeItem(goalStorageKey);
      }
    } catch {
      // ignore
    }
    toast('Meta da semana atualizada!', 'success');
  };

  // Histórico de Quizzes do analista
  const quizHistory = useMemo(() => {
    if (!member) return [];
    const isCurrentStudent = member.name === ana.name;

    if (isCurrentStudent) {
      // Retorna quizzes reais do store do usuário atual
      return Object.entries(progress.quiz).map(([moduleId, data]) => {
        const mod = catalogIndex.moduleById.get(moduleId);
        const group = mod ? catalogIndex.groupOfModule.get(mod.id) : null;
        return {
          id: moduleId,
          moduleName: mod?.nome ?? moduleId,
          groupName: group?.nome ?? 'Geral',
          score: `${data.melhor} / ${data.total}`,
          percentage: Math.round((data.melhor / data.total) * 100),
          approved: data.aprovado,
          attempts: 1,
          date: 'recente',
        };
      });
    }

    // Mock realista para os outros analistas
    const list = [];
    const numApproved = member.quizzesApprovedCount ?? parseInt(member.quizzes, 10) ?? 0;
    let count = 0;

    for (const group of catalog.grupos) {
      for (const mod of group.modulos) {
        if (!mod.tem_quiz) continue;
        if (count < numApproved) {
          list.push({
            id: mod.id,
            moduleName: mod.nome,
            groupName: group.nome,
            score: '5 / 6',
            percentage: 83,
            approved: true,
            attempts: count === 1 ? 2 : 1,
            date: 'recentemente',
          });
          count++;
        } else if (count === numApproved && member.stalled) {
          list.push({
            id: mod.id,
            moduleName: mod.nome,
            groupName: group.nome,
            score: '3 / 6',
            percentage: 50,
            approved: false,
            attempts: 2,
            date: 'há 4 dias',
          });
          break;
        }
      }
      if (count > numApproved) break;
    }

    return list;
  }, [member, ana.name, progress.quiz]);

  if (!member) {
    return (
      <div className={styles.page}>
        <div className={`wrap ${styles.stack}`}>
          <nav className={styles.breadcrumb}>
            <Link to="/lider">← Voltar para Onboarding do time</Link>
          </nav>
          <div className={styles.profileCard}>
            <div className={styles.profileText}>
              <h1>Analista não encontrado</h1>
              <p>O analista solicitado não existe ou não está cadastrado nesta equipe.</p>
            </div>
            <Link to="/lider" className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}>
              Voltar para o Dashboard
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isCompleted = member.current === -1 || member.seals >= catalog.grupos.length;

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        {/* Breadcrumb de Navegação */}
        <nav className={styles.breadcrumb} aria-label="Navegação">
          <Link to="/lider">← Onboarding do time</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>Dossiê de {member.name}</span>
        </nav>

        {/* Header do Analista */}
        <header className={styles.profileCard}>
          <div className={styles.profileMain}>
            <span
              className={`${styles.avatar} ${member.stalled ? styles.avatarStalled : ''}`}
              aria-hidden="true"
            >
              {member.initials}
            </span>
            <div className={styles.profileText}>
              <h1>{member.name}</h1>
              <div className={styles.profileMeta}>
                <span>Analista de Suporte em Onboarding</span>
                <span>•</span>
                <span>{member.since}</span>
                <span>•</span>
                <Chip tone={member.stalled ? 'todo' : isCompleted ? 'done' : 'doing'}>
                  {member.stalled
                    ? 'Sem atividade (+3 dias)'
                    : isCompleted
                      ? 'Onboarding Concluído'
                      : 'No ritmo previsto'}
                </Chip>
              </div>
            </div>
          </div>

          <div className={styles.profileActions}>
            <Link
              to={`/certificado/${member.id}`}
              className={styles.actionBtn}
              title="Visualizar ou emitir certificado digital de onboarding deste analista"
            >
              🎓 Certificado
            </Link>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={() => setActiveTab('pauta')}
            >
              Pauta de 1:1
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
              onClick={() => {
                setActiveTab('pauta');
                toast('Seção de metas ativada abaixo', 'default');
              }}
            >
              Definir Meta
            </button>
          </div>
        </header>

        {/* Grade de 4 KPIs do Analista */}
        <div className={styles.kpisGrid}>
          <div className={styles.kpiCard}>
            <span>Selos Conquistados</span>
            <b>
              {member.seals} <small style={{ fontSize: '16px', fontWeight: 500, color: 'var(--muted)' }}>/ {catalog.grupos.length}</small>
            </b>
            <span>{Math.round((member.seals / catalog.grupos.length) * 100)}% da trilha total</span>
          </div>

          <div className={styles.kpiCard}>
            <span>Aulas Essenciais</span>
            <b>
              {member.essentials} <small style={{ fontSize: '16px', fontWeight: 500, color: 'var(--muted)' }}>/ {totalEssentials}</small>
            </b>
            <span>conteúdo obrigatório</span>
          </div>

          <div className={styles.kpiCard}>
            <span>Quizzes Aprovados</span>
            <b>{member.quizzesApprovedCount ?? member.quizzes.split(' ')[0]}</b>
            <span>{member.quizzes}</span>
          </div>

          <div className={`${styles.kpiCard} ${member.stalled ? styles.kpiAlert : ''}`}>
            <span>Última Atividade</span>
            <b>{member.last}</b>
            <span>{member.stalled ? 'Requer intervenção' : 'Atividade recente'}</span>
          </div>
        </div>

        {/* Abas de Navegação do Dossiê */}
        <nav className={styles.tabsNav} role="tablist" aria-label="Seções do Dossiê">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'grupos'}
            className={`${styles.tabBtn} ${activeTab === 'grupos' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('grupos')}
          >
            Trilha e Competências (8 Grupos)
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'quizzes'}
            className={`${styles.tabBtn} ${activeTab === 'quizzes' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('quizzes')}
          >
            Histórico de Quizzes ({quizHistory.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pauta'}
            className={`${styles.tabBtn} ${activeTab === 'pauta' ? styles.tabBtnActive : ''}`}
            onClick={() => setActiveTab('pauta')}
          >
            Pauta de 1:1 e Metas ({notes.length})
          </button>
        </nav>

        {/* Conteúdo da Aba 1: Grupos e Competências */}
        {activeTab === 'grupos' && (
          <div className={styles.tabContent} role="tabpanel">
            <div className={styles.groupsGrid}>
              {catalog.grupos.map((group, idx) => {
                const isDone = idx < member.seals;
                const isCurrent = idx === member.current;
                const groupEssentials = catalogIndex.essentialsOf.get(group.id)?.length ?? 0;
                const progressPercent = isDone ? 100 : isCurrent ? 50 : 0;

                return (
                  <div key={group.id} className={styles.groupCard}>
                    <div className={styles.groupCardHeader}>
                      <div className={styles.groupCardTitle}>
                        <span
                          className={`${styles.groupIndex} ${
                            isDone
                              ? styles.groupIndexDone
                              : isCurrent
                                ? styles.groupIndexCurrent
                                : ''
                          }`}
                        >
                          {isDone ? '✓' : idx + 1}
                        </span>
                        <h3>{group.nome}</h3>
                      </div>
                      <Chip tone={isDone ? 'done' : isCurrent ? 'doing' : 'todo'}>
                        {isDone ? 'Selo Conquistado' : isCurrent ? 'Em Andamento' : 'A Iniciar'}
                      </Chip>
                    </div>

                    <div className={styles.groupProgressStats}>
                      <span>{groupEssentials} aulas essenciais</span>
                      <span>{progressPercent}%</span>
                    </div>

                    <div className={styles.groupProgressBar} aria-hidden="true">
                      <div
                        className={styles.groupProgressFill}
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>

                    <div className={styles.groupModulesList}>
                      {group.modulos.map((mod) => (
                        <div key={mod.id} className={styles.groupModuleItem}>
                          <span>{mod.nome}</span>
                          <b>{mod.tem_quiz ? 'Com quiz' : 'Aulas'}</b>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Conteúdo da Aba 2: Histórico de Quizzes */}
        {activeTab === 'quizzes' && (
          <div className={styles.tabContent} role="tabpanel">
            {member.stalled && (
              <div className={styles.errorCallout}>
                <h4>Pontos de Atenção Identificados</h4>
                <p style={{ margin: 0, fontSize: '13px', color: '#9a3412' }}>
                  O analista apresentou dificuldade e parou na tentativa de quiz do grupo atual:
                </p>
                <ul className={styles.errorList}>
                  <li>
                    <b>PDV · Cardápio:</b> Erro na pergunta <i>"Copiar complementos substitui os existentes"</i>
                  </li>
                  <li>
                    <b>Configurações de Impressão:</b> Dúvida sobre vias automáticas
                  </li>
                </ul>
              </div>
            )}

            <div className={styles.quizzesCard}>
              <div className={styles.tableWrap}>
                <table>
                  <thead>
                    <tr>
                      <th scope="col">Módulo</th>
                      <th scope="col">Grupo</th>
                      <th scope="col">Nota</th>
                      <th scope="col">Aproveitamento</th>
                      <th scope="col">Situação</th>
                      <th scope="col">Tentativas</th>
                      <th scope="col">Data</th>
                    </tr>
                  </thead>
                  <tbody>
                    {quizHistory.length === 0 ? (
                      <tr>
                        <td colSpan={7} style={{ textAlign: 'center', padding: '32px' }}>
                          Nenhum quiz realizado por este analista ainda.
                        </td>
                      </tr>
                    ) : (
                      quizHistory.map((q) => (
                        <tr key={q.id}>
                          <td>
                            <b>{q.moduleName}</b>
                          </td>
                          <td>{q.groupName}</td>
                          <td>{q.score}</td>
                          <td>{q.percentage}%</td>
                          <td>
                            <span
                              className={`${styles.scoreBadge} ${
                                q.approved ? styles.scorePass : styles.scoreFail
                              }`}
                            >
                              {q.approved ? 'Aprovado' : 'Reprovado'}
                            </span>
                          </td>
                          <td>{q.attempts}ª tentativa</td>
                          <td>{q.date}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Conteúdo da Aba 3: Pauta de 1:1 e Metas */}
        {activeTab === 'pauta' && (
          <div className={styles.tabContent} role="tabpanel">
            <div className={styles.oneOnOneLayout}>
              {/* Coluna Esquerda: Anotações da Pauta */}
              <div className={styles.notesCard}>
                <h3>Pauta para Reunião de 1:1 & Feedbacks</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Anotações privadas e tópicos de alinhamento com o analista.
                </p>

                <div className={styles.newNoteForm}>
                  <div style={{ display: 'flex', gap: '10px' }}>
                    <select
                      className={styles.categorySelect}
                      value={newNoteCategory}
                      onChange={(e) =>
                        setNewNoteCategory(
                          e.target.value as 'alinhamento' | 'atencao' | 'elogio',
                        )
                      }
                      aria-label="Categoria da anotação"
                    >
                      <option value="alinhamento">Alinhamento Geral</option>
                      <option value="atencao">Ponto de Atenção</option>
                      <option value="elogio">Elogio / Destaque</option>
                    </select>
                  </div>

                  <textarea
                    className={styles.noteTextarea}
                    placeholder="Escreva um tópico para discutir na próxima reunião de 1:1..."
                    value={newNoteText}
                    onChange={(e) => setNewNoteText(e.target.value)}
                    aria-label="Texto da anotação de 1:1"
                  />

                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    style={{ alignSelf: 'flex-start' }}
                    onClick={handleAddNote}
                  >
                    Adicionar à Pauta
                  </button>
                </div>

                <div className={styles.notesHistory}>
                  {notes.length === 0 ? (
                    <p style={{ color: 'var(--muted)', fontSize: '13px', margin: '8px 0' }}>
                      Nenhuma pauta registrada para este analista ainda.
                    </p>
                  ) : (
                    notes.map((n) => (
                      <div key={n.id} className={styles.noteItem}>
                        <div className={styles.noteItemHeader}>
                          <span
                            className={`${styles.noteCategoryTag} ${
                              n.category === 'atencao'
                                ? styles.tagAtencao
                                : n.category === 'elogio'
                                  ? styles.tagElogio
                                  : styles.tagAlinhamento
                            }`}
                          >
                            {n.category === 'atencao'
                              ? 'Atenção'
                              : n.category === 'elogio'
                                ? 'Elogio'
                                : 'Alinhamento'}
                          </span>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span>{n.date}</span>
                            <button
                              type="button"
                              className={styles.deleteNoteBtn}
                              onClick={() => handleDeleteNote(n.id)}
                              title="Excluir anotação"
                            >
                              Remover
                            </button>
                          </div>
                        </div>
                        <p className={styles.noteText}>{n.text}</p>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Coluna Direita: Meta da Semana */}
              <div className={styles.goalCard}>
                <h3>Meta da Semana</h3>
                <p style={{ margin: 0, fontSize: '13px', color: 'var(--muted)' }}>
                  Defina o foco e prazo do analista para esta semana.
                </p>

                {currentGoal ? (
                  <div className={styles.goalCurrent}>
                    <b>Meta ativa:</b>
                    <span>{currentGoal}</span>
                  </div>
                ) : (
                  <p style={{ margin: 0, fontSize: '13px', color: 'var(--soft)' }}>
                    Nenhuma meta definida para esta semana.
                  </p>
                )}

                <div className={styles.goalForm}>
                  <label htmlFor="goal-input" style={{ fontSize: '12px', fontWeight: 600, color: 'var(--navy)' }}>
                    {currentGoal ? 'Alterar meta:' : 'Definir nova meta:'}
                  </label>
                  <input
                    id="goal-input"
                    type="text"
                    className={styles.goalInput}
                    placeholder="Ex: Concluir o Grupo 2 (PDV) até sexta"
                    value={goalDraft}
                    onChange={(e) => setGoalDraft(e.target.value)}
                  />
                  <button
                    type="button"
                    className={`${styles.actionBtn} ${styles.actionBtnPrimary}`}
                    onClick={handleSaveGoal}
                  >
                    Salvar Meta
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
