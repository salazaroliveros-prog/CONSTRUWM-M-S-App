
import React, { useState, useEffect, useMemo } from 'react';
import Layout from './Layout';
import { AppView, Project, BudgetItem } from '../types';
import { storageService } from '../services/storageService';
import { COLORS, TYPOLOGY_BUDGETS, INDIRECT_COSTS_PERCENT, UTILITY_PERCENT, TAX_PERCENT, LOGO_URL } from '../constants';
import { geminiGenerate } from '../services/geminiProxy';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

interface ProjectPhase {
  name: string;
  directCost: number;
  indirectCost: number;
  durationDays: number;
  description: string;
}

interface PhaseEstimationResult {
  phases: ProjectPhase[];
  totalEstimatedDuration: number;
  aiSummary: string;
}

const PresupuestosView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedTypology, setSelectedTypology] = useState('RESIDENCIAL');
  const [budgetItems, setBudgetItems] = useState<BudgetItem[]>([]);
  
  const [isEstimating, setIsEstimating] = useState(false);
  const [phaseResult, setPhaseResult] = useState<PhaseEstimationResult | null>(null);

  useEffect(() => {
    const list = storageService.getProjects();
    setProjects(list);
    
    const targetId = localStorage.getItem('mys_target_budget_project');
    if (targetId) {
      const targetProject = list.find(p => p.id === targetId);
      if (targetProject) {
        setSelectedProjectId(targetId);
        setSelectedTypology(targetProject.typology);
      }
      localStorage.removeItem('mys_target_budget_project');
    } else if (list.length > 0) {
      setSelectedProjectId(list[0].id);
      setSelectedTypology(list[0].typology);
    }
  }, []);

  useEffect(() => {
    const currentProject = projects.find(p => p.id === selectedProjectId);
    const defaultItems = TYPOLOGY_BUDGETS[selectedTypology] || [];
    
    const initializedItems = defaultItems.map((item, idx) => {
      let autoQty = 0;
      if (currentProject) {
        if (item.unit === 'm2') autoQty = currentProject.constructionArea;
        else if (item.name.toLowerCase().includes('limpieza')) autoQty = currentProject.landArea;
      }

      return {
        id: `${selectedTypology}-${idx}`,
        name: item.name,
        category: item.cat,
        unit: item.unit,
        unitPrice: item.price,
        quantity: autoQty,
        total: autoQty * item.price
      };
    });
    setBudgetItems(initializedItems);
    setPhaseResult(null);
  }, [selectedTypology, selectedProjectId, projects]);

  const financialMetrics = useMemo(() => {
    const directCost = budgetItems.reduce((acc, curr) => acc + curr.total, 0);
    const indirectCost = directCost * INDIRECT_COSTS_PERCENT;
    const utility = directCost * UTILITY_PERCENT;
    const taxes = (directCost + indirectCost + utility) * TAX_PERCENT;
    const grandTotal = directCost + indirectCost + utility + taxes;
    return { directCost, indirectCost, utility, taxes, grandTotal };
  }, [budgetItems]);

  const runPhaseEstimationIA = async () => {
    const activeItems = budgetItems.filter(i => i.total > 0);
    if (activeItems.length === 0) return alert("El presupuesto no tiene renglones con cantidades válidas para analizar.");

    setIsEstimating(true);
    try {
        const currentProject = projects.find(p => p.id === selectedProjectId);
        
        const prompt = `Actúa como un Senior Estimator de construcción. Analiza estos renglones: ${JSON.stringify(activeItems)}. 
        Divide el proyecto "${currentProject?.name}" en fases lógicas (Cimentación, Estructura, Muros, Acabados, etc.).
        Para cada fase, calcula:
        1. Costo Directo (suma de renglones asignados).
        2. Costo Indirecto (15%).
        3. Duración estimada en días calendario.
        4. Breve justificación técnica.
        
        Responde exclusivamente en JSON con esta estructura:
        {
          "phases": [
            { "name": "string", "directCost": number, "indirectCost": number, "durationDays": number, "description": "string" }
          ],
          "totalEstimatedDuration": number,
          "aiSummary": "string"
        }`;
        
        const response = await geminiGenerate({
          model: 'gemini-3-flash-preview',
          prompt,
          config: { responseMimeType: 'application/json' }
        });

        const result = JSON.parse(response.text || '{}');
        setPhaseResult(result);
    } catch (e) {
        console.error(e);
        alert("Error al procesar la estimación por fases. Por favor, intente de nuevo.");
    } finally {
        setIsEstimating(false);
    }
  };

  const updateRow = (id: string, field: keyof BudgetItem, value: any) => {
    setBudgetItems(prev => prev.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        updated.total = updated.unitPrice * (updated.quantity || 0);
        return updated;
      }
      return item;
    }));
  };

  return (
    <Layout title="Presupuestos e Inteligencia" onNavigate={onNavigate} onLogout={onLogout} currentView="PRESUPUESTOS">
      <div className="space-y-10 pb-24 animate-in fade-in duration-500">
        
        {/* Header de Acción Ejecutivo */}
        <div className="bg-white p-10 rounded-[3.5rem] shadow-2xl border-l-[15px] border-[#b8860b] flex flex-col lg:flex-row gap-10 items-end">
          <div className="flex-1 w-full space-y-4">
            <div className="flex items-center gap-6">
              <div className="w-16 h-16 bg-slate-900 p-3 rounded-3xl shadow-2xl">
                 <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
              </div>
              <div>
                <h3 className="text-2xl font-black text-slate-900 uppercase tracking-tighter leading-none">Análisis de Costos Maestros</h3>
                <p className="text-[10px] font-black text-[#b8860b] uppercase tracking-[0.4em] mt-3">Proyecto Seleccionado: {projects.find(p=>p.id===selectedProjectId)?.name || 'N/A'}</p>
              </div>
            </div>
            <select 
              className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-slate-900 outline-none focus:border-[#b8860b] transition-all uppercase text-xs shadow-inner" 
              value={selectedProjectId} 
              onChange={e => setSelectedProjectId(e.target.value)}
            >
              {projects.map(p => <option key={p.id} value={p.id}>{p.name.toUpperCase()}</option>)}
            </select>
          </div>
          <div className="flex gap-4 w-full lg:w-auto">
            <button 
                onClick={runPhaseEstimationIA} 
                disabled={isEstimating}
                className={`flex-1 lg:flex-none px-12 py-6 rounded-[1.8rem] font-black text-[11px] uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-4 active:scale-95 ${isEstimating ? 'bg-slate-300 text-slate-500' : 'bg-[#001f3f] text-white hover:bg-[#b8860b]'}`}
            >
                {isEstimating ? (
                  <div className="w-4 h-4 border-2 border-slate-400 border-t-slate-600 rounded-full animate-spin"></div>
                ) : '✨ Estimar Fases IA'}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-12 gap-10">
          
          {/* Tabla de Renglones (Lado Izquierdo o Arriba) */}
          <div className="xl:col-span-8 space-y-10">
            <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
              <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                <h3 className="font-black uppercase text-xs tracking-[0.4em]">Desglose de Renglones de Obra (APU)</h3>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-black text-[#b8860b] uppercase tracking-widest">Sincronización WM/M&S</span>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b">
                    <tr>
                      <th className="px-10 py-6 text-left">Actividad</th>
                      <th className="px-6 py-6 text-center">Unidad</th>
                      <th className="px-6 py-6 text-center">P.U. (Q)</th>
                      <th className="px-6 py-6 text-center">Cant.</th>
                      <th className="px-10 py-6 text-right">Subtotal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {budgetItems.map(item => (
                      <tr key={item.id} className="hover:bg-slate-50/50 transition-all group">
                        <td className="px-10 py-6">
                          <p className="font-black text-slate-900 uppercase text-xs group-hover:text-[#b8860b] transition-colors">{item.name}</p>
                          <p className="text-[8px] text-slate-400 font-black uppercase tracking-widest mt-1">{item.category}</p>
                        </td>
                        <td className="px-6 py-6 text-center font-black text-slate-400 uppercase text-[10px]">{item.unit}</td>
                        <td className="px-6 py-6 text-center">
                          <input type="number" className="w-28 p-3 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-900 outline-none focus:border-[#b8860b] shadow-inner text-xs" value={item.unitPrice} onChange={e => updateRow(item.id, 'unitPrice', Number(e.target.value))} />
                        </td>
                        <td className="px-6 py-6 text-center">
                          <input type="number" className="w-24 p-3 bg-white border border-slate-200 rounded-xl text-center font-black text-slate-900 outline-none focus:border-[#b8860b] shadow-inner text-xs" value={item.quantity} onChange={e => updateRow(item.id, 'quantity', Number(e.target.value))} />
                        </td>
                        <td className="px-10 py-6 text-right font-black text-slate-900 text-sm">Q{item.total.toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="p-12 bg-slate-50 border-t flex flex-col md:flex-row justify-between items-center gap-8">
                <div className="flex gap-10">
                   <div className="text-center md:text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Directo</p>
                      <p className="text-xl font-black text-slate-900">Q{financialMetrics.directCost.toLocaleString()}</p>
                   </div>
                   <div className="text-center md:text-left">
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Costo Indirecto (15%)</p>
                      <p className="text-xl font-black text-slate-900">Q{financialMetrics.indirectCost.toLocaleString()}</p>
                   </div>
                </div>
                <div className="text-center md:text-right">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Gran Total de Obra</p>
                  <p className="text-4xl font-black text-slate-900 tracking-tighter">Q{financialMetrics.grandTotal.toLocaleString(undefined, { minimumFractionDigits: 2 })}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Resultado de Estimación IA (Lado Derecho) */}
          <div className="xl:col-span-4 space-y-10">
            {phaseResult ? (
              <div className="bg-white p-10 rounded-[4rem] shadow-2xl border-t-[14px] border-[#b8860b] animate-in slide-in-from-right duration-700">
                <div className="flex items-center gap-4 mb-8">
                   <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center text-xl">✨</div>
                   <div>
                      <h4 className="text-xl font-black text-slate-900 uppercase tracking-tighter leading-none">Dictamen de Fases IA</h4>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.3em] mt-2">Planificación Maestra Estimada</p>
                   </div>
                </div>

                <div className="space-y-6">
                  {phaseResult.phases.map((phase, idx) => (
                    <div key={idx} className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 hover:border-[#b8860b]/30 transition-all group">
                       <div className="flex justify-between items-start mb-4">
                          <div>
                            <p className="text-sm font-black text-slate-900 uppercase group-hover:text-[#b8860b] transition-colors">{phase.name}</p>
                            <p className="text-[10px] font-black text-[#b8860b] mt-1">{phase.durationDays} Días Estimados</p>
                          </div>
                          <div className="text-right">
                             <p className="text-[11px] font-black text-slate-900">Q{(phase.directCost + phase.indirectCost).toLocaleString()}</p>
                             <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Inversión Fase</p>
                          </div>
                       </div>
                       <p className="text-[10px] text-slate-500 leading-relaxed font-medium italic">"{phase.description}"</p>
                    </div>
                  ))}
                </div>

                <div className="mt-10 pt-8 border-t space-y-6">
                   <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Duración Total Obra</span>
                      <span className="text-2xl font-black text-slate-900 tracking-tighter">{phaseResult.totalEstimatedDuration} Días</span>
                   </div>
                   <div className="p-6 bg-slate-900 text-white rounded-3xl shadow-xl">
                      <p className="text-[10px] font-black text-[#b8860b] uppercase tracking-widest mb-3">Conclusión Estratégica</p>
                      <p className="text-xs font-bold leading-relaxed opacity-80">{phaseResult.aiSummary}</p>
                   </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-50 p-20 rounded-[4rem] shadow-inner border border-slate-200 border-dashed flex flex-col items-center justify-center text-center space-y-6 opacity-60">
                 <div className="text-6xl grayscale">📊</div>
                 <div>
                    <p className="text-sm font-black text-slate-400 uppercase tracking-widest">Sin Análisis de Fases</p>
                    <p className="text-[10px] text-slate-400 font-bold mt-2">Inicie la estimación IA para proyectar costos y tiempos del proyecto.</p>
                 </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
};

export default PresupuestosView;
