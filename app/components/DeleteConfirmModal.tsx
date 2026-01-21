'use client';

import { useState, useEffect } from 'react';
import styles from '../Report.module.css';

interface DeleteConfirmModalProps {
    isOpen: boolean;
    conversationId: string;
    phoneNumber?: string;
    onClose: () => void;
    onDeleted: (conversationId: string) => void;
}

export default function DeleteConfirmModal({
    isOpen,
    conversationId,
    phoneNumber,
    onClose,
    onDeleted
}: DeleteConfirmModalProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);
    const [shake, setShake] = useState(false);

    // Reset state when modal opens/closes
    useEffect(() => {
        if (isOpen) {
            setPassword('');
            setError(null);
            setSuccess(false);
            setLoading(false);
        }
    }, [isOpen]);

    // Handle escape key
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen && !loading) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleEscape);
        return () => window.removeEventListener('keydown', handleEscape);
    }, [isOpen, loading, onClose]);

    const handleDelete = async () => {
        if (!password.trim()) {
            setError('Digite a senha de administrador');
            setShake(true);
            setTimeout(() => setShake(false), 500);
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const res = await fetch(`/api/conversation/${conversationId}`, {
                method: 'DELETE',
                headers: {
                    'X-Admin-Password': password,
                },
            });

            const data = await res.json();

            if (!res.ok) {
                if (res.status === 401) {
                    setError('Senha de administrador incorreta');
                    setShake(true);
                    setTimeout(() => setShake(false), 500);
                } else {
                    setError(data.error || 'Erro ao deletar conversa');
                }
                setLoading(false);
                return;
            }

            // Sucesso!
            setSuccess(true);
            setTimeout(() => {
                onDeleted(conversationId);
                onClose();
            }, 1500);

        } catch (err: any) {
            setError(err.message || 'Erro de conexão');
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className={styles.deleteModalOverlay} onClick={!loading ? onClose : undefined}>
            <div
                className={`${styles.deleteModal} ${shake ? styles.shake : ''} ${success ? styles.success : ''}`}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Ícone animado */}
                <div className={`${styles.deleteIconContainer} ${success ? styles.successIcon : ''}`}>
                    {success ? (
                        <svg viewBox="0 0 24 24" className={styles.checkIcon}>
                            <path
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                d="M5 13l4 4L19 7"
                            />
                        </svg>
                    ) : (
                        <svg viewBox="0 0 24 24" className={styles.trashIcon}>
                            <path
                                fill="currentColor"
                                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                            />
                        </svg>
                    )}
                </div>

                {/* Conteúdo */}
                {success ? (
                    <div className={styles.deleteSuccessContent}>
                        <h3>Conversa Deletada!</h3>
                        <p>A conversa foi removida com sucesso.</p>
                    </div>
                ) : (
                    <>
                        <h3 className={styles.deleteTitle}>Deletar Conversa</h3>
                        <p className={styles.deleteDescription}>
                            Esta ação é <strong>irreversível</strong>. A conversa será permanentemente
                            removida do sistema.
                        </p>

                        {phoneNumber && (
                            <div className={styles.deleteInfo}>
                                <span className={styles.deleteInfoLabel}>Telefone:</span>
                                <span className={styles.deleteInfoValue}>{phoneNumber}</span>
                            </div>
                        )}

                        <div className={styles.deleteInfo}>
                            <span className={styles.deleteInfoLabel}>ID:</span>
                            <span className={styles.deleteInfoValue}>{conversationId.slice(0, 20)}...</span>
                        </div>

                        <div className={styles.deletePasswordSection}>
                            <label className={styles.deletePasswordLabel}>
                                Senha de Administrador
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDelete()}
                                placeholder="Digite a senha..."
                                className={`${styles.deletePasswordInput} ${error ? styles.inputError : ''}`}
                                autoFocus
                                disabled={loading}
                            />
                            {error && (
                                <span className={styles.deleteError}>{error}</span>
                            )}
                        </div>

                        <div className={styles.deleteActions}>
                            <button
                                onClick={onClose}
                                className={styles.deleteCancelBtn}
                                disabled={loading}
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleDelete}
                                className={styles.deleteConfirmBtn}
                                disabled={loading}
                            >
                                {loading ? (
                                    <span className={styles.deleteLoadingSpinner} />
                                ) : (
                                    <>
                                        <svg viewBox="0 0 24 24" width="16" height="16">
                                            <path
                                                fill="currentColor"
                                                d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"
                                            />
                                        </svg>
                                        Deletar
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
