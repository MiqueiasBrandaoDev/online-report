export function formatarDuracao(segundos: number): string {
    const minutos = Math.floor(segundos / 60);
    const segs = Math.floor(segundos % 60);
    return `${minutos}:${segs.toString().padStart(2, '0')}`;
}

export function formatarDataHora(isoString: string): string {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    // User wants Brasilia time.
    // Assuming the browser locale handles it or we force it.
    // The python script forces Brasilia.
    // In JS, we can use toLocaleString with timeZone: 'America/Sao_Paulo'
    return date.toLocaleString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }).replace(',', ' às'); // "dd/mm hh:mm" -> "dd/mm às hh:mm" roughly, but let's check format
}

export function formatarData(isoString: string): string {
    if (!isoString) return "N/A";
    const date = new Date(isoString);
    return date.toLocaleDateString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        day: '2-digit',
        month: '2-digit'
    }) + " " + date.toLocaleTimeString('pt-BR', {
        timeZone: 'America/Sao_Paulo',
        hour: '2-digit',
        minute: '2-digit'
    });
}
