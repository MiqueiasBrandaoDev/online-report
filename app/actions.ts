'use server';

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "admin123";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin456";

/**
 * Verifica senha de login (acesso ao sistema)
 */
export async function checkPassword(password: string): Promise<boolean> {
    return password === ACCESS_PASSWORD;
}

/**
 * Verifica senha de administrador (ações destrutivas)
 */
export async function checkAdminPassword(password: string): Promise<boolean> {
    return password === ADMIN_PASSWORD;
}
