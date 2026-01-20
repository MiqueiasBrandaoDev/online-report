export interface Conversation {
    conversation_id: string;
    status: string;
    call_successful: string;
    start_time_unix_secs: number;
    end_time_unix_secs?: number;
    call_duration_secs?: number;
}

export interface ConversationDetails {
    conversation_id: string;
    transcript: Array<{ role: string; message: string; time_in_call_secs: number }>;
    metadata?: {
        call_duration_secs?: number;
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
    duration_seconds?: number;
    status?: string;
    call_successful?: string;
}

/**
 * Sessão processada de uma conversa
 * Contém dados individuais de cada ligação para permitir filtragem por data
 */
export interface ProcessedSession {
    /** ID único da conversa na ElevenLabs (para buscar transcrição/áudio) */
    conversation_id?: string;
    /** Data/hora da conversa em formato ISO (ex: "2024-01-15T14:30:00.000Z") */
    horario: string;
    /** Duração da conversa em segundos */
    duracao: number;
    /** Número de mensagens trocadas na conversa */
    mensagens: number;
    /** Status da conversa: bem-sucedido ou não-atendida */
    status: "bem-sucedido" | "nao-atendida";
    /** Resultado da venda (se disponível via data_collection) */
    resultado_venda?: "aceito" | "recusado" | null;
    /** Telefone do cliente (se disponível) */
    telefone_cliente?: string;
    /** Nome do cliente (se disponível via data_collection) */
    nome_cliente?: string;
}

/**
 * Dados completos do relatório de ligações
 *
 * Este objeto contém tanto os dados brutos (sessoes) quanto as estatísticas
 * pré-calculadas. Os dados brutos permitem filtragem por data no dashboard.
 *
 * @example Filtrando por data:
 * ```ts
 * const filtradas = reportData.sessoes.filter(s => {
 *   const data = new Date(s.horario);
 *   return data >= startDate && data <= endDate;
 * });
 * ```
 */
export interface ReportData {
    /** Total de ligações no período */
    total: number;
    /** Contagem por status: { "bem-sucedido": N, "nao-atendida": M } */
    status_count: Record<string, number>;
    /** Array com duração de cada ligação em segundos */
    duracoes: number[];
    /** Array com quantidade de mensagens de cada ligação */
    mensagens: number[];

    /**
     * @deprecated Use `sessoes` que inclui todas as ligações
     * Array apenas com sessões bem-sucedidas (mantido para compatibilidade)
     */
    sessoes_sucesso: ProcessedSession[];

    /**
     * Array com TODAS as sessões (sucesso + não atendidas)
     * Use este campo para filtragem por data no dashboard
     */
    sessoes: ProcessedSession[];

    // ========== Estatísticas pré-calculadas ==========
    /** Ligações com status bem-sucedido */
    ligacoes_atendidas: number;
    /** Ligações não atendidas */
    ligacoes_nao_atendidas: number;
    /** Ligações com duração > 30 segundos */
    ligacoes_mais_30s: number;
    /** Taxa de atendimento em % (0-100) */
    taxa_atendimento: number;
    /** Taxa de ligações > 30s em % (0-100) */
    taxa_mais_30s: number;
    /** Soma de todas as durações em segundos */
    duracao_total: number;
    /** Média de duração em segundos */
    duracao_media: number;
    /** Maior duração registrada em segundos */
    maior_duracao: number;
    /** Ligações com duração zero */
    sessoes_zero: number;
    /** Total de mensagens trocadas */
    total_mensagens: number;
    /** Média de mensagens por ligação bem-sucedida */
    media_msgs: number;
    /** Maior número de mensagens em uma ligação */
    max_msgs: number;

    // ========== Distribuições ==========
    /** Distribuição de mensagens: { "0": N, "1-2": M, "3-4": O, ... } */
    dist_msgs: Record<string, number>;

    // ========== Top engajamentos ==========
    /** Top 5 ligações com mais mensagens */
    picos: ProcessedSession[];

    // ========== Metadados ==========
    /** Data de início do período (formato local pt-BR) */
    periodo_inicio?: string;
    /** Data de fim do período (formato local pt-BR) */
    periodo_fim?: string;
    /** Data/hora de geração do relatório (formato local pt-BR) */
    gerado_em?: string;
}
