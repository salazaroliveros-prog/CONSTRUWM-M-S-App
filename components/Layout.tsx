import React, { useState, useEffect } from 'react';
import { COLORS, LOGO_URL } from '../constants';
import { AppView, AppNotification } from '../types';
import { storageService } from '../services/storageService';

interface Props {
  title: string;
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
  children: React.ReactNode;
  currentView?: AppView;
}

const Layout: React.FC<Props> = ({ title, onNavigate, onLogout, children, currentView }) => {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [time, setTime] = useState(new Date());

  useEffect(() => {
    setNotifications(storageService.getNotifications());
    const interval = setInterval(() => {
      setTime(new Date());
      setNotifications(storageService.getNotifications());
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  const unreadCount = notifications.filter(n => !n.read).length;

  const handleOpenNotifs = () => {
    setShowNotifs(!showNotifs);
    if (!showNotifs) {
      storageService.markNotificationsRead();
      setNotifications(storageService.getNotifications());
    }
  };

  const navLinks: { label: string; view: AppView; icon: string }[] = [
    { label: 'DASHBOARD', view: 'DASHBOARD', icon: '🏠' },
    { label: 'OPERACIONES', view: 'INICIO', icon: '⚡' },
    { label: 'PROYECTOS', view: 'PROYECTOS', icon: '🏗️' },
    { label: 'PRESUPUESTOS', view: 'PRESUPUESTOS', icon: '📊' },
    { label: 'COMPRAS', view: 'COMPRAS', icon: '🛒' },
    { label: 'RRHH', view: 'RRHH', icon: '👥' },
    { label: 'FINANZAS', view: 'FINANZAS', icon: '🏛️' },
    { label: 'EDITOR IA', view: 'IMAGE_EDITOR', icon: '🪄' },
    { label: 'REPORTES', view: 'REPORTES', icon: '📄' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#f8fafc]">
      {/* Header Corporativo */}
      <header className="sticky top-0 z-[100] bg-[#001f3f] px-6 shadow-2xl no-print border-b-4 border-[#b8860b]">
        <div className="max-w-7xl mx-auto py-4 flex items-center justify-between">
          <div className="flex items-center gap-6 cursor-pointer group" onClick={() => onNavigate('DASHBOARD')}>
            <div className="h-16 w-auto overflow-hidden transition-transform group-hover:scale-105 duration-300">
               <img src={LOGO_URL} alt="M&S/WM Constructora" className="h-full w-auto object-contain drop-shadow-lg" />
            </div>
            <div className="hidden sm:block border-l border-white/20 pl-6">
              <h1 className="text-lg font-black text-white tracking-widest leading-tight uppercase">WM CONSTRUCTORA</h1>
              <p className="text-[8px] uppercase tracking-[0.4em] text-[#b8860b] mt-1 font-black">Edificando el Futuro</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div className="hidden lg:block text-right border-r border-slate-700 pr-6">
              <p className="text-white font-black text-[10px] uppercase tracking-widest">{time.toLocaleDateString('es-GT', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
              <p className="text-[#b8860b] font-mono text-xs font-bold">{time.toLocaleTimeString()}</p>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={handleOpenNotifs} className="relative p-2.5 text-white hover:bg-white/10 rounded-2xl transition-all border border-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
                {unreadCount > 0 && <span className="absolute top-0 right-0 w-5 h-5 bg-red-600 text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#001f3f]">{unreadCount}</span>}
              </button>

              <button onClick={onLogout} className="px-5 py-2.5 bg-red-600 text-white font-black rounded-2xl text-[10px] hover:bg-red-700 shadow-xl active:scale-95 transition-all uppercase tracking-widest border border-red-500/20">SALIR</button>
            </div>
          </div>
        </div>

        {/* Navegación Desktop Principal */}
        <div className="hidden md:block max-w-7xl mx-auto overflow-x-auto no-scrollbar">
          <nav className="flex items-center gap-2 py-3">
            {navLinks.map((link) => (
              <button
                key={link.view}
                onClick={() => onNavigate(link.view)}
                className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap border
                  ${currentView === link.view 
                    ? 'bg-[#b8860b] text-white border-[#b8860b] shadow-lg' 
                    : 'text-slate-300 border-transparent hover:text-white hover:bg-white/5'}`}
              >
                <span className="text-base opacity-90">{link.icon}</span>
                {link.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 md:p-8">
        <div className="max-w-7xl mx-auto fade-in">
          <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4 no-print border-b border-slate-200 pb-6">
            <div>
              <p className="text-[10px] font-black text-[#b8860b] uppercase tracking-[0.5em] mb-2">M&S SYSTEM PRO 2.5</p>
              <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">{title}</h2>
            </div>
            <div className="flex items-center gap-3">
               <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-xl shadow-inner border border-slate-200">👤</div>
               <div>
                  <p className="text-[10px] font-black text-slate-800 uppercase leading-none">Administrador Maestro</p>
                  <p className="text-[8px] font-bold text-slate-400 uppercase mt-1 tracking-widest">Acceso Nivel 1</p>
               </div>
            </div>
          </div>
          {children}
        </div>
      </main>

      {/* Navegación Móvil */}
      <nav className="sticky bottom-0 z-[100] md:hidden flex justify-around p-4 bg-[#001f3f] shadow-[0_-10px_30px_rgba(0,0,0,0.3)] border-t-4 border-[#b8860b] no-print">
        {navLinks.slice(0, 4).concat(navLinks.slice(7)).map((link) => (
          <button 
            key={link.view} 
            onClick={() => onNavigate(link.view)} 
            className={`flex flex-col items-center gap-1.5 transition-all ${currentView === link.view ? 'scale-110' : 'opacity-40'}`}
          >
            <span className="text-2xl">{link.icon}</span>
            <span className={`text-[9px] font-black uppercase tracking-tighter ${currentView === link.view ? 'text-[#b8860b]' : 'text-slate-400'}`}>
              {link.label === 'DASHBOARD' ? 'INICIO' : link.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
};

export default Layout;