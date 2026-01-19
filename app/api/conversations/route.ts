import { NextResponse } from 'next/server';

const API_KEY = process.env.ELEVENLABS_API_KEY;
// Support multiple IDs, comma separated
// Handle both single variable or plural, prioritize plural logic
const RAW_IDS = process.env.ELEVENLABS_AGENT_IDS || process.env.ELEVENLABS_AGENT_ID || "";
const CONFIGURED_AGENT_IDS = RAW_IDS.split(',').map(id => id.trim()).filter(id => id.length > 0);
const BASE_URL = process.env.ELEVENLABS_API_URL || "https://api.elevenlabs.io/v1/convai/conversations";
const AGENTS_LIST_URL = "https://api.elevenlabs.io/v1/convai/agents";

// Fetch all agent IDs from the account
async function fetchAllAgentIds(): Promise<string[]> {
    const allAgents: any[] = [];
    let cursor = null;
    const maxPages = 100;
    let page = 0;

    try {
        do {
            const url = new URL(AGENTS_LIST_URL);
            url.searchParams.append('page_size', '100');
            if (cursor) {
                url.searchParams.append('cursor', cursor);
            }

            const res = await fetch(url.toString(), {
                headers: {
                    'xi-api-key': API_KEY!,
                },
            });

            if (!res.ok) {
                console.error(`Error fetching agents list: ${res.status}`);
                break;
            }

            const data = await res.json();
            const agents = data.agents || [];
            allAgents.push(...agents);
            cursor = data.next_cursor;
            page++;

        } while (cursor && page < maxPages);

        return allAgents.map(agent => agent.agent_id).filter(id => id);
    } catch (e) {
        console.error('Exception fetching agents list', e);
        return [];
    }
}

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const startParam = searchParams.get('start');

    if (!startParam) {
        return NextResponse.json({ error: 'Missing start parameter (unix timestamp)' }, { status: 400 });
    }

    const startUnix = parseInt(startParam);

    // If no agent IDs configured, fetch all from account
    let AGENT_IDS = CONFIGURED_AGENT_IDS;
    if (AGENT_IDS.length === 0) {
        console.log('No agent IDs configured, fetching all agents from account...');
        AGENT_IDS = await fetchAllAgentIds();
        console.log(`Found ${AGENT_IDS.length} agents in account`);
    }

    if (AGENT_IDS.length === 0) {
        return NextResponse.json({ error: 'No Agent IDs found' }, { status: 500 });
    }

    let allConversations: any[] = [];

    try {
        // Fetch for each agent
        // We can do this in parallel
        const promises = AGENT_IDS.map(async (agentId) => {
            let cursor = null;
            let agentConversations: any[] = [];
            const maxPages = 1000; // Allow up to 100k conversations per agent (100 per page)
            let page = 0;

            try {
                do {
                    const url = new URL(BASE_URL);
                    url.searchParams.append('agent_id', agentId);
                    url.searchParams.append('page_size', '100');
                    url.searchParams.append('call_start_after_unix', startUnix.toString());
                    if (cursor) {
                        url.searchParams.append('cursor', cursor);
                    }

                    const res = await fetch(url.toString(), {
                        headers: {
                            'xi-api-key': API_KEY!, // We made sure it exists or env error
                        },
                    });

                    if (!res.ok) {
                        console.error(`Error fetching for agent ${agentId}: ${res.status}`);
                        // If one agent fails, we continue with others? 
                        // Let's break this loop but return what we got.
                        break;
                    }

                    const data = await res.json();
                    const conversations = data.conversations || [];
                    agentConversations = [...agentConversations, ...conversations];
                    cursor = data.next_cursor;
                    page++;

                } while (cursor && page < maxPages);
            } catch (e) {
                console.error(`Exception fetching agent ${agentId}`, e);
            }

            return agentConversations;
        });

        const results = await Promise.all(promises);
        allConversations = results.flat();

        // Sort by start time descending (newest first)
        allConversations.sort((a, b) => b.start_time_unix_secs - a.start_time_unix_secs);

        return NextResponse.json({ conversations: allConversations });

    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
