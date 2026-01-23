'use server';

import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

const LOGS_FILE = path.join(process.cwd(), 'data', 'login-logs.json');

interface LoginLog {
    date: string;
    ip: string;
}

async function ensureDataDir() {
    const dataDir = path.join(process.cwd(), 'data');
    try {
        await fs.access(dataDir);
    } catch {
        await fs.mkdir(dataDir, { recursive: true });
    }
}

async function getLogs(): Promise<LoginLog[]> {
    try {
        const data = await fs.readFile(LOGS_FILE, 'utf-8');
        return JSON.parse(data);
    } catch {
        return [];
    }
}

async function saveLogs(logs: LoginLog[]) {
    await ensureDataDir();
    await fs.writeFile(LOGS_FILE, JSON.stringify(logs, null, 2));
}

// GET - Retorna todos os logs
export async function GET() {
    const logs = await getLogs();
    return NextResponse.json(logs);
}

// POST - Adiciona um novo log de login
export async function POST(request: NextRequest) {
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
        || request.headers.get('x-real-ip')
        || 'unknown';

    const newLog: LoginLog = {
        date: new Date().toISOString(),
        ip
    };

    const logs = await getLogs();
    logs.unshift(newLog); // Adiciona no início (mais recente primeiro)

    // Mantém apenas os últimos 100 logs
    if (logs.length > 100) {
        logs.splice(100);
    }

    await saveLogs(logs);

    return NextResponse.json({ success: true });
}
