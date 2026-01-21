'use client';

import { useState, useEffect } from 'react';
import ReportView from './components/ReportView';
import Login from './components/Login';
import GenerateReportModal from './components/GenerateReportModal';
import FaltamLigarCard from './components/FaltamLigarCard';
import { ReportData } from '@/lib/types';
import { checkPassword } from './actions';

const STORAGE_KEY = 'report_access_token';

export default function Home() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [checkingStoredAuth, setCheckingStoredAuth] = useState(true);

  // Verifica se há senha salva no LocalStorage ao carregar
  useEffect(() => {
    const checkStoredPassword = async () => {
      try {
        const storedPassword = localStorage.getItem(STORAGE_KEY);
        if (storedPassword) {
          const isValid = await checkPassword(storedPassword);
          if (isValid) {
            setIsAuthenticated(true);
            loadExistingReport();
          } else {
            // Senha salva não é mais válida, remove do storage
            localStorage.removeItem(STORAGE_KEY);
          }
        }
      } catch {
        // LocalStorage não disponível (SSR ou privado)
      }
      setCheckingStoredAuth(false);
    };

    checkStoredPassword();
  }, []);

  const handleLogin = async (pwd: string) => {
    const isValid = await checkPassword(pwd);
    if (isValid) {
      // Salva a senha no LocalStorage para próximos acessos
      try {
        localStorage.setItem(STORAGE_KEY, pwd);
      } catch {
        // LocalStorage não disponível
      }
      setIsAuthenticated(true);
      // Load existing report after successful login
      loadExistingReport();
    }
    return isValid;
  };

  const loadExistingReport = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/report');
      if (res.ok) {
        const data = await res.json();
        if (data.exists !== false) {
          setReportData(data);
        } else {
          // No report exists, show modal to generate
          setShowModal(true);
        }
      } else {
        // No report exists
        setShowModal(true);
      }
    } catch (err) {
      console.error('Error loading report:', err);
      setShowModal(true);
    } finally {
      setLoading(false);
    }
  };

  const handleReportGenerated = (data: ReportData) => {
    setReportData(data);
    setShowModal(false);
  };

  const handleGenerateNew = () => {
    setShowModal(true);
  };

  // Recarrega os dados do relatório após uma conversa ser deletada
  const handleDataUpdate = async () => {
    try {
      const res = await fetch('/api/report');
      if (res.ok) {
        const data = await res.json();
        if (data.exists !== false) {
          setReportData(data);
        }
      }
    } catch (err) {
      console.error('Error reloading report:', err);
    }
  };

  // Mostra loading enquanto verifica senha salva
  if (checkingStoredAuth) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#e6edf3' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #30363d',
            borderTop: '4px solid #238636',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#8b949e' }}>Verificando acesso...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  if (!isAuthenticated) {
    return <Login onLogin={handleLogin} />;
  }

  if (loading) {
    return (
      <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#e6edf3' }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #30363d',
            borderTop: '4px solid #238636',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 20px'
          }}></div>
          <p style={{ color: '#8b949e' }}>Carregando painel...</p>
        </div>
        <style jsx>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </main>
    );
  }

  if (reportData) {
    return (
      <div>
        <ReportView data={reportData} startDate={reportData.periodo_inicio || 'N/A'} onDataUpdate={handleDataUpdate} />

        {/* Card de Faltam Ligar */}
        <FaltamLigarCard />

        {/* Float Action Button to generate new report */}
        <div style={{ position: 'fixed', bottom: '30px', right: '30px', zIndex: 100 }}>
          <button
            onClick={handleGenerateNew}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '50px',
              cursor: 'pointer',
              boxShadow: '0 4px 12px rgba(46, 160, 67, 0.3)',
              fontWeight: 600,
              fontSize: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <svg style={{ width: '20px', height: '20px', fill: 'white' }} viewBox="0 0 24 24">
              <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z" />
            </svg>
            Gerar Novo Relatório
          </button>
        </div>

        {showModal && (
          <GenerateReportModal
            onClose={() => setShowModal(false)}
            onReportGenerated={handleReportGenerated}
          />
        )}
      </div>
    );
  }

  // No report loaded yet, show empty state
  return (
    <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0d1117', color: '#e6edf3', padding: '20px' }}>
      {showModal ? (
        <GenerateReportModal
          onClose={() => setShowModal(false)}
          onReportGenerated={handleReportGenerated}
        />
      ) : (
        <div style={{ textAlign: 'center' }}>
          <h1 style={{ fontSize: '36px', color: '#e6edf3', marginBottom: '20px' }}>
            Nenhum relatório disponível
          </h1>
          <button
            onClick={() => setShowModal(true)}
            style={{
              padding: '16px 32px',
              background: 'linear-gradient(135deg, #238636 0%, #2ea043 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '16px',
              cursor: 'pointer',
              fontWeight: 600,
              boxShadow: '0 4px 12px rgba(46, 160, 67, 0.3)'
            }}
          >
            Gerar Primeiro Relatório
          </button>
        </div>
      )}
    </main>
  );
}
