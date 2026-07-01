import React, { useState, useEffect } from 'react';
import { Search, Trophy, Timer, Shield, Info, SlidersHorizontal, ShieldAlert, User, UserCheck, Lock, Smartphone, X } from 'lucide-react';
import { Player, SystemConfig, VoterInfo } from '../types';
import PlayerCard from './PlayerCard';
import { getBahiaDateStr } from '../dbService';

interface VotingPanelProps {
  players: Player[];
  onVote: (playerId: string) => void;
  hasVotedToday: boolean;
  votedPlayerId?: string;
  isVoting: boolean;
  recommendedPlayerId?: string | null;
  config: SystemConfig | null;
  voterInfo: VoterInfo | null;
  onLogin: () => void;
  onLogout: () => void;
}

export default function VotingPanel({
  players,
  onVote,
  hasVotedToday,
  votedPlayerId,
  isVoting,
  recommendedPlayerId,
  config,
  voterInfo,
  onLogin,
  onLogout,
}: VotingPanelProps) {
  const [search, setSearch] = useState('');
  const [selectedTeam, setSelectedTeam] = useState('Todos');
  const [timeLeft, setTimeLeft] = useState('');

  // We don't need local states for auth modal anymore, 
  // we just use onLogin which pops up Google Auth.
  const handleInitiateVote = (playerId: string) => {
    onVote(playerId);
  };

  // 1. Calculate and update countdown to midnight in Bahia Time (UTC-3)
  useEffect(() => {
    const updateCountdown = () => {
      const now = new Date();
      // Adjust to Bahia UTC-3
      const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
      const bahiaDate = new Date(utc + (3600000 * -3));

      const midnight = new Date(bahiaDate);
      midnight.setHours(24, 0, 0, 0); // Next midnight

      const diffMs = midnight.getTime() - bahiaDate.getTime();
      
      const hours = Math.floor(diffMs / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diffMs % (1000 * 60)) / 1000);

      const hStr = String(hours).padStart(2, '0');
      const mStr = String(minutes).padStart(2, '0');
      const sStr = String(seconds).padStart(2, '0');

      setTimeLeft(`${hStr}h ${mStr}m ${sStr}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, []);

  // 2. Get unique team names for the filter dropdown
  const teams = ['Todos', ...Array.from(new Set(players.map(p => p.team))).filter(Boolean)];

  // 3. Filter players based on search query and team selection
  const filteredPlayers = React.useMemo(() => {
    let result = players.filter(player => {
      const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase()) || 
                            player.team.toLowerCase().includes(search.toLowerCase());
      const matchesTeam = selectedTeam === 'Todos' || player.team === selectedTeam;
      return matchesSearch && matchesTeam;
    });

    // Order by manual 'order' if set, else alternate by team
    const hasCustomOrder = result.some(p => p.order && p.order > 0);
    
    if (hasCustomOrder && selectedTeam === 'Todos') {
      result.sort((a, b) => (a.order || 9999) - (b.order || 9999));
    } else if (selectedTeam === 'Todos') {
      // Alternate teams for fairness
      const teamGroups: Record<string, Player[]> = {};
      result.forEach(p => {
        if (!teamGroups[p.team]) teamGroups[p.team] = [];
        teamGroups[p.team].push(p);
      });
      
      // Sort players within each team alphabetically
      Object.values(teamGroups).forEach(group => group.sort((a,b) => a.name.localeCompare(b.name)));
      
      const teamNames = Object.keys(teamGroups);
      const interleaved: Player[] = [];
      const maxLen = Math.max(0, ...Object.values(teamGroups).map(g => g.length));
      
      for (let i = 0; i < maxLen; i++) {
        for (const team of teamNames) {
          if (teamGroups[team][i]) interleaved.push(teamGroups[team][i]);
        }
      }
      result = interleaved;
    } else {
      // If a specific team is selected, just sort alphabetically
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [players, search, selectedTeam]);

  const totalVotes = players.reduce((sum, p) => sum + p.votesCount, 0);

  // 4. Find the voted player name if voted today
  const votedPlayer = players.find(p => p.id === votedPlayerId);

  // Find recommended player from shared link
  const recommendedPlayer = recommendedPlayerId ? players.find(p => p.id === recommendedPlayerId) : null;

  // 5. Get top 3 players for the Podium Leaderboard
  const podiumPlayers = [...players]
    .sort((a, b) => b.votesCount - a.votesCount)
    .slice(0, 3)
    .filter(p => p.votesCount > 0); // Only display if they have at least 1 vote

  // Check if voting period is active or locked
  const now = Date.now();
  const start = config?.startDate ? new Date(config.startDate).getTime() : null;
  const end = config?.endDate ? new Date(config.endDate).getTime() : null;

  let isLocked = false;
  let lockReason = '';

  if (config) {
    if (!config.votingEnabled) {
      isLocked = true;
      lockReason = 'A votação foi suspensa temporariamente pelo administrador.';
    } else if (start && now < start) {
      isLocked = true;
      const formattedStart = new Date(config.startDate).toLocaleString('pt-BR', { timeZone: 'America/Bahia' });
      lockReason = `A votação ainda não começou! Ela iniciará em: ${formattedStart}`;
    } else if (end && now > end) {
      isLocked = true;
      const formattedEnd = new Date(config.endDate).toLocaleString('pt-BR', { timeZone: 'America/Bahia' });
      lockReason = `A votação foi encerrada em: ${formattedEnd}`;
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8" id="voting-panel-container">
      {/* Question, Team Logos and Status Card */}
      <div className="mb-8 bg-blue-900 border border-blue-800 rounded-3xl p-6 md:p-10 shadow-lg flex flex-col items-center text-center relative overflow-hidden" id="matchup-question-card">
        {/* Decorative elements */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute -top-32 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl pointer-events-none"></div>
        
        {/* Team Logos Matchup */}
        <div className="relative z-10 flex items-center justify-center gap-6 md:gap-14 mb-8" id="team-matchup-logos">
          {/* Team 1: AZUUP */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-18 h-18 md:w-24 md:h-24 rounded-3xl bg-white border-2 border-white p-3 flex items-center justify-center shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
              {config?.logoAzuup ? (
                <img src={config.logoAzuup} alt="Azuup Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-blue-600/10 text-blue-600 rounded-2xl font-black text-2xl flex items-center justify-center">
                  AZ
                </div>
              )}
            </div>
            <span className="text-xs md:text-sm font-black text-white uppercase tracking-widest">AZUUP</span>
          </div>

          {/* X Divider */}
          <div className="flex flex-col items-center">
            <div className="text-white font-black text-4xl md:text-6xl drop-shadow-lg opacity-90 animate-pulse">
              X
            </div>
          </div>

          {/* Team 2: Campinense */}
          <div className="flex flex-col items-center gap-2.5">
            <div className="w-18 h-18 md:w-24 md:h-24 rounded-3xl bg-white border-2 border-white p-3 flex items-center justify-center shadow-lg overflow-hidden transition-transform duration-300 hover:scale-105">
              {config?.logoCampinense ? (
                <img src={config.logoCampinense} alt="Campinense Logo" className="max-w-full max-h-full object-contain" />
              ) : (
                <div className="w-full h-full bg-red-600/10 text-red-600 rounded-2xl font-black text-2xl flex items-center justify-center">
                  CP
                </div>
              )}
            </div>
            <span className="text-xs md:text-sm font-black text-white uppercase tracking-widest">CAMPINENSE</span>
          </div>
        </div>

        {/* Voting Question / Question of the hour */}
        <div className="relative z-10 w-full max-w-4xl mx-auto mt-6 text-center px-4">
          <div className="relative">
            <h2 className="text-sm md:text-base font-bold tracking-widest text-blue-200 uppercase leading-relaxed drop-shadow-md max-w-3xl mx-auto text-balance" id="question-text">
              Vote no Craque Prata da Casa
            </h2>
          </div>
        </div>

        {/* Voting Schedule details and badge */}
        <div className="relative z-10 mt-6 flex flex-wrap gap-2.5 justify-center items-center">
          {isLocked ? (
            <span className="inline-flex items-center gap-1.5 bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs font-black px-4.5 py-2 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-rose-500"></span>
              VOTAÇÃO ENCERRADA
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 bg-blue-500/20 border border-blue-400/30 text-blue-200 text-xs font-black px-4.5 py-2 rounded-full shadow-xs">
              <span className="w-2 h-2 rounded-full bg-blue-400 animate-ping"></span>
              VOTAÇÃO ATIVA
            </span>
          )}

          {config?.startDate && (
            <span className="text-xs font-semibold text-blue-200 bg-black/20 border border-white/10 px-4 py-2 rounded-full">
              Início: <strong className="text-white">{new Date(config.startDate).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}</strong>
            </span>
          )}
          {config?.endDate && (
            <span className="text-xs font-semibold text-blue-200 bg-black/20 border border-white/10 px-4 py-2 rounded-full">
              Término: <strong className="text-white">{new Date(config.endDate).toLocaleString('pt-BR', { timeZone: 'America/Bahia' })}</strong>
            </span>
          )}
        </div>

        {/* Locked Overlay Warning Bar */}
        {isLocked && (
          <div className="w-full mt-6 bg-rose-500/10 border border-rose-500/20 text-rose-200 p-4 rounded-2xl flex items-center gap-3 justify-center text-sm font-bold animate-fade-in">
            <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
            <span>{lockReason}</span>
          </div>
        )}
      </div>

      {/* Voter Identification Accreditation Card / Status Banner */}
      <div className="hidden" id="voter-accreditation-card">
      </div>

      {/* Sponsor Banner */}
      {config?.sponsorName && (
        <div className="mb-8 bg-gradient-to-r from-blue-900 via-blue-800 to-blue-900 border border-blue-700/50 rounded-3xl p-6 md:p-8 shadow-xl flex flex-col sm:flex-row items-center gap-6 md:gap-10 text-center sm:text-left text-white overflow-hidden relative">
          {/* Abstract elements */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-500/20 rounded-full blur-2xl pointer-events-none"></div>

          {config.sponsorLogoUrl ? (
            <div className="w-28 h-28 sm:w-40 sm:h-40 shrink-0 flex items-center justify-center relative z-10 bg-white/10 rounded-3xl p-4 border border-white/20 backdrop-blur-sm">
              <img src={config.sponsorLogoUrl} alt={config.sponsorName} className="max-w-full max-h-full object-contain drop-shadow-md" />
            </div>
          ) : (
            <div className="w-24 h-24 sm:w-32 sm:h-32 rounded-3xl bg-gradient-to-br from-blue-500 to-blue-700 border border-blue-400/30 shrink-0 flex items-center justify-center shadow-lg relative z-10">
              <Trophy className="w-10 h-10 text-white drop-shadow-md" />
            </div>
          )}
          
          <div className="relative z-10">
            <span className="text-[10px] md:text-xs font-black uppercase tracking-[0.2em] text-blue-200 bg-blue-950/50 px-4 py-1.5 rounded-full border border-blue-400/30 shadow-sm inline-block mb-4">
              Oferecimento Especial
            </span>
            <h3 className="text-3xl sm:text-4xl md:text-5xl font-black text-white leading-tight font-display tracking-tight text-balance drop-shadow-sm">
              {config.sponsorName}
            </h3>
            {config.sponsorPrize && (
              <div className="mt-4 bg-white/10 border border-white/10 rounded-2xl p-4 backdrop-blur-sm inline-block">
                <p className="text-sm sm:text-base text-blue-100 font-medium text-balance">
                  Prêmio de <strong className="text-amber-400 font-black text-lg drop-shadow-md">{config.sponsorPrize}</strong> para o jogador mais votado!
                </p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Recommended Player Invitation Banner */}
      {recommendedPlayer && (
        <div className="mb-8 bg-gradient-to-r from-blue-800 via-blue-900 to-slate-950 text-white rounded-3xl p-6 md:p-8 shadow-xl relative overflow-hidden border border-blue-500/20" id="recommendation-banner">
          {/* Soccer grid background pattern */}
          <div className="absolute inset-0 opacity-5 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:20px_20px]"></div>
          
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-2xl overflow-hidden bg-white/10 border border-white/20 flex items-center justify-center shrink-0 shadow-md">
                {recommendedPlayer.imageUrl ? (
                  <img src={recommendedPlayer.imageUrl} alt={recommendedPlayer.name} className="w-full h-full object-cover" />
                ) : (
                  <span className="font-extrabold text-xl text-white">
                    {recommendedPlayer.name.slice(0, 2).toUpperCase()}
                  </span>
                )}
              </div>
              <div>
                <span className="inline-flex items-center gap-1 bg-amber-400 text-slate-950 text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider mb-2 shadow-sm">
                  ★ Indicação de Voto
                </span>
                <h2 className="text-xl md:text-2xl font-black font-display tracking-tight">Votar em {recommendedPlayer.name}</h2>
                <p className="text-blue-200/90 text-xs md:text-sm mt-1 max-w-xl">
                  Você recebeu uma indicação direta para apoiar o craque do <strong className="text-amber-300 uppercase font-black">{recommendedPlayer.team}</strong>!
                </p>
              </div>
            </div>
            
            <div className="shrink-0 w-full md:w-auto">
              {hasVotedToday ? (
                <div className="bg-white/10 border border-white/20 text-slate-300 px-6 py-3 rounded-2xl font-bold text-sm text-center">
                  {votedPlayerId === recommendedPlayer.id ? 'Você já votou nele hoje!' : 'Você já votou em outro jogador hoje!'}
                </div>
              ) : (
                <button
                  onClick={() => handleInitiateVote(recommendedPlayer.id)}
                  disabled={isVoting}
                  className="w-full md:w-auto px-7 py-3.5 rounded-2xl bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black text-sm tracking-wide shadow-md hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-center"
                >
                  {isVoting ? 'Computando Voto...' : 'Votar Agora'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1. Daily Restriction Notification Area */}
      {hasVotedToday && votedPlayer && (
        <div 
          id="voted-alert"
          className="mb-8 p-5 bg-gradient-to-r from-blue-500/10 to-sky-500/5 border border-blue-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 animate-fade-in"
        >
          <div>
            <span className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-800 bg-blue-100 px-2.5 py-1 rounded-full uppercase tracking-wider mb-2">
              Voto Confirmado
            </span>
            <h3 className="text-base font-bold text-gray-900">
              Você já votou hoje no jogador <span className="text-blue-700 font-extrabold">{votedPlayer.name}</span>!
            </h3>
            <p className="text-xs text-gray-500 mt-1">
              Obrigado por apoiar o esporte em Morro do Chapéu. Você pode escolher outro jogador (ou o mesmo) amanhã.
            </p>
          </div>
          
          <div className="flex items-center gap-2 bg-white px-4 py-2.5 rounded-xl border border-blue-100 shadow-xs shrink-0">
            <Timer className="w-5 h-5 text-amber-500 animate-spin-slow" />
            <div>
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Novo voto em</div>
              <div className="text-sm font-extrabold text-gray-800 tracking-tight font-mono">{timeLeft}</div>
            </div>
          </div>
        </div>
      )}

      {/* 2. Top 3 Podium Leaders */}
      {podiumPlayers.length > 0 && (
        <div className="mb-10" id="podium-section">
          <div className="flex items-center gap-2 mb-6">
            <Trophy className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-gray-900">Líderes de Votação (Top 3)</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {podiumPlayers.map((player, index) => {
              const podiumColors = [
                { bg: 'from-amber-500 to-yellow-400', badge: 'bg-amber-500', text: 'text-amber-800', label: '1º Lugar' },
                { bg: 'from-slate-400 to-slate-300', badge: 'bg-slate-400', text: 'text-slate-800', label: '2º Lugar' },
                { bg: 'from-amber-700 to-amber-600', badge: 'bg-amber-700', text: 'text-amber-100', label: '3º Lugar' },
              ];
              const color = podiumColors[index] || podiumColors[2];
              const pct = totalVotes > 0 ? (player.votesCount / totalVotes) * 100 : 0;

              return (
                <div 
                  key={player.id}
                  className="bg-white rounded-xl border border-gray-100 p-4 shadow-xs flex items-center gap-4 relative overflow-hidden"
                >
                  <div className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${color.bg}`} />
                  
                  <div className="relative shrink-0">
                    <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-100 border-2 border-gray-200 flex items-center justify-center">
                      {player.imageUrl ? (
                        <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full bg-blue-700 text-white font-extrabold flex items-center justify-center text-xs">
                          {player.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className={`absolute -bottom-1.5 -right-1.5 w-6 h-6 rounded-full ${color.badge} text-white font-extrabold text-[10px] flex items-center justify-center border-2 border-white`}>
                      {index + 1}
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{color.label}</div>
                    <div className="text-sm font-bold text-gray-900 truncate mt-0.5">{player.name}</div>
                    <div className="text-xs text-gray-500 truncate flex items-center gap-1">
                      <Shield className="w-3 h-3 text-blue-600 inline shrink-0" />
                      <span className="truncate">{player.team}</span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="text-sm font-black text-blue-600">{player.votesCount}</div>
                    <div className="text-[10px] font-bold text-gray-400 uppercase">{pct.toFixed(0)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. Search and Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-gray-100 p-4 md:p-6 mb-8 shadow-xs" id="filters-toolbar">
        <div className="flex flex-col md:flex-row gap-4 justify-between items-center">
          <div className="relative w-full md:max-w-md">
            <span className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <Search className="w-5 h-5 text-gray-400" />
            </span>
            <input
              id="search-player-input"
              type="text"
              placeholder="Pesquise o jogador ou time..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-hidden text-sm transition-colors text-gray-700"
            />
          </div>

          <div className="flex items-center gap-2 w-full md:w-auto shrink-0 justify-between md:justify-end">
            <SlidersHorizontal className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-bold text-gray-500 uppercase tracking-wider shrink-0">Filtrar por Time:</span>
            <select
              id="team-filter-select"
              value={selectedTeam}
              onChange={(e) => setSelectedTeam(e.target.value)}
              className="px-3.5 py-2 text-sm rounded-xl border border-gray-200 focus:border-blue-500 focus:outline-hidden bg-white text-gray-700 cursor-pointer font-medium max-w-[200px]"
            >
              {teams.map(team => (
                <option key={team} value={team}>{team}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 4. Player Cards List */}
      {filteredPlayers.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" id="players-list-grid">
          {filteredPlayers.map(player => (
            <PlayerCard
              key={player.id}
              player={player}
              totalVotes={totalVotes}
              onVote={handleInitiateVote}
              hasVotedToday={hasVotedToday}
              votedPlayerId={votedPlayerId}
              isVoting={isVoting}
              isLocked={isLocked}
              config={config}
            />
          ))}
        </div>
      ) : (
        <div className="bg-gray-50 rounded-2xl border border-dashed border-gray-200 py-16 px-4 text-center" id="empty-players-state">
          <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4 text-gray-400">
            <Info className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-gray-900">
            {players.length === 0 ? 'Nenhum jogador cadastrado' : 'Nenhum jogador encontrado'}
          </h3>
          <p className="text-sm text-gray-500 mt-1 max-w-sm mx-auto">
            {players.length === 0
              ? 'Nenhum jogador foi cadastrado no campeonato ainda. Acesse o Painel Admin para cadastrar os jogadores!'
              : 'Não encontramos jogadores correspondentes à sua pesquisa ou filtro de time. Tente ajustar os termos ou o filtro.'}
          </p>
        </div>
      )}

    </div>
  );
}
