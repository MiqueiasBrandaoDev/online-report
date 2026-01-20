'use client';

import React, { useState, useMemo } from 'react';
import styles from '../Report.module.css';
import { ReportData, ProcessedSession } from '@/lib/types';
import { formatarDuracao, formatarDataHora } from '@/lib/utils';
import AnimatedCounter from './AnimatedCounter';
import DateRangeFilter from './DateRangeFilter';
import { recalculateFromSessions } from '@/lib/stats';

interface ReportViewProps {
    data: ReportData;
    startDate: string;
}

/**
 * Componente principal de visualização do relatório
 *
 * Suporta filtragem por data usando o componente DateRangeFilter.
 * Quando um filtro é aplicado, as estatísticas são recalculadas
 * usando apenas as sessões dentro do range selecionado.
 */
export default function ReportView({ data, startDate }: ReportViewProps) {
    // Estado para dados filtrados (null = sem filtro ativo)
    const [filteredData, setFilteredData] = useState<ReturnType<typeof recalculateFromSessions> | null>(null);
    const [isFiltered, setIsFiltered] = useState(false);

    // Verifica se o relatório tem todas as sessões ou é antigo
    const hasAllSessions = Boolean(data.sessoes && data.sessoes.length > 0);

    // Usa sessoes completas ou fallback para sessoes_sucesso (relatórios antigos)
    const sessoesParaFiltro = useMemo(() => {
        if (data.sessoes && data.sessoes.length > 0) {
            return data.sessoes;
        }
        // Fallback para relatórios antigos: usa sessoes_sucesso
        if (data.sessoes_sucesso && data.sessoes_sucesso.length > 0) {
            return data.sessoes_sucesso.map(s => ({
                ...s,
                status: (s.status || "bem-sucedido") as "bem-sucedido" | "nao-atendida"
            }));
        }
        return [];
    }, [data.sessoes, data.sessoes_sucesso]);

    // Usa dados filtrados ou originais
    // Quando filteredData existe, faz merge com data original (filteredData sobrescreve)
    const displayData = filteredData
        ? { ...data, ...filteredData }
        : data;

    // Debug
    console.log('displayData.total:', displayData.total, 'filteredData:', filteredData?.total);

    // Handler para quando o filtro é aplicado
    const handleFilter = (filteredSessoes: ProcessedSession[]) => {
        console.log('Filtro aplicado - sessões filtradas:', filteredSessoes.length);
        const recalculated = recalculateFromSessions(filteredSessoes);
        console.log('Dados recalculados:', recalculated);
        setFilteredData(recalculated);
        setIsFiltered(true);
    };

    // Handler para limpar o filtro
    const handleClearFilter = () => {
        setFilteredData(null);
        setIsFiltered(false);
    };

    // Helper for progress bar width
    const getWidth = (val: number, max: number) => {
        if (max === 0) return '0%';
        return `${Math.min(100, (val / max) * 100)}%`;
    };

    const distMax = Math.max(...Object.values(displayData.dist_msgs), 1);

    return (
        <div className={styles.wrapper}>
            <div className={styles.container}>
                {/* Header with Filter */}
                <header className={styles.header}>
                    <div className={styles.headerWithFilter}>
                        <div className={styles.headerContent}>
                            <div className={styles.headerTop}>
                                <div className={styles.logo}>
                                    <svg viewBox="0 0 24 24"><path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" /></svg>
                                </div>
                                <h1 className={styles.title}>
                                    Relatório de Ligações
                                    {isFiltered && <span className={styles.filterActive}>Filtrado</span>}
                                </h1>
                            </div>
                            <p className={styles.subtitle}>Sempre Odonto - Análise de Conversas</p>
                            <div className={styles.periodBadge}>
                                <svg viewBox="0 0 24 24"><path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" /></svg>
                                <span>
                                    {data.periodo_inicio}
                                    {data.periodo_fim && ` até ${data.periodo_fim}`}
                                </span>
                            </div>
                        </div>

                        {/* Filtro de data (só aparece se tiver TODAS as sessões) */}
                        {hasAllSessions && sessoesParaFiltro.length > 0 && (
                            <DateRangeFilter
                                sessoes={sessoesParaFiltro}
                                onFilter={handleFilter}
                                onClear={handleClearFilter}
                            />
                        )}
                        {/* Aviso para relatórios antigos sem suporte a filtro */}
                        {!hasAllSessions && sessoesParaFiltro.length > 0 && (
                            <div className={styles.legacyWarning}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/>
                                </svg>
                                <span>Gere um novo relatório para usar filtros</span>
                            </div>
                        )}
                    </div>
                </header>

                {/* Stats Cards */}
                <div className={styles.statsGrid}>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Total de Ligações</div>
                        <div className={styles.statValue}>
                            <AnimatedCounter value={displayData.total} duration={1800} />
                        </div>
                        <div className={styles.statSub}>registros processados</div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Taxa de Atendimento</div>
                        <div className={styles.statValue}>
                            <AnimatedCounter value={displayData.taxa_atendimento} duration={1600} decimals={1} suffix="%" />
                        </div>
                        <div className={`${styles.statSub} ${styles.success}`}>
                            <AnimatedCounter value={displayData.ligacoes_atendidas} duration={1400} /> atendidas
                        </div>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressWrapper}>
                                <span className={styles.tooltip}>{displayData.ligacoes_atendidas.toLocaleString()} de {displayData.total.toLocaleString()} ligações atendidas</span>
                                <div className={styles.progressBar}>
                                    <div className={`${styles.progressFill} ${styles.green}`} style={{ width: `${displayData.taxa_atendimento}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Ligações +30s</div>
                        <div className={styles.statValue}>
                            <AnimatedCounter value={displayData.ligacoes_mais_30s} duration={1600} />
                        </div>
                        <div className={styles.statSub}>
                            <AnimatedCounter value={displayData.taxa_mais_30s} duration={1400} decimals={1} suffix="% do total" />
                        </div>
                        <div className={styles.progressContainer}>
                            <div className={styles.progressWrapper}>
                                <span className={styles.tooltip}>{displayData.ligacoes_mais_30s.toLocaleString()} ligações com mais de 30 segundos</span>
                                <div className={styles.progressBar}>
                                    <div className={`${styles.progressFill} ${styles.blue}`} style={{ width: `${displayData.taxa_mais_30s}%` }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                    <div className={styles.statCard}>
                        <div className={styles.statLabel}>Tempo Total</div>
                        <div className={styles.statValue}>{formatarDuracao(displayData.duracao_total)}</div>
                        <div className={styles.statSub}>média de {formatarDuracao(displayData.duracao_media)} por ligação</div>
                    </div>
                </div>

                {/* Status Section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" /></svg>
                        <span className={styles.sectionTitle}>Status das Ligações</span>
                    </div>
                    <div className={styles.sectionContent}>
                        <div className={styles.statusGrid} style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                            <div className={styles.statusItem}>
                                <div className={`${styles.statusValue} ${styles.success}`}>
                                    <AnimatedCounter value={displayData.ligacoes_atendidas} duration={1600} />
                                </div>
                                <div className={styles.statusLabel}>Bem-sucedidas</div>
                            </div>
                            <div className={styles.statusItem}>
                                <div className={`${styles.statusValue} ${styles.danger}`}>
                                    <AnimatedCounter value={displayData.ligacoes_nao_atendidas} duration={1600} />
                                </div>
                                <div className={styles.statusLabel}>Não Atendidas</div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Two Columns: Duration & Messages */}
                <div className={styles.twoColumns}>
                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <svg viewBox="0 0 24 24"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" /></svg>
                            <span className={styles.sectionTitle}>Duração</span>
                        </div>
                        <div className={styles.sectionContent}>
                            <div className={styles.metricsList}>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Duração Total</span>
                                    <span className={styles.metricValue}>{formatarDuracao(displayData.duracao_total)}</span>
                                </div>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Duração Média</span>
                                    <span className={styles.metricValue}>{formatarDuracao(displayData.duracao_media)}</span>
                                </div>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Maior Duração</span>
                                    <span className={styles.metricValue}>{formatarDuracao(displayData.maior_duracao)}</span>
                                </div>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Sessões sem duração</span>
                                    <span className={styles.metricValue}>{displayData.sessoes_zero}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className={styles.section}>
                        <div className={styles.sectionHeader}>
                            <svg viewBox="0 0 24 24"><path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z" /></svg>
                            <span className={styles.sectionTitle}>Mensagens</span>
                        </div>
                        <div className={styles.sectionContent}>
                            <div className={styles.metricsList}>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Total de Mensagens</span>
                                    <span className={styles.metricValue}>{displayData.total_mensagens.toLocaleString()}</span>
                                </div>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Média por Sessão</span>
                                    <span className={styles.metricValue}>~{displayData.media_msgs.toFixed(1)}</span>
                                </div>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Máximo em uma Sessão</span>
                                    <span className={styles.metricValue}>{displayData.max_msgs}</span>
                                </div>
                                <div className={styles.metricRow}>
                                    <span className={styles.metricLabel}>Sessões Bem-sucedidas</span>
                                    <span className={styles.metricValue}>{displayData.sessoes_sucesso.length}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Distribution Section */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <svg viewBox="0 0 24 24"><path d="M5 9.2h3V19H5V9.2zM10.6 5h2.8v14h-2.8V5zm5.6 8H19v6h-2.8v-6z" /></svg>
                        <span className={styles.sectionTitle}>Distribuição de Mensagens (Sessões Bem-sucedidas)</span>
                    </div>
                    <div className={styles.sectionContent}>
                        {["0", "1-2", "3-4", "5-6", "7-8", "9+"].map((faixa, index) => {
                            const count = displayData.dist_msgs[faixa] || 0;
                            if (count === 0) return null;

                            return (
                                <div key={faixa} className={styles.distItem}>
                                    <span className={styles.distLabel}>{faixa} msgs</span>
                                    <div className={styles.distBarContainer}>
                                        <div
                                            className={styles.distBar}
                                            data-index={index}
                                            style={{ width: getWidth(count, distMax) }}
                                            title={`${count} sessões com ${faixa} mensagens`}
                                        >
                                            {count}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Top Engagements */}
                <div className={styles.section}>
                    <div className={styles.sectionHeader}>
                        <svg viewBox="0 0 24 24"><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" /></svg>
                        <span className={styles.sectionTitle}>Picos de Engajamento (Top 5)</span>
                    </div>
                    <div className={styles.sectionContent}>
                        <div className={styles.tableContainer}>
                            <table className={styles.table}>
                                <thead>
                                    <tr>
                                        <th>Horário</th>
                                        <th>Duração</th>
                                        <th>Mensagens</th>
                                        <th>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {displayData.picos.map((pico, idx) => (
                                        <tr key={idx}>
                                            <td>{formatarDataHora(pico.horario)}</td>
                                            <td><span className={`${styles.badge} ${styles.badgePurple}`}>{formatarDuracao(pico.duracao)}</span></td>
                                            <td><strong>{pico.mensagens}</strong> mensagens</td>
                                            <td><span className={`${styles.badge} ${styles.badgeSuccess}`}>Bem-sucedida</span></td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <footer className={styles.footer}>
                    <p>Relatório gerado em {new Date().toLocaleString('pt-BR')}</p>
                    <p style={{ marginTop: '8px' }}>Powered by DAXX</p>
                </footer>
            </div>
        </div>
    );
}
