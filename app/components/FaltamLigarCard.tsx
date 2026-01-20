'use client';

import { useEffect, useState } from 'react';
import styles from './FaltamLigarCard.module.css';
import AnimatedCounter from './AnimatedCounter';

export default function FaltamLigarCard() {
    const [faltamLigar, setFaltamLigar] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const response = await fetch('/api/faltam-ligar');
                const data = await response.json();

                if (data.faltam_ligar !== null && data.faltam_ligar !== undefined) {
                    setFaltamLigar(data.faltam_ligar);
                    setError(false);
                } else {
                    // Webhook indisponível, mas não é erro crítico
                    setFaltamLigar(null);
                    setError(false);
                }
            } catch (err) {
                console.error('Erro ao buscar faltam_ligar:', err);
                setError(true);
            } finally {
                setLoading(false);
            }
        }

        fetchData();

        // Atualiza a cada 5 minutos
        const interval = setInterval(fetchData, 5 * 60 * 1000);
        return () => clearInterval(interval);
    }, []);

    if (loading) {
        return (
            <div className={styles.card}>
                <div className={styles.glassLayer} />
                <div className={styles.content}>
                    <div className={styles.loadingPulse} />
                </div>
            </div>
        );
    }

    if (error || faltamLigar === null) {
        return null;
    }

    return (
        <div className={styles.card}>
            <div className={styles.glassLayer} />
            <div className={styles.accentGlow} />

            <div className={styles.content}>
                <div className={styles.iconWrapper}>
                    <svg viewBox="0 0 24 24" className={styles.icon}>
                        <path d="M20 15.5c-1.25 0-2.45-.2-3.57-.57-.35-.11-.74-.03-1.02.24l-2.2 2.2c-2.83-1.44-5.15-3.75-6.59-6.59l2.2-2.21c.28-.26.36-.65.25-1C8.7 6.45 8.5 5.25 8.5 4c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1 0 9.39 7.61 17 17 17 .55 0 1-.45 1-1v-3.5c0-.55-.45-1-1-1z" />
                    </svg>
                    <div className={styles.badge}>
                        <svg viewBox="0 0 24 24" width="10" height="10">
                            <path fill="currentColor" d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z" />
                        </svg>
                    </div>
                </div>

                <div className={styles.info}>
                    <span className={styles.label}>Faltam Ligar</span>
                    <span className={styles.value}>
                        <AnimatedCounter value={faltamLigar} duration={1200} />
                    </span>
                    <span className={styles.sublabel}>leads pendentes</span>
                </div>
            </div>

            <div className={styles.progressRing}>
                <svg viewBox="0 0 36 36" className={styles.ringBg}>
                    <circle cx="18" cy="18" r="16" fill="none" strokeWidth="2" />
                </svg>
            </div>
        </div>
    );
}
