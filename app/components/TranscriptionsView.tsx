'use client';

import React, { useState, useEffect } from 'react';
import styles from '../Report.module.css';
import { ProcessedSession } from '@/lib/types';
import DeleteConfirmModal from './DeleteConfirmModal';

interface TranscriptMessage {
    role: 'user' | 'agent';
    message: string;
    time_in_call_secs: number;
}

interface ConversationDetails {
    conversation_id: string;
    transcript: TranscriptMessage[];
    metadata?: {
        phone_call?: {
            external_number?: string;
            to_number?: string;
            from_number?: string;
        };
    };
    analysis?: {
        transcript_summary?: string;
        call_successful?: string;
        data_collection_results?: Record<string, {
            value: string | boolean | number;
            rationale?: string;
        }>;
    };
    conversation_initiation_client_data?: {
        dynamic_variables?: Record<string, string | number | boolean>;
    };
    has_audio?: boolean;
}

interface TranscriptionsViewProps {
    sessoes: ProcessedSession[];
    onConversationDeleted?: () => void;
}

function formatDuration(seconds: number): string {
    if (seconds === 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}

function formatDate(dateStr: string): string {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function formatPhoneNumber(phone: string): string {
    // Remove caracteres não numéricos
    const cleaned = phone.replace(/\D/g, '');
    // Formata como (XX) XXXXX-XXXX ou similar
    if (cleaned.length === 11) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.slice(0, 2)}) ${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
    } else if (cleaned.length >= 12) {
        // Número internacional
        return `+${cleaned.slice(0, 2)} (${cleaned.slice(2, 4)}) ${cleaned.slice(4, 9)}-${cleaned.slice(9)}`;
    }
    return phone;
}

// Extrai dados do cliente dos detalhes da conversa
function extractCustomerData(details: ConversationDetails | null): {
    nome?: string;
    telefone?: string;
    resultado?: 'aceito' | 'recusado' | null;
} {
    if (!details) return {};

    // Busca telefone
    const telefone = details.metadata?.phone_call?.external_number
        || details.metadata?.phone_call?.from_number;

    // Busca nome e resultado nos data_collection_results
    const dataResults = details.analysis?.data_collection_results;
    let nome: string | undefined;
    let resultado: 'aceito' | 'recusado' | null = null;

    if (dataResults) {
        // Procura pelo nome do cliente (pode estar em diferentes campos)
        const nomeFields = ['customer_name', 'nome', 'nome_cliente', 'name', 'client_name'];
        for (const field of nomeFields) {
            if (dataResults[field]?.value && typeof dataResults[field].value === 'string') {
                nome = dataResults[field].value as string;
                break;
            }
        }

        // Procura pelo resultado da venda
        const resultFields = ['sale_accepted', 'venda_aceita', 'result', 'accepted', 'aceitou'];
        for (const field of resultFields) {
            if (dataResults[field]?.value !== undefined) {
                const value = dataResults[field].value;
                if (typeof value === 'boolean') {
                    resultado = value ? 'aceito' : 'recusado';
                } else if (typeof value === 'string') {
                    const lower = value.toLowerCase();
                    if (lower === 'true' || lower === 'sim' || lower === 'yes' || lower === 'aceito') {
                        resultado = 'aceito';
                    } else if (lower === 'false' || lower === 'não' || lower === 'nao' || lower === 'no' || lower === 'recusado') {
                        resultado = 'recusado';
                    }
                }
                break;
            }
        }
    }

    // Também verifica dynamic_variables
    const dynVars = details.conversation_initiation_client_data?.dynamic_variables;
    if (dynVars) {
        if (!nome && dynVars.nome) nome = String(dynVars.nome);
        if (!nome && dynVars.customer_name) nome = String(dynVars.customer_name);
        if (!nome && dynVars.name) nome = String(dynVars.name);
    }

    return { nome, telefone, resultado };
}

