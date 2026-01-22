import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';
import { translateToPortuguese } from '@/lib/translate';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin456";
const BASE_URL = process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io/v1/convai/conversations";
const REPORT_FILE = path.join(process.cwd(), 'data', 'latest-report.json');

export async function GET(request: Request, { params }: { params: any }) {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    // Verifica se deve traduzir o resumo (apenas quando abre detalhes da ligação)
    const { searchParams } = new URL(request.url);
    const shouldTranslate = searchParams.get('translate') === 'true';

    if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    try {
        const url = `${BASE_URL}/${conversationId}`;
        const res = await fetch(url, {
            headers: {
                'xi-api-key': API_KEY!,
            },
        });

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ error: 'Not found' }, { status: 404 });
            }
            if (res.status === 429) {
                console.error(`Rate limit exceeded for conversation ${conversationId}`);
                return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
            }
            console.error(`API Error ${res.status} for conversation ${conversationId}`);
            throw new Error(`API Error ${res.status}`);
        }

        const data = await res.json();

        // Traduz o resumo para português apenas se solicitado
        if (shouldTranslate && data.analysis?.transcript_summary) {
            data.analysis.transcript_summary = await translateToPortuguese(data.analysis.transcript_summary);
        }

        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * DELETE - Deleta uma conversa da ElevenLabs
 * Requer senha de administrador no header X-Admin-Password
 */
export async function DELETE(request: Request, { params }: { params: any }) {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    // Verifica senha de administrador
    const adminPassword = request.headers.get('X-Admin-Password');
    if (!adminPassword || adminPassword !== ADMIN_PASSWORD) {
        return NextResponse.json({ error: 'Unauthorized - Invalid admin password' }, { status: 401 });
    }

    try {
        const url = `${BASE_URL}/${conversationId}`;
        const res = await fetch(url, {
            method: 'DELETE',
            headers: {
                'xi-api-key': API_KEY!,
            },
        });

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
            }
            if (res.status === 422) {
                return NextResponse.json({ error: 'Unable to delete conversation' }, { status: 422 });
            }
            console.error(`API Error ${res.status} deleting conversation ${conversationId}`);
            throw new Error(`API Error ${res.status}`);
        }

        // Remove da base de dados local (latest-report.json)
        try {
            const reportData = await fs.readFile(REPORT_FILE, 'utf-8');
            const report = JSON.parse(reportData);

            // Encontra a sessão para obter dados necessários para recalcular métricas
            const sessaoRemovida = report.sessoes?.find((s: any) => s.conversation_id === conversationId);

            // Remove das listas de sessões
            if (report.sessoes) {
                report.sessoes = report.sessoes.filter((s: any) => s.conversation_id !== conversationId);
            }
            if (report.sessoes_sucesso) {
                report.sessoes_sucesso = report.sessoes_sucesso.filter((s: any) => s.conversation_id !== conversationId);
            }

            // Recalcula métricas se a sessão foi encontrada
            if (sessaoRemovida) {
                report.total = Math.max(0, (report.total || 0) - 1);

                // Atualiza contagem de status
                if (report.status_count && sessaoRemovida.status) {
                    const status = sessaoRemovida.status;
                    if (report.status_count[status]) {
                        report.status_count[status] = Math.max(0, report.status_count[status] - 1);
                    }
                }

                // Remove duração da lista
                if (report.duracoes && sessaoRemovida.call_duration !== undefined) {
                    const idx = report.duracoes.indexOf(sessaoRemovida.call_duration);
                    if (idx > -1) {
                        report.duracoes.splice(idx, 1);
                    }
                }

                // Remove mensagens da lista
                if (report.mensagens && sessaoRemovida.message_count !== undefined) {
                    const idx = report.mensagens.indexOf(sessaoRemovida.message_count);
                    if (idx > -1) {
                        report.mensagens.splice(idx, 1);
                    }
                }

                // Recalcula ligações atendidas/não atendidas
                const duracao = sessaoRemovida.call_duration || 0;
                if (duracao > 0) {
                    report.ligacoes_atendidas = Math.max(0, (report.ligacoes_atendidas || 0) - 1);
                    if (duracao > 30) {
                        report.ligacoes_mais_30s = Math.max(0, (report.ligacoes_mais_30s || 0) - 1);
                    }
                } else {
                    report.ligacoes_nao_atendidas = Math.max(0, (report.ligacoes_nao_atendidas || 0) - 1);
                    report.sessoes_zero = Math.max(0, (report.sessoes_zero || 0) - 1);
                }

                // Recalcula totais
                report.duracao_total = Math.max(0, (report.duracao_total || 0) - duracao);
                report.total_mensagens = Math.max(0, (report.total_mensagens || 0) - (sessaoRemovida.message_count || 0));

                // Recalcula médias e taxas
                if (report.total > 0) {
                    report.duracao_media = Math.round(report.duracao_total / report.ligacoes_atendidas) || 0;
                    report.taxa_atendimento = Math.round((report.ligacoes_atendidas / report.total) * 100);
                    report.taxa_mais_30s = report.ligacoes_atendidas > 0
                        ? Math.round((report.ligacoes_mais_30s / report.ligacoes_atendidas) * 100)
                        : 0;
                    report.media_msgs = Math.round(report.total_mensagens / report.total);
                } else {
                    report.duracao_media = 0;
                    report.taxa_atendimento = 0;
                    report.taxa_mais_30s = 0;
                    report.media_msgs = 0;
                }

                // Recalcula maior duração e max mensagens
                report.maior_duracao = report.duracoes?.length > 0 ? Math.max(...report.duracoes) : 0;
                report.max_msgs = report.mensagens?.length > 0 ? Math.max(...report.mensagens) : 0;
            }

            // Salva o relatório atualizado
            await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2));
            console.log(`Conversation ${conversationId} removed from local database`);

        } catch (fileError: any) {
            // Se não conseguir atualizar o arquivo local, loga mas não falha a requisição
            // já que a conversa foi deletada da API com sucesso
            console.error(`Warning: Could not update local database: ${fileError.message}`);
        }

        return NextResponse.json({ success: true, message: 'Conversation deleted successfully' });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
