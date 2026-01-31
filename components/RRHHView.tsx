import React, { useState, useEffect, useMemo, useRef } from 'react';
import Layout from './Layout';
import { AppView, Employee, CandidateApplication, AttendanceRecord } from '../types';
import { storageService } from '../services/storageService';
import { COLORS, POSITIONS, LOGO_URL } from '../constants';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

declare var L: any; // Leaflet global reference

const RRHHView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [tab, setTab] = useState<'HIRE' | 'ATTENDANCE' | 'APPLICATIONS' | 'PAYROLL' | 'MAP'>('ATTENDANCE');
  const [employees, setEmployees] = useState<Employee[]>(storageService.getEmployees());
  const [applications, setApplications] = useState<CandidateApplication[]>(storageService.getApplications());
  const [selectedEmpForPayroll, setSelectedEmpForPayroll] = useState<any>(null);
  
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);

  const [newEmployee, setNewEmployee] = useState<Partial<Employee>>({
    name: '',
    dpi: '',
    phone: '',
    address: '',
    position: POSITIONS[0].title,
    salary: POSITIONS[0].pay,
    experience: '',
    hiringDate: new Date().toISOString().split('T')[0]
  });

  useEffect(() => {
    if (tab === 'MAP' && mapRef.current && !leafletMap.current) {
      const guateCoords = [14.6349, -90.5069];
      leafletMap.current = L.map(mapRef.current).setView(guateCoords, 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; WM/M&S Constructora'
      }).addTo(leafletMap.current);

      const today = new Date().toISOString().split('T')[0];
      const markers: any[] = [];
      employees.forEach(emp => {
        if (emp.lastAttendance && emp.lastAttendance.date === today) {
          const marker = L.marker([emp.lastAttendance.lat, emp.lastAttendance.lng])
            .addTo(leafletMap.current)
            .bindPopup(`
              <div class="p-2">
                <p style="margin:0; font-weight: 900; font-size: 12px; color: #001f3f; text-transform: uppercase;">${emp.name}</p>
                <p style="margin: 4px 0 0 0; font-weight: 700; font-size: 10px; color: #b8860b;">ID: ${emp.workerId}</p>
                <p style="margin: 4px 0 0 0; font-size: 9px; color: #64748b;">Estatus: Presente</p>
              </div>
            `);
          markers.push(marker);
        }
      });
      if (markers.length > 0) {
        const group = L.featureGroup(markers);
        leafletMap.current.fitBounds(group.getBounds().pad(0.5));
      }
    }
    return () => {
      if (leafletMap.current) {
        leafletMap.current.remove();
        leafletMap.current = null;
      }
    };
  }, [tab, employees]);

  const copyApplyLink = () => {
    const url = `${window.location.origin}${window.location.pathname}?portal=APPLY`;
    navigator.clipboard.writeText(url);
    alert("Enlace de postulación corporativa copiado. Envíelo al candidato vía WhatsApp.");
  };

  const sharePortalLink = (empId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?portal=ATTENDANCE`;
    navigator.clipboard.writeText(url);
    alert(`Enlace de Terminal de Asistencia copiado para ID: ${empId}. El trabajador debe guardarlo en su pantalla de inicio.`);
  };

  const weeklyPayroll = useMemo(() => {
    const today = new Date();
    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(today.getDate() - i);
      return d.toISOString().split('T')[0];
    });

    return employees.map(emp => {
      const dailySalary = (emp.salary || 3000) / 30;
      const validRecords = emp.attendanceHistory?.filter(r => 
        last7Days.includes(r.date)
      ) || [];
      const presentDays = validRecords.length;
      const totalToPay = dailySalary * presentDays;
      return { 
        ...emp, 
        presentDays, 
        totalToPay, 
        dailySalary,
        last7DaysDates: last7Days
      };
    });
  }, [employees]);

  const handleHire = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployee.name || !newEmployee.dpi) return alert("Faltan datos críticos.");
    const emp: Employee = { 
      ...newEmployee as Employee, id: crypto.randomUUID(),
      workerId: storageService.generateWorkerId(),
      status: 'ACTIVE', attendanceStatus: 'OUT',
      attendanceHistory: [], isContractAccepted: true
    };
    storageService.saveEmployee(emp);
    setEmployees(storageService.getEmployees());
    setTab('ATTENDANCE');
  };

  const handleApplicationAction = (app: CandidateApplication, action: 'ACCEPTED' | 'REJECTED') => {
    storageService.updateApplicationStatus(app.id, action);
    setApplications(storageService.getApplications());
    if (action === 'ACCEPTED') {
      setNewEmployee({
        name: app.name, dpi: app.dpi, phone: app.phone,
        experience: app.experience, position: app.positionApplied,
        salary: POSITIONS.find(p => p.title === app.positionApplied)?.pay || 0
      });
      setTab('HIRE');
    }
  };

  return (
    <Layout title="RRHH y Gestión de Cuadrilla" onNavigate={onNavigate} onLogout={onLogout} currentView="RRHH">
      <div className="space-y-6 pb-20 no-print animate-in fade-in duration-500">
        
        {/* Modal Pago */}
        {selectedEmpForPayroll && (
          <div className="fixed inset-0 z-[500] flex items-center justify-center p-6 bg-slate-900/90 backdrop-blur-xl">
             <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden border-t-[12px] border-[#b8860b]">
                <div className="p-8 bg-slate-900 text-white flex justify-between items-center">
                   <h4 className="text-xl font-black uppercase">{selectedEmpForPayroll.name}</h4>
                   <button onClick={() => setSelectedEmpForPayroll(null)} className="text-xl">✕</button>
                </div>
                <div className="p-10 space-y-6">
                   <div className="grid grid-cols-2 gap-4">
                      <div className="p-6 bg-slate-50 rounded-2xl">
                         <p className="text-[9px] font-black text-slate-400 uppercase">Salario Diario</p>
                         <p className="text-xl font-black">Q{selectedEmpForPayroll.dailySalary.toFixed(2)}</p>
                      </div>
                      <div className="p-6 bg-green-50 rounded-2xl">
                         <p className="text-[9px] font-black text-green-600 uppercase">Días Laborados</p>
                         <p className="text-xl font-black">{selectedEmpForPayroll.presentDays} / 7</p>
                      </div>
                   </div>
                   <div className="pt-6 border-t flex justify-between items-end">
                      <p className="text-xs font-bold text-slate-400 uppercase">Pago Sugerido</p>
                      <p className="text-3xl font-black text-slate-900">Q{selectedEmpForPayroll.totalToPay.toFixed(2)}</p>
                   </div>
                </div>
             </div>
          </div>
        )}

        <div className="flex bg-white rounded-3xl shadow-xl border p-1 overflow-x-auto no-scrollbar">
          <button onClick={() => setTab('ATTENDANCE')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'ATTENDANCE' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-500'}`}>Cuadrilla</button>
          <button onClick={() => setTab('PAYROLL')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'PAYROLL' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-500'}`}>Planilla</button>
          <button onClick={() => setTab('APPLICATIONS')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'APPLICATIONS' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-500'}`}>Postulantes</button>
          <button onClick={() => setTab('HIRE')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'HIRE' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-500'}`}>Contrato</button>
          <button onClick={() => setTab('MAP')} className={`flex-1 min-w-[120px] py-4 rounded-2xl font-black text-[10px] uppercase transition-all ${tab === 'MAP' ? 'bg-[#001f3f] text-white shadow-lg' : 'text-slate-500'}`}>Mapa GPS</button>
        </div>

        {tab === 'ATTENDANCE' && (
          <div className="space-y-6">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex items-center gap-4">
                 <img src={LOGO_URL} className="h-12" alt="M&S" />
                 <div>
                    <h3 className="text-xl font-black text-slate-900 uppercase">Control de Campo Digital</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">Sincronización GPS obligatoria de 7:00 a 7:30 AM</p>
                 </div>
              </div>
              <button onClick={copyApplyLink} className="px-6 py-4 bg-[#b8860b] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-xl transition-all hover:scale-105">
                 📋 COPIAR ENLACE RECLUTAMIENTO
              </button>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-2xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-8 py-5 text-left">ID / Colaborador</th>
                    <th className="px-8 py-5 text-center">Estatus Hoy</th>
                    <th className="px-8 py-5 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {employees.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-all">
                      <td className="px-8 py-5">
                        <p className="font-black text-slate-900 uppercase text-xs">{emp.name}</p>
                        <p className="text-[9px] text-[#b8860b] font-black">{emp.workerId} • {emp.position}</p>
                      </td>
                      <td className="px-8 py-5 text-center">
                        <span className={`text-[10px] font-black uppercase px-4 py-1.5 rounded-full ${emp.attendanceStatus === 'IN' ? 'bg-green-100 text-green-700' : 'bg-red-50 text-red-400'}`}>
                          {emp.attendanceStatus === 'IN' ? 'Geoverificado ✅' : 'Ausente ❌'}
                        </span>
                      </td>
                      <td className="px-8 py-5 text-right">
                        <button onClick={() => sharePortalLink(emp.workerId)} className="p-2 text-slate-400 hover:text-slate-900 transition-colors" title="Compartir Portal Asistencia">
                           <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                             <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                           </svg>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'PAYROLL' && (
          <div className="space-y-6 animate-in fade-in">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border flex justify-between items-center">
               <h3 className="text-xl font-black text-slate-800 uppercase tracking-tighter">Auditoría de Planilla Semanal</h3>
               <p className="text-2xl font-black text-slate-900 tracking-tighter">Q{weeklyPayroll.reduce((acc, curr) => acc + curr.totalToPay, 0).toFixed(2)}</p>
            </div>
            <div className="bg-white rounded-[2.5rem] shadow-2xl border overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-50 text-[10px] font-black text-slate-400 uppercase tracking-widest border-b">
                  <tr>
                    <th className="px-8 py-5 text-left">Colaborador</th>
                    <th className="px-8 py-5 text-center">Días GPS</th>
                    <th className="px-8 py-5 text-right">Total a Pagar</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {weeklyPayroll.map(emp => (
                    <tr key={emp.id} className="hover:bg-slate-50 transition-all cursor-pointer" onClick={() => setSelectedEmpForPayroll(emp)}>
                      <td className="px-8 py-5 font-black text-slate-800 uppercase text-xs">{emp.name}</td>
                      <td className="px-8 py-5 text-center font-black text-slate-900">{emp.presentDays} / 7</td>
                      <td className="px-8 py-5 text-right font-black text-slate-900">Q{emp.totalToPay.toFixed(2)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'HIRE' && (
          <div className="bg-white p-12 rounded-[3.5rem] shadow-2xl border max-w-4xl mx-auto border-t-[14px] border-[#b8860b]">
             <h3 className="text-2xl font-black text-slate-900 tracking-tighter mb-10 uppercase text-center">Formalización de Contrato</h3>
             <form onSubmit={handleHire} className="space-y-6">
                <div className="grid grid-cols-2 gap-8">
                   <InputField label="Nombre Completo" value={newEmployee.name} onChange={(v:any) => setNewEmployee({...newEmployee, name: v})} />
                   <InputField label="DPI (13 dígitos)" value={newEmployee.dpi} onChange={(v:any) => setNewEmployee({...newEmployee, dpi: v})} />
                   <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Puesto Asignado</label>
                      <select className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl font-black text-slate-900" value={newEmployee.position} onChange={e => setNewEmployee({...newEmployee, position: e.target.value})}>
                        {POSITIONS.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                      </select>
                   </div>
                   <InputField label="Salario Semanal (Q)" type="number" value={newEmployee.salary} onChange={(v:any) => setNewEmployee({...newEmployee, salary: Number(v)})} />
                </div>
                <button type="submit" className="w-full py-6 bg-slate-900 text-white font-black rounded-3xl shadow-2xl uppercase tracking-[0.3em] text-[11px] hover:bg-[#b8860b] transition-all">Protocolizar e Integrar a Cuadrilla</button>
             </form>
          </div>
        )}

        {tab === 'MAP' && (
          <div className="bg-white rounded-[3rem] shadow-2xl border-4 border-white overflow-hidden relative h-[600px] animate-in zoom-in-95">
             <div ref={mapRef} className="w-full h-full z-0"></div>
          </div>
        )}

        {tab === 'APPLICATIONS' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 animate-in slide-in-from-bottom">
            {applications.filter(a => a.status === 'PENDING').map(app => (
              <div key={app.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col justify-between">
                <div>
                  <span className="px-4 py-1.5 bg-slate-900 text-white text-[9px] font-black rounded-full uppercase tracking-widest">{app.positionApplied}</span>
                  <h4 className="text-xl font-black text-slate-900 uppercase mt-6">{app.name}</h4>
                  <p className="text-[11px] text-slate-400 font-bold uppercase mt-1 tracking-widest">DPI: {app.dpi} • Tel: {app.phone}</p>
                  <p className="text-xs text-slate-500 mt-4 leading-relaxed font-medium">Experiencia: <span className="italic">"{app.experience}"</span></p>
                </div>
                <div className="flex gap-4 mt-10">
                  <button onClick={() => handleApplicationAction(app, 'ACCEPTED')} className="flex-1 py-4 bg-[#b8860b] text-white font-black rounded-2xl text-[10px] uppercase shadow-lg hover:brightness-110">CONTRATAR</button>
                  <button onClick={() => handleApplicationAction(app, 'REJECTED')} className="flex-1 py-4 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase hover:bg-red-50 hover:text-red-500">RECHAZAR</button>
                </div>
              </div>
            ))}
            {applications.filter(a => a.status === 'PENDING').length === 0 && (
               <div className="col-span-2 py-40 text-center opacity-20">
                  <h3 className="text-3xl font-black uppercase tracking-widest">Sin nuevas aplicaciones</h3>
               </div>
            )}
          </div>
        )}

      </div>
    </Layout>
  );
};

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-1">
    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{label}</label>
    <input type={type} className="w-full p-4 bg-slate-50 border-2 border-slate-100 rounded-2xl outline-none font-black text-slate-900 focus:border-[#b8860b] shadow-inner" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default RRHHView;