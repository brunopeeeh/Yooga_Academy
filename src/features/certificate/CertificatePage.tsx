import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useAuthStore } from '@/stores/auth';
import styles from './CertificatePage.module.css';

const MEMBER_NAMES: Record<string, string> = {
  'exemplo-ana': 'Ana Silveira',
  'exemplo-fabio': 'Fábio Ribeiro',
  'exemplo-carla': 'Carla Mendes',
  'exemplo-elis': 'Elis Regina',
  'exemplo-bruno': 'Bruno Oliveira',
  'exemplo-diego': 'Diego Santos',
  'demo-analista': 'Ana (Analista Demo)',
  'demo-lider': 'Fábio (Líder Demo)',
};

export function CertificatePage() {
  const { memberId } = useParams<{ memberId?: string }>();
  const authUser = useAuthStore((state) => state.user);

  const studentName = useMemo(() => {
    if (memberId && MEMBER_NAMES[memberId]) {
      return MEMBER_NAMES[memberId];
    }
    if (authUser?.name) {
      return authUser.name;
    }
    return 'Ana Silveira';
  }, [memberId, authUser]);

  const certificateCode = useMemo(() => {
    const raw = (memberId ?? authUser?.id ?? 'ana').toUpperCase();
    return `YGA-2026-${raw.slice(0, 8)}-CERT-88F4`;
  }, [memberId, authUser]);

  const issueDate = useMemo(() => {
    return new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    });
  }, []);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={styles.page}>
      <div className={styles.controls}>
        <Link to={authUser?.role === 'lider' ? '/lider' : '/conquistas'} className={styles.backLink}>
          ← Voltar
        </Link>
        <button type="button" className={styles.printBtn} onClick={handlePrint}>
          🖨️ Imprimir / Salvar em PDF
        </button>
      </div>

      <article className={styles.certificateContainer} aria-label="Certificado de Conclusão Oficial">
        <div className={styles.certificateInnerBorder}>
          <div className={styles.badge}>
            ★ Yooga Academy · Formação Oficial ★
          </div>

          <h1 className={styles.title}>Certificado de Conclusão</h1>
          <p className={styles.subtitle}>Programa de Aceleração e Onboarding de Suporte</p>

          <p className={styles.bodyText}>
            Certificamos com distinção e mérito que
            <span className={styles.studentName}>{studentName}</span>
            concluiu com êxito a <b>Trilha Completa de Formação e Onboarding do Suporte Técnico Yooga</b>,
            demonstrando domínio integral sobre operação de PDV, regras fiscais, integrações com marketplaces,
            configuração de hardware e excelência no atendimento ao cliente parceiro.
          </p>

          <div className={styles.metaGrid}>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Carga Horária</span>
              <span className={styles.metaValue}>40 horas</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Competências</span>
              <span className={styles.metaValue}>8 Grupos · 100% dos Selos</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Avaliação Final</span>
              <span className={styles.metaValue}>Aprovado com Louvor</span>
            </div>
            <div className={styles.metaItem}>
              <span className={styles.metaLabel}>Data de Emissão</span>
              <span className={styles.metaValue}>{issueDate}</span>
            </div>
          </div>

          <div className={styles.footerSignatures}>
            <div className={styles.signatureBox}>
              <div className={styles.signatureLine} />
              <span className={styles.signatureName}>Lucas Duarte</span>
              <span className={styles.signatureRole}>Head de Suporte & Operações</span>
            </div>

            <div className={styles.signatureBox}>
              <div className={styles.signatureLine} />
              <span className={styles.signatureName}>Liderança Yooga Academy</span>
              <span className={styles.signatureRole}>Excelência e Treinamento</span>
            </div>
          </div>

          <div className={styles.authCode}>
            Autenticidade Verificada · Código da Credencial: <b>{certificateCode}</b>
          </div>
        </div>
      </article>
    </div>
  );
}

