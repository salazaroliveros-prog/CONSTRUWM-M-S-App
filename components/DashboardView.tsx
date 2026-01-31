
import React, { useMemo, useState, useEffect } from 'react';
import { AppView } from '../types';
import Layout from './Layout';
import { COLORS, LOGO_URL } from '../constants';
import { storageService } from '../services/storageService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { GoogleGenAI } from "@google/genai";

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

const DashboardView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [aiBriefing, setAiBriefing] = useState<string | null>(null);
  const [isBriefingLoading, setIsBriefingLoading] = useState(false);

  const txs = storageService.getTransactions();
  const projects = storageService.getProjects();
  
  const metrics = useMemo(() => {
    const totalIncome = txs.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
    const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
    const profit = totalIncome - totalExpense;
    return { 
      totalIncome, 
      totalExpense, 
      profit, 
      active: projects.filter(p => p.status === 'ACTIVE').length,
      paused: projects.filter(p => p.status === 'PAUSED').length,
      totalCount: projects.length
    };
  }, [txs, projects]);

  useEffect(() => {
    const getBriefing = async () => {
      setIsBriefingLoading(true);
      try {
        const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
        const prompt = `Actúa como CEO de M&S. Genera un resumen ejecutivo de 2 párrafos basado en: Q${metrics.profit} utilidad, ${metrics.active} obras activas, ${storageService.getEmployees().length} empleados. Usa tono formal.`;
        const response = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: prompt
        });
        setAiBriefing(response.text || null);
      } catch (e) { console.error(e); }
      finally { setIsBriefingLoading(false); }
    };
    getBriefing();
  }, []);

  const barData = [
    { name: 'INGRESOS', val: metrics.totalIncome },
    { name: 'GASTOS', val: metrics.totalExpense },
    { name: 'UTILIDAD', val: metrics.profit }
  ];

  return (
    <Layout title="Consola Maestra de Mando" onNavigate={onNavigate} onLogout={onLogout} currentView="DASHBOARD">
      <div className="space-y-8 pb-20">
        
        {/* Executive Intelligence Briefing */}
        <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative overflow-hidden group border-t-[12px] border-[#b8860b]">
           <div className="absolute top-0 right-0 p-10 opacity-10 group-hover:scale-125 transition-transform duration-1000">
              <img src={LOGO_URL} alt="" className="h-32 grayscale brightness-0 invert" />
           </div>
           <div className="relative z-10 space-y-6">
              <div className="flex items-center gap-4">
                 <div className="w-10 h-10 bg-[#b8860b] rounded-xl flex items-center justify-center text-xl shadow-lg">✨</div>
                 <h2 className="text-xl font-black text-white uppercase tracking-tighter">Executive Intelligence Briefing</h2>
              </div>
              {isBriefingLoading ? (
                 <div className="flex gap-2">
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce"></div>
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-1.5 h-1.5 bg-slate-500 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                 </div>
              ) : (
                 <p className="text-sm text-slate-400 font-medium leading-relaxed max-w-4xl animate-in fade-in slide-in-from-left duration-700">
                   {aiBriefing || "Análisis de portafolio consolidado. Sincronización de flujos de caja y operaciones en campo validada."}
                 </p>
              )}
           </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <StatCard title="Proyectos Activos" value={metrics.active} icon="🏗️" />
          <StatCard title="Capital Operativo" value={`Q${metrics.profit.toLocaleString()}`} color="text-green-600" icon="💰" />
          <StatCard title="Egresos Mes" value={`Q${metrics.totalExpense.toLocaleString()}`} color="text-red-600" icon="📉" />
          <StatCard title="Total Personal" value={storageService.getEmployees().length} color="text-blue-600" icon="👥" />
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 h-[450px]">
            <h3 className="text-[10px] font-black text-slate-400 mb-10 uppercase tracking-[0.4em]">Balance Financiero Corporativo</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'black', fill: '#94a3b8'}} />
                  <YAxis axisLine={false} tickLine={false} tick={{fontSize: 9, fontWeight: 'bold'}} />
                  <Tooltip cursor={{fill: '#f8fafc'}} contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="val" radius={[8, 8, 0, 0]} barSize={40}>
                    {barData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === 2 ? COLORS.MUSTARD : (index === 0 ? '#10b981' : '#ef4444')} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col items-center justify-center text-center space-y-8">
             <div className="w-32 h-32 rounded-full border-[10px] border-slate-50 flex items-center justify-center text-4xl shadow-inner relative">
                <div className="absolute inset-0 border-[10px] border-[#b8860b] rounded-full border-t-transparent animate-spin duration-[3000ms]"></div>
                📊
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Estatus Portafolio</p>
                <p className="text-3xl font-black text-slate-900 tracking-tighter">{metrics.active} / {metrics.totalCount}</p>
                <p className="text-[9px] font-bold text-slate-400 uppercase mt-2">Obras en Ejecución</p>
             </div>
             <button onClick={() => onNavigate('PROYECTOS')} className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-[#b8860b] transition-all shadow-xl">Gestionar Portafolio</button>
          </div>
        </div>

        {/* Executive Menu Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6">
          <MenuButton label="OPERACIONES" icon="⚡" onClick={() => onNavigate('INICIO')} />
          <MenuButton label="PROYECTOS" icon="🏗️" onClick={() => onNavigate('PROYECTOS')} />
          <MenuButton label="PRESUPUESTOS" icon="📊" onClick={() => onNavigate('PRESUPUESTOS')} />
          <MenuButton label="LOGÍSTICA" icon="🛒" onClick={() => onNavigate('COMPRAS')} />
          <MenuButton label="GESTIÓN RRHH" icon="👥" onClick={() => onNavigate('RRHH')} />
          <MenuButton label="FINANZAS" icon="🏛️" onClick={() => onNavigate('FINANZAS')} />
        </div>
      </div>
    </Layout>
  );
};

const StatCard = ({ title, value, color = "text-slate-800", icon }: any) => (
  <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-100 flex items-center justify-between group hover:shadow-xl transition-all duration-500">
    <div>
      <p className="text-[9px] uppercase font-black text-slate-400 mb-2 tracking-[0.2em]">{title}</p>
      <p className={`text-2xl font-black tracking-tighter ${color}`}>{value}</p>
    </div>
    <div className="text-3xl opacity-20 group-hover:opacity-100 transition-opacity grayscale group-hover:grayscale-0">{icon}</div>
  </div>
);

const MenuButton = ({ label, icon, onClick }: any) => (
  <button 
    onClick={onClick}
    className="flex flex-col items-center justify-center p-8 bg-white rounded-[2.5rem] shadow-sm hover:shadow-2xl border border-slate-50 transition-all hover:-translate-y-2 active:scale-95 group"
  >
    <span className="text-4xl mb-4 group-hover:scale-125 transition-transform duration-500">{icon}</span>
    <span className="text-[9px] font-black text-slate-500 tracking-[0.3em] uppercase">{label}</span>
  </button>
);

export default DashboardView;
