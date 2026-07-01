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
    if (!voterInfo) {
      onLogin(); // Trigger Google Login if not logged in
    } else {
      onVote(playerId);
    }
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
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(search.toLowerCase()) || 
                          player.team.toLowerCase().includes(search.toLowerCase());
    const matchesTeam = selectedTeam === 'Todos' || player.team === selectedTeam;
    return matchesSearch && matchesTeam;
  });

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
        
        {/* Sponsor/Main Logo Space */}
        {config?.logoPrincipal && (
          <div className="relative z-10 mb-8 max-w-[200px] md:max-w-[250px] bg-white/10 backdrop-blur-sm border border-white/20 p-4 rounded-2xl flex items-center justify-center shadow-lg">
            <img src={config.logoPrincipal} alt="Logo Principal" className="w-full h-auto object-contain max-h-[80px]" />
          </div>
        )}

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
          <div className="relative p-6 md:p-8 bg-gradient-to-b from-white/10 to-white/5 backdrop-blur-xl border border-white/10 rounded-3xl shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-1 bg-gradient-to-r from-transparent via-blue-400 to-transparent opacity-50"></div>
            <h2 className="text-lg md:text-2xl lg:text-3xl font-display font-medium tracking-wide text-white leading-relaxed drop-shadow-lg" id="question-text">
              <span className="text-blue-400 text-4xl leading-none inline-block align-top mr-2 opacity-60">"</span>
              {config?.votingQuestion || 'Quem é o seu favorito para conquistar o título de melhor "Prata da Casa" do Campeonato Municipal de Morro do Chapéu 2026 - Azuup x Campinense?'}
              <span className="text-blue-400 text-4xl leading-none inline-block align-bottom ml-2 opacity-60">"</span>
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
      <div className="mb-8" id="voter-accreditation-card">
        {voterInfo ? (
          <div className="p-5 bg-gradient-to-r from-blue-500/10 via-blue-500/5 to-white border border-blue-500/20 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 shrink-0">
                <UserCheck className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-blue-800 bg-blue-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Eleitor Logado e Habilitado
                  </span>
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>
                </div>
                <h3 className="text-base font-black text-slate-800 mt-1 font-display">
                  {voterInfo.name}
                </h3>
                <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <Smartphone className="w-3.5 h-3.5 text-slate-400" />
                  <span>Logado como: {voterInfo.email || 'Usuário'}</span>
                </p>
              </div>
            </div>
            
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl border border-slate-200 hover:border-rose-300 text-slate-500 hover:text-rose-600 bg-white hover:bg-rose-50 text-xs font-black uppercase tracking-wider transition-colors cursor-pointer shrink-0"
            >
              Sair da Conta
            </button>
          </div>
        ) : (
          <div className="p-5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-white border border-amber-500/20 rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 shadow-xs animate-fade-in">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 shrink-0">
                <User className="w-6 h-6 stroke-[2.5]" />
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-black text-amber-800 bg-amber-100 px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                    Identificação Necessária
                  </span>
                </div>
                <h3 className="text-base font-black text-slate-800 mt-1 font-display">
                  Faça login para habilitar sua votação
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Entre com sua conta Google para validar, auditar e assegurar a autenticidade de seus votos.
                </p>
              </div>
            </div>
            
            <button
              onClick={onLogin}
              className="px-5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-900 text-white hover:shadow-md text-xs font-black uppercase tracking-widest transition-all cursor-pointer shrink-0"
            >
              Identificar-se agora
            </button>
          </div>
        )}
      </div>

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
