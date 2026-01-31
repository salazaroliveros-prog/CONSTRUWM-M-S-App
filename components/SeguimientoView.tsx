
import React, { useState, useMemo } from 'react';
import Layout from './Layout';
import { AppView, Project } from '../types';
import { storageService } from '../services/storageService';
import { COLORS } from '../constants';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

const SeguimientoView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [selectedProjId, setSelectedProjId] = useState('');
  const projects = storageService.getProjects();

  const progressData = useMemo(() => {
    return [
      { name: 'Cimentación', physical: 100, financial: 95, color: '#10b981' },
      { name: 'Muros', physical: 60, financial: 75, color: '#b8860b' },
      { name: 'Estructura', physical: 30, financial: 20, color: '#3b82f6' },
      { name: 'Instalaciones', physical: 10, financial: 15, color: '#8b5cf6' },
      { name: 'Acabados', physical: 0, financial: 5, color: '#f59e0b' }
    ];
  }, []);

  const handlePrint = () => window.print();

  return (
    <Layout title="Seguimiento y Control de Obra" onNavigate={onNavigate} onLogout={onLogout} currentView="SEGUIMIENTO">
      <div className="space-y-6 pb-20 print:pb-0">
        
        <div className="bg-white p-8 rounded-[2rem] shadow-xl border flex flex-col md:flex-row gap-6 items-end no-print">
          <div className="flex-1 w-full">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Seleccionar Obra para Auditoría</label>
            <select 
              className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#b8860b] font-bold"
              value={selectedProjId}
              onChange={e => setSelectedProjId(e.target.value)}
            >
              <option value="">-- Proyectos en Curso --</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <button onClick={handlePrint} className="w-full md:w-auto px-8 py-4 bg-slate-900 text-white font-bold rounded-xl text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-lg">
            📄 GENERAR REPORTE PDF
          </button>
        </div>

        <div className="hidden print:block mb-8 border-b-4 border-slate-900 pb-4">
            <h1 className="text-3xl font-black">REPORTE DE AVANCE TÉCNICO</h1>
            <p className="text-xs font-bold text-slate-500 uppercase">PROYECTO: {projects.find(p => p.id === selectedProjId)?.name || 'Consolidado'}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 print:shadow-none print:p-0 print:border-none">
            <div className="mb-8 flex justify-between items-center no-print">
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Curva de Avance Consolidada</h3>
                <div className="flex gap-4">
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-500 rounded-full"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Físico</span></div>
                    <div className="flex items-center gap-2"><div className="w-3 h-3 bg-[#b8860b] rounded-full"></div><span className="text-[10px] font-bold text-slate-400 uppercase">Financiero</span></div>
                </div>
            </div>
            <div className="h-80 print:hidden">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={progressData} layout="vertical" margin={{ left: 20 }}>
                  <XAxis type="number" domain={[0, 100]} hide />
                  <YAxis type="category" dataKey="name" width={100} axisLine={false} tickLine={false} tick={{fontSize: 10, fontWeight: 'bold', fill: '#64748b'}} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 20px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="physical" fill="#10b981" radius={[0, 10, 10, 0]} barSize={12} name="Avance Físico %" />
                  <Bar dataKey="financial" fill="#b8860b" radius={[0, 10, 10, 0]} barSize={12} name="Avance Financiero %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="space-y-6 print:hidden">
            <div className="bg-gradient-to-br from-[#001f3f] to-slate-900 p-8 rounded-[2.5rem] shadow-2xl text-white border border-white/10">
                <p className="text-[10px] font-black text-[#b8860b] uppercase tracking-widest mb-4">Métricas Críticas</p>
                <div className="space-y-6">
                    <div className="flex justify-between items-end border-b border-white/10 pb-4">
                        <span className="text-xs font-bold opacity-60">Holgura</span>
                        <span className="text-3xl font-black text-green-400">+5d</span>
                    </div>
                    <div className="flex justify-between items-end">
                        <span className="text-xs font-bold opacity-60">Riesgo</span>
                        <span className="text-xl font-black uppercase text-[#b8860b]">BAJO</span>
                    </div>
                </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden print:shadow-none print:border-slate-300 print:rounded-none">
          <div className="p-8 bg-slate-900 text-white flex justify-between items-center print:bg-slate-100 print:text-slate-900 print:p-4">
            <h3 className="font-black uppercase text-xs tracking-widest">Cronograma de Hitos Ejecutados</h3>
          </div>
          <div className="divide-y divide-slate-50 print:divide-slate-200">
            {progressData.map((item, idx) => (
              <div key={idx} className="p-8 hover:bg-slate-50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-6 group print:p-4">
                <div className="md:w-1/4 print:w-1/3">
                  <p className="font-black text-slate-800 text-lg group-hover:text-[#b8860b] transition-colors print:text-sm">{item.name}</p>
                </div>
                <div className="flex-1 w-full bg-slate-100 h-6 rounded-full overflow-hidden relative shadow-inner print:bg-slate-200">
                  <div className="h-full transition-all duration-1000" style={{ width: `${item.physical}%`, backgroundColor: item.color }}></div>
                  <div className="absolute inset-0 flex items-center justify-center text-[9px] font-black text-slate-600 tracking-widest">{item.physical}%</div>
                </div>
                <div className="md:w-48 text-right print:w-auto">
                  <span className="px-3 py-1 bg-slate-100 text-slate-600 rounded-full text-[9px] font-bold print:bg-transparent print:p-0">EST: 24/11</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="hidden print:grid grid-cols-2 gap-20 mt-20 pt-10 border-t-2 border-slate-900">
            <div className="text-center pt-4">
                <p className="text-xs font-black uppercase">Firma Supervisor Residente</p>
            </div>
            <div className="text-center pt-4">
                <p className="text-xs font-black uppercase">Vo.Bo. Director de Proyecto</p>
            </div>
        </div>
      </div>
    </Layout>
  );
};

export default SeguimientoView;
