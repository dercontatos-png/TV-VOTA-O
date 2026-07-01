import React, { useEffect, useState } from 'react';
import { Player } from '../types';
import { Trophy, Users, ShieldCheck, ExternalLink, QrCode } from 'lucide-react';
import { getPlayers } from '../dbService';

export function MuralPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    // Polling function for real-time updates without Firestore listeners to keep it simple and cheap
    const fetchRanking = async () => {
      try {
        const data = await getPlayers();
        setPlayers(data);
        setTotalVotes(data.reduce((sum, p) => sum + p.votesCount, 0));
      } catch (e) {
        console.error("Mural update error:", e);
      }
    };

    fetchRanking();
    
    // Auto-update every 10 seconds for the live broadcast
    const interval = setInterval(fetchRanking, 10000);
    return () => clearInterval(interval);
  }, []);

  // Top 10 players for the mural
  const topPlayers = [...players].sort((a, b) => b.votesCount - a.votesCount).slice(0, 8);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col font-sans text-slate-100 selection:bg-emerald-500 selection:text-white" style={{ background: '#020617' }}>
      
      {/* Top TV Broadcast Header */}
      <header className="bg-gradient-to-r from-emerald-900 to-slate-900 border-b border-emerald-500/20 shadow-2xl py-6 px-10 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-emerald-500 rounded-2xl flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Trophy className="w-8 h-8 text-slate-950" />
          </div>
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight text-white drop-shadow-md">Craque da Galera</h1>
            <p className="text-emerald-400 font-bold tracking-widest text-sm uppercase mt-1">Ao Vivo • Votação Oficial</p>
          </div>
        </div>
        
        <div className="flex items-center gap-8 bg-slate-900/50 p-4 rounded-3xl border border-white/5 shadow-inner">
          <div className="text-right">
            <p className="text-slate-400 text-xs font-bold uppercase tracking-widest mb-1">Total de Votos</p>
            <p className="text-3xl font-black text-white font-mono">{totalVotes.toLocaleString('pt-BR')}</p>
          </div>
          <div className="w-px h-12 bg-white/10"></div>
          <div className="flex items-center gap-3 bg-emerald-500/10 px-4 py-2 rounded-xl border border-emerald-500/30">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <span className="text-emerald-400 font-bold uppercase tracking-wider text-xs">Votação Auditada</span>
          </div>
        </div>
      </header>

      {/* Main Ranking Grid */}
      <main className="flex-grow p-10 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {topPlayers.map((player, index) => {
            const percentage = totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : '0.0';
            const isFirst = index === 0;

            return (
              <div 
                key={player.id}
                className={`relative flex flex-col rounded-3xl overflow-hidden border ${isFirst ? 'border-amber-400/50 shadow-2xl shadow-amber-400/20 bg-gradient-to-b from-amber-500/10 to-slate-900' : 'border-slate-800 bg-slate-900/50'} transition-all duration-500 transform hover:scale-105`}
              >
                {/* Ranking Badge */}
                <div className={`absolute top-4 left-4 w-10 h-10 rounded-full flex items-center justify-center font-black text-lg z-20 ${isFirst ? 'bg-amber-400 text-slate-900 shadow-lg' : 'bg-slate-800 text-slate-300'}`}>
                  {index + 1}º
                </div>
                
                {/* Player Photo Area */}
                <div className="h-64 relative bg-slate-800 w-full overflow-hidden">
                  {player.imageUrl ? (
                    <img 
                      src={player.imageUrl} 
                      alt={player.name} 
                      className={`w-full h-full transition-transform duration-1000 ${
                        player.imageFit === 'contain' 
                          ? 'object-contain' 
                          : `object-cover ${player.imagePosition === 'bottom' ? 'object-bottom' : player.imagePosition === 'center' ? 'object-center' : 'object-top'}`
                      }`}
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center opacity-20">
                      <Users className="w-20 h-20 text-slate-400" />
                    </div>
                  )}
                  {/* Gradient Overlay for text readability */}
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent"></div>
                  
                  {/* Team Badge */}
                  <div className="absolute bottom-4 left-4">
                    <span className={`text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md ${isFirst ? 'bg-amber-400/20 text-amber-300 border border-amber-400/30' : 'bg-white/10 text-slate-300 border border-white/10'}`}>
                      {player.team}
                    </span>
                  </div>
                </div>

                {/* Info Area */}
                <div className="p-6 pt-2">
                  <h3 className={`text-xl font-black mb-1 truncate ${isFirst ? 'text-amber-400' : 'text-white'}`} title={player.name}>
                    {player.name}
                  </h3>
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-6">{player.position}</p>
                  
                  <div className="flex items-end justify-between">
                    <div>
                      <p className="text-slate-500 text-[10px] uppercase tracking-widest mb-1 font-bold">Votos</p>
                      <p className="text-3xl font-black font-mono text-white leading-none">{player.votesCount.toLocaleString('pt-BR')}</p>
                    </div>
                    <div className="text-right">
                      <div className={`text-2xl font-black ${isFirst ? 'text-emerald-400' : 'text-blue-400'}`}>
                        {percentage}%
                      </div>
                    </div>
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="w-full bg-slate-800 h-2 mt-4 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full transition-all duration-1000 ease-out ${isFirst ? 'bg-amber-400' : 'bg-blue-500'}`}
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {topPlayers.length === 0 && (
          <div className="flex flex-col items-center justify-center h-96 text-slate-500">
            <Trophy className="w-20 h-20 mb-6 opacity-20" />
            <h2 className="text-2xl font-black uppercase tracking-widest">Nenhum voto registrado ainda</h2>
          </div>
        )}
      </main>
      
      {/* Footer / Info for Broadcast */}
      <footer className="bg-black py-4 px-10 border-t border-white/5 flex items-center justify-between text-slate-500 text-xs font-bold uppercase tracking-widest">
        <p>Atualização Automática (A cada 10s)</p>
        <div className="flex items-center gap-2">
          <span>Vote pelo celular no link oficial</span>
          <QrCode className="w-4 h-4" />
        </div>
      </footer>
    </div>
  );
}
