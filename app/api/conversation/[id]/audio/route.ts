import { NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io/v1/convai/conversations";

export async function GET(request: Request, { params }: { params: any }) {
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

    if (!conversationId) {
        return NextResponse.json({ error: 'Missing conversation ID' }, { status: 400 });
    }

    try {
        const url = `${BASE_URL}/${conversationId}/audio`;
        const res = await fetch(url, {
            headers: {
                'xi-api-key': API_KEY!,
            },
        });

        if (!res.ok) {
            if (res.status === 404) {
                return NextResponse.json({ error: 'Audio not found' }, { status: 404 });
            }
            if (res.status === 429) {
                return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 });
            }
            throw new Error(`API Error ${res.status}`);
        }

        // Retorna o áudio como stream
        const audioData = await res.arrayBuffer();

        return new NextResponse(audioData, {
            headers: {
                'Content-Type': 'audio/mpeg',
                'Content-Disposition': `attachment; filename="${conversationId}.mp3"`,
            },
        });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
