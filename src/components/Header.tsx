import { Trophy, Calendar, MapPin } from 'lucide-react';
import { SystemConfig } from '../types';

interface HeaderProps {
  onNavigate: (view: 'voting' | 'admin') => void;
  currentView: 'voting' | 'admin';
  config: SystemConfig | null;
}

export default function Header({ onNavigate, currentView, config }: HeaderProps) {
  return (
    <header className="bg-gradient-to-br from-slate-950 via-emerald-950 to-emerald-900 text-white border-b border-emerald-800/20 relative overflow-hidden" id="app-header">
      {/* Decorative soccer grid/field layout lines */}
      <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:32px_32px]"></div>
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-500/5 rounded-full blur-3xl pointer-events-none"></div>
      
      <div className="max-w-6xl mx-auto px-4 py-8 md:py-10 relative z-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-4.5">
            <div className="p-3.5 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl text-slate-950 shadow-lg shadow-amber-500/10 shrink-0 transform hover:rotate-3 transition-transform duration-300" id="header-trophy-container">
              <Trophy className="w-8 h-8 md:w-10 md:h-10 text-emerald-950 stroke-[2.5]" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-amber-400 text-xs font-black tracking-widest uppercase">
                <MapPin className="w-3.5 h-3.5 animate-bounce" />
                Morro do Chapéu • BA
              </div>
              <h1 className="text-2xl md:text-3xl lg:text-4xl font-display font-black tracking-tight mt-1 leading-none bg-gradient-to-r from-white via-slate-100 to-emerald-200 bg-clip-text text-transparent" id="header-main-title">
                Melhor Prata da Casa
              </h1>
              <p className="text-slate-300 text-xs md:text-sm mt-2 max-w-xl font-medium leading-relaxed">
                Campeonato Municipal de Morro do Chapéu 2026. Escolha o seu favorito das equipes finalistas! Seu voto decide o grande vencedor.
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2.5 bg-slate-900/60 p-1.5 rounded-2xl border border-white/5 self-start md:self-auto" id="header-navigation-controls">
            <button
              id="nav-vote-btn"
              onClick={() => onNavigate('voting')}
              className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                currentView === 'voting'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/20 scale-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Votação Pública
            </button>
            <button
              id="nav-admin-btn"
              onClick={() => onNavigate('admin')}
              className={`px-5 py-2.5 text-xs font-extrabold uppercase tracking-wider rounded-xl transition-all duration-300 cursor-pointer ${
                currentView === 'admin'
                  ? 'bg-gradient-to-r from-emerald-500 to-green-600 text-white shadow-md shadow-emerald-500/20 scale-100'
                  : 'text-slate-400 hover:text-white hover:bg-white/5'
              }`}
            >
              Painel Admin
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
