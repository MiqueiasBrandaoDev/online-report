import { NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY;
const AGENT_ID = process.env.ELEVENLABS_AGENT_ID;
const BASE_URL = process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io/v1/convai/conversations";

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');

    if (!startParam) {
        return NextResponse.json({ error: 'Missing start parameter (unix timestamp)' }, { status: 400 });
    }

    const startUnix = parseInt(startParam);
    let cursor = null;
    let allConversations: any[] = [];

    try {
        do {
            const url = new URL(BASE_URL);
            url.searchParams.append('agent_id', AGENT_ID!);
            url.searchParams.append('page_size', '100'); // Max page size
            url.searchParams.append('call_start_after_unix', startUnix.toString());
            if (cursor) {
                url.searchParams.append('cursor', cursor);
            }

            const res = await fetch(url.toString(), {
                headers: {
                    'xi-api-key': API_KEY!,
                },
            });

            if (!res.ok) {
                throw new Error(`ElevenLabs API Error: ${res.status}`);
            }

            const data = await res.json();
            const conversations = data.conversations || [];
            allConversations = [...allConversations, ...conversations];
            cursor = data.next_cursor;

        } while (cursor);

        return NextResponse.json({ conversations: allConversations });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
