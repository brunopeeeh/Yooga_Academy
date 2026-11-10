import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { catalog } from '@/data/catalog';
import { useAuthStore } from '@/stores/auth';
import { useCurationStore } from '@/stores/curation';
import { toast } from '@/stores/toast';
import styles from './DiagnosticPage.module.css';

interface ModuleMetric {
  readonly id: string;
  readonly moduleName: string;
  readonly groupName: string;
  readonly passRate: number;
  readonly avgAttempts: number;
  readonly totalAttempts: number;
  readonly status: 'critico' | 'atencao' | 'saudavel';
}

interface CriticalQuestion {
  readonly id: string;
  readonly moduleId: string;
  readonly moduleName: string;
  readonly groupName: string;
  readonly question: string;
  readonly rightAnswer: string;
  readonly wrongAnswer: string;
  readonly errorRate: string;
  readonly errorPercentage: number;
}

const CRITICAL_QUESTIONS: readonly CriticalQuestion[] = [
  {
    id: 'crit-1',
    moduleId: 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio',
    moduleName: 'Configurações gerais do PDV · Cardápio',
    groupName: 'PDV (Mesa e balcão)',
    question: 'Ao copiar complementos de um produto para outro no cardápio, qual é o comportamento do sistema?',
    rightAnswer: 'Copia os novos grupos mantendo a estrutura configurada',
    wrongAnswer: 'Substitui todos os complementos já existentes no produto destino',
    errorRate: '4 de 6 analistas erraram',
    errorPercentage: 67,
  },
  {
    id: 'crit-2',
    moduleId: 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio',
    moduleName: 'Configurações gerais do PDV · Cardápio',
    groupName: 'PDV (Mesa e balcão)',
    question: 'Quem possui permissão padrão no Yooga para criar e alterar produtos no cardápio?',
    rightAnswer: 'Apenas usuários com perfil Administrador ou Gerente',
    wrongAnswer: 'Qualquer operador com acesso ao módulo de PDV',
    errorRate: '3 de 6 analistas erraram',
    errorPercentage: 50,
  },
  {
    id: 'crit-3',
    moduleId: 'fiscal--nfc-e',
    moduleName: 'NFC-e',
    groupName: 'Fiscal',
    question: 'Em caso de instabilidade na SEFAZ, o que o suporte deve orientar sobre a emissão em contingência?',
    rightAnswer: 'Emitir em contingência offline e transmitir assim que a SEFAZ normalizar',
    wrongAnswer: 'Aguardar o retorno da SEFAZ sem finalizar as vendas no caixa',
    errorRate: '3 de 6 analistas erraram',
    errorPercentage: 50,
  },
  {
    id: 'crit-4',
    moduleId: 'balancas-e-impressoras--impressao',
    moduleName: 'Impressão',
    groupName: 'Balanças e Impressoras',
    question: 'Como configurar a impressão automática da via de produção separada da via do cliente?',
    rightAnswer: 'Ativar o direcionamento de produção por setor nas configurações da impressora',
    wrongAnswer: 'Criar dois modelos idênticos de impressora com o mesmo IP de rede',
    errorRate: '2 de 5 analistas erraram',
    errorPercentage: 40,
  },
  {
    id: 'crit-5',
    moduleId: 'integracoes--marketplaces',
    moduleName: 'Marketplaces',
    groupName: 'Integrações',
    question: 'O que acontece ao cancelar um pedido sincronizado diretamente no Painel Gestor do Yooga?',
    rightAnswer: 'O Yooga envia a solicitação de cancelamento para validação na API do marketplace',
    wrongAnswer: 'O pedido é cancelado apenas localmente sem avisar o marketplace',
    errorRate: '2 de 5 analistas erraram',
    errorPercentage: 40,
  },
];

const FLAGS_STORAGE_KEY = 'yooga.academy.leader_curation_flags';

