import { NextResponse } from 'next/server';

// Whitelist de telefones a ignorar (números de teste)
const WHITELIST_PHONES_RAW = process.env.WHITELIST_PHONES || '';
const WHITELIST_PHONES = WHITELIST_PHONES_RAW
    .split(',')
    .map(phone => phone.trim().replace(/\D/g, '')) // Remove tudo que não é dígito
    .filter(phone => phone.length > 0);

export async function GET() {
    return NextResponse.json({ phones: WHITELIST_PHONES });
}
