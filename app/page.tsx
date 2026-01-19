'use client';

import { useState } from 'react';
import ReportView from './components/ReportView';
import { Conversation, ReportData } from '@/lib/types';
import { calculateStats } from '@/lib/stats';
import styles from './Report.module.css'; // Use same module for container or inline

export default function Home() {
  const [startDate, setStartDate] = useState('');
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate) return;

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
      const conversations: Conversation[] = listData.conversations;

      if (conversations.length === 0) {
        setError('Nenhuma ligação encontrada para este período.');
        setLoading(false);
        return;
      }

      setProgress({ current: 0, total: conversations.length, stage: 'Processando detalhes...' });

      // 2. Fetch Details with Concurrency
      const detailsMap: Record<string, any> = {};
      const concurrency = 5;
      const ids = conversations.map(c => c.conversation_id);

      let completed = 0;

      const fetchDetail = async (id: string) => {
        try {
          const res = await fetch(`/api/conversation/${id}`);
          if (res.ok) {
            const data = await res.json();
            detailsMap[id] = data;
          }
        } catch (err) {
          console.error(`Failed to fetch ${id}`, err);
        } finally {
          completed++;
          setProgress(prev => ({ ...prev!, current: completed }));
        }
      };

      // Concurrency control
      const activePromises: Promise<void>[] = [];

      for (const id of ids) {
        const p = fetchDetail(id).then(() => {
          activePromises.splice(activePromises.indexOf(p), 1);
        });
        activePromises.push(p);
        if (activePromises.length >= concurrency) {
          await Promise.race(activePromises);
        }
      }
      await Promise.all(activePromises);

      // 3. Calculate Stats
      const stats = calculateStats(conversations, detailsMap);
      setReportData(stats);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (reportData) {
    return (
      <div>
        <ReportView data={reportData} startDate={new Date(startDate).toLocaleString('pt-BR')} />
        <div style={{ textAlign: 'center', padding: '20px', background: '#0d1117' }}>
          <button
            onClick={() => setReportData(null)}
            style={{
              padding: '10px 20px',
              background: '#238636',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer'
            }}
          >
            Gerar Novo Relatório
          </button>
        </div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#e6edf3' }}>
      <div style={{ padding: '40px', background: '#161b22', borderRadius: '12px', border: '1px solid #30363d', maxWidth: '500px', width: '100%' }}>
        <h1 style={{ marginBottom: '24px', fontSize: '24px', textAlign: 'center' }}>Gerador de Relatório</h1>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', color: '#8b949e' }}>Data de Início</label>
            <input
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '12px',
                background: '#0d1117',
                border: '1px solid #30363d',
                borderRadius: '6px',
                color: '#e6edf3',
                fontSize: '16px'
              }}
            />
          </div>

          {!loading && (
            <button
              type="submit"
              style={{
                padding: '12px',
                background: '#238636',
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 600
              }}
            >
              Gerar Relatório
            </button>
          )}
        </form>

        {loading && progress && (
          <div style={{ marginTop: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#8b949e' }}>
              <span>{progress.stage}</span>
              {progress.total > 0 && <span>{Math.round((progress.current / progress.total) * 100)}%</span>}
            </div>
            {progress.total > 0 && (
              <div style={{ height: '8px', background: '#21262d', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${(progress.current / progress.total) * 100}%`,
                  height: '100%',
                  background: '#238636',
                  transition: 'width 0.3s ease'
                }} />
              </div>
            )}
            {progress.total > 0 && <div style={{ textAlign: 'center', marginTop: '4px', fontSize: '12px', color: '#8b949e' }}>{progress.current} de {progress.total}</div>}
          </div>
        )}

        {error && (
          <div style={{ marginTop: '24px', padding: '12px', background: 'rgba(248, 81, 73, 0.1)', color: '#f85149', borderRadius: '6px', fontSize: '14px' }}>
            {error}
          </div>
        )}
      </div>
    </main>
  );
}