function loadFlags(): Record<string, { reason: string; note: string; date: string }> {
  try {
    const raw = localStorage.getItem(FLAGS_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function DiagnosticPage() {
  const authUser = useAuthStore((state) => state.user);
  const reviewQuiz = useCurationStore((state) => state.reviewQuiz);

  const [flags, setFlags] = useState<Record<string, { reason: string; note: string; date: string }>>(
    () => loadFlags(),
  );

  const [flagModalTarget, setFlagModalTarget] = useState<{
    id: string;
    moduleId: string;
    title: string;
  } | null>(null);

  const [flagReason, setFlagReason] = useState('mudou_sistema');
  const [flagNote, setFlagNote] = useState('');

  // Compilação dos módulos com quiz a partir do catálogo
  const moduleMetrics: readonly ModuleMetric[] = useMemo(() => {
    const list: ModuleMetric[] = [];

    for (const group of catalog.grupos) {
      for (const mod of group.modulos) {
        if (!mod.tem_quiz) continue;

        let passRate = 85;
        let avgAttempts = 1.2;
        let status: 'critico' | 'atencao' | 'saudavel' = 'saudavel';

        if (mod.id === 'pdv-mesa-e-balcao--configuracoes-gerais-do-pdv-cardapio') {
          passRate = 45;
          avgAttempts = 2.4;
          status = 'critico';
        } else if (mod.id === 'fiscal--nfc-e') {
          passRate = 52;
          avgAttempts = 2.1;
          status = 'critico';
        } else if (mod.id === 'balancas-e-impressoras--impressao') {
          passRate = 64;
          avgAttempts = 1.8;
          status = 'atencao';
        } else if (mod.id === 'integracoes--marketplaces') {
          passRate = 68;
          avgAttempts = 1.7;
          status = 'atencao';
        }

        list.push({
          id: mod.id,
          moduleName: mod.nome,
          groupName: group.nome,
          passRate,
          avgAttempts,
          totalAttempts: 6,
          status,
        });
      }
    }

    return list.sort((a, b) => a.passRate - b.passRate);
  }, []);

  const criticalCount = moduleMetrics.filter((m) => m.status === 'critico').length;

  const handleOpenFlagModal = (target: { id: string; moduleId: string; title: string }) => {
    setFlagModalTarget(target);
    setFlagReason('mudou_sistema');
    setFlagNote(flags[target.id]?.note ?? '');
  };

  const handleSendFlag = () => {
    if (!flagModalTarget) return;

    const flagData = {
      reason: flagReason,
      note: flagNote.trim(),
      date: new Date().toLocaleDateString('pt-BR'),
    };

    const updated = {
      ...flags,
      [flagModalTarget.id]: flagData,
    };
    setFlags(updated);

    try {
      localStorage.setItem(FLAGS_STORAGE_KEY, JSON.stringify(updated));
    } catch {
      // ignore
    }

    // Encaminha para o store de curadoria como necessidade de ajuste
    reviewQuiz(
      flagModalTarget.moduleId,
      'ajuste',
      authUser?.name ? `${authUser.name} (Líder)` : 'Líder de Suporte',
    );

    toast('Sinalização enviada para a equipe de Curadoria!', 'success');
    setFlagModalTarget(null);
  };

  return (
    <div className={styles.page}>
      <div className={`wrap ${styles.stack}`}>
        {/* Breadcrumb */}
        <nav className={styles.breadcrumb} aria-label="Navegação">
          <Link to="/lider">← Onboarding do time</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span>Diagnóstico de Gaps & Conteúdo</span>
        </nav>

        {/* Header */}
        <header className={styles.head}>
          <div>
            <span className="cap">Inteligência Operacional · Qualidade do Suporte</span>
            <h1>Diagnóstico de Gaps & Conteúdo</h1>
          </div>
          <div className={styles.headActions}>
            <Link to="/lider/metas" className={styles.flagBtn}>
              Turmas & Metas
            </Link>
            <Link to="/curadoria" className={styles.flagBtn}>
              Abrir Fila de Curadoria →
            </Link>
          </div>
        </header>

        {/* KPIs */}
        <div className={styles.kpisGrid}>
          <div className={styles.kpiCard}>
            <span>Aprovação Média 1º Quiz</span>
            <b>78%</b>
            <span>mínimo para passar: 70%</span>
          </div>

          <div className={`${styles.kpiCard} ${styles.kpiAlert}`}>
            <span>Módulos Críticos</span>
            <b>{criticalCount}</b>
            <span>aprovação abaixo de 60%</span>
          </div>

          <div className={styles.kpiCard}>
            <span>Perguntas Problemáticas</span>
            <b>{CRITICAL_QUESTIONS.length}</b>
            <span>taxa de erro &gt; 40%</span>
          </div>

          <div className={styles.kpiCard}>
            <span>Sinalizações para Curadoria</span>
            <b>{Object.keys(flags).length}</b>
            <span>itens enviados para ajuste</span>
          </div>
        </div>

        {/* Layout Principal */}
        <div className={styles.layout}>
          {/* Tabela de Módulos */}
          <section className={styles.mainCard} aria-labelledby="modules-title">
            <div className={styles.cardHeader}>
              <div>
                <h2 id="modules-title">Desempenho por Módulo</h2>
                <p>Taxa de aprovação na primeira tentativa e esforço médio do time.</p>
              </div>
            </div>

            <div className={styles.tableWrap}>
              <table>
                <thead>
                  <tr>
                    <th scope="col">Módulo</th>
                    <th scope="col">Grupo</th>
                    <th scope="col">Aprovação 1º Quiz</th>
                    <th scope="col">Média Tentativas</th>
                    <th scope="col">Situação</th>
                    <th scope="col">Ação</th>
                  </tr>
                </thead>
                <tbody>
                  {moduleMetrics.map((mod) => (
                    <tr key={mod.id}>
                      <td>
                        <b>{mod.moduleName}</b>
                      </td>
                      <td>{mod.groupName}</td>
                      <td>
                        <b>{mod.passRate}%</b>
                      </td>
                      <td>{mod.avgAttempts}x</td>
                      <td>
                        <span
                          className={`${styles.rateBadge} ${
                            mod.status === 'saudavel'
                              ? styles.rateHigh
                              : mod.status === 'atencao'
                                ? styles.rateMedium
                                : styles.rateLow
                          }`}
                        >
                          {mod.status === 'saudavel'
                            ? 'Saudável'
                            : mod.status === 'atencao'
                              ? 'Atenção'
                              : 'Crítico'}
                        </span>
                      </td>
                      <td>
                        <button
                          type="button"
                          className={`${styles.flagBtn} ${
                            flags[mod.id] ? styles.flagBtnActive : ''
                          }`}
                          onClick={() =>
                            handleOpenFlagModal({
                              id: mod.id,
                              moduleId: mod.id,
                              title: `Quiz: ${mod.moduleName}`,
                            })
                          }
                        >
                          {flags[mod.id] ? '✓ Sinalizado' : 'Sinalizar'}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Lateral: Perguntas Mais Erradas */}
          <aside className={styles.questionsSide} aria-labelledby="questions-title">
            <div className={styles.sideHeader}>
              <h2 id="questions-title">Top Questões Mais Erradas</h2>
              <p>Perguntas onde os analistas mais tropeçam durante os quizzes.</p>
            </div>

            {CRITICAL_QUESTIONS.map((item) => (
              <div key={item.id} className={styles.questionCard}>
                <div className={styles.questionTop}>
                  <span className={styles.questionPath}>
                    {item.groupName} › {item.moduleName}
                  </span>
                  <span className={styles.errorTag}>{item.errorPercentage}% erro</span>
                </div>

                <h3 className={styles.questionTitle}>{item.question}</h3>

                <div className={styles.answersBox}>
                  <div className={styles.answerRight}>
                    <span aria-hidden="true">✓</span>
                    <span>
                      <b>Correta:</b> {item.rightAnswer}
                    </span>
                  </div>
                  <div className={styles.answerWrong}>
                    <span aria-hidden="true">✕</span>
                    <span>
                      <b>Erro Comum:</b> {item.wrongAnswer}
                    </span>
                  </div>
                </div>

                <div className={styles.questionActions}>
                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>{item.errorRate}</span>
                  <button
                    type="button"
                    className={`${styles.flagBtn} ${
                      flags[item.id] ? styles.flagBtnActive : ''
                    }`}
                    onClick={() =>
                      handleOpenFlagModal({
                        id: item.id,
                        moduleId: item.moduleId,
                        title: item.question,
                      })
                    }
                  >
                    {flags[item.id] ? '✓ Sinalizada' : 'Sinalizar para Curadoria'}
                  </button>
                </div>
              </div>
            ))}
          </aside>
        </div>
      </div>

      {/* Modal de Sinalização para Curadoria */}
      {flagModalTarget && (
        <div
          className={styles.modalOverlay}
          onClick={() => setFlagModalTarget(null)}
          role="presentation"
        >
          <div
            className={styles.modalDialog}
            role="dialog"
            aria-modal="true"
            aria-labelledby="modal-flag-title"
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.modalHeader}>
              <h3 id="modal-flag-title">Encaminhar para Curadoria</h3>
              <button
                type="button"
                className={styles.modalCloseBtn}
                onClick={() => setFlagModalTarget(null)}
                aria-label="Fechar modal"
              >
                ✕
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.flagTargetInfo}>
                <span>Item a ajustar:</span>
                <b>{flagModalTarget.title}</b>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="flag-reason-select" className={styles.formLabel}>
                  Motivo da sinalização:
                </label>
                <select
                  id="flag-reason-select"
                  className={styles.formSelect}
                  value={flagReason}
                  onChange={(e) => setFlagReason(e.target.value)}
                >
                  <option value="mudou_sistema">Tela ou funcionalidade do sistema mudou</option>
                  <option value="ambigua">Enunciado ou alternativas ambíguas</option>
                  <option value="confusa">Terminologia confusa para o suporte</option>
                  <option value="artigo_incompleto">Artigo da Central está incompleto</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label htmlFor="flag-note-textarea" className={styles.formLabel}>
                  Observação do Líder para o time de conteúdo:
                </label>
                <textarea
                  id="flag-note-textarea"
                  className={styles.formTextarea}
                  placeholder="Explique o que precisa ser ajustado na pergunta ou no artigo..."
                  value={flagNote}
                  onChange={(e) => setFlagNote(e.target.value)}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button
                type="button"
                className={styles.btnCancel}
                onClick={() => setFlagModalTarget(null)}
              >
                Cancelar
              </button>
              <button
                type="button"
                className={styles.btnSubmit}
                onClick={handleSendFlag}
              >
                Enviar para Fila de Curadoria
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
