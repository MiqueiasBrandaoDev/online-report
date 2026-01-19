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
    };
    duration_seconds?: number;
    status?: string;
    call_successful?: string;
}

export interface ProcessedSession {
    horario: string; // ISO date string
    duracao: number;
    mensagens: number;
}

export interface ReportData {
    total: number;
    status_count: Record<string, number>;
    duracoes: number[];
    mensagens: number[];
    sessoes_sucesso: ProcessedSession[];

    // Pre-calculated stats for easier rendering
    ligacoes_atendidas: number;
    ligacoes_nao_atendidas: number;
    ligacoes_mais_30s: number;
    taxa_atendimento: number;
    taxa_mais_30s: number;
    duracao_total: number;
    duracao_media: number;
    maior_duracao: number;
    sessoes_zero: number;
    total_mensagens: number;
    media_msgs: number;
    max_msgs: number;

    // Distributions
    dist_msgs: Record<string, number>;

    // Top engagements
    picos: ProcessedSession[];
}
