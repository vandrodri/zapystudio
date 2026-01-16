import React, { useState, useRef } from 'react';

const LogoGenerator: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [style, setStyle] = useState('modern');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedLogo, setGeneratedLogo] = useState<string | null>(null);
  const [refImage, setRefImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const logoStyles = {
    modern: 'modern minimalist clean geometric',
    vintage: 'vintage retro classic elegant serif fonts',
    tech: 'futuristic tech cyberpunk neon gradient',
    organic: 'organic natural flowing handcrafted artisan',
    bold: 'bold strong impactful powerful typography',
    playful: 'playful colorful friendly fun whimsical'
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert("Por favor, descreva o logo que você quer gerar!");
      return;
    }

    setIsGenerating(true);
    try {
      const styleModifier = logoStyles[style as keyof typeof logoStyles];
      const fullPrompt = `${prompt}, ${styleModifier} style`;
      
      const response = await fetch('/.netlify/functions/generate-logo', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: fullPrompt })
      });

      if (!response.ok) {
        const error = await response.json();
        alert(error.error || 'Erro ao gerar logo');
        return;
      }

      const data = await response.json();
      setGeneratedLogo(data.image);
      
    } catch (error) {
      console.error("Erro na geração do logo:", error);
      alert("Falha ao gerar o logo. Verifique sua conexão e tente novamente.");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRefImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setRefImage(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const downloadLogo = () => {
    if (!generatedLogo) return;
    const link = document.createElement('a');
    link.href = generatedLogo;
    link.download = `logo-ia-${Date.now()}.png`;
    link.click();
  };

  const downloadSVG = () => {
    if (!generatedLogo) return;
    const svgContent = `<svg width="1024" height="1024" xmlns="http://www.w3.org/2000/svg"><image href="${generatedLogo}" width="1024" height="1024" /></svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `logo-ia-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto py-12 space-y-12">
      <header className="text-center space-y-4">
        <h1 className="text-5xl font-extrabold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
          Arquiteto de Logos IA
        </h1>
        <p className="text-slate-400 text-lg">Crie a identidade perfeita para sua marca em segundos.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-start">
        {/* Creation Controls */}
        <div className="space-y-8 p-8 bg-dark-blue-800 rounded-[3rem] shadow-neu-out">
          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Estilo do Logo</label>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(logoStyles).map(([key, value]) => (
                <button
                  key={key}
                  onClick={() => setStyle(key)}
                  className={`p-3 rounded-xl text-sm font-medium transition-all ${
                    style === key
                      ? 'bg-blue-500 text-white shadow-lg'
                      : 'bg-dark-blue-900 text-slate-400 hover:bg-dark-blue-700'
                  }`}
                >
                  {key.charAt(0).toUpperCase() + key.slice(1)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Descrição do Logo</label>
            <textarea
              placeholder="Ex: Uma empresa de tecnologia futurista chamada 'Nova', usando tons de azul profundo e prata..."
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full h-32 bg-dark-blue-900 border-none rounded-2xl p-4 shadow-neu-sm-in outline-none focus:ring-2 ring-blue-500/50 resize-none transition-all"
            />
          </div>

          <div className="space-y-3">
            <label className="text-sm font-semibold text-slate-300">Imagem de Referência (Em breve)</label>
            <div 
              className="relative overflow-hidden h-40 bg-dark-blue-900 rounded-2xl shadow-neu-sm-in flex flex-col items-center justify-center border-2 border-dashed border-dark-blue-700 opacity-50"
            >
              <div className="flex flex-col items-center text-slate-600">
                <svg className="w-8 h-8 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                <span className="text-xs uppercase tracking-widest font-bold text-center px-2">Funcionalidade em desenvolvimento</span>
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className={`w-full py-5 rounded-2xl shadow-neu-out font-bold text-xl transition-all ${
              isGenerating 
                ? 'bg-dark-blue-700 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-br from-blue-500 to-indigo-600 hover:scale-[1.02] active:scale-95'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center justify-center gap-3">
                <div className="w-5 h-5 border-2 border-slate-500 border-t-white rounded-full animate-spin" />
                <span>Desenhando...</span>
              </div>
            ) : 'Gerar Logo'}
          </button>
        </div>

        {/* Result Area */}
        <div className="flex flex-col items-center space-y-6">
          <div className="w-full aspect-square bg-dark-blue-800 rounded-[3rem] shadow-neu-in p-10 flex items-center justify-center relative overflow-hidden group">
            {generatedLogo ? (
              <>
                <img 
                  src={generatedLogo} 
                  className="w-full h-full object-contain rounded-2xl shadow-2xl transition-transform duration-700 group-hover:scale-105" 
                  alt="Logo Gerado" 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-dark-blue-900/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-8 gap-3">
                  <button 
                    onClick={downloadLogo}
                    className="bg-white text-dark-blue-900 px-4 py-3 rounded-xl font-bold shadow-xl flex items-center gap-2 hover:bg-blue-50 transition-all hover:-translate-y-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    PNG
                  </button>
                  <button 
                    onClick={downloadSVG}
                    className="bg-indigo-600 text-white px-4 py-3 rounded-xl font-bold shadow-xl flex items-center gap-2 hover:bg-indigo-500 transition-all hover:-translate-y-1"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                    </svg>
                    SVG
                  </button>
                </div>
              </>
            ) : (
              <div className="text-center space-y-4 text-slate-500 animate-pulse">
                <div className="w-24 h-24 mx-auto border-4 border-slate-700 border-t-indigo-500 rounded-full flex items-center justify-center">
                  <svg className="w-10 h-10" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </div>
                <p className="font-medium">O canvas aguarda sua visão.</p>
              </div>
            )}
          </div>
          
          {generatedLogo && (
            <p className="text-slate-400 text-sm flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-ping" />
              Seu logo único com IA está pronto!
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default LogoGenerator;