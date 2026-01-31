
import React, { useState } from 'react';
import { COLORS, LOGO_URL } from '../constants';
import { storageService } from '../services/storageService';

interface Props {
  onLogin: (success: boolean) => void;
}

const LoginView: React.FC<Props> = ({ onLogin }) => {
  const [password, setPassword] = useState('');
  const [showChangePass, setShowChangePass] = useState(false);
  const [newPass, setNewPass] = useState('');

  const handleAccess = () => {
    if (password === storageService.getAdminPass()) {
      onLogin(true);
    } else {
      alert('Credencial Inválida. Acceso Denegado.');
    }
  };

  const handleChangePassword = () => {
    if (password === storageService.getAdminPass()) {
      storageService.setAdminPass(newPass);
      alert('Token de Seguridad Actualizado.');
      setShowChangePass(false);
    } else {
      alert('Validación de origen fallida.');
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen px-4 bg-[#001f3f]">
      {/* Fondo con Marca de Agua Corporativa */}
      <div className="absolute inset-0 opacity-10 pointer-events-none overflow-hidden flex items-center justify-center">
         <img src={LOGO_URL} alt="" className="w-full max-w-7xl grayscale contrast-200 animate-pulse scale-150 rotate-12" />
      </div>

      <div className="relative max-w-lg w-full bg-white rounded-[4rem] shadow-[0_80px_150px_-20px_rgba(0,0,0,0.8)] overflow-hidden border-[10px] border-[#b8860b] transform transition-all animate-in zoom-in-95 duration-1000">
        <div className="p-16 text-center">
          <div className="flex justify-center mb-10">
             <div className="h-56 w-auto hover:scale-105 transition-transform duration-1000 logo-glow">
                <img src={LOGO_URL} alt="WM Constructora Logo" className="h-full w-auto object-contain drop-shadow-2xl" />
             </div>
          </div>
          
          <div className="space-y-2 mb-12">
            <h1 className="text-4xl font-black tracking-tighter uppercase leading-none text-slate-900">
              WM CONSTRUCTORA
            </h1>
            <p className="text-[10px] font-black text-[#b8860b] uppercase tracking-[0.6em] mt-2">Executive Enterprise System</p>
          </div>
          
          {!showChangePass ? (
            <div className="space-y-8">
              <div className="relative">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest block mb-3">Clave Corporativa de Acceso</label>
                <input
                  type="password"
                  placeholder="••••••••"
                  className="w-full px-10 py-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] focus:outline-none focus:border-[#b8860b] text-center font-black text-2xl tracking-[0.5em] text-slate-900 placeholder:text-slate-200 transition-all shadow-inner"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAccess()}
                />
              </div>
              <button
                onClick={handleAccess}
                className="w-full py-6 text-white font-black rounded-[2rem] transition-all active:scale-95 shadow-[0_25px_60px_-10px_rgba(184,134,11,0.4)] bg-gradient-to-r from-slate-900 via-[#001f3f] to-slate-900 text-xs uppercase tracking-[0.4em] hover:brightness-125 border border-white/10"
              >
                AUTORIZAR INGRESO
              </button>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-bottom-6 duration-500">
              <input
                type="password"
                placeholder="CLAVE ACTUAL"
                className="w-full px-8 py-5 border-2 rounded-[1.5rem] focus:border-[#b8860b] font-black text-sm text-slate-900 tracking-widest text-center shadow-inner"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <input
                type="password"
                placeholder="NUEVA CLAVE"
                className="w-full px-8 py-5 border-2 rounded-[1.5rem] focus:border-[#b8860b] font-black text-sm text-slate-900 tracking-widest text-center shadow-inner"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <div className="flex gap-4 pt-4">
                <button
                  onClick={handleChangePassword}
                  className="flex-1 py-5 bg-[#b8860b] text-white font-black rounded-2xl text-[10px] uppercase tracking-widest shadow-2xl"
                >
                  SINCRONIZAR
                </button>
                <button
                  onClick={() => setShowChangePass(false)}
                  className="flex-1 py-5 bg-slate-100 text-slate-500 font-black rounded-2xl text-[10px] uppercase tracking-widest"
                >
                  CANCELAR
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="bg-slate-50 py-6 text-center border-t border-slate-100">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-[0.8em]">EDIFICANDO EL FUTURO • WM S.A.</p>
        </div>
      </div>
    </div>
  );
};

export default LoginView;
