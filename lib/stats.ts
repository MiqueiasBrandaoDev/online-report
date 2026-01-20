import { Conversation, ConversationDetails, ReportData, ProcessedSession } from './types';

/**
 * Calcula estatísticas a partir das conversas brutas da API ElevenLabs
 *
 * @param conversations - Lista de conversas da API (endpoint /conversations)
 * @param detailsMap - Mapa com detalhes de cada conversa (endpoint /conversations/{id})
 * @returns ReportData com estatísticas calculadas e dados brutos para filtragem
 *
 * @example
 * ```ts
 * const stats = calculateStats(conversations, detailsMap);
 * // Acessar todas as sessões para filtragem:
 * const sessoesHoje = stats.sessoes.filter(s =>
 *   new Date(s.horario).toDateString() === new Date().toDateString()
 * );
 * ```
 */
export function calculateStats(
    conversations: Conversation[],
    detailsMap: Record<string, ConversationDetails>
): ReportData {
    const total = conversations.length;
    const status_count: Record<string, number> = {};
    const duracoes: number[] = [];
    const mensagens: number[] = [];

    // Array com TODAS as sessões (para filtragem no dashboard)
    const sessoes: ProcessedSession[] = [];
    // Array apenas com sucessos (mantido para compatibilidade)
    const sessoes_sucesso: ProcessedSession[] = [];

    conversations.forEach(conv => {
        const details = detailsMap[conv.conversation_id];

        // Determina status baseado nos dados da API
        let status: "bem-sucedido" | "nao-atendida" = "nao-atendida";
        if (conv.call_successful === "success" || conv.status === "done") {
            status = "bem-sucedido";
        }
        if (details?.call_successful === "success") {
            status = "bem-sucedido";
        }

        status_count[status] = (status_count[status] || 0) + 1;

        // Calcula duração priorizando dados mais precisos
        let duracao = 0;
        if (details?.metadata?.call_duration_secs) {
            duracao = details.metadata.call_duration_secs;
        } else if (conv.call_duration_secs) {
            duracao = conv.call_duration_secs;
        } else if (conv.start_time_unix_secs && conv.end_time_unix_secs) {
            duracao = conv.end_time_unix_secs - conv.start_time_unix_secs;
        }
        duracoes.push(duracao);

        // Conta mensagens do transcript
        const num_msgs = details?.transcript?.length || 0;
        mensagens.push(num_msgs);

        // Extrai dados do cliente dos detalhes
        let resultado_venda: "aceito" | "recusado" | null = null;
        let telefone_cliente: string | undefined;
        let nome_cliente: string | undefined;

        if (details) {
            // Telefone do cliente
            telefone_cliente = details.metadata?.phone_call?.external_number
                || details.metadata?.phone_call?.from_number;

            // Dados de data_collection_results
            const dataResults = details.analysis?.data_collection_results;
            if (dataResults) {
                // Busca nome do cliente
                const nomeFields = ['customer_name', 'nome', 'nome_cliente', 'name', 'client_name'];
                for (const field of nomeFields) {
                    if (dataResults[field]?.value && typeof dataResults[field].value === 'string') {
                        nome_cliente = dataResults[field].value as string;
                        break;
                    }
                }

                // Busca resultado da venda
                const resultFields = ['sale_accepted', 'venda_aceita', 'result', 'accepted', 'aceitou'];
                for (const field of resultFields) {
                    if (dataResults[field]?.value !== undefined) {
                        const value = dataResults[field].value;
                        if (typeof value === 'boolean') {
                            resultado_venda = value ? 'aceito' : 'recusado';
                        } else if (typeof value === 'string') {
                            const lower = value.toLowerCase();
                            if (lower === 'true' || lower === 'sim' || lower === 'yes' || lower === 'aceito') {
                                resultado_venda = 'aceito';
                            } else if (lower === 'false' || lower === 'não' || lower === 'nao' || lower === 'no' || lower === 'recusado') {
                                resultado_venda = 'recusado';
                            }
                        }
                        break;
                    }
                }
            }

            // Também verifica dynamic_variables para nome
            const dynVars = details.conversation_initiation_client_data?.dynamic_variables;
            if (dynVars && !nome_cliente) {
                if (dynVars.nome) nome_cliente = String(dynVars.nome);
                else if (dynVars.customer_name) nome_cliente = String(dynVars.customer_name);
                else if (dynVars.name) nome_cliente = String(dynVars.name);
            }
        }

        // Cria objeto da sessão com todos os dados
        const startTs = conv.start_time_unix_secs;
        const horario = new Date(startTs * 1000).toISOString();
        const sessao: ProcessedSession = {
            conversation_id: conv.conversation_id,
            horario,
            duracao,
            mensagens: num_msgs,
            status,
            resultado_venda,
            telefone_cliente,
            nome_cliente
        };

        // Adiciona em ambos os arrays
        sessoes.push(sessao);
        if (status === "bem-sucedido") {
            sessoes_sucesso.push(sessao);
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
        sessoes, // Novo: todas as sessões para filtragem
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

/**
 * Recalcula estatísticas a partir de um subconjunto de sessões filtradas
 *
 * Use esta função para recalcular os valores quando o usuário aplica
 * um filtro de data no dashboard.
 *
 * @param sessoes - Array de sessões já filtradas por data
 * @returns Objeto com estatísticas recalculadas
 *
 * @example
 * ```ts
 * // No componente do dashboard:
 * const sessoesNoRange = reportData.sessoes.filter(s => {
 *   const d = new Date(s.horario);
 *   return d >= startDate && d <= endDate;
 * });
 * const statsFiltered = recalculateFromSessions(sessoesNoRange);
 * ```
 */
export function recalculateFromSessions(sessoes: ProcessedSession[]) {
    const total = sessoes.length;
    const sessoes_sucesso = sessoes.filter(s => s.status === "bem-sucedido");
    const sessoes_nao_atendidas = sessoes.filter(s => s.status === "nao-atendida");

    const duracoes = sessoes.map(s => s.duracao);
    const mensagens = sessoes.map(s => s.mensagens);

    const ligacoes_atendidas = sessoes_sucesso.length;
    const ligacoes_nao_atendidas = sessoes_nao_atendidas.length;
    const ligacoes_mais_30s = duracoes.filter(d => d > 30).length;

    const taxa_atendimento = total > 0 ? (ligacoes_atendidas / total * 100) : 0;
    const taxa_mais_30s = total > 0 ? (ligacoes_mais_30s / total * 100) : 0;

    const duracao_total = duracoes.reduce((a, b) => a + b, 0);
    const duracao_media = total > 0 ? duracao_total / total : 0;
    const maior_duracao = duracoes.length > 0 ? Math.max(...duracoes) : 0;
    const sessoes_zero = duracoes.filter(d => d === 0).length;

    const total_mensagens = mensagens.reduce((a, b) => a + b, 0);
    const msgs_sucesso = sessoes_sucesso.filter(s => s.mensagens > 0).map(s => s.mensagens);
    const media_msgs = msgs_sucesso.length > 0
        ? msgs_sucesso.reduce((a, b) => a + b, 0) / msgs_sucesso.length
        : 0;
    const max_msgs = mensagens.length > 0 ? Math.max(...mensagens) : 0;

    // Distribuição de mensagens
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

    // Top 5 engajamentos
    const picos = [...sessoes_sucesso]
        .sort((a, b) => b.mensagens - a.mensagens)
        .slice(0, 5);

    return {
        total,
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
        picos,
        sessoes_sucesso
    };
}
