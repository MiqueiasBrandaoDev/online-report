'use client';

import { useState } from 'react';

interface LoginProps {
    onLogin: (password: string) => Promise<boolean>;
}

export default function Login({ onLogin }: LoginProps) {
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(false);

        const success = await onLogin(password);
        if (!success) {
            setError(true);
            setLoading(false);
        }
        // If success, parent component handles redirection/state
    };

    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: '#0d1117',
            padding: '20px'
        }}>
            <div style={{
                background: '#161b22',
                border: '1px solid #30363d',
                borderRadius: '12px',
                padding: '32px',
                width: '100%',
                maxWidth: '400px',
                textAlign: 'center'
            }}>
                <div style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '12px',
                    background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
                    margin: '0 auto 24px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <svg style={{ width: '24px', height: '24px', fill: 'white' }} viewBox="0 0 24 24"><path d="M12 17c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm6-9h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zM8.9 6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2H8.9V6z" /></svg>
                </div>

                <h2 style={{ fontSize: '24px', color: '#e6edf3', marginBottom: '8px', fontWeight: 600 }}>Acesso Restrito</h2>
                <p style={{ color: '#8b949e', marginBottom: '24px', fontSize: '14px' }}>Digite a senha para acessar o relatório de chamadas.</p>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Senha de acesso"
                        style={{
                            width: '100%',
                            padding: '12px',
                            borderRadius: '6px',
                            border: `1px solid ${error ? '#f85149' : '#30363d'}`,
                            background: '#0d1117',
                            color: '#e6edf3',
                            fontSize: '16px',
                            outline: 'none'
                        }}
                    />
                    {error && <span style={{ color: '#f85149', fontSize: '12px', textAlign: 'left' }}>Senha incorreta.</span>}

                    <button
                        type="submit"
                        disabled={loading}
                        style={{
                            padding: '12px',
                            borderRadius: '6px',
                            border: 'none',
                            background: '#238636',
                            color: 'white',
                            fontSize: '16px',
                            fontWeight: 600,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
                        }}
                    >
                        {loading ? 'Verificando...' : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}
