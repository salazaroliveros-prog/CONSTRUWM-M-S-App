
import React, { useState, useEffect } from 'react';
import { AppView } from './types';
import { storageService } from './services/storageService';

// Module Imports
import LoginView from './components/LoginView';
import DashboardView from './components/DashboardView';
import InicioView from './components/InicioView';
import ProyectosView from './components/ProyectosView';
import PresupuestosView from './components/PresupuestosView';
import SeguimientoView from './components/SeguimientoView';
import ComprasView from './components/ComprasView';
import RRHHView from './components/RRHHView';
import FinanzasView from './components/FinanzasView';
import WorkerPortal from './components/WorkerPortal';
import ReportesView from './components/ReportesView';
import ImageEditorView from './components/ImageEditorView';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>('LOGIN');
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    // Detect worker portal mode via URL (Simulated for this environment)
    const params = new URLSearchParams(window.location.search);
    if (params.get('portal')) {
      setView('WORKER_PORTAL');
    }
  }, []);

  const navigate = (newView: AppView) => setView(newView);

  const handleLogin = (success: boolean) => {
    if (success) {
      setIsAdmin(true);
      setView('DASHBOARD');
    }
  };

  const handleLogout = () => {
    setIsAdmin(false);
    setView('LOGIN');
  };

  const renderView = () => {
    switch (view) {
      case 'LOGIN': return <LoginView onLogin={handleLogin} />;
      case 'DASHBOARD': return <DashboardView onNavigate={navigate} onLogout={handleLogout} />;
      case 'INICIO': return <InicioView onNavigate={navigate} onLogout={handleLogout} />;
      case 'PROYECTOS': return <ProyectosView onNavigate={navigate} onLogout={handleLogout} />;
      case 'PRESUPUESTOS': return <PresupuestosView onNavigate={navigate} onLogout={handleLogout} />;
      case 'SEGUIMIENTO': return <SeguimientoView onNavigate={navigate} onLogout={handleLogout} />;
      case 'COMPRAS': return <ComprasView onNavigate={navigate} onLogout={handleLogout} />;
      case 'RRHH': return <RRHHView onNavigate={navigate} onLogout={handleLogout} />;
      case 'FINANZAS': return <FinanzasView onNavigate={navigate} onLogout={handleLogout} />;
      case 'REPORTES': return <ReportesView onNavigate={navigate} onLogout={handleLogout} />;
      case 'IMAGE_EDITOR': return <ImageEditorView onNavigate={navigate} onLogout={handleLogout} />;
      case 'WORKER_PORTAL': return <WorkerPortal onNavigate={navigate} />;
      default: return <LoginView onLogin={handleLogin} />;
    }
  };

  return (
    <div className="min-h-screen">
      {renderView()}
    </div>
  );
};

export default App;
