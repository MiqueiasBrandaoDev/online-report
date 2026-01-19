'use client';

import { useState } from 'react';
import ReportView from './components/ReportView';
import Login from './components/Login';
import { Conversation, ReportData } from '@/lib/types';
import { calculateStats } from '@/lib/stats';
import { checkPassword } from './actions';
import { getPastDate } from '@/lib/utils';
// import styles from './Report.module.css'; // We'll use inline styles for the dashboard to be quick and clean

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Dashboard state
  const [startDate, setStartDate] = useState(getPastDate(1)); // Default 24h
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number; stage: string } | null>(null);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (pwd: string) => {
    const isValid = await checkPassword(pwd);
    if (isValid) setIsAuthenticated(true);
    return isValid;
  };

  const setFilter = (days: number) => {
    setStartDate(getPastDate(days));
  };

  const handleGenerate = async () => {
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

      setProgress({ current: 0, total: conversations.length, stage: `Encontradas ${conversations.length} ligações. Analisando...` });

      // 2. Fetch Details with Concurrency
      const detailsMap: Record<string, any> = {};
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

      for (const id of ids) {
        await fetchDetail(id);
        // 1 second delay between requests as requested
        await new Promise(resolve => setTimeout(resolve, 1000));
      }

      // 3. Calculate Stats
      const stats = calculateStats(conversations, detailsMap);
      setReportData(stats);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (reportData) {
    return (
      <div>
        <ReportView data={reportData} startDate={new Date(startDate).toLocaleString('pt-BR')} />

        {/* Float Action Button to go back */}
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 100 }}>
          <button
            onClick={() => setReportData(null)}
            style={{
              padding: '16px 32px',
              background: '#238636',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(0,0,0,0.3)',
              fontWeight: 600,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg style={{ width: '20px', height: '20px', fill: 'white' }} viewBox="0 0 24 24"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z" /></svg>
            Novo Relatório
          </button>
        </div>
      </div>
    );
  }

  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#e6edf3', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '600px' }}>
        {/* Hero Header */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <h1 style={{ fontSize: '36px', background: 'linear-gradient(90deg, #e6edf3, #8b949e)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', fontWeight: 700, marginBottom: '10px' }}>
            Relatório de Chamadas
          </h1>
          <p style={{ color: '#8b949e', fontSize: '16px' }}>
            Selecione um período para analisar o desempenho dos agentes.
          </p>
        </div>

        <div style={{ background: '#161b22', borderRadius: '16px', border: '1px solid #30363d', padding: '30px', boxShadow: '0 8px 30px rgba(0,0,0,0.4)' }}>

          {/* Filter Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', marginBottom: '24px' }}>
            {[
              { label: 'Últimas 24h', days: 1 },
              { label: '48 Horas', days: 2 },
              { label: '7 Dias', days: 7 },
              { label: 'Todo o Período', days: -1 }
            ].map((opt) => (
              <button
                key={opt.days}
                onClick={() => {
                  if (opt.days === -1) setStartDate("2023-01-01T00:00");
                  else setFilter(opt.days);
                }}
                style={{
                  padding: '12px',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Custom Date Input */}
          <div style={{ marginBottom: '30px' }}>
            <label style={{ display: 'block', marginBottom: '10px', color: '#8b949e', fontSize: '14px', fontWeight: 500 }}>Período Personalizado (Início)</label>
            <div style={{ position: 'relative' }}>
              <input
                type="datetime-local"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                style={{
                  width: '100%',
                  padding: '16px',
                  background: '#0d1117',
                  border: '1px solid #30363d',
                  borderRadius: '8px',
                  color: '#e6edf3',
                  fontSize: '16px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          {/* Generate Button */}
          {!loading && (
            <button
              onClick={handleGenerate}
              style={{
                width: '100%',
                padding: '16px',
                background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '16px',
                cursor: 'pointer',
                fontWeight: 600,
                boxShadow: '0 4px 12px rgba(46, 160, 67, 0.3)',
                transition: 'transform 0.1s'
              }}
            >
              Gerar Análise
            </button>
          )}

          {/* Progress / Loading */}
          {loading && (
            <div style={{ marginTop: '10px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#8b949e' }}>
                <span>{progress?.stage || 'Iniciando...'}</span>
                {progress && progress.total > 0 && <span>{Math.round((progress.current / progress.total) * 100)}%</span>}
              </div>
              <div style={{ height: '6px', background: '#21262d', borderRadius: '4px', overflow: 'hidden' }}>
                <div style={{
                  width: `${progress ? (progress.current / (progress.total || 1)) * 100 : 0}%`,
                  height: '100%',
                  background: '#238636',
                  transition: 'width 0.3s ease'
                }} />
              </div>
              {progress && progress.total > 0 && (
                <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '12px', color: '#8b949e' }}>
                  {progress.current} de {progress.total} ligações
                </div>
              )}
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div style={{ marginTop: '20px', padding: '12px', background: 'rgba(248, 81, 73, 0.1)', color: '#f85149', borderRadius: '8px', fontSize: '14px', border: '1px solid rgba(248, 81, 73, 0.2)' }}>
              {error}
            </div>
          )}

        </div>
      </div>
    </main>
  );
}
