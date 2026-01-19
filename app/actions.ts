'use server';

const ACCESS_PASSWORD = process.env.ACCESS_PASSWORD || "admin123";

export async function checkPassword(password: string): Promise<boolean> {
    // Simple equality check
    // In a real app we might use timingSafeEqual but for this requirement it's fine
    return password === ACCESS_PASSWORD;
}
