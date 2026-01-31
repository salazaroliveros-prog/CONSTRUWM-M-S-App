
import React, { useState, useEffect, useRef } from 'react';
import Layout from './Layout';
import { AppView, Transaction } from '../types';
import { storageService } from '../services/storageService';
import { dataUrlToInlineData, geminiGenerate, type GeminiPart } from '../services/geminiProxy';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

interface ChatMessage {
  role: 'USER' | 'AI';
  text: string;
  image?: string;
  specs?: string;
}

const ComprasView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { 
      role: 'AI', 
      text: 'Centro de Inteligencia Logística M&S activado. Estoy monitoreando el mercado guatemalteco y su historial de adquisiciones para detectar oportunidades de ahorro y blindar su cadena de suministro. ¿Qué insumo o equipo desea auditar hoy?' 
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [inputSpecs, setInputSpecs] = useState('');
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showSpecsInput, setShowSpecsInput] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, isLoading]);

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSend = async () => {
    if ((!inputText.trim() && !selectedImage && !inputSpecs.trim()) || isLoading) return;
    
    const userMsgText = inputText;
    const userMsgImage = selectedImage;
    const userMsgSpecs = inputSpecs;
    
    setMessages(prev => [...prev, { 
      role: 'USER', 
      text: userMsgText, 
      image: userMsgImage || undefined,
      specs: userMsgSpecs || undefined
    }]);
    
    setInputText('');
    setSelectedImage(null);
    setInputSpecs('');
    setShowSpecsInput(false);
    setIsLoading(true);

    try {
      const historyTxs = storageService.getTransactions();
      
      // Proporcionamos un contexto histórico más amplio para que la IA detecte patrones
      const historySummary = historyTxs.slice(-50).map(t => ({
        desc: t.description,
        precio: t.cost,
        unidad: t.unit,
        cat: t.category,
        fecha: t.date,
        prov: t.provider || 'N/A'
      }));

      const projectsList = storageService.getProjects().map(p => ({
        n: p.name,
        t: p.typology,
        s: p.status
      }));

      const parts: GeminiPart[] = [];
      let fullTextPrompt = `CONSULTA DE REQUISICIÓN: "${userMsgText}"`;
      
      if (userMsgSpecs) {
        fullTextPrompt += `\n\nDATOS TÉCNICOS ADJUNTOS:\n${userMsgSpecs}`;
      }

      fullTextPrompt += `\n\n--- CONTEXTO OPERATIVO M&S ---
      HISTORIAL DE COMPRAS (Últimas 50): ${JSON.stringify(historySummary)}
      PROYECTOS ACTIVOS: ${JSON.stringify(projectsList)}
      
      TAREA CRÍTICA:
      1. Usa Google Search para encontrar el precio MÁS BAJO actual en Guatemala para los insumos mencionados.
      2. Compara el precio de mercado vs. el precio histórico de la empresa.
      3. Si el precio actual es >10% mayor al histórico, alerta sobre SOBRECOSTO y sugiere proveedores alternos.
      4. Si el precio actual es <10% menor al histórico, sugiere COMPRA POR VOLUMEN inmediata.
      5. Identifica riesgos de desabastecimiento (ej. huelgas, escasez de clinker para cemento, fluctuación del acero).
      6. Responde con secciones: [ANÁLISIS DE MERCADO], [COMPARATIVA HISTÓRICA], [ALERTAS DE RIESGO] y [RECOMENDACIÓN ESTRATÉGICA].`;
      
      parts.push({ text: fullTextPrompt });

      if (userMsgImage) {
        parts.push({ inlineData: dataUrlToInlineData(userMsgImage) });
      }

      const response = await geminiGenerate({
        model: 'gemini-3-pro-preview',
        parts,
        config: {
          systemInstruction: `Eres el "Logistics Intelligence Director" de M&S Constructora. 
          Tu objetivo es minimizar el costo de adquisición (COA) y garantizar el flujo de materiales.
          REGLAS DE OPERACIÓN:
          - Eres proactivo: No esperes a que te pidan ahorrar, busca el ahorro en cada palabra del usuario.
          - Eres territorial: Conoces a la perfección el mercado de Guatemala (Construfácil, EPA, Cemaco, Ferretería El Globo, Aceros de Guatemala, Progreso).
          - Eres analítico: Usas los datos históricos proporcionados para cuestionar pedidos ineficientes.
          - Eres ejecutivo: Tu lenguaje es directo, serio y enfocado en resultados financieros.
          Usa Markdown profesional con tablas comparativas si es posible.`,
          tools: [{ googleSearch: {} }]
        }
      });

      setMessages(prev => [...prev, { 
        role: 'AI', 
        text: response.text || 'Análisis de mercado y riesgos finalizado. Por favor, revise las recomendaciones adjuntas.' 
      }]);
    } catch (e) {
      console.error(e);
      setMessages(prev => [...prev, { 
        role: 'AI', 
        text: 'Error crítico en el motor de inteligencia. El servidor de datos de mercado no responde. Verifique su conexión de red empresarial.' 
      }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Layout title="Centro de Inteligencia Logística" onNavigate={onNavigate} onLogout={onLogout} currentView="COMPRAS">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-[calc(100vh-14rem)] overflow-hidden">
        
        {/* Panel Izquierdo: Formulario de Requisición Rápida */}
        <div className="lg:col-span-4 flex flex-col gap-6 overflow-y-auto pr-2 custom-scrollbar no-print">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-2xl border border-slate-100 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-blue-50 rounded-full -mr-16 -mt-16 opacity-40 group-hover:scale-110 transition-transform"></div>
            
            <div className="flex items-center gap-4 mb-8 relative">
              <div className="w-12 h-12 bg-slate-900 rounded-2xl flex items-center justify-center shadow-lg text-white font-black">LOG</div>
              <div>
                <h3 className="text-xl font-black text-slate-800 tracking-tight">Nueva Requisición</h3>
                <p className="text-[9px] font-black text-[#b8860b] uppercase tracking-[0.3em]">Validación IA Obligatoria</p>
              </div>
            </div>

            <div className="space-y-5 relative">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Insumo / Equipo</label>
                <input 
                  className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none focus:ring-4 focus:ring-[#b8860b]/10 focus:bg-white transition-all font-bold text-slate-700" 
                  placeholder="Ej: Cemento 4000 PSI, Varilla 3/8''" 
                  value={inputText}
                  onChange={e => setInputText(e.target.value)}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Cant. Solicitada</label>
                  <input className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold" type="number" placeholder="0" />
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Prioridad</label>
                  <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs">
                    <option>Standard</option>
                    <option className="text-orange-600">Alta (Próximo Hito)</option>
                    <option className="text-red-600">CRÍTICA (Paro Técnico)</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest ml-1">Destino de Suministro</label>
                <select className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold text-xs">
                  {storageService.getProjects().map(p => <option key={p.id}>{p.name}</option>)}
                </select>
              </div>

              <div className="pt-2">
                <button 
                  onClick={() => setShowSpecsInput(!showSpecsInput)}
                  className="text-[9px] font-black text-[#b8860b] uppercase tracking-widest hover:underline flex items-center gap-2"
                >
                  {showSpecsInput ? '[-] Ocultar Especificaciones' : '[+] Agregar Especificaciones Técnicas'}
                </button>
                {showSpecsInput && (
                  <textarea 
                    className="w-full mt-3 p-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-medium text-xs h-24 animate-in fade-in slide-in-from-top-2"
                    placeholder="Detalles de marca, grado, procedencia, etc..."
                    value={inputSpecs}
                    onChange={e => setInputSpecs(e.target.value)}
                  />
                )}
              </div>
            </div>
            
            <button 
              onClick={handleSend}
              disabled={isLoading}
              className={`w-full mt-8 py-5 text-white font-black rounded-2xl shadow-xl transition-all uppercase tracking-[0.2em] text-[10px] active:scale-95 flex items-center justify-center gap-3 ${isLoading ? 'bg-slate-400 cursor-not-allowed' : 'bg-slate-900 hover:bg-slate-800'}`}
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                  VALIDANDO COSTOS...
                </>
              ) : 'PROCESAR PARA AUDITORÍA IA'}
            </button>
          </div>

          <div className="bg-slate-900 p-6 rounded-[2rem] text-white shadow-xl flex items-center gap-4">
            <div className="w-10 h-10 bg-[#b8860b] rounded-full flex items-center justify-center text-lg shadow-inner">💡</div>
            <p className="text-[10px] font-medium leading-relaxed opacity-80 italic">
              "El sistema audita automáticamente el precio de mercado local en tiempo real antes de autorizar cualquier compra."
            </p>
          </div>
        </div>

        {/* Panel Derecho: Chat de Inteligencia Proactiva */}
        <div className="lg:col-span-8 flex flex-col bg-white rounded-[3rem] shadow-2xl border border-slate-100 overflow-hidden relative">
          <div className="p-8 bg-slate-900 text-white flex items-center justify-between z-10">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-600 rounded-2xl flex items-center justify-center font-black shadow-lg text-xl animate-pulse">IA</div>
              <div>
                <p className="font-black text-lg tracking-tight">Asistente Estratégico de Suministros</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <p className="text-[8px] text-green-400 font-black uppercase tracking-[0.2em]">Enlace con Mercado Guatemala Activo</p>
                </div>
              </div>
            </div>
            <button onClick={() => setMessages(messages.slice(0,1))} className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-all" title="Limpiar Auditoría">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          </div>

          <div ref={scrollRef} className="flex-1 p-8 overflow-y-auto space-y-8 bg-slate-50/50 custom-scrollbar scroll-smooth">
            {messages.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'USER' ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-4 duration-500`}>
                <div className={`max-w-[85%] group`}>
                  {m.image && (
                    <div className="rounded-[2rem] overflow-hidden shadow-2xl border-4 border-white mb-3 ml-auto w-64 transform hover:scale-105 transition-transform cursor-pointer">
                      <img src={m.image} alt="Referencia Técnica" className="w-full h-auto object-cover" />
                    </div>
                  )}
                  <div className={`p-7 rounded-[2.5rem] text-sm leading-relaxed shadow-sm relative ${
                    m.role === 'USER' 
                      ? 'bg-slate-900 text-white rounded-tr-none' 
                      : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none font-medium'
                  }`}>
                    {m.specs && (
                      <div className="mb-4 p-3 bg-white/10 rounded-xl border border-white/20 text-[10px] font-mono opacity-80">
                        {m.specs}
                      </div>
                    )}
                    <div className="prose prose-sm max-w-none prose-slate">
                      {m.text.split('\n').map((line, idx) => (
                        <p key={idx} className={line.startsWith('#') ? 'font-black text-slate-900 mt-4 mb-2' : 'mb-2'}>
                          {line}
                        </p>
                      ))}
                    </div>
                    {m.role === 'AI' && (
                      <div className="absolute -bottom-6 left-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button className="px-3 py-1 bg-white border rounded-full text-[8px] font-black uppercase hover:bg-slate-50 transition-all">Reportar Error</button>
                        <button className="px-3 py-1 bg-white border rounded-full text-[8px] font-black uppercase hover:bg-slate-50 transition-all">Copiar Análisis</button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-xl flex gap-6 items-center">
                  <div className="flex gap-2">
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce"></div>
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                    <div className="w-2.5 h-2.5 bg-blue-600 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Rastreando Proveedores en Guatemala...</p>
                </div>
              </div>
            )}
          </div>

          <div className="p-8 bg-white border-t border-slate-100 no-print">
            <div className="flex gap-4 items-center">
              <input type="file" accept="image/*" ref={fileInputRef} onChange={handleImageSelect} className="hidden" />
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className={`p-5 rounded-2xl border transition-all shadow-sm group ${selectedImage ? 'bg-blue-50 border-blue-200 text-blue-600' : 'bg-slate-50 border-slate-200 text-slate-400 hover:bg-slate-100 hover:text-[#b8860b]'}`}
                title="Adjuntar Foto de Material/Equipo"
              >
                {selectedImage ? '✅' : '📷'}
              </button>
              <div className="flex-1 relative">
                <input 
                  className="w-full p-5 bg-slate-50 border border-slate-200 rounded-[1.5rem] text-sm outline-none focus:ring-4 focus:ring-[#b8860b]/10 font-bold text-slate-800 pr-20 shadow-inner transition-all" 
                  placeholder="Consulte sobre precios, stock o riesgos de un insumo..." 
                  value={inputText} 
                  onChange={e => setInputText(e.target.value)} 
                  onKeyDown={e => e.key === 'Enter' && handleSend()} 
                />
                <button 
                  onClick={handleSend} 
                  disabled={isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-4 bg-slate-900 text-white rounded-2xl shadow-xl active:scale-95 transition-all hover:bg-blue-600 disabled:bg-slate-300"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            </div>
            {selectedImage && (
              <div className="mt-3 flex items-center gap-2 animate-in fade-in">
                <span className="text-[10px] font-bold text-blue-600 uppercase bg-blue-50 px-3 py-1 rounded-full">Imagen de referencia cargada</span>
                <button onClick={() => setSelectedImage(null)} className="text-[10px] text-red-500 hover:underline">Eliminar</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ComprasView;
