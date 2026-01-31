
import React, { useState, useRef } from 'react';
import Layout from './Layout';
import { AppView } from '../types';
import { dataUrlToInlineData, geminiGenerate } from '../services/geminiProxy';

interface Props {
  onNavigate: (view: AppView) => void;
  onLogout: () => void;
}

const ImageEditorView: React.FC<Props> = ({ onNavigate, onLogout }) => {
  const [sourceImage, setSourceImage] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSourceImage(reader.result as string);
        setEditedImage(null);
        setError(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleProcessImage = async () => {
    if (!sourceImage || !prompt.trim()) return;

    setIsLoading(true);
    setError(null);

    try {
      const response = await geminiGenerate({
        model: 'gemini-2.5-flash-image',
        parts: [
          { inlineData: dataUrlToInlineData(sourceImage) },
          { text: `Please edit this image according to the following instruction: ${prompt}. Return the modified image.` },
        ],
      });

      const firstImage = response.images?.[0];
      if (firstImage) {
        setEditedImage(`data:${firstImage.mimeType};base64,${firstImage.data}`);
      } else {
        setError("La IA no devolvió una imagen editada. Intente con una instrucción diferente.");
      }
    } catch (e) {
      console.error(e);
      setError("Error al procesar la imagen con la IA. Verifique su conexión o intente más tarde.");
    } finally {
      setIsLoading(false);
    }
  };

  const downloadImage = () => {
    if (!editedImage) return;
    const link = document.createElement('a');
    link.href = editedImage;
    link.download = `edited_image_${Date.now()}.png`;
    link.click();
  };

  return (
    <Layout title="Laboratorio de Imágenes IA" onNavigate={onNavigate} onLogout={onLogout} currentView="IMAGE_EDITOR">
      <div className="space-y-10 pb-20 max-w-6xl mx-auto">
        
        <div className="bg-white p-10 rounded-[3rem] shadow-2xl border-l-[12px] border-[#b8860b]">
          <h2 className="text-3xl font-black text-slate-800 tracking-tight uppercase">Editor de Visualización de Obra</h2>
          <p className="text-slate-500 mt-2 font-medium italic">"Utilice Gemini 2.5 Flash Image para modificar renders, fotos de sitio o planos con lenguaje natural."</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Panel de Control */}
          <div className="space-y-8">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 flex flex-col gap-8">
              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">1. Carga de Referencia</h3>
                <div
                  onClick={() => fileInputRef.current?.click()}
                  className={`w-full aspect-video rounded-[2.5rem] border-4 border-dashed flex flex-col items-center justify-center cursor-pointer transition-all ${sourceImage ? 'border-emerald-100 bg-emerald-50/20' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    className="hidden"
                    accept="image/*"
                    aria-label="Subir imagen de referencia"
                    title="Subir imagen de referencia"
                  />
                  {sourceImage ? (
                    <img
                      src={sourceImage}
                      alt="Imagen de referencia"
                      className="w-full h-full object-cover rounded-[2.25rem]"
                    />
                  ) : (
                    <div className="text-center">
                      <span className="text-5xl mb-4 block">📸</span>
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Click para subir foto de obra</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">2. Instrucción de Edición</h3>
                <textarea 
                  className="w-full p-6 bg-slate-50 border-2 border-slate-100 rounded-[2rem] outline-none focus:border-[#b8860b] transition-all font-bold text-slate-700 h-32 placeholder:text-slate-300"
                  placeholder="Ej: 'Añade un filtro retro', 'Quita a las personas del fondo', 'Cambia el color de la fachada a blanco'..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                />
              </div>

              <button 
                onClick={handleProcessImage}
                disabled={isLoading || !sourceImage || !prompt.trim()}
                className={`w-full py-6 rounded-[2rem] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl transition-all flex items-center justify-center gap-4 ${isLoading ? 'bg-slate-400' : 'bg-slate-900 text-white hover:bg-[#b8860b] active:scale-95'}`}
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
                    PROCESANDO CON IA...
                  </>
                ) : '🪄 EJECUTAR EDICIÓN IA'}
              </button>

              {error && (
                <div className="p-5 bg-red-50 border border-red-100 rounded-2xl">
                  <p className="text-[10px] font-black text-red-600 uppercase tracking-widest text-center">{error}</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-xl flex items-center gap-6">
              <div className="w-12 h-12 bg-[#b8860b] rounded-2xl flex items-center justify-center text-2xl shadow-lg">💡</div>
              <p className="text-xs font-medium leading-relaxed opacity-80 italic">
                "Este módulo permite prototipar cambios visuales en el proyecto de forma instantánea para presentar al cliente."
              </p>
            </div>
          </div>

          {/* Panel de Resultado */}
          <div className="bg-white p-10 rounded-[3rem] shadow-2xl border border-slate-100 flex flex-col min-h-[500px]">
            <div className="flex justify-between items-center mb-10">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Resultado Generado</h3>
              {editedImage && (
                <button 
                  onClick={downloadImage}
                  className="px-6 py-2 bg-slate-100 text-slate-700 font-black rounded-full text-[9px] uppercase hover:bg-[#b8860b] hover:text-white transition-all shadow-sm"
                >
                  📥 Descargar PNG
                </button>
              )}
            </div>

            <div className="flex-1 rounded-[2.5rem] border-4 border-slate-50 bg-slate-50/50 flex flex-col items-center justify-center overflow-hidden relative">
              {isLoading ? (
                <div className="flex flex-col items-center gap-6 text-center">
                   <div className="w-16 h-16 border-[6px] border-[#b8860b] border-t-transparent rounded-full animate-spin"></div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] animate-pulse">Re-imaginando la escena...</p>
                </div>
              ) : editedImage ? (
                <img src={editedImage} className="w-full h-full object-contain animate-in fade-in zoom-in duration-700" alt="Result" />
              ) : (
                <div className="text-center opacity-20">
                  <span className="text-8xl mb-6 block">✨</span>
                  <p className="text-sm font-black text-slate-400 uppercase tracking-[0.2em]">Esperando procesamiento</p>
                </div>
              )}
            </div>

            {editedImage && (
              <div className="mt-8 flex justify-center gap-4">
                 <button onClick={() => setEditedImage(null)} className="text-[9px] font-black text-slate-400 uppercase tracking-widest hover:text-red-500 transition-colors">Limpiar Lienzo</button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default ImageEditorView;
