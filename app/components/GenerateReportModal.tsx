'use client';
import { useState } from 'react';
import styles from '../Report.module.css';

interface GenerateReportModalProps {
    onClose: () => void;
    onReportGenerated: (reportData: any) => void;
}

export default function GenerateReportModal({ onClose, onReportGenerated }: GenerateReportModalProps) {
    const [startDate, setStartDate] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [progress, setProgress] = useState<{ current: number; total: number; stage: string } | null>(null);

    const handleGenerate = async () => {
        if (!startDate) {
            setError('Por favor, selecione uma data de início');
            return;
        }

        setLoading(true);
        setError(null);
        setProgress({ current: 0, total: 0, stage: 'Buscando lista de ligações...' });

        try {
            const startUnix = Math.floor(new Date(startDate).getTime() / 1000);

            // 1. Fetch List
            const listRes = await fetch(`/api/conversations?start=${startUnix}`);
            if (!listRes.ok) {
                const errData = await listRes.json();
                throw new Error(errData.error || 'Erro ao buscar lista');
            }
            const listData = await listRes.json();
            const conversations = listData.conversations;

            if (conversations.length === 0) {
                setError('Nenhuma conversa encontrada a partir dessa data.');
                setLoading(false);
                return;
            }

            // 2. Fetch details
            setProgress({ current: 0, total: conversations.length, stage: 'Buscando detalhes das conversas...' });

            const detailsMap: Record<string, any> = {};
            const ids = conversations.map((c: any) => c.conversation_id);

            let completed = 0;

            const fetchDetail = async (id: string, retries = 3) => {
                try {
                    const res = await fetch(`/api/conversation/${id}`);
                    if (res.ok) {
                        const data = await res.json();
                        detailsMap[id] = data;
                    } else if (res.status === 429 && retries > 0) {
                        const waitTime = (4 - retries) * 1000;
                        console.log(`Rate limit hit for ${id}, retrying in ${waitTime}ms...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        return fetchDetail(id, retries - 1);
                    }
                } catch (err) {
                    console.error(`Failed to fetch ${id}`, err);
                } finally {
                    completed++;
                    setProgress(prev => ({ ...prev!, current: completed }));
                }
            };

            const CONCURRENT_LIMIT = parseInt(process.env.NEXT_PUBLIC_CONCURRENT_LIMIT || '8');

            for (let i = 0; i < ids.length; i += CONCURRENT_LIMIT) {
                const batch = ids.slice(i, i + CONCURRENT_LIMIT);
                await Promise.all(batch.map((id: string) => fetchDetail(id)));
            }

            // 3. Calculate Stats
            const { calculateStats } = await import('@/lib/stats');
            const stats = calculateStats(conversations, detailsMap);

            // Add metadata to report
            stats.periodo_inicio = new Date(startDate).toLocaleString('pt-BR');
            stats.gerado_em = new Date().toLocaleString('pt-BR');

            // 4. Save report to server
            const saveRes = await fetch('/api/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(stats),
            });

            if (!saveRes.ok) {
                throw new Error('Erro ao salvar relatório');
            }

            onReportGenerated(stats);

        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.modalOverlay}>
            <div className={styles.modal}>
                <div className={styles.modalHeader}>
                    <h2>Gerar Novo Relatório</h2>
                    <button onClick={onClose} className={styles.closeButton}>×</button>
                </div>

                <div className={styles.modalContent}>
                    {!loading ? (
                        <>
                            <label className={styles.label}>
                                Data de início:
                                <input
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className={styles.input}
                                />
                            </label>

                            {error && <p className={styles.error}>{error}</p>}

                            <div className={styles.modalActions}>
                                <button onClick={onClose} className={styles.cancelButton}>
                                    Cancelar
                                </button>
                                <button onClick={handleGenerate} className={styles.generateButton}>
                                    Gerar Relatório
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className={styles.progressContainer}>
                            <p>{progress?.stage}</p>
                            {progress && progress.total > 0 && (
                                <p>
                                    Progresso: {progress.current} / {progress.total}
                                </p>
                            )}
                            <div className={styles.spinner}></div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
