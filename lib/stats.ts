import { Conversation, ConversationDetails, ReportData, ProcessedSession } from './types';

export function calculateStats(
    conversations: Conversation[],
    detailsMap: Record<string, ConversationDetails>
): ReportData {
    const total = conversations.length;
    const status_count: Record<string, number> = {};
    const duracoes: number[] = [];
    const mensagens: number[] = [];
    const sessoes_sucesso: ProcessedSession[] = [];

    conversations.forEach(conv => {
        const details = detailsMap[conv.conversation_id];

        // Status
        let status = "nao-atendida";
        if (conv.call_successful === "success" || conv.status === "done") {
            status = "bem-sucedido";
        }
        // Override if details say otherwise (though API list is usually accurate on status)
        if (details?.call_successful === "success") status = "bem-sucedido";

        status_count[status] = (status_count[status] || 0) + 1;

        // Duration
        let duracao = 0;
        if (details?.metadata?.call_duration_secs) {
            duracao = details.metadata.call_duration_secs;
        } else if (conv.call_duration_secs) {
            duracao = conv.call_duration_secs;
        } else if (conv.start_time_unix_secs && conv.end_time_unix_secs) {
            duracao = conv.end_time_unix_secs - conv.start_time_unix_secs;
        }
        duracoes.push(duracao);

        // Messages
        const num_msgs = details?.transcript?.length || 0;
        mensagens.push(num_msgs);

        // Sucesso
        if (status === "bem-sucedido") {
            const startTs = conv.start_time_unix_secs;
            const horario = new Date(startTs * 1000).toISOString();
            sessoes_sucesso.push({
                horario,
                duracao,
                mensagens: num_msgs
            });
        }
    });

    // Calculate Aggregates
    const total_mensagens = mensagens.reduce((a, b) => a + b, 0);
    const msgs_sucesso = sessoes_sucesso.filter(s => s.mensagens > 0).map(s => s.mensagens);
    const media_msgs = msgs_sucesso.length > 0 ? msgs_sucesso.reduce((a, b) => a + b, 0) / msgs_sucesso.length : 0;
    const max_msgs = mensagens.length > 0 ? Math.max(...mensagens) : 0;

    const sessoes_zero = duracoes.filter(d => d === 0).length;
    const maior_duracao = duracoes.length > 0 ? Math.max(...duracoes) : 0;
    const duracao_total = duracoes.reduce((a, b) => a + b, 0);
    const duracao_media = duracoes.length > 0 ? duracao_total / duracoes.length : 0;

    const ligacoes_atendidas = status_count["bem-sucedido"] || 0;
    const ligacoes_nao_atendidas = status_count["nao-atendida"] || 0;
    const ligacoes_mais_30s = duracoes.filter(d => d > 30).length;

    const taxa_atendimento = total > 0 ? (ligacoes_atendidas / total * 100) : 0;
    const taxa_mais_30s = total > 0 ? (ligacoes_mais_30s / total * 100) : 0;

    // Picos
    const picos = [...sessoes_sucesso].sort((a, b) => b.mensagens - a.mensagens).slice(0, 5);

    // Dist
    const dist_msgs: Record<string, number> = {
        "0": 0, "1-2": 0, "3-4": 0, "5-6": 0, "7-8": 0, "9+": 0
    };

    sessoes_sucesso.forEach(s => {
        const m = s.mensagens;
        if (m === 0) dist_msgs["0"]++;
        else if (m <= 2) dist_msgs["1-2"]++;
        else if (m <= 4) dist_msgs["3-4"]++;
        else if (m <= 6) dist_msgs["5-6"]++;
        else if (m <= 8) dist_msgs["7-8"]++;
        else dist_msgs["9+"]++;
    });

    return {
        total,
        status_count,
        duracoes,
        mensagens,
        sessoes_sucesso,
        ligacoes_atendidas,
        ligacoes_nao_atendidas,
        ligacoes_mais_30s,
        taxa_atendimento,
        taxa_mais_30s,
        duracao_total,
        duracao_media,
        maior_duracao,
        sessoes_zero,
        total_mensagens,
        media_msgs,
        max_msgs,
        dist_msgs,
        picos
    };
}
