import { Trophy, Calendar, MapPin, LogOut, User } from 'lucide-react';
import { SystemConfig } from '../types';

interface HeaderProps {
  onNavigate: (view: 'voting' | 'admin') => void;
  currentView: 'voting' | 'admin';
  config: SystemConfig | null;
  isAdmin: boolean;
  adminEmail?: string | null;
  onAdminLogout: () => void;
}

export default function Header({ 
  onNavigate, 
  currentView, 
  config, 
  isAdmin, 
  adminEmail,
  onAdminLogout 
}: HeaderProps) {
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
          
          {/* Admin Status Pill */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 self-start md:self-auto">

            {isAdmin && (
              <div className="flex items-center gap-2 bg-emerald-950/80 border border-emerald-500/30 px-3 py-1.5 rounded-xl text-[11px] font-bold text-emerald-300 shadow-xs">
                <User className="w-3.5 h-3.5" />
                <span className="truncate max-w-[130px]" title={adminEmail || ''}>
                  {adminEmail || 'Organizador'}
                </span>
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              </div>
            )}

            {isAdmin && (
              <button
                onClick={onAdminLogout}
                title="Desconectar Painel Admin"
                className="p-2.5 rounded-xl text-slate-400 hover:text-rose-400 bg-slate-900/60 hover:bg-rose-950/30 border border-white/5 hover:border-rose-500/30 transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
