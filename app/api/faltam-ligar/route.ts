import { NextResponse } from 'next/server';

export async function GET() {
    try {
        const response = await fetch(
            'https://main-n8n-production.up.railway.app/webhook/5b481bdb-8267-46e0-9187-251490c30766',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({}),
                cache: 'no-store',
            }
        );

        const data = await response.json();

        console.log('Resposta do webhook:', data);

        // Se retornou erro do n8n ou não tem o campo
        if (data.code !== undefined || data.faltam_ligar === undefined) {
            console.log('Webhook retornou erro ou sem dados:', data);
            return NextResponse.json({
                faltam_ligar: null,
                error: data.message || 'Dados não disponíveis'
            });
        }

        return NextResponse.json({
            faltam_ligar: data.faltam_ligar
        });
    } catch (error) {
        console.error('Erro ao buscar faltam_ligar:', error);
        return NextResponse.json({
            faltam_ligar: null,
            error: 'Falha ao conectar com o servidor'
        });
    }
}
