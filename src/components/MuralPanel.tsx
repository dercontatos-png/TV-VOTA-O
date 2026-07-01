import React, { useEffect, useState } from 'react';
import { Player, SystemConfig } from '../types';
import { DEFAULT_CONFIG } from '../dbService';
import { db } from '../firebase';
import { collection, onSnapshot, query, orderBy, doc } from 'firebase/firestore';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell, Tooltip } from 'recharts';
import { Trophy, Users } from 'lucide-react';

export function MuralPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
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

  // Format data for Recharts
  const chartData = players.map(player => {
    const percentage = totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : '0';
    return {
      name: player.name,
      votes: player.votesCount,
      percentage: percentage,
      team: player.team,
      imageUrl: player.imageUrl
    };
  });

  // Custom tick to show player photo and name
  const CustomTick = (props: any) => {
    const { x, y, payload } = props;
    const player = chartData.find(p => p.name === payload.value);
    
    return (
      <g transform={`translate(${x},${y})`}>
        <foreignObject x={-75} y={15} width={150} height={200}>
          <div className="flex flex-col items-center justify-start h-full">
            {player?.imageUrl ? (
              <div className="w-28 h-28 rounded-full overflow-hidden mb-4 border-4 border-slate-700/50 shadow-[0_0_20px_rgba(0,0,0,0.6)] bg-slate-800">
                 <img src={player.imageUrl} className="w-full h-full object-cover" alt={player.name} referrerPolicy="no-referrer" />
              </div>
            ) : (
              <div className="w-28 h-28 rounded-full bg-slate-800 border-4 border-slate-700/50 mb-4 flex items-center justify-center text-slate-400 text-3xl font-black shadow-[0_0_20px_rgba(0,0,0,0.6)]">
                {payload.value.substring(0, 2).toUpperCase()}
              </div>
            )}
            <span className="text-xl font-black text-white text-center uppercase tracking-wider leading-tight w-full truncate px-1 drop-shadow-md">
              {payload.value}
            </span>
            {player?.team && (
              <span className="text-sm text-emerald-400 font-black uppercase tracking-widest truncate w-full text-center mt-1.5 drop-shadow-md">
                {player.team}
              </span>
            )}
          </div>
        </foreignObject>
      </g>
    );
  };

  return (
    <div className="min-h-screen bg-[#020617] flex flex-col font-sans text-slate-100 relative overflow-hidden">
      
      {/* Background Effects */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-emerald-900/30 via-slate-900/0 to-transparent"></div>
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-indigo-900/20 via-slate-900/0 to-transparent"></div>

      <div className="flex flex-col h-screen p-6 md:p-10 relative z-10">
        
        {/* Header - Simplified as requested */}
        <header className="flex justify-end items-center mb-6">
          <div className="flex flex-col items-end">
            <span className="text-2xl text-emerald-400/80 uppercase tracking-widest font-black mb-1">Total de Votos</span>
            <div className="text-7xl font-black text-white font-mono tracking-tighter drop-shadow-xl">
              {totalVotes.toLocaleString('pt-BR')}
            </div>
          </div>
        </header>

        {/* Chart Panel */}
        <div className="flex-grow bg-slate-900/40 backdrop-blur-xl rounded-[2.5rem] border border-white/10 p-8 md:p-12 shadow-2xl relative">
          
          {totalVotes === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-500">
              <Users className="w-32 h-32 mb-6 opacity-20" />
              <p className="text-4xl font-black uppercase tracking-widest opacity-50">Aguardando Votos</p>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={chartData}
                margin={{ top: 80, right: 30, left: 20, bottom: 180 }}
              >
                <defs>
                  <linearGradient id="colorVotes" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={1}/>
                    <stop offset="100%" stopColor="#047857" stopOpacity={0.7}/>
                  </linearGradient>
                  <filter id="glow">
                    <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                    <feMerge>
                      <feMergeNode in="coloredBlur"/>
                      <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                  </filter>
                </defs>
                
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.08)" />
                
                <XAxis 
                  dataKey="name" 
                  axisLine={{ stroke: 'rgba(255,255,255,0.15)', strokeWidth: 2 }}
                  tickLine={false}
                  tick={<CustomTick />}
                  interval={0}
                />
                
                <YAxis 
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: '#94a3b8', fontSize: 24, fontWeight: 700 }}
                  dx={-20}
                  allowDecimals={false}
                />
                
                <Tooltip
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: 'rgba(15,23,42,0.95)', borderColor: 'rgba(255,255,255,0.15)', borderRadius: '16px', color: '#fff', backdropFilter: 'blur(12px)' }}
                  itemStyle={{ color: '#34d399', fontWeight: '900', fontSize: '24px' }}
                />

                <Bar 
                  dataKey="votes" 
                  fill="url(#colorVotes)" 
                  radius={[16, 16, 0, 0]}
                  barSize={120}
                  isAnimationActive={true}
                  animationDuration={1000}
                  label={(props: any) => {
                    const { x, y, width, value } = props;
                    const dataEntry = chartData[props.index];
                    const percentage = dataEntry?.percentage || '0';
                    if (value === 0) return null;
                    
                    return (
                      <g transform={`translate(${x + width / 2},${y - 25})`}>
                        <text fill="#ffffff" textAnchor="middle" fontSize={36} fontWeight={900} filter="url(#glow)">
                          {value}
                        </text>
                        <text y={30} fill="#a7f3d0" textAnchor="middle" fontSize={22} fontWeight={800}>
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
    </div>
  );
}