interface TranscriptionCardProps {
    sessao: ProcessedSession;
    onDeleteClick: (conversationId: string, phoneNumber?: string) => void;
}

function TranscriptionCard({ sessao, onDeleteClick }: TranscriptionCardProps) {
    const [isExpanded, setIsExpanded] = useState(false);
    const [details, setDetails] = useState<ConversationDetails | null>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const loadDetails = async () => {
        if (!sessao.conversation_id || details) return;

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/conversation/${sessao.conversation_id}?translate=true`);
            if (!res.ok) {
                throw new Error('Falha ao carregar detalhes');
            }
            const data = await res.json();
            setDetails(data);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        const newExpanded = !isExpanded;
        setIsExpanded(newExpanded);

        if (newExpanded && !details && sessao.conversation_id) {
            loadDetails();
        }
    };

    const audioUrl = sessao.conversation_id
        ? `/api/conversation/${sessao.conversation_id}/audio`
        : undefined;

    // Extrai dados do cliente - usa dados do sessao (relatório) ou fallback para details (API)
    const detailsCustomerData = extractCustomerData(details);
    const customerData = {
        nome: sessao.nome_cliente || detailsCustomerData.nome,
        telefone: sessao.telefone_cliente || detailsCustomerData.telefone,
        resultado: sessao.resultado_venda || detailsCustomerData.resultado
    };

    // Título do card: nome do cliente ou ID
    const cardTitle = customerData.nome
        || (customerData.telefone ? formatPhoneNumber(customerData.telefone) : null)
        || (sessao.conversation_id ? `#${sessao.conversation_id.slice(-8)}` : 'Sem ID');

    return (
        <div className={styles.transcriptionCard}>
            <div
                className={styles.transcriptionHeader}
                onClick={handleToggle}
            >
                <div className={styles.transcriptionInfo}>
                    <span className={styles.transcriptionPhone}>
                        {cardTitle}
                    </span>
                    <div className={styles.transcriptionMeta}>
                        <span className={styles.transcriptionDate}>{formatDate(sessao.horario)}</span>
                        <span className={styles.transcriptionDuration}>
                            <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor">
                                <path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/>
                            </svg>
                            {formatDuration(sessao.duracao)}
                        </span>
                        <span className={`${styles.transcriptionStatus} ${
                            sessao.status === 'bem-sucedido'
                                ? styles.transcriptionStatusSuccess
                                : styles.transcriptionStatusFailed
                        }`}>
                            {sessao.status === 'bem-sucedido' ? '✓ Bem-sucedida' : '✗ Não atendida'}
                        </span>
                        {/* Badge de resultado da venda */}
                        {customerData.resultado && (
                            <span className={`${styles.transcriptionStatus} ${
                                customerData.resultado === 'aceito'
                                    ? styles.saleAccepted
                                    : styles.saleRejected
                            }`}>
                                {customerData.resultado === 'aceito' ? '$ Venda Aceita' : '✗ Venda Recusada'}
                            </span>
                        )}
                        <span style={{ fontSize: '11px', color: '#8b949e' }}>
                            {sessao.mensagens} msgs
                        </span>
                    </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Botão de deletar */}
                    <button
                        onClick={(e) => {
                            e.stopPropagation();
                            if (sessao.conversation_id) {
                                onDeleteClick(sessao.conversation_id, customerData.telefone);
                            }
                        }}
                        className={styles.deleteButton}
                        title="Deletar conversa"
                    >
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                    <div className={`${styles.transcriptionExpand} ${isExpanded ? styles.expanded : ''}`}>
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
                            <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
                        </svg>
                    </div>
                </div>
            </div>

            <div className={`${styles.transcriptionContent} ${isExpanded ? styles.expanded : ''}`}>
                {loading && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#8b949e' }}>
                        Carregando detalhes...
                    </div>
                )}

                {error && (
                    <div style={{ textAlign: 'center', padding: '20px', color: '#f85149' }}>
                        Erro: {error}
                    </div>
                )}

                {!loading && !error && (
                    <>
                        {/* Dados do Cliente - Primeiro */}
                        {(customerData.nome || customerData.telefone) && (
                            <div className={styles.transcriptionSection}>
                                <div className={styles.transcriptionSectionTitle}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                                    </svg>
                                    Dados do Cliente
                                </div>
                                <div className={styles.customerDataBox}>
                                    {customerData.nome && (
                                        <div className={styles.customerDataRow}>
                                            <span className={styles.customerDataLabel}>Nome</span>
                                            <span className={styles.customerDataValue}>{customerData.nome}</span>
                                        </div>
                                    )}
                                    {customerData.telefone && (
                                        <div className={styles.customerDataRow}>
                                            <span className={styles.customerDataLabel}>Telefone</span>
                                            <span className={styles.customerDataValue}>
                                                {formatPhoneNumber(customerData.telefone)}
                                            </span>
                                        </div>
                                    )}
                                    {customerData.resultado && (
                                        <div className={styles.customerDataRow}>
                                            <span className={styles.customerDataLabel}>Resultado</span>
                                            <span className={`${styles.customerDataValue} ${
                                                customerData.resultado === 'aceito'
                                                    ? styles.resultAccepted
                                                    : styles.resultRejected
                                            }`}>
                                                {customerData.resultado === 'aceito' ? 'Venda Aceita' : 'Venda Recusada'}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Áudio */}
                        {audioUrl && sessao.status === 'bem-sucedido' && (
                            <div className={styles.transcriptionSection}>
                                <div className={styles.transcriptionSectionTitle}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/>
                                    </svg>
                                    Áudio da Chamada
                                </div>
                                <audio controls className={styles.audioPlayer}>
                                    <source src={audioUrl} type="audio/mpeg" />
                                    Seu navegador não suporta o elemento de áudio.
                                </audio>
                            </div>
                        )}

                        {/* Resumo */}
                        {details?.analysis?.transcript_summary && (
                            <div className={styles.transcriptionSection}>
                                <div className={styles.transcriptionSectionTitle}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                    </svg>
                                    Resumo
                                </div>
                                <div className={styles.summaryBox}>
                                    <p className={styles.summaryText}>{details.analysis.transcript_summary}</p>
                                </div>
                            </div>
                        )}

                        {/* Transcrição */}
                        {details?.transcript && details.transcript.length > 0 && (
                            <div className={styles.transcriptionSection}>
                                <div className={styles.transcriptionSectionTitle}>
                                    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor">
                                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                    </svg>
                                    Transcrição ({details.transcript.length} mensagens)
                                </div>
                                <div className={styles.transcriptMessages}>
                                    {details.transcript.map((msg, idx) => (
                                        <div
                                            key={idx}
                                            className={`${styles.transcriptMessage} ${
                                                msg.role === 'user'
                                                    ? styles.transcriptMessageUser
                                                    : styles.transcriptMessageAgent
                                            }`}
                                        >
                                            <span className={styles.transcriptMessageRole}>
                                                {msg.role === 'user' ? 'Cliente' : 'Agente'}
                                                {msg.time_in_call_secs > 0 && (
                                                    <span style={{ fontWeight: 'normal', marginLeft: '8px', opacity: 0.7 }}>
                                                        {formatDuration(msg.time_in_call_secs)}
                                                    </span>
                                                )}
                                            </span>
                                            <span className={styles.transcriptMessageText}>{msg.message}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Sem transcrição disponível */}
                        {(!details?.transcript || details.transcript.length === 0) && !loading && (
                            <div className={styles.emptyState}>
                                <div className={styles.emptyStateIcon}>
                                    <svg viewBox="0 0 24 24" fill="currentColor">
                                        <path d="M20 2H4c-1.1 0-1.99.9-1.99 2L2 22l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm-2 12H6v-2h12v2zm0-3H6V9h12v2zm0-3H6V6h12v2z"/>
                                    </svg>
                                </div>
                                <p className={styles.emptyStateTitle}>
                                    {sessao.status === 'nao-atendida'
                                        ? 'Ligação não atendida'
                                        : 'Sem transcrição disponível'}
                                </p>
                                <p className={styles.emptyStateText}>
                                    {sessao.status === 'nao-atendida'
                                        ? 'Esta ligação não foi atendida pelo cliente.'
                                        : 'Não há dados de transcrição para esta conversa.'}
                                </p>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}

export default function TranscriptionsView({ sessoes, onConversationDeleted }: TranscriptionsViewProps) {
    // Ordena por data mais recente e filtra apenas conversas com ID
    const [localSessoes, setLocalSessoes] = useState(sessoes);
    const sessoesOrdenadas = [...localSessoes]
        .filter(s => s.conversation_id)
        .sort((a, b) => new Date(b.horario).getTime() - new Date(a.horario).getTime());

    // Atualiza sessões locais quando as props mudam
    useEffect(() => {
        setLocalSessoes(sessoes);
    }, [sessoes]);

    // Paginação: mostra 20 por vez
    const [visibleCount, setVisibleCount] = useState(20);

    // Reseta paginação quando as sessões mudam (ex: filtro aplicado/removido)
    useEffect(() => {
        setVisibleCount(20);
    }, [localSessoes]);

    // Filtro por status de ligação
    const [statusFilter, setStatusFilter] = useState<'all' | 'bem-sucedido' | 'nao-atendida'>('all');

    // Filtro por resultado da venda
    const [vendaFilter, setVendaFilter] = useState<'all' | 'aceito' | 'recusado'>('all');

    // Filtro por duração mínima (em segundos)
    const [duracaoMinima, setDuracaoMinima] = useState<string>('');

    // Estado do modal de delete
    const [deleteModal, setDeleteModal] = useState<{
        isOpen: boolean;
        conversationId: string;
        phoneNumber?: string;
    }>({
        isOpen: false,
        conversationId: '',
        phoneNumber: undefined
    });

    const handleDeleteClick = (conversationId: string, phoneNumber?: string) => {
        setDeleteModal({
            isOpen: true,
            conversationId,
            phoneNumber
        });
    };

    const handleDeleteClose = () => {
        setDeleteModal({
            isOpen: false,
            conversationId: '',
            phoneNumber: undefined
        });
    };

    const handleDeleted = (conversationId: string) => {
        // Remove a sessão deletada da lista local
        setLocalSessoes(prev => prev.filter(s => s.conversation_id !== conversationId));
        // Notifica o componente pai para recarregar os dados do relatório
        if (onConversationDeleted) {
            onConversationDeleted();
        }
    };

    // Aplica filtros
    let sessoesFiltradas = sessoesOrdenadas;

    if (statusFilter !== 'all') {
        sessoesFiltradas = sessoesFiltradas.filter(s => s.status === statusFilter);
    }

    if (vendaFilter !== 'all') {
        if (vendaFilter === 'recusado') {
            // Incluir sessões com resultado_venda === 'recusado' OU sem resultado (null/undefined)
            sessoesFiltradas = sessoesFiltradas.filter(s =>
                s.resultado_venda === 'recusado' ||
                s.resultado_venda === null ||
                s.resultado_venda === undefined
            );
        } else {
            sessoesFiltradas = sessoesFiltradas.filter(s => s.resultado_venda === vendaFilter);
        }
    }

    // Filtro por duração mínima
    const duracaoMinimaNum = parseInt(duracaoMinima, 10);
    if (!isNaN(duracaoMinimaNum) && duracaoMinimaNum > 0) {
        sessoesFiltradas = sessoesFiltradas.filter(s => s.duracao >= duracaoMinimaNum);
    }

    // Aplica paginação após filtros
    const sessoesVisiveis = sessoesFiltradas.slice(0, visibleCount);
    const hasMore = visibleCount < sessoesFiltradas.length;

    // Mostra o filtro de vendas se houver sessões bem-sucedidas
    const temSessoesBemSucedidas = sessoesOrdenadas.some(s => s.status === 'bem-sucedido');

    return (
        <div className={styles.transcriptionsContainer}>
            <div className={styles.section} style={{ opacity: 1 }}>
                <div className={styles.sectionHeader}>
                    <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                        <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                    </svg>
                    <span className={styles.sectionTitle}>Transcrições das Chamadas</span>
                    <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value as any)}
                            style={{
                                background: 'rgba(13, 17, 23, 0.6)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '6px',
                                color: '#e6edf3',
                                padding: '6px 12px',
                                fontSize: '12px',
                                cursor: 'pointer'
                            }}
                        >
                            <option value="all">Todas</option>
                            <option value="bem-sucedido">Bem-sucedidas</option>
                            <option value="nao-atendida">Não atendidas</option>
                        </select>
                        {temSessoesBemSucedidas && (
                            <select
                                value={vendaFilter}
                                onChange={(e) => setVendaFilter(e.target.value as any)}
                                style={{
                                    background: 'rgba(13, 17, 23, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    color: '#e6edf3',
                                    padding: '6px 12px',
                                    fontSize: '12px',
                                    cursor: 'pointer'
                                }}
                            >
                                <option value="all">Todas Vendas</option>
                                <option value="aceito">Vendas Aceitas</option>
                                <option value="recusado">Vendas Recusadas</option>
                            </select>
                        )}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <span style={{ fontSize: '12px', color: '#8b949e' }}>Min:</span>
                            <input
                                type="number"
                                value={duracaoMinima}
                                onChange={(e) => setDuracaoMinima(e.target.value)}
                                placeholder="seg"
                                min="0"
                                style={{
                                    width: '60px',
                                    background: 'rgba(13, 17, 23, 0.6)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    color: '#e6edf3',
                                    padding: '6px 8px',
                                    fontSize: '12px'
                                }}
                            />
                            <span style={{ fontSize: '11px', color: '#8b949e' }}>seg</span>
                        </div>
                        <span style={{ fontSize: '13px', color: '#8b949e' }}>
                            {sessoesFiltradas.length} registros
                        </span>
                    </div>
                </div>
                <div className={styles.sectionContent}>
                    {sessoesFiltradas.length === 0 ? (
                        <div className={styles.emptyState}>
                            <div className={styles.emptyStateIcon}>
                                <svg viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                                </svg>
                            </div>
                            <p className={styles.emptyStateTitle}>Nenhuma transcrição disponível</p>
                            <p className={styles.emptyStateText}>
                                Gere um novo relatório para ter acesso às transcrições das chamadas.
                            </p>
                        </div>
                    ) : (
                        <>
                            {sessoesVisiveis.map(sessao => (
                                <TranscriptionCard
                                    key={sessao.conversation_id}
                                    sessao={sessao}
                                    onDeleteClick={handleDeleteClick}
                                />
                            ))}

                            {hasMore && (
                                <button
                                    onClick={() => setVisibleCount(prev => prev + 20)}
                                    style={{
                                        width: '100%',
                                        padding: '14px',
                                        marginTop: '16px',
                                        background: 'rgba(255, 255, 255, 0.05)',
                                        border: '1px solid rgba(255, 255, 255, 0.1)',
                                        borderRadius: '10px',
                                        color: '#e6edf3',
                                        fontSize: '13px',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease'
                                    }}
                                    onMouseOver={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
                                    }}
                                    onMouseOut={(e) => {
                                        e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)';
                                    }}
                                >
                                    Carregar mais ({sessoesFiltradas.length - visibleCount} restantes)
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Modal de confirmação de delete */}
            <DeleteConfirmModal
                isOpen={deleteModal.isOpen}
                conversationId={deleteModal.conversationId}
                phoneNumber={deleteModal.phoneNumber}
                onClose={handleDeleteClose}
                onDeleted={handleDeleted}
            />
        </div>
    );
}
