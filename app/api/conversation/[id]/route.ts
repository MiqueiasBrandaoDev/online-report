import { NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const BASE_URL = process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io/v1/convai/conversations";

export async function GET(request: Request, { params }: { params: any }) {
    // Await params in newer Next.js versions if needed, but for now treating as sync or awaited 
    // pending framework update. In Next 15 params is a promise?
    // Safe way:
    const resolvedParams = await params;
    const conversationId = resolvedParams.id;

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
            // If 404 or other, return null or error? Python script catches exception and passes.
            // We'll return 404 or empty structure.
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
        return NextResponse.json(data);

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
