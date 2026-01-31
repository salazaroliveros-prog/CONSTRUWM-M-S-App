
import React, { useState, useMemo } from 'react';
import Layout from './Layout';
import { AppView } from '../types';
import { storageService } from '../services/storageService';
import { geminiGenerate } from '../services/geminiProxy';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, PieChart, Pie } from 'recharts';
import { LOGO_URL } from '../constants';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

const ReportesView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [aiInsight, setAiInsight] = useState<string | null>(null);

  const txs = storageService.getTransactions();
  const projects = storageService.getProjects();
  const employees = storageService.getEmployees();

  const metrics = useMemo(() => {
    const totalIncome = txs.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
    const totalExpense = txs.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
    const profit = totalIncome - totalExpense;
    
    const projectStats = {
      active: projects.filter(p => p.status === 'ACTIVE').length,
      pending: projects.filter(p => p.status === 'PENDING').length,
      executed: projects.filter(p => p.status === 'EXECUTED').length
    };

    return { totalIncome, totalExpense, profit, projectStats };
  }, [txs, projects]);

  const generateReportInsight = async () => {
    setIsAnalysing(true);
    try {
      const prompt = `Actúa como Director General de M&S Constructora. 
      Analiza los siguientes datos consolidados y genera un REPORTE EJECUTIVO de 3 párrafos.
      
      DATOS:
      - Ingresos Totales: Q${metrics.totalIncome}
      - Gastos Totales: Q${metrics.totalExpense}
      - Utilidad Bruta: Q${metrics.profit}
      - Proyectos Totales: ${projects.length}
      - Personal en Cuadrilla: ${employees.length}
      
      Estructura:
      1. Diagnóstico de Salud Financiera.
      2. Análisis de Capacidad Operativa.
      3. Recomendación Estratégica para el próximo trimestre.
      Responde en Markdown profesional.`;

      const response = await geminiGenerate({
        model: 'gemini-3-flash-preview',
        prompt,
      });
      setAiInsight(response.text || 'Error al generar análisis.');
    } catch (e) {
      console.error(e);
      setAiInsight('El motor de inteligencia ejecutiva no pudo procesar los datos.');
    } finally {
      setIsAnalysing(false);
    }
  };

  const barData = [
    { name: 'Finanzas', income: metrics.totalIncome, expense: metrics.totalExpense }
  ];

  return (
    <Layout title="Centro de Reportes Ejecutivos" onNavigate={onNavigate} onLogout={onLogout} currentView="REPORTES">
      <div className="space-y-8 pb-20">
        
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border flex flex-col md:flex-row justify-between items-center gap-8 no-print">
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-[#b8860b] rounded-[2rem] flex items-center justify-center text-3xl shadow-xl">📊</div>
            <img src={LOGO_URL} alt="M&S" className="h-14 object-contain" />
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tighter uppercase">Generación de Reportes</h3>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-1">Inteligencia de Negocios WM/M&S</p>
            </div>
          </div>
          <button 
            onClick={generateReportInsight}
            disabled={isAnalysing}
            className="px-10 py-5 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl hover:bg-[#b8860b] transition-all flex items-center gap-3"
          >
            {isAnalysing ? 'Analizando Métricas...' : '✨ Generar Diagnóstico IA'}
          </button>
        </div>

        {aiInsight && (
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-t-[14px] border-[#b8860b] animate-in slide-in-from-top duration-500">
            <h4 className="text-2xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Análisis Ejecutivo de Gestión</h4>
            <div className="prose prose-slate max-w-none text-sm leading-relaxed">
              {aiInsight.split('\n').map((l, i) => <p key={i} className="mb-4">{l}</p>)}
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-8">Balance Global de Operaciones</h3>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                  <Bar dataKey="income" fill="#10b981" radius={[6, 6, 0, 0]} name="Ingresos (Q)" />
                  <Bar dataKey="expense" fill="#ef4444" radius={[6, 6, 0, 0]} name="Gastos (Q)" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <ReportCard label="Proyectos Activos" value={metrics.projectStats.active} icon="🏗️" />
            <ReportCard label="Personal Total" value={employees.length} icon="👥" />
            <ReportCard label="Utilidad Estimada" value={`Q${metrics.profit.toLocaleString()}`} icon="💰" />
            <ReportCard label="Solicitudes RRHH" value={storageService.getApplications().length} icon="📩" />
          </div>
        </div>

      </div>
    </Layout>
  );
};

const ReportCard = ({ label, value, icon }: any) => (
  <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 flex items-center justify-between group hover:shadow-2xl transition-all">
    <div>
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className="text-2xl font-black text-slate-900 tracking-tighter">{value}</p>
    </div>
    <div className="text-3xl opacity-20 group-hover:opacity-100 transition-opacity">{icon}</div>
  </div>
);

export default ReportesView;
