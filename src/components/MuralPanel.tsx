import React, { useEffect, useState } from 'react';
import { Player, SystemConfig } from '../types';
import { DEFAULT_CONFIG, getPlayers, getSystemConfig } from '../dbService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Trophy, Users } from 'lucide-react';

interface MuralPanelProps {
  staticPlayers?: Player[];
  staticConfig?: SystemConfig;
}

export function MuralPanel({ staticPlayers, staticConfig }: MuralPanelProps = {}) {
  const [players, setPlayers] = useState<Player[]>(staticPlayers || []);
  const [config, setConfig] = useState<SystemConfig>(staticConfig || DEFAULT_CONFIG);
  const [totalVotes, setTotalVotes] = useState(staticPlayers ? staticPlayers.reduce((sum, p) => sum + p.votesCount, 0) : 0);

  useEffect(() => {
    if (staticPlayers && staticConfig) {
      setPlayers(staticPlayers);
      setConfig(staticConfig);
      setTotalVotes(staticPlayers.reduce((sum, p) => sum + p.votesCount, 0));
      return;
    }

    const loadData = async () => {
      try {
        const [playersData, configData] = await Promise.all([
          getPlayers(),
          getSystemConfig()
        ]);
        const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlayers(sortedPlayers);
        setConfig(configData);
        setTotalVotes(playersData.reduce((sum, p) => sum + p.votesCount, 0));
      } catch (error) {
        console.error("Mural load error:", error);
      }
    };

    // Initial load
    loadData();

    // Poll every 5 seconds for the live mural TV display
    const interval = setInterval(loadData, 5000);

    return () => {
      clearInterval(interval);
    };
  }, [staticPlayers, staticConfig]);

  // Format data for Recharts (Show top 10 players)
  const chartData = [...players]
    .sort((a, b) => b.votesCount - a.votesCount)
    .slice(0, 10)
    .map(player => {
      const percentage = totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : '0';
      return {
        name: player.name,
        votes: player.votesCount,
        percentage: percentage,
        team: player.team,
        imageUrl: player.imageUrl,
        position: player.position
      };
    });

  // Custom tick to show player photo and name
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const player = chartData.find(p => p.name === payload.value);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-60} y={15} width={120} height={200}>
          <div className="flex flex-col items-center justify-start h-full">
            {player?.imageUrl ? (
              <div className="w-16 h-16 rounded-full overflow-hidden mb-2 border-[2px] border-white shadow-lg bg-slate-100 shrink-0">
                 <img crossOrigin="anonymous" src={player.imageUrl} className="w-full h-full object-cover" alt={player.name} referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-full bg-slate-100 border-[2px] border-white mb-2 flex items-center justify-center text-[#003f7a] text-2xl font-black shadow-lg shrink-0">
                {payload.value.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-sm font-black text-white text-center uppercase tracking-wider leading-tight w-full break-words px-1 drop-shadow-md">
              {payload.value}
            </span>
            {player?.position && (
              <span className="text-[10px] text-blue-200 font-bold uppercase tracking-widest w-full text-center mt-1 drop-shadow-md break-words">
                {player.position}
              </span>
            )}
            {player?.team && (
              <span className="text-[10px] text-blue-300 font-bold uppercase tracking-widest truncate w-full text-center mt-0.5 drop-shadow-md">
                {player.team}
              </span>
            )}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="w-full h-full min-h-screen bg-[#001730] flex flex-col font-sans text-slate-100 relative overflow-hidden">
      
      {/* Background Graphic Elements */}
      <div className="absolute top-0 left-0 w-full h-full opacity-30 pointer-events-none">
        <div className="absolute top-[0%] left-[0%] w-[50%] h-[50%] rounded-full bg-blue-500 blur-[150px]"></div>
        <div className="absolute bottom-[0%] right-[0%] w-[50%] h-[50%] rounded-full bg-blue-800 blur-[150px]"></div>
      </div>
      <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-400 via-white to-blue-400"></div>

      <div className="flex flex-col h-full p-6 md:p-8 relative z-10">
        
        {/* Header */}
        <header className="flex justify-between items-start mb-8 gap-4">
          <div className="bg-[#0f172a]/80 backdrop-blur-md border border-white/10 rounded-xl p-4 shadow-2xl max-w-2xl flex-grow shrink-0 flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-black text-white uppercase tracking-widest leading-snug">
              RESULTADO DOS VOTOS
            </h1>
          </div>
          
          {config?.sponsorName && (
            <div className="bg-blue-900/60 backdrop-blur-md border border-blue-400/30 rounded-xl p-3 shadow-2xl flex items-center gap-4 shrink-0 max-w-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none"></div>
              <div className="flex flex-col relative z-10">
                <span className="text-[9px] font-black text-blue-300 uppercase tracking-[0.2em] leading-none mb-1">
                  OFERECIMENTO
                </span>
                <span className="text-sm font-black text-white uppercase tracking-wider leading-tight text-balance">
                  {config.sponsorName}
                </span>
                {config.sponsorPrize && (
                  <span className="text-xs font-bold text-blue-200 mt-0.5">
                    PRÊMIO: {config.sponsorPrize}
                  </span>
                )}
              </div>
            </div>
          )}

          <div className="flex flex-col items-end bg-[#0f172a]/80 backdrop-blur-md border border-white/10 rounded-xl py-3 px-6 shadow-2xl shrink-0">
            <span className="text-sm text-blue-200 font-bold uppercase tracking-widest mb-1">Total de Votos</span>
            <div className="text-4xl font-black text-white font-mono tracking-tighter">
              {totalVotes.toLocaleString('pt-BR')}
            </div>
          </div>
        </header>

        {/* Chart Panel - Replaced with flexbox bars for perfect styling */}
        <div className="flex-grow relative flex items-end justify-center pb-8 gap-4 md:gap-8 lg:gap-12 mt-12 w-full">
          {[...players].sort((a, b) => b.votesCount - a.votesCount).slice(0, 7).map((player, index, arr) => {
            const topVotes = arr[0]?.votesCount || 1;
            const heightPercentage = Math.max(15, (player.votesCount / topVotes) * 100);
            
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: 'min(160px, 12vw)', flexShrink: 0, justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: 'clamp(24px, 3vw, 48px)', fontWeight: 900, color: '#fbbf24', textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
                    {player.votesCount}
                  </span>
                  <span style={{ fontSize: 'clamp(14px, 1.5vw, 24px)', color: '#fcd34d', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div style={{ zIndex: 20, marginBottom: 'clamp(-40px, -5vw, -70px)' }}>
                  {player.imageUrl ? (
                    <img crossOrigin="anonymous" src={player.imageUrl} style={{ width: 'clamp(80px, 9vw, 140px)', height: 'clamp(80px, 9vw, 140px)', borderRadius: '50%', objectFit: 'cover', border: 'clamp(2px, 0.3vw, 4px) solid white', backgroundColor: '#0f172a', boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)' }} />
                  ) : (
                    <div style={{ width: 'clamp(80px, 9vw, 140px)', height: 'clamp(80px, 9vw, 140px)', borderRadius: '50%', backgroundColor: '#0f172a', border: 'clamp(2px, 0.3vw, 4px) solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 'clamp(24px, 3vw, 48px)', fontWeight: 900, color: 'white', boxShadow: '0 0 20px rgba(251, 191, 36, 0.8)' }}>
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ 
                  width: '100%', 
                  height: `${(heightPercentage / 100) * 45}vh`, 
                  minHeight: '80px',
                  background: 'rgba(0, 0, 0, 0.7)', 
                  borderRadius: '80px 80px 0 0',
                  border: 'clamp(2px, 0.2vw, 3px) solid #fbbf24',
                  borderBottom: 'none',
                  boxShadow: '0 0 20px rgba(251, 191, 36, 0.5), inset 0 0 20px rgba(251, 191, 36, 0.2)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  paddingBottom: '0'
                }}>
                  <div style={{ backgroundColor: 'black', borderTop: 'clamp(2px, 0.2vw, 3px) solid #fbbf24', width: '100%', padding: 'clamp(8px, 1vw, 12px) 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 'clamp(40px, 5vh, 60px)' }}>
                    <div style={{ fontSize: 'clamp(12px, 1.2vw, 20px)', fontWeight: 900, color: 'white', textTransform: 'uppercase', wordBreak: 'normal', lineHeight: 1.1, textAlign: 'center' }}>
                      {player.name}
                    </div>
                    {player.position && (
                       <div style={{ fontSize: 'clamp(9px, 0.9vw, 14px)', fontWeight: 700, color: '#fbbf24', textTransform: 'uppercase', marginTop: '4px', textAlign: 'center' }}>
                         {player.position}
                       </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Leave bottom right completely empty for TV Logo */}
      <div className="absolute bottom-0 right-0 w-[300px] h-[250px] pointer-events-none z-50">
        {/* Intentionally left blank for broadcast logo overlay */}
      </div>

    </div>
  );
}
