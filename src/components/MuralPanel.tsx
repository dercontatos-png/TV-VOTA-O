import React, { useEffect, useState } from 'react';
import { Player, SystemConfig } from '../types';
import { getPlayers, getSystemConfig, DEFAULT_CONFIG } from '../dbService';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Cell } from 'recharts';
import { QrCode } from 'lucide-react';

export function MuralPanel() {
  const [players, setPlayers] = useState<Player[]>([]);
  const [config, setConfig] = useState<SystemConfig>(DEFAULT_CONFIG);
  const [totalVotes, setTotalVotes] = useState(0);

  useEffect(() => {
    // Polling function for real-time updates
    const fetchData = async () => {
      try {
        const [playersData, configData] = await Promise.all([
          getPlayers(),
          getSystemConfig()
        ]);
        
        // Sort players by original order or name to keep X-axis stable
        const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlayers(sortedPlayers);
        
        setTotalVotes(playersData.reduce((sum, p) => sum + p.votesCount, 0));
        
        if (configData) {
          setConfig(configData);
        }
      } catch (e) {
        console.error("Mural update error:", e);
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  // Format data for Recharts
  const chartData = players.map(player => {
    const percentage = totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(0) : '0';
    return {
      name: player.name,
      votes: player.votesCount,
      percentage: percentage,
      label: `${player.votesCount} (${percentage}%)`
    };
  });

  const generateQRCodeURL = () => {
    const currentUrl = window.location.origin;
    return `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(currentUrl)}`;
  };

  return (
    <div className="min-h-screen bg-[#0d2e1e] flex flex-col font-sans text-slate-100 p-8">
      
      {/* Header section outside the white box */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex items-center gap-3">
          {config.logoPrincipal && (
            <img src={config.logoPrincipal} alt="Logo" className="h-10 object-contain" />
          )}
        </div>

        <div className="flex gap-4">
          <div className="bg-white text-slate-800 rounded-xl px-6 py-3 flex flex-col items-center justify-center shadow-lg min-w-32">
            <span className="text-2xl font-bold">{totalVotes}</span>
            <span className="text-xs text-gray-500 uppercase tracking-wide">Total de votos</span>
          </div>

          <div className="bg-white text-slate-800 rounded-xl px-4 py-3 flex flex-col items-center justify-center shadow-lg cursor-pointer hover:bg-gray-50 transition-colors">
            <img src={generateQRCodeURL()} alt="QR Code" className="w-12 h-12 mb-1" />
            <span className="text-[10px] text-gray-500 uppercase tracking-wide">Scan para votar</span>
          </div>
        </div>
      </div>

      {/* Main White Panel */}
      <div className="bg-gray-100 rounded-[32px] p-8 md:p-12 flex-grow shadow-2xl flex flex-col">
        <h1 className="text-2xl md:text-3xl font-medium text-slate-800 mb-12">
          {config.votingQuestion}
        </h1>

        <div className="flex-grow w-full min-h-[400px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 30, right: 30, left: 0, bottom: 30 }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
              <XAxis 
                dataKey="name" 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#6b7280', fontSize: 12, fontWeight: 600 }}
                dy={16}
              />
              <YAxis 
                axisLine={false}
                tickLine={false}
                tick={{ fill: '#9ca3af', fontSize: 12 }}
                dx={-10}
                allowDecimals={false}
              />
              <Bar 
                dataKey="votes" 
                fill="#10b981" 
                radius={[4, 4, 0, 0]}
                barSize={60}
                isAnimationActive={false}
                label={(props: any) => {
                  const { x, y, width, value } = props;
                  // We need to find the percentage for this value from chartData
                  const dataEntry = chartData[props.index];
                  const percentage = dataEntry?.percentage || '0';
                  
                  return (
                    <text x={x + width / 2} y={y - 10} fill="#6b7280" textAnchor="middle" fontSize={14}>
                      {value} ({percentage}%)
                    </text>
                  );
                }}
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill="#10b981" />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
