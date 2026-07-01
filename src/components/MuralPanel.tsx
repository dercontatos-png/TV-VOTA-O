import React, { useEffect, useState } from 'react';
import { Player, SystemConfig } from '../types';
import { DEFAULT_CONFIG } from '../dbService';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
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
    // If static data is provided, skip Firestore listeners
    if (staticPlayers && staticConfig) {
      setPlayers(staticPlayers);
      setConfig(staticConfig);
      setTotalVotes(staticPlayers.reduce((sum, p) => sum + p.votesCount, 0));
      return;
    }

    // Real-time listener for players
    const playersRef = collection(db, 'players');
    const q = query(playersRef, orderBy('votesCount', 'desc'), orderBy('name', 'asc'));
    
    const unsubscribePlayers = onSnapshot(q, (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Player));
      
      const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
      setPlayers(sortedPlayers);
      setTotalVotes(playersData.reduce((sum, p) => sum + p.votesCount, 0));
    }, (error) => {
      console.error("Mural players listener error:", error);
    });

    // Real-time listener for config
    const configRef = doc(db, 'settings', 'voting');
    const unsubscribeConfig = onSnapshot(configRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setConfig(prev => ({ ...prev, ...data }));
      }
    }, (error) => {
      console.error("Mural config listener error:", error);
    });

    return () => {
      unsubscribePlayers();
      unsubscribeConfig();
    };
  }, []);

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
            <div className="bg-amber-900/40 backdrop-blur-md border border-amber-500/30 rounded-xl p-3 shadow-2xl flex items-center gap-4 shrink-0 max-w-sm">
              <div className="flex flex-col">
                <span className="text-[9px] font-black text-amber-400 uppercase tracking-widest leading-none mb-1">
                  OFERECIMENTO
                </span>
                <span className="text-sm font-black text-white uppercase tracking-wider leading-tight">
                  {config.sponsorName}
                </span>
                {config.sponsorPrize && (
                  <span className="text-xs font-bold text-amber-200 mt-0.5">
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

        {/* Chart Panel */}
        <div className="flex-grow bg-white/5 backdrop-blur-xl rounded-[2rem] border border-white/10 p-6 md:p-8 shadow-2xl relative mb-12 mr-[200px] flex flex-col">
          
          {totalVotes === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Users className="w-24 h-24 mb-6 opacity-20" />
              <p className="text-3xl font-black uppercase tracking-widest opacity-50">Aguardando Votos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 80, right: 20, left: 0, bottom: 180 }}
              >
                <defs>
                  <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#ffffff" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#93c5fd" stopOpacity={0.9}/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="rgba(255,255,255,0.15)" />
                
                <XAxis 
                  dataKey="name" 
                  axisLine={{ stroke: 'rgba(255,255,255,0.4)', strokeWidth: 3 }}
                  tickLine={false}
                  tick={<CustomTick />}
                  interval={0}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#bfdbfe', fontSize: 24, fontWeight: 800 }}
                  dx={-15}
                  allowDecimals={false}
                  domain={[0, (dataMax: number) => (dataMax === 0 ? 10 : Math.ceil(dataMax * 1.2))]}
                />
                
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.1)' }}
                  contentStyle={{ backgroundColor: 'rgba(0,40,85,0.95)', borderColor: 'rgba(255,255,255,0.3)', borderRadius: '12px', color: '#fff', backdropFilter: 'blur(12px)' }}
                  itemStyle={{ color: '#60a5fa', fontWeight: '900', fontSize: '24px' }}
                />

                <Bar 
                  dataKey="votes" 
                  fill="url(#colorVotes)" 
                  radius={[12, 12, 0, 0]}
                  maxBarSize={90}
                  isAnimationActive={!staticPlayers}
                  animationDuration={1000}
                  label={(props: any) => {
                    const { x, y, width, value } = props;
                    const dataEntry = chartData[props.index];
                    const percentage = dataEntry?.percentage || '0';
                    if (value === 0) return null;
                    
                    return (
                      <g transform={`translate(${x + width / 2},${y - 15})`}>
                        <text fill="#ffffff" textAnchor="middle" fontSize={28} fontWeight={900} filter="url(#glow)" y={-25}>
                          {value}
                        </text>
                        <text fill="#bfdbfe" textAnchor="middle" fontSize={16} fontWeight={800} y={-5}>
                          {percentage}%
                        </text>
                      </g>
                    );
                  }}
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Leave bottom right completely empty for TV Logo */}
      <div className="absolute bottom-0 right-0 w-[300px] h-[250px] pointer-events-none z-50">
        {/* Intentionally left blank for broadcast logo overlay */}
      </div>

    </div>
  );
}
