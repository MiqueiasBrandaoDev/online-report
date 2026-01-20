'use client';
import { useState, useMemo } from 'react';
import styles from '../Report.module.css';
import { ProcessedSession } from '@/lib/types';

interface DateRangeFilterProps {
    /** Array de todas as sessões do relatório */
    sessoes: ProcessedSession[];
    /** Callback chamado quando o filtro é aplicado */
    onFilter: (filteredSessoes: ProcessedSession[]) => void;
    /** Callback chamado quando o filtro é limpo */
    onClear: () => void;
}

/**
 * Componente de filtro de data para o dashboard
 *
 * Permite filtrar sessões por período usando inputs de data nativos.
 * Apenas datas dentro do range do relatório são permitidas (min/max).
 */
export default function DateRangeFilter({ sessoes, onFilter, onClear }: DateRangeFilterProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');
    const [isFiltered, setIsFiltered] = useState(false);

    // Calcula min e max das datas disponíveis nas sessões
    const dateRange = useMemo(() => {
        if (!sessoes || sessoes.length === 0) return { min: '', max: '', minFormatted: '', maxFormatted: '' };

        const dates = sessoes.map(s => new Date(s.horario).getTime());
        const minDate = new Date(Math.min(...dates));
        const maxDate = new Date(Math.max(...dates));

        // Formato YYYY-MM-DD para input type="date"
        const formatForInput = (d: Date) => d.toISOString().split('T')[0];

        // Formato DD/MM para exibição
        const formatForDisplay = (d: Date) => d.toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            timeZone: 'America/Sao_Paulo'
        });

        return {
            min: formatForInput(minDate),
            max: formatForInput(maxDate),
            minFormatted: formatForDisplay(minDate),
            maxFormatted: formatForDisplay(maxDate)
        };
    }, [sessoes]);

    // Aplica o filtro
    const handleApplyFilter = () => {
        if (!startDate || !endDate) return;

        const start = new Date(startDate + 'T00:00:00');
        const end = new Date(endDate + 'T23:59:59');

        console.log('DateRangeFilter - Aplicando filtro:', { startDate, endDate, start: start.toISOString(), end: end.toISOString() });
        console.log('Total de sessões recebidas:', sessoes.length);

        const filtered = sessoes.filter(sessao => {
            const sessaoDate = new Date(sessao.horario);
            return sessaoDate >= start && sessaoDate <= end;
        });

        console.log('Sessões após filtro:', filtered.length);

        onFilter(filtered);
        setIsFiltered(true);
        setIsOpen(false);
    };

    // Limpa o filtro
    const handleClear = () => {
        setStartDate('');
        setEndDate('');
        setIsFiltered(false);
        onClear();
    };

    // Formata o range selecionado para exibição no botão
    const formatSelectedRange = () => {
        if (!startDate || !endDate) {
            return 'Filtrar por data';
        }
        const formatDate = (dateStr: string) => {
            const [year, month, day] = dateStr.split('-');
            return `${day}/${month}`;
        };
        return `${formatDate(startDate)} - ${formatDate(endDate)}`;
    };

    // Se não houver sessões ou range válido, não renderiza
    if (!sessoes || sessoes.length === 0 || !dateRange.min || !dateRange.max) {
        return null;
    }

    return (
        <div className={styles.dateFilterWrapper}>
            <button
                className={styles.dateFilterToggle}
                onClick={() => setIsOpen(!isOpen)}
                type="button"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M19 4h-1V2h-2v2H8V2H6v2H5c-1.11 0-1.99.9-1.99 2L3 20c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H5V9h14v11zM9 11H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2zm-8 4H7v2h2v-2zm4 0h-2v2h2v-2zm4 0h-2v2h2v-2z" />
                </svg>
                <span>{formatSelectedRange()}</span>
                <svg
                    width="12"
                    height="12"
                    viewBox="0 0 24 24"
                    fill="currentColor"
                    style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
                >
                    <path d="M7 10l5 5 5-5z" />
                </svg>
            </button>

            {isFiltered && (
                <button
                    className={styles.clearFilterButton}
                    onClick={handleClear}
                    title="Limpar filtro"
                    type="button"
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
                    </svg>
                </button>
            )}

            {isOpen && (
                <>
                    <div className={styles.calendarBackdrop} onClick={() => setIsOpen(false)} />
                    <div className={styles.calendarDropdown}>
                        <div className={styles.dateFilterHeader}>
                            <span>Filtrar por período</span>
                            <span className={styles.dateFilterHint}>
                                Datas disponíveis: {dateRange.minFormatted} - {dateRange.maxFormatted}
                            </span>
                        </div>

                        <div className={styles.dateInputsRow}>
                            <div className={styles.dateInputGroup}>
                                <label className={styles.dateInputLabel}>Data inicial</label>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    min={dateRange.min}
                                    max={endDate || dateRange.max}
                                />
                            </div>
                            <div className={styles.dateInputGroup}>
                                <label className={styles.dateInputLabel}>Data final</label>
                                <input
                                    type="date"
                                    className={styles.dateInput}
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    min={startDate || dateRange.min}
                                    max={dateRange.max}
                                />
                            </div>
                        </div>

                        <div className={styles.calendarActions}>
                            <button
                                className={styles.calendarCancelBtn}
                                onClick={() => setIsOpen(false)}
                                type="button"
                            >
                                Cancelar
                            </button>
                            <button
                                className={styles.calendarApplyBtn}
                                onClick={handleApplyFilter}
                                disabled={!startDate || !endDate}
                                type="button"
                            >
                                Aplicar Filtro
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
    );
}
