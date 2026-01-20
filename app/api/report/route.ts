import { NextResponse } from 'next/server';
import { promises as fs } from 'fs';
import path from 'path';

const REPORT_FILE = path.join(process.cwd(), 'data', 'latest-report.json');

// GET - Load existing report
export async function GET() {
    try {
        const data = await fs.readFile(REPORT_FILE, 'utf-8');
        const report = JSON.parse(data);
        return NextResponse.json(report);
    } catch (error: any) {
        // File doesn't exist or error reading
        if (error.code === 'ENOENT') {
            return NextResponse.json({ exists: false }, { status: 404 });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// POST - Save new report (deletes previous one automatically)
export async function POST(request: Request) {
    try {
        const reportData = await request.json();

        // Ensure data directory exists
        const dataDir = path.join(process.cwd(), 'data');
        await fs.mkdir(dataDir, { recursive: true });

        // Save report (overwrites previous)
        await fs.writeFile(REPORT_FILE, JSON.stringify(reportData, null, 2));

        return NextResponse.json({ success: true, message: 'Report saved successfully' });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

// DELETE - Delete existing report
export async function DELETE() {
    try {
        await fs.unlink(REPORT_FILE);
        return NextResponse.json({ success: true, message: 'Report deleted successfully' });
    } catch (error: any) {
        if (error.code === 'ENOENT') {
            return NextResponse.json({ success: true, message: 'No report to delete' });
        }
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
