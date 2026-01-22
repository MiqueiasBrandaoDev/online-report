/**
 * Traduz um texto de inglês para português brasileiro usando MyMemory API
 * API gratuita e estável, sem necessidade de chave
 * @param text Texto em inglês para traduzir
 * @returns Texto traduzido para pt-BR
 */
export async function translateToPortuguese(text: string): Promise<string> {
    if (!text || text.trim() === '') {
        return text;
    }

    try {
        const encodedText = encodeURIComponent(text);
        const email = process.env.MYMEMORY_EMAIL || '';
        const emailParam = email ? `&de=${email}` : '';
        const url = `https://api.mymemory.translated.net/get?q=${encodedText}&langpair=en|pt-br${emailParam}`;

        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`HTTP error: ${response.status}`);
        }

        const data = await response.json();

        if (data.responseStatus === 200 && data.responseData?.translatedText) {
            return data.responseData.translatedText;
        }

        // Se não conseguiu traduzir, retorna o original
        return text;
    } catch (error) {
        console.error('Translation error:', error);
        return text;
    }
}
