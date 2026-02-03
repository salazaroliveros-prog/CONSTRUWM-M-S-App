
import React, { useState, useEffect } from 'react';
import { AppView } from '../types';
import { POSITIONS, LOGO_URL } from '../constants';
import { attendanceErrorToUserMessage, edgeApi, formatApiError } from '../services/edgeApi';

interface Props {
  onNavigate: (view: AppView) => void;
}

const WorkerPortal: React.FC<Props> = ({ onNavigate }) => {
  const [mode, setMode] = useState<'APPLY' | 'ATTENDANCE' | 'SUCCESS'>('ATTENDANCE');
  const [time, setTime] = useState(new Date());
  const [workerId, setWorkerId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [currentCoords, setCurrentCoords] = useState<{lat: number, lng: number} | null>(null);

  const [applyForm, setApplyForm] = useState({
    name: '',
    phone: '',
    dpi: '',
    experience: '',
    position: POSITIONS[0].title
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const portalType = params.get('portal');
    if (portalType === 'APPLY') setMode('APPLY');
    const timer = setInterval(() => setTime(new Date()), 1000);

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCurrentCoords({lat: pos.coords.latitude, lng: pos.coords.longitude}),
        () => setLocationError("Acceso a GPS denegado. Es obligatorio para validar asistencia.")
      );
    }
    return () => clearInterval(timer);
  }, []);

  const h = time.getHours();
  const m = time.getMinutes();
  const isAttendanceOpen = h === 7 && m >= 0 && m < 30;
  const isCloseWarning = h === 7 && m >= 15 && m < 30;
  const isTooLate = (h === 7 && m >= 30) || h >= 8;

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyForm.name || !applyForm.dpi || applyForm.dpi.length !== 13) return alert("DPI Inválido.");
    if (!edgeApi.isConfigured()) {
      alert('Supabase no está configurado. Falta .env.local');
      return;
    }
    setIsLoading(true);
    edgeApi.portalSubmitContract({
      name: applyForm.name,
      phone: applyForm.phone,
      dpi: applyForm.dpi,
      experience: applyForm.experience,
      positionApplied: applyForm.position,
    }).then(() => {
      setIsLoading(false);
      setMode('SUCCESS');
    }).catch((err) => {
      setIsLoading(false);
      alert(formatApiError(err));
    });
  };

  const handleAttendance = () => {
    if (!workerId) return alert("Ingrese ID Corporativo");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        if (!edgeApi.isConfigured()) {
          alert('Supabase no está configurado. Falta .env.local');
          return;
        }
        setIsLoading(true);
        edgeApi.portalMarkAttendance({
          workerId,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          method: 'SELF',
          deviceLabel: navigator.userAgent,
        }).then((resp) => {
          alert(`¡Asistencia Validada!\nColaborador: ${resp.employeeName}\nModo: INDIVIDUAL`);
          setWorkerId('');
          setIsLoading(false);
        }).catch((err) => {
          const msg = formatApiError(err);
          alert(attendanceErrorToUserMessage(msg));
          setIsLoading(false);
        });
      },
      () => {
        setLocationError("Error de GPS.");
        setIsLoading(false);
      }
    );
  };

  if (mode === 'SUCCESS') {
    return (
      <div className="min-h-screen bg-[#001f3f] flex items-center justify-center p-8 text-center">
        <div className="bg-white p-12 rounded-[4rem] shadow-2xl space-y-8 max-w-sm border-t-[15px] border-[#b8860b] animate-in zoom-in-95">
           <img src={LOGO_URL} alt="M&S" className="h-24 mx-auto object-contain" />
           <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter leading-none">Perfil Recibido Correctamente</h2>
           <p className="text-sm text-slate-500 font-bold leading-relaxed">Su información ha sido enviada al departamento de RRHH. Analizaremos su experiencia y le contactaremos vía WhatsApp para la firma de contrato.</p>
           <button onClick={() => setMode('ATTENDANCE')} className="w-full py-5 bg-slate-900 text-white font-black rounded-3xl uppercase text-[10px] tracking-widest shadow-xl active:scale-95 transition-all">Cerrar Terminal</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      <header className="bg-[#001f3f] p-10 text-white text-center shadow-2xl border-b-[10px] border-[#b8860b]">
        <img src={LOGO_URL} alt="M&S Logo" className="h-24 mx-auto mb-6 object-contain drop-shadow-lg" />
        <h1 className="text-3xl font-black uppercase tracking-tighter leading-none">Terminal de Campo</h1>
        <p className="text-[10px] font-bold text-[#b8860b] uppercase tracking-[0.5em] mt-3">Geolocalización en Tiempo Real</p>
      </header>

      <main className="p-6 max-w-md mx-auto space-y-8 mt-10">
        
        {mode === 'APPLY' ? (
           <div className="bg-white p-12 rounded-[4rem] shadow-2xl space-y-8 animate-in slide-in-from-bottom duration-700 border border-slate-100">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter text-center">Postulación de Cuadrilla</h2>
              <form onSubmit={handleApply} className="space-y-5">
                 <InputField label="Nombre y Apellidos" value={applyForm.name} onChange={(v:any) => setApplyForm({...applyForm, name: v})} />
                 <InputField label="DPI (13 dígitos)" value={applyForm.dpi} onChange={(v:any) => setApplyForm({...applyForm, dpi: v})} />
                 <InputField label="WhatsApp de Contacto" value={applyForm.phone} onChange={(v:any) => setApplyForm({...applyForm, phone: v})} />
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Especialidad Técnica</label>
                    <select aria-label="Especialidad Técnica" className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-black text-slate-900 uppercase text-xs" value={applyForm.position} onChange={e => setApplyForm({...applyForm, position: e.target.value})}>
                      {POSITIONS.map(p => <option key={p.title} value={p.title}>{p.title}</option>)}
                    </select>
                 </div>
                 <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase ml-2 tracking-widest">Breve Experiencia</label>
                    <textarea className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] font-bold text-slate-900 text-xs h-28" placeholder="Cuéntenos sobre sus últimos proyectos..." value={applyForm.experience} onChange={e => setApplyForm({...applyForm, experience: e.target.value})} />
                 </div>
                 <button type="submit" disabled={isLoading} className="w-full py-6 bg-slate-900 text-white font-black rounded-[2rem] shadow-2xl uppercase tracking-[0.3em] text-[11px] active:scale-95 transition-all">
                    {isLoading ? 'Enviando Perfil...' : 'ENVIAR POSTULACIÓN'}
                 </button>
              </form>
           </div>
        ) : (
          <div className="space-y-6">
            <div className={`bg-white p-12 rounded-[4rem] shadow-2xl text-center space-y-8 border-4 transition-all duration-500 ${isCloseWarning ? 'border-orange-400' : isTooLate ? 'border-red-100' : 'border-white'}`}>
               <div className={`text-6xl font-black tracking-tighter tabular-nums ${isCloseWarning ? 'text-orange-500 animate-pulse' : isTooLate ? 'text-slate-300' : 'text-slate-900'}`}>
                 {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
               </div>

               {isCloseWarning && (
                  <div className="bg-orange-50 p-4 rounded-2xl border-2 border-orange-200 animate-bounce">
                     <p className="text-[10px] font-black text-orange-700 uppercase tracking-widest leading-none">⚠️ ¡AVISO DE CIERRE!</p>
                     <p className="text-[9px] font-bold text-orange-600 uppercase mt-2">La asistencia se desactivará en breve (07:30 AM)</p>
                  </div>
               )}

              {isTooLate && (
                  <div className="bg-red-50 p-6 rounded-[2.5rem] border-2 border-red-100">
                     <p className="text-[11px] font-black text-red-600 uppercase tracking-widest">VENTANA DE TIEMPO CERRADA</p>
                     <p className="text-[9px] font-bold text-red-400 uppercase mt-2">Asistencia solo permitida de 07:00 a 07:30 AM</p>
                  </div>
               )}

               <div className="flex items-center justify-center gap-3">
                 <div className={`w-3 h-3 rounded-full ${currentCoords ? 'bg-green-500 animate-pulse' : 'bg-red-500'}`}></div>
                 <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                   GPS: {currentCoords ? 'VALIDADO' : 'BUSCANDO SEÑAL...'}
                 </span>
               </div>

               <div className="pt-6 space-y-3">
                  <input 
                    className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] text-center font-black text-4xl tracking-widest outline-none focus:border-[#b8860b] focus:bg-white text-slate-900 shadow-inner" 
                    placeholder="ID-PRO" 
                    value={workerId}
                    onChange={e => setWorkerId(e.target.value.toUpperCase())}
                  />
                  <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest italic">Ingrese su Identificación Maestra</p>
               </div>

               <button 
                 onClick={handleAttendance}
                 disabled={isLoading || !isAttendanceOpen}
                 className={`w-full py-8 rounded-[3rem] font-black uppercase tracking-[0.4em] shadow-2xl transition-all flex items-center justify-center gap-4 text-xs ${(isAttendanceOpen && currentCoords) ? 'bg-slate-900 text-white active:scale-95 shadow-slate-200' : 'bg-slate-100 text-slate-300 cursor-not-allowed'}`}
               >
                 {isLoading ? (
                   <div className="w-5 h-5 border-4 border-white/20 border-t-white rounded-full animate-spin"></div>
                 ) : (
                   isAttendanceOpen ? 'VALIDAR INGRESO ✅' : 'Terminal Bloqueada'
                 )}
               </button>
            </div>
          </div>
        )}

      </main>

      <footer className="mt-10 p-12 text-center text-slate-300 text-[9px] font-black uppercase tracking-[0.6em]">
        WM CONSTRUCTORA • GRUPO M&S S.A. • EDIFICANDO EL FUTURO
      </footer>
    </div>
  );
};

const InputField = ({ label, value, onChange, type = "text" }: any) => (
  <div className="space-y-2">
    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{label}</label>
    <input aria-label={label} type={type} className="w-full p-5 bg-slate-50 border-2 border-slate-100 rounded-[1.8rem] outline-none font-black text-slate-900 focus:border-[#b8860b] focus:bg-white transition-all shadow-inner text-sm" value={value} onChange={e => onChange(e.target.value)} />
  </div>
);

export default WorkerPortal;
