
import React, { useState } from 'react';
import { AppView } from './types';
import Editor from './components/Editor';
import LogoGenerator from './components/LogoGenerator';

const App: React.FC = () => {
  const [view, setView] = useState<AppView>(AppView.EDITOR);

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sidebar / Navigation */}
      <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex gap-4 p-4 bg-dark-blue-800 rounded-full shadow-neu-out border border-dark-blue-700/50 backdrop-blur-md">
        <button
          onClick={() => setView(AppView.EDITOR)}
          className={`px-6 py-2 rounded-full transition-all duration-300 font-semibold ${
            view === AppView.EDITOR
              ? 'bg-blue-600 text-white shadow-neu-sm-in'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Editor
        </button>
        <button
          onClick={() => setView(AppView.LOGO_GEN)}
          className={`px-6 py-2 rounded-full transition-all duration-300 font-semibold ${
            view === AppView.LOGO_GEN
              ? 'bg-blue-600 text-white shadow-neu-sm-in'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Logo IA
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 pb-24 pt-4 px-4">
        <div className="max-w-7xl mx-auto h-full">
          {view === AppView.EDITOR ? (
            <Editor />
          ) : (
            <LogoGenerator />
          )}
        </div>
      </main>

      {/* Background Decor */}
      <div className="fixed -top-24 -left-24 w-96 h-96 bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="fixed -bottom-24 -right-24 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none" />
    </div>
  );
};

export default App;
