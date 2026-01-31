
import React, { useState, useMemo, useEffect } from 'react';
import Layout from './Layout';
import { AppView, Transaction, Project } from '../types';
import { storageService } from '../services/storageService';
import { GoogleGenAI, Type } from "@google/genai";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

interface PredictionPoint {
  date: string;
  income: number;
  expense: number;
  reason?: string;
}

const FinanzasView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [isAnalysing, setIsAnalysing] = useState(false);
  const [isPredicting, setIsPredicting] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<string | null>(null);
  const [predictionData, setPredictionData] = useState<PredictionPoint[] | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('CONSOLIDATED');

  const txs = useMemo(() => storageService.getTransactions().sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()), []);
  const projects = storageService.getProjects();

  const activeTxs = useMemo(() => {
    if (selectedProjectId === 'CONSOLIDATED') return txs;
    return txs.filter(t => t.projectId === selectedProjectId);
  }, [txs, selectedProjectId]);

  const metrics = useMemo(() => {
    const income = activeTxs.filter(t => t.type === 'INCOME').reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
    const expense = activeTxs.filter(t => t.type === 'EXPENSE').reduce((acc, curr) => acc + (curr.cost * curr.quantity), 0);
    return { income, expense, balance: income - expense };
  }, [activeTxs]);

  const filteredTxs = useMemo(() => {
    return activeTxs.filter(t => 
      t.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.category.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [activeTxs, searchTerm]);

  const chartData = useMemo(() => {
    const sorted = [...activeTxs].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const groups: Record<string, { date: string; income: number; expense: number }> = {};
    
    sorted.forEach(t => {
      const dateKey = t.date;
      if (!groups[dateKey]) {
        groups[dateKey] = { date: dateKey, income: 0, expense: 0 };
      }
      if (t.type === 'INCOME') groups[dateKey].income += t.cost * t.quantity;
      else groups[dateKey].expense += t.cost * t.quantity;
    });
    
    return Object.values(groups);
  }, [activeTxs]);

  const runAiFinancialCheck = async () => {
    setIsAnalysing(true);
    setAiAnalysis(null);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const contextName = selectedProjectId === 'CONSOLIDATED' ? 'GLOBAL CONSOLIDADO' : projects.find(p => p.id === selectedProjectId)?.name;
      const prompt = `Analiza las finanzas de ${contextName}: Ingresos Q${metrics.income}, Egresos Q${metrics.expense}, Balance Q${metrics.balance}. 
      Proporciona un dictamen ejecutivo en Markdown resaltando riesgos y oportunidades de ahorro.`;
      const response = await ai.models.generateContent({ 
        model: 'gemini-3-pro-preview', 
        contents: prompt
      });
      setAiAnalysis(response.text || 'Sin análisis disponible.');
    } catch (e) { console.error(e); } finally { setIsAnalysing(false); }
  };

  const generatePrediction = async () => {
    setIsPredicting(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Predice el flujo de caja para los próximos 7 días basado en este historial: ${JSON.stringify(activeTxs.slice(0, 15))}. 
      Responde estrictamente en JSON con un objeto que contenga un array 'prediction'.`;
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: { responseMimeType: "application/json" }
      });
      const result = JSON.parse(response.text || '{"prediction":[]}');
      setPredictionData(result.prediction);
    } catch (e) { console.error(e); } finally { setIsPredicting(false); }
  };

  const selectedProjectName = useMemo(() => {
    if (selectedProjectId === 'CONSOLIDATED') return 'CONSOLIDADO GLOBAL';
    return projects.find(p => p.id === selectedProjectId)?.name || 'PROYECTO';
  }, [selectedProjectId, projects]);

  return (
    <Layout title="Control Financiero Central" onNavigate={onNavigate} onLogout={onLogout} currentView="FINANZAS">
      <div className="space-y-8 pb-20">
        
        {/* Métricas del Alcance Seleccionado */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <FinanceCard label={`Fondos en: ${selectedProjectName}`} val={`Q${metrics.balance.toLocaleString()}`} color="text-slate-900" icon="🏛️" />
          <FinanceCard label="Ingresos Totales" val={`Q${metrics.income.toLocaleString()}`} color="text-green-600" icon="📈" />
          <FinanceCard label="Egresos Totales" val={`Q${metrics.expense.toLocaleString()}`} color="text-red-600" icon="📉" />
        </div>

        {/* Sección de Visualización y Análisis IA */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          <div className="lg:col-span-8 space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-2xl border overflow-hidden relative group">
              {/* Selector Contextual cerca del Gráfico */}
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-4">
                <div>
                  <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Flujo de Efectivo Dinámico</h3>
                  <p className="text-sm font-black text-slate-800 uppercase mt-1">Contexto: {selectedProjectName}</p>
                </div>
                
                <div className="flex items-center gap-3 w-full md:w-auto">
                   <select 
                    className="flex-1 md:w-72 p-3 bg-slate-50 border-2 border-slate-100 rounded-xl outline-none focus:border-[#b8860b] font-black text-slate-700 transition-all text-[10px] uppercase"
                    value={selectedProjectId}
                    onChange={(e) => {
                      setSelectedProjectId(e.target.value);
                      setAiAnalysis(null);
                      setPredictionData(null);
                    }}
                  >
                    <option value="CONSOLIDATED">ESTADO GLOBAL</option>
                    {projects.map(p => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                  <div className="hidden sm:flex gap-3">
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-green-500"></div><span className="text-[8px] font-black text-slate-400 uppercase">IN</span></div>
                    <div className="flex items-center gap-2"><div className="w-2 h-2 rounded-full bg-red-500"></div><span className="text-[8px] font-black text-slate-400 uppercase">OUT</span></div>
                  </div>
                </div>
              </div>

              <div className="h-96">
                {chartData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                      <XAxis dataKey="date" tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <YAxis tick={{fontSize: 9, fontWeight: 'bold'}} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{borderRadius: '1.5rem', border: 'none', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'}} />
                      <Area type="monotone" dataKey="income" stroke="#10b981" fill="#10b981" fillOpacity={0.05} strokeWidth={4} />
                      <Area type="monotone" dataKey="expense" stroke="#ef4444" fill="#ef4444" fillOpacity={0.05} strokeWidth={4} />
                    </AreaChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center text-center space-y-4">
                     <div className="text-4xl opacity-20">📊</div>
                     <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Sin transacciones registradas para este contexto</p>
                  </div>
                )}
              </div>
            </div>

            {aiAnalysis && (
              <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border-t-[14px] border-[#b8860b] animate-in slide-in-from-left duration-500">
                <h4 className="text-2xl font-black text-slate-900 mb-8 tracking-tighter uppercase">Análisis Estratégico IA</h4>
                <div className="prose prose-slate max-w-none text-sm leading-relaxed text-slate-600">
                  {aiAnalysis.split('\n').map((l, i) => <p key={i} className="mb-2">{l}</p>)}
                </div>
              </div>
            )}
          </div>

          <div className="lg:col-span-4 space-y-6 no-print">
            <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl text-white relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#b8860b] rounded-full -mr-16 -mt-16 opacity-10 group-hover:scale-150 transition-transform"></div>
              <h3 className="text-xl font-black mb-4 relative z-10">Auditoría Ejecutiva</h3>
              <p className="text-xs text-slate-400 mb-8 leading-relaxed relative z-10">Validación de márgenes y salud presupuestaria para {selectedProjectName}.</p>
              <button 
                onClick={runAiFinancialCheck} 
                disabled={isAnalysing}
                className="w-full py-5 bg-white text-slate-900 font-black rounded-2xl shadow-xl hover:bg-[#b8860b] hover:text-white transition-all flex items-center justify-center gap-3 relative z-10 uppercase text-[10px] tracking-widest"
              >
                {isAnalysing ? 'Consultando...' : 'Iniciar Auditoría IA'}
              </button>
            </div>

            <div className="bg-white p-10 rounded-[3rem] shadow-xl border space-y-6">
              <div>
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2 block">Buscador en Transacciones</label>
                <input 
                  className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl outline-none focus:ring-4 focus:ring-[#b8860b]/10 font-bold text-sm"
                  placeholder="Filtrar libro mayor..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
              </div>
              <button 
                onClick={generatePrediction}
                disabled={isPredicting}
                className="w-full py-5 bg-slate-50 border-2 border-slate-200 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest hover:bg-slate-900 hover:text-white transition-all flex items-center justify-center gap-2"
              >
                {isPredicting ? 'Calculando...' : '✨ Proyectar Flujo Futuro'}
              </button>
            </div>
          </div>
        </div>

        {/* Libro Mayor Seccionado */}
        <div className="bg-white rounded-[3.5rem] shadow-2xl border overflow-hidden no-print">
          <div className="p-10 bg-slate-900 text-white flex flex-col md:flex-row justify-between items-center gap-6">
            <div>
              <h3 className="text-lg font-black uppercase tracking-tighter">Libro Auxiliar: {selectedProjectName}</h3>
              <p className="text-[10px] text-[#b8860b] font-black uppercase tracking-[0.4em] mt-1">Registros de Transacciones Validadas</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-slate-50 border-b">
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                  <th className="px-10 py-6 text-left">Fecha</th>
                  <th className="px-10 py-6 text-left">Concepto Operativo</th>
                  <th className="px-10 py-6 text-center">Categoría</th>
                  <th className="px-10 py-6 text-right">Monto Unitario</th>
                  <th className="px-10 py-6 text-right">Total (Q)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTxs.length === 0 ? (
                  <tr><td colSpan={5} className="p-24 text-center text-slate-300 font-black uppercase tracking-[0.2em] italic">No se encontraron movimientos financieros</td></tr>
                ) : (
                  filteredTxs.map(t => (
                    <tr key={t.id} className="hover:bg-slate-50 transition-all group">
                      <td className="px-10 py-6 text-xs text-slate-400 font-mono">{t.date}</td>
                      <td className="px-10 py-6">
                        <p className="font-black text-slate-800 uppercase text-xs">{t.description}</p>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-[9px] text-slate-400 font-bold uppercase">{t.provider || 'Interno'}</span>
                          {selectedProjectId === 'CONSOLIDATED' && (
                            <span className="text-[9px] text-[#b8860b] font-black uppercase">• {projects.find(p => p.id === t.projectId)?.name}</span>
                          )}
                        </div>
                      </td>
                      <td className="px-10 py-6 text-center">
                        <span className="px-4 py-1.5 bg-slate-100 rounded-full text-[9px] uppercase font-black text-slate-500 border border-slate-200">{t.category}</span>
                      </td>
                      <td className="px-10 py-6 text-right font-bold text-slate-400 text-xs">Q{t.cost.toLocaleString()} ({t.quantity} {t.unit})</td>
                      <td className={`px-10 py-6 text-right font-black text-base ${t.type === 'INCOME' ? 'text-green-600' : 'text-red-600'}`}>
                        {t.type === 'INCOME' ? '+' : '-'} Q{(t.cost * t.quantity).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </Layout>
  );
};

const FinanceCard = ({ label, val, color, icon }: any) => (
  <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex items-center justify-between group hover:shadow-2xl transition-all">
    <div>
      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-black ${color} tracking-tighter`}>{val}</p>
    </div>
    <div className="text-4xl opacity-10 group-hover:opacity-30 transition-opacity">{icon}</div>
  </div>
);

export default FinanzasView;
