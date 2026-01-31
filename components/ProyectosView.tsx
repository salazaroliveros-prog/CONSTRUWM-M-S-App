import React, { useState, useMemo } from 'react';
import Layout from './Layout';
import { AppView, Project } from '../types';
import { storageService } from '../services/storageService';
import { COLORS, TIPOLOGIAS, LOGO_URL } from '../constants';
import { GoogleGenAI, Type } from "@google/genai";

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

interface Milestone {
  name: string;
  startPercent: number;
  durationPercent: number;
  color: string;
  description: string;
  isCritical?: boolean;
}

const ProyectosView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [tab, setTab] = useState<'CARDS' | 'CREATE'>('CARDS');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [projects, setProjects] = useState<Project[]>(storageService.getProjects());
  
  const [selectedTimelineProject, setSelectedTimelineProject] = useState<Project | null>(null);
  const [isTimelineLoading, setIsTimelineLoading] = useState(false);
  const [aiMilestones, setAiMilestones] = useState<Milestone[]>([]);

  // Estado para edición
  const [editingProject, setEditingProject] = useState<Project | null>(null);

  const [form, setForm] = useState<Partial<Project>>({
    name: '',
    clientName: '',
    landArea: 0,
    constructionArea: 0,
    location: '',
    typology: 'RESIDENCIAL',
    needsProgram: '',
    startDate: new Date().toISOString().split('T')[0],
    coverType: 'Otros',
    estimatedDays: 120
  });

  const calculateProgress = (startDate: string, estimatedDays: number) => {
    const start = new Date(startDate).getTime();
    const now = new Date().getTime();
    const total = (estimatedDays || 120) * 24 * 60 * 60 * 1000;
    const elapsed = now - start;
    return Math.min(Math.max(Math.round((elapsed / total) * 100), 0), 100);
  };

  const validateAreas = (land: number, construction: number) => {
    if (construction > land) {
      alert("⚠️ ALERTA CRÍTICA: El área de construcción (m²) es superior al área del terreno (m²). Por favor, verifique si esto es correcto antes de proceder.");
      return true;
    }
    return false;
  };

  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = statusFilter === 'ALL' || p.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [projects, searchTerm, statusFilter]);

  const handleSaveProject = () => {
    if (!form.name || !form.clientName) {
      alert("Error: Identificación del proyecto y cliente son requeridos.");
      return;
    }

    validateAreas(form.landArea || 0, form.constructionArea || 0);

    const newProj: Project = { ...form as Project, id: crypto.randomUUID(), status: 'PENDING' };
    storageService.saveProject(newProj);
    setProjects(storageService.getProjects());
    setTab('CARDS');
    // Reset form
    setForm({
      name: '', clientName: '', landArea: 0, constructionArea: 0, 
      location: '', typology: 'RESIDENCIAL', needsProgram: '',
      startDate: new Date().toISOString().split('T')[0],
      coverType: 'Otros', estimatedDays: 120
    });
  };

  const handleUpdateProject = () => {
    if (!editingProject) return;
    
    validateAreas(editingProject.landArea || 0, editingProject.constructionArea || 0);

    storageService.saveProject(editingProject);
    setProjects(storageService.getProjects());
    setEditingProject(null);
    alert("Proyecto actualizado correctamente.");
  };

  const handleDeleteProject = (id: string, name: string) => {
    if (confirm(`¿Está seguro de que desea eliminar permanentemente el proyecto "${name}"? Esta acción no se puede deshacer.`)) {
      storageService.deleteProject(id);
      setProjects(storageService.getProjects());
    }
  };

  const viewBudget = (id: string) => {
    localStorage.setItem('mys_target_budget_project', id);
    onNavigate('PRESUPUESTOS');
  };

  const generateTimeline = async (project: Project) => {
    setSelectedTimelineProject(project);
    setIsTimelineLoading(true);
    setAiMilestones([]);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const prompt = `Senior Construction Manager Simulation: 
      Analiza el proyecto "${project.name}" de tipología ${project.typology} con ${project.constructionArea}m2 de construcción sobre un terreno de ${project.landArea}m2.
      Genera un cronograma técnico maestro de 8 hitos en JSON para un diagrama de Gantt.
      
      Esquema JSON:
      {
        "milestones": [
          { "name": "string", "startPercent": number, "durationPercent": number, "description": "string", "color": "hex_color", "isCritical": boolean }
        ]
      }`;

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
          responseMimeType: "application/json"
        }
      });
      const result = JSON.parse(response.text || '{"milestones":[]}');
      setAiMilestones(result.milestones);
    } catch (e) { console.error(e); } finally { setIsTimelineLoading(false); }
  };

  const getMonthLabels = (startDate: string, estimatedDays: number) => {
    const start = new Date(startDate);
    const months = [];
    for (let i = 0; i <= Math.ceil(estimatedDays / 30); i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      months.push(d.toLocaleDateString('es-GT', { month: 'short' }).toUpperCase());
    }
    return months;
  };

  return (
    <Layout title="Control de Portafolio" onNavigate={onNavigate} onLogout={onLogout} currentView="PROYECTOS">
      <div className="space-y-12 pb-24 animate-in fade-in duration-700">
        
        {/* Selector de Navegación Minimalista */}
        <div className="flex bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 p-1.5 max-w-sm mx-auto sm:mx-0">
          <button onClick={() => setTab('CARDS')} className={`flex-1 py-3 font-black text-[10px] uppercase transition-all tracking-[0.2em] rounded-xl ${tab === 'CARDS' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-400'}`}>Activos</button>
          <button onClick={() => setTab('CREATE')} className={`flex-1 py-3 font-black text-[10px] uppercase transition-all tracking-[0.2em] rounded-xl ${tab === 'CREATE' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-400'}`}>Nuevo</button>
        </div>

        {tab === 'CARDS' ? (
          <div className="space-y-10">
            {/* Buscador de Alta Fidelidad */}
            <div className="bg-white/50 backdrop-blur-sm p-8 rounded-[2.5rem] shadow-sm border border-white flex flex-col md:flex-row gap-8 items-center">
              <div className="relative flex-1 w-full">
                <input 
                  className="w-full pl-14 pr-8 py-5 bg-white border border-slate-100 rounded-3xl outline-none font-bold text-sm text-slate-800 focus:border-[#b8860b] focus:shadow-[0_0_0_4px_rgba(184,134,11,0.05)] transition-all placeholder:text-slate-300" 
                  placeholder="Buscar obra o expediente..."
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                />
                <span className="absolute left-6 top-1/2 -translate-y-1/2 text-xl opacity-20">🔍</span>
              </div>
              <select className="w-full md:w-56 p-5 bg-white border border-slate-100 rounded-3xl font-black text-[10px] uppercase text-slate-400 outline-none hover:border-[#b8860b] transition-all" value={statusFilter} onChange={e => setStatusFilter(e.target.value)}>
                <option value="ALL">TODOS</option>
                <option value="ACTIVE">EJECUCIÓN</option>
                <option value="PENDING">PENDIENTES</option>
              </select>
            </div>

            {/* Grid de Proyectos Ejecutivo */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
              {filteredProjects.map(p => {
                const progress = calculateProgress(p.startDate, p.estimatedDays || 120);
                return (
                  <div key={p.id} className="bg-white rounded-[2.5rem] shadow-[0_20px_50px_-15px_rgba(0,0,0,0.05)] border border-slate-50 overflow-hidden flex flex-col transition-all duration-500 hover:-translate-y-3 hover:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.1)] group">
                    {/* Header con Degradado Minimalista */}
                    <div className="p-8 bg-gradient-to-br from-[#001f3f] to-[#003366] text-white relative h-48 flex flex-col justify-between">
                      <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none group-hover:scale-110 transition-transform duration-700">
                         <img src={LOGO_URL} alt="" className="h-20 grayscale brightness-0 invert" />
                      </div>
                      <div className="flex justify-between items-start relative z-10">
                         <span className={`px-3 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest border border-white/20 backdrop-blur-md ${p.status === 'ACTIVE' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-[#b8860b]/20 text-[#b8860b]'}`}>
                           {p.status}
                         </span>
                         <div className="flex gap-2">
                            <button onClick={() => setEditingProject(p)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/20 flex items-center justify-center text-sm transition-all border border-white/10" title="Editar Proyecto">✏️</button>
                            <button onClick={() => handleDeleteProject(p.id, p.name)} className="w-9 h-9 rounded-xl bg-white/5 hover:bg-red-500/40 flex items-center justify-center text-sm transition-all border border-white/10" title="Eliminar Proyecto">🗑️</button>
                         </div>
                      </div>
                      <div className="relative z-10">
                        <h3 className="text-xl font-black tracking-tight leading-tight uppercase group-hover:text-[#b8860b] transition-colors line-clamp-2">{p.name}</h3>
                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-2 opacity-60 italic">{p.clientName}</p>
                      </div>
                    </div>

                    {/* Cuerpo de Datos Técnicos */}
                    <div className="p-8 space-y-8 flex-1">
                      <div className="grid grid-cols-2 gap-8 border-b border-slate-50 pb-8">
                         <div className="space-y-1.5">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Tipología</p>
                            <p className="text-xs font-black text-slate-800 uppercase">{p.typology}</p>
                         </div>
                         <div className="text-right space-y-1.5">
                            <p className="text-[8px] font-black text-slate-300 uppercase tracking-widest">Área Obra</p>
                            <p className="text-xs font-black text-slate-800">{p.constructionArea} m²</p>
                         </div>
                      </div>

                      {/* Progreso de Obra Estilizado */}
                      <div className="space-y-4">
                         <div className="flex justify-between items-end">
                            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Progreso Maestro</p>
                            <p className="text-xs font-black text-slate-900">{progress}%</p>
                         </div>
                         <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden p-0.5">
                            <div className="h-full bg-gradient-to-r from-[#001f3f] to-[#b8860b] rounded-full transition-all duration-1000" style={{ width: `${progress}%` }}></div>
                         </div>
                      </div>
                      
                      <div className="flex items-center gap-2.5 text-slate-400 py-3 px-4 bg-slate-50/50 rounded-2xl border border-slate-100/50">
                         <span className="text-sm">📍</span>
                         <p className="text-[9px] font-black uppercase tracking-wider truncate text-slate-500">{p.location || 'Ciudad de Guatemala'}</p>
                      </div>
                    </div>

                    {/* Acciones del Dashboard */}
                    <div className="px-8 pb-8 flex gap-4">
                      <button onClick={() => viewBudget(p.id)} className="flex-1 py-4 bg-slate-900 text-white font-black text-[9px] uppercase rounded-2xl hover:bg-[#b8860b] transition-all shadow-xl active:scale-95 tracking-[0.2em]">Presupuesto</button>
                      <button onClick={() => generateTimeline(p)} className="flex-1 py-4 bg-white border border-slate-200 text-slate-800 font-black text-[9px] uppercase rounded-2xl hover:border-[#b8860b] hover:text-[#b8860b] transition-all tracking-[0.2em] shadow-sm">Gantt IA</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Vista de Creación Mejorada */
          <div className="bg-white p-16 rounded-[4rem] shadow-2xl border border-slate-50 max-w-4xl mx-auto border-t-[12px] border-[#b8860b]">
             <div className="flex items-center gap-10 mb-16">
                <div className="w-20 h-20 bg-slate-900 p-4 rounded-3xl shadow-xl">
                   <img src={LOGO_URL} alt="Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                   <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Alta de Proyecto</h2>
                   <p className="text-[10px] text-[#b8860b] font-black uppercase tracking-[0.4em] mt-3">Protocolo de Registro Corporativo</p>
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <InputField label="Identificación de la Obra" value={form.name} onChange={(v: string) => setForm({...form, name: v})} />
                <InputField label="Titular / Cliente" value={form.clientName} onChange={(v: string) => setForm({...form, clientName: v})} />
                <InputField label="Área del Terreno (m²)" type="number" value={form.landArea} onChange={(v: string) => setForm({...form, landArea: Number(v)})} />
                <InputField label="Área de Construcción (m²)" type="number" value={form.constructionArea} onChange={(v: string) => setForm({...form, constructionArea: Number(v)})} />
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-2">Tipología Técnica</label>
                  <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm text-slate-900 outline-none focus:border-[#b8860b] transition-all uppercase" value={form.typology} onChange={e => setForm({...form, typology: e.target.value as any})}>
                    {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <InputField label="Ubicación" value={form.location} onChange={(v: string) => setForm({...form, location: v})} />
                <InputField label="Inicio Estimado" type="date" value={form.startDate} onChange={(v: string) => setForm({...form, startDate: v})} />
                <InputField label="Ciclo de Ejecución (Días)" type="number" value={form.estimatedDays} onChange={(v: string) => setForm({...form, estimatedDays: Number(v)})} />
             </div>
             <button onClick={handleSaveProject} className="w-full mt-16 py-7 bg-slate-900 text-white font-black rounded-3xl shadow-2xl hover:bg-[#b8860b] transition-all uppercase tracking-[0.3em] text-xs">Finalizar Registro de Obra</button>
          </div>
        )}

        {/* Modal de Edición de Proyecto */}
        {editingProject && (
          <div className="fixed inset-0 z-[700] flex items-center justify-center p-6 bg-slate-900/95 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-white w-full max-w-4xl rounded-[4rem] shadow-2xl overflow-hidden border-t-[14px] border-[#b8860b] flex flex-col max-h-[92vh]">
                <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                    <div className="flex items-center gap-6">
                        <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center text-xl">✏️</div>
                        <h3 className="text-2xl font-black uppercase tracking-tight">Editar Expediente</h3>
                    </div>
                    <button onClick={() => setEditingProject(null)} className="text-3xl hover:text-[#b8860b] transition-colors p-2">✕</button>
                </div>
                <div className="flex-1 overflow-y-auto p-12 space-y-10">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        <InputField label="Identificación de la Obra" value={editingProject.name} onChange={(v: string) => setEditingProject({...editingProject, name: v})} />
                        <InputField label="Titular / Cliente" value={editingProject.clientName} onChange={(v: string) => setEditingProject({...editingProject, clientName: v})} />
                        <InputField label="Área del Terreno (m²)" type="number" value={editingProject.landArea} onChange={(v: string) => setEditingProject({...editingProject, landArea: Number(v)})} />
                        <InputField label="Área Construcción (m²)" type="number" value={editingProject.constructionArea} onChange={(v: string) => setEditingProject({...editingProject, constructionArea: Number(v)})} />
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Tipología Técnica</label>
                            <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm text-slate-900 uppercase" value={editingProject.typology} onChange={e => setEditingProject({...editingProject, typology: e.target.value as any})}>
                                {TIPOLOGIAS.map(t => <option key={t} value={t}>{t}</option>)}
                            </select>
                        </div>
                        <InputField label="Ubicación" value={editingProject.location} onChange={(v: string) => setEditingProject({...editingProject, location: v})} />
                        <div className="space-y-2">
                            <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">Estatus Operativo</label>
                            <select className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl font-black text-sm text-slate-900 uppercase" value={editingProject.status} onChange={e => setEditingProject({...editingProject, status: e.target.value as any})}>
                                <option value="PENDING">PENDIENTE</option>
                                <option value="ACTIVE">ACTIVO</option>
                                <option value="EXECUTED">EJECUTADO</option>
                                <option value="PAUSED">PAUSADO</option>
                                <option value="STOPPED">DETENIDO</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div className="p-10 border-t bg-slate-50 flex justify-end gap-4">
                    <button onClick={() => setEditingProject(null)} className="px-10 py-5 text-slate-400 font-black uppercase text-[10px] tracking-widest">Cancelar</button>
                    <button onClick={handleUpdateProject} className="px-12 py-5 bg-slate-900 text-white font-black rounded-2xl text-[10px] uppercase shadow-xl hover:bg-[#b8860b] transition-all tracking-widest">Guardar Cambios</button>
                </div>
            </div>
          </div>
        )}

        {/* Modal de Cronograma Gantt */}
        {selectedTimelineProject && (
          <div className="fixed inset-0 z-[600] flex items-center justify-center p-6 bg-slate-900/98 backdrop-blur-xl animate-in fade-in">
             <div className="bg-white w-full max-w-6xl rounded-[4rem] shadow-2xl overflow-hidden border-t-[14px] border-[#b8860b] flex flex-col max-h-[92vh]">
                <div className="p-10 bg-slate-900 text-white flex justify-between items-center">
                   <div className="flex items-center gap-8">
                      <div className="w-16 h-16 bg-[#b8860b] rounded-3xl flex items-center justify-center text-3xl shadow-xl">📊</div>
                      <div>
                        <h3 className="text-2xl font-black uppercase tracking-tight leading-none">Diagrama de Gantt Maestro</h3>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mt-3">{selectedTimelineProject.name}</p>
                      </div>
                   </div>
                   <button onClick={() => setSelectedTimelineProject(null)} className="text-4xl hover:text-[#b8860b] transition-colors p-2">✕</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-12 bg-slate-50/30">
                   {isTimelineLoading ? (
                      <div className="py-48 text-center space-y-10">
                         <div className="w-20 h-20 border-[6px] border-[#b8860b] border-t-transparent rounded-full animate-spin mx-auto"></div>
                         <p className="text-[11px] font-black text-slate-400 uppercase tracking-[0.3em]">Planificando Ruta Crítica...</p>
                      </div>
                   ) : (
                      <div className="relative border border-slate-100 rounded-[3rem] bg-white shadow-xl p-12 overflow-x-auto min-w-[900px]">
                        {/* Eje Temporal */}
                        <div className="flex border-b border-slate-100 pb-8 mb-10 sticky top-0 bg-white z-10">
                          <div className="w-64 shrink-0 font-black text-[10px] text-slate-400 uppercase tracking-widest border-r">Fase / Actividad</div>
                          <div className="flex-1 flex justify-between text-[10px] font-black text-slate-800 uppercase px-10 relative">
                            {getMonthLabels(selectedTimelineProject.startDate, selectedTimelineProject.estimatedDays || 120).map((m, i) => (
                              <span key={i} className="flex-1 text-center border-l first:border-l-0 border-slate-50">{m}</span>
                            ))}
                            <div className="absolute top-0 bottom-[-1000px] w-0.5 bg-red-500 z-30" style={{ left: `${calculateProgress(selectedTimelineProject.startDate, selectedTimelineProject.estimatedDays || 120)}%` }}>
                               <div className="bg-red-500 text-white px-3 py-1 rounded-full text-[8px] font-black whitespace-nowrap shadow-xl -mt-10 border-2 border-white">ESTATUS ACTUAL</div>
                            </div>
                          </div>
                        </div>

                        {/* Hitos */}
                        <div className="space-y-6 relative">
                          <div className="absolute inset-0 flex justify-between pointer-events-none px-10">
                             {getMonthLabels(selectedTimelineProject.startDate, selectedTimelineProject.estimatedDays || 120).map((_, i) => (
                               <div key={i} className="w-px h-full bg-slate-50"></div>
                             ))}
                          </div>

                          {aiMilestones.map((m, idx) => (
                            <div key={idx} className="flex items-center group relative h-14">
                               <div className="w-64 shrink-0 pr-8 border-r border-slate-50 flex items-center gap-3">
                                  <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${m.isCritical ? 'bg-red-500 shadow-lg animate-pulse' : 'bg-slate-200'}`}></div>
                                  <p className="text-[11px] font-black text-slate-800 uppercase truncate" title={m.name}>{m.name}</p>
                               </div>
                               <div className="flex-1 h-10 relative rounded-2xl overflow-visible bg-slate-50/50 ml-6 group-hover:bg-slate-100/50 transition-all">
                                  <div 
                                    className="absolute h-full rounded-2xl shadow-xl flex items-center px-5 transition-all duration-1000 group-hover:brightness-110 cursor-help"
                                    style={{ left: `${m.startPercent}%`, width: `${m.durationPercent}%`, backgroundColor: m.color || '#b8860b' }}
                                  >
                                     <span className="text-[8px] font-black text-white uppercase whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                                       {m.description}
                                     </span>
                                  </div>
                               </div>
                            </div>
                          ))}
                        </div>
                      </div>
                   )}
                </div>

                <div className="p-10 border-t bg-white flex justify-between items-center">
                   <div className="flex items-center gap-8">
                      <div className="flex items-center gap-3">
                         <div className="w-4 h-4 bg-red-500 rounded-full shadow-lg"></div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Indicador Semanal</span>
                      </div>
                      <div className="flex items-center gap-3">
                         <div className="w-4 h-4 bg-[#b8860b] rounded-full shadow-lg"></div>
                         <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Inversión Maestro</span>
                      </div>
                   </div>
                   <button onClick={() => setSelectedTimelineProject(null)} className="px-12 py-5 bg-slate-900 text-white font-black rounded-[2rem] text-[10px] uppercase shadow-2xl hover:bg-[#b8860b] transition-all tracking-[0.2em] active:scale-95">Cerrar Monitor</button>
                </div>
             </div>
          </div>
        )}

      </div>
    </Layout>
  );
};

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-3">{label}</label>
    <input 
      type={type} 
      className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-3xl outline-none font-black text-slate-900 focus:border-[#b8860b] focus:bg-white transition-all shadow-inner text-sm" 
      value={value} 
      onChange={e => onChange(e.target.value)} 
    />
  </div>
);

export default ProyectosView;