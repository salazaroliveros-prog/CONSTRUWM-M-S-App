
import React, { useState, useEffect } from 'react';
import Layout from './Layout';
import { AppView, Transaction, Project } from '../types';
import { GUATEMALA_UNITS, CATEGORIES_EXPENSE, CATEGORIES_INCOME, COLORS } from '../constants';
import { storageService } from '../services/storageService';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

const InicioView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [mode, setMode] = useState<'IDLE' | 'INCOME' | 'EXPENSE'>('IDLE');
  
  const [form, setForm] = useState<Partial<Transaction>>({
    description: '',
    quantity: 1,
    unit: 'Quetzal',
    cost: 0,
    category: '',
    provider: '',
    date: new Date().toISOString().split('T')[0],
    rentalEnd: ''
  });

  useEffect(() => {
    setProjects(storageService.getProjects());
  }, []);

  const handleSave = () => {
    if (!selectedProjectId || !form.description || !form.cost || !form.category) {
      alert('Por favor complete todos los campos requeridos');
      return;
    }

    const newTx: Transaction = {
      id: crypto.randomUUID(),
      projectId: selectedProjectId,
      type: mode as 'INCOME' | 'EXPENSE',
      description: form.description!,
      quantity: form.quantity!,
      unit: form.unit!,
      cost: form.cost!,
      category: form.category!,
      date: form.date!,
      month: new Date(form.date!).toLocaleString('es-GT', { month: 'long' }),
      provider: form.provider,
      rentalEnd: form.rentalEnd
    };

    storageService.saveTransaction(newTx);
    
    if (form.rentalEnd) {
      storageService.addNotification({
        title: "Alerta de Alquiler",
        message: `El equipo "${form.description}" debe devolverse el ${form.rentalEnd}.`,
        type: "WARNING"
      });
    }

    alert('Registro financiero exitoso');
    setMode('IDLE');
    setForm({ description: '', quantity: 1, unit: 'Quetzal', cost: 0, category: '', provider: '', date: new Date().toISOString().split('T')[0], rentalEnd: '' });
  };

  return (
    <Layout title="Control de Operaciones" onNavigate={onNavigate} onLogout={onLogout} currentView="INICIO">
      <div className="space-y-6 max-w-2xl mx-auto pb-20">
        
        <div className="bg-white rounded-[2rem] shadow-xl border overflow-hidden">
          <div className="bg-slate-800 p-6 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📋</span>
              <h2 className="text-white font-bold tracking-tight">Nuevo Movimiento en Obra</h2>
            </div>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Proyecto Destino</label>
              <select 
                className="w-full p-4 bg-slate-50 border rounded-2xl outline-none focus:ring-2 focus:ring-[#b8860b] font-medium"
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
              >
                <option value="">Seleccione Proyecto...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name} - {p.clientName}</option>)}
              </select>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setMode('INCOME')}
                className={`flex-1 py-4 font-black rounded-2xl transition-all border-2 ${mode === 'INCOME' ? 'bg-green-600 text-white border-green-600 shadow-lg scale-105' : 'bg-white text-green-600 border-green-100'}`}
              >
                (+) INGRESO
              </button>
              <button 
                onClick={() => setMode('EXPENSE')}
                className={`flex-1 py-4 font-black rounded-2xl transition-all border-2 ${mode === 'EXPENSE' ? 'bg-red-600 text-white border-red-600 shadow-lg scale-105' : 'bg-white text-red-600 border-red-100'}`}
              >
                (-) EGRESO
              </button>
            </div>

            {mode !== 'IDLE' && (
              <div className="pt-6 border-t space-y-4 animate-in slide-in-from-top">
                <InputField label="Descripción detallada" value={form.description} onChange={v => setForm({...form, description: v})} />
                
                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Cantidad" type="number" value={form.quantity} onChange={v => setForm({...form, quantity: Number(v)})} />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Unidad</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl" value={form.unit} onChange={e => setForm({...form, unit: e.target.value})}>
                      {GUATEMALA_UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <InputField label="Costo Unitario (Q)" type="number" value={form.cost} onChange={v => setForm({...form, cost: Number(v)})} />
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Categoría</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl" value={form.category} onChange={e => setForm({...form, category: e.target.value})}>
                      <option value="">Seleccione...</option>
                      {(mode === 'INCOME' ? CATEGORIES_INCOME : CATEGORIES_EXPENSE).map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </div>
                </div>

                {form.category === 'Equipo/Herramienta' && (
                  <div className="p-4 bg-orange-50 rounded-2xl border border-orange-100 space-y-4">
                    <p className="text-[10px] font-bold text-orange-700 uppercase">Control de Alquiler</p>
                    <InputField label="Fecha de Devolución" type="date" value={form.rentalEnd} onChange={v => setForm({...form, rentalEnd: v})} />
                  </div>
                )}

                <div className="pt-6">
                  <button 
                    onClick={handleSave}
                    className="w-full py-5 text-white font-black rounded-2xl shadow-2xl transition-all active:scale-95 bg-gradient-to-r from-[#b8860b] to-[#9a6d0a] uppercase tracking-[0.2em] text-xs"
                  >
                    Guardar Movimiento en Obra
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
    <input type={type} className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-2 focus:ring-[#b8860b] font-medium" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default InicioView;
