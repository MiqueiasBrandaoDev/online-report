'use client';

import { useState, useEffect } from 'react';

interface LoginLog {
    date: string;
    ip: string;
}

export default function LogsPage() {
    const [logs, setLogs] = useState<LoginLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/login-logs')
            .then(res => res.json())
            .then(data => {
                setLogs(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) {
        return <div>Carregando logs...</div>;
    }

    return (
        <div style={{ padding: '20px', fontFamily: 'monospace' }}>
            <h1>Login Logs</h1>
            <p>Total: {logs.length} registros</p>
            <table border={1} cellPadding={8} style={{ borderCollapse: 'collapse' }}>
                <thead>
                    <tr>
                        <th>#</th>
                        <th>Data/Hora</th>
                        <th>IP</th>
                    </tr>
                </thead>
                <tbody>
                    {logs.map((log, index) => (
                        <tr key={index}>
                            <td>{index + 1}</td>
                            <td>{new Date(log.date).toLocaleString('pt-BR')}</td>
                            <td>{log.ip}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {logs.length === 0 && <p>Nenhum login registrado ainda.</p>}
        </div>
    );
}
