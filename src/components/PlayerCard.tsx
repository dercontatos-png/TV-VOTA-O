import React, { useState } from 'react';
import { Award, User, Shield, Check, Share2, X, Search } from 'lucide-react';
import { Player, SystemConfig } from '../types';

interface PlayerCardProps {
  key?: string | number;
  player: Player;
  totalVotes: number;
  onVote: (playerId: string) => void;
  hasVotedToday: boolean;
  votedPlayerId?: string;
  isVoting: boolean;
  isLocked?: boolean;
  config?: SystemConfig | null;
}

export default function PlayerCard({
  player,
  totalVotes,
  onVote,
  hasVotedToday,
  votedPlayerId,
  isVoting,
  isLocked = false,
  config,
}: PlayerCardProps) {
  const [copied, setCopied] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [isZoomed, setIsZoomed] = useState(false);
  const [fitMode, setFitMode] = useState<'cover' | 'contain'>(player.imageFit || 'cover');

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    const shareUrl = `${window.location.origin}${window.location.pathname}?player=${player.id}`;
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy link:', err);
    });
  };

  const percentage = totalVotes > 0 ? (player.votesCount / totalVotes) * 100 : 0;
  const isVotedByMe = votedPlayerId === player.id;

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Team Colors: Azuup (Azul, vermelho e branco), Campinense (Amarelo e preto)
  const getTeamColorTheme = (teamName: string) => {
    const name = teamName.toLowerCase();
    if (name.includes('azuup')) {
      return {
        border: 'border-blue-600',
        ring: 'ring-red-500',
        bg: 'bg-blue-50 text-blue-900',
        gradient: 'from-blue-600 to-red-600',
        avatarBorder: 'border-blue-500',
        badge: 'bg-blue-600 text-white',
        progress: 'bg-gradient-to-r from-blue-600 to-red-600',
        text: 'text-blue-700',
        accentIconColor: 'text-blue-600'
      };
    }
    if (name.includes('campinense')) {
      return {
        border: 'border-yellow-400',
        ring: 'ring-black',
        bg: 'bg-yellow-50 text-yellow-900',
        gradient: 'from-yellow-400 to-black',
        avatarBorder: 'border-yellow-400',
        badge: 'bg-black text-yellow-400',
        progress: 'bg-gradient-to-r from-yellow-400 to-black',
        text: 'text-yellow-600',
        accentIconColor: 'text-yellow-500'
      };
    }
    return {
      border: 'border-blue-500',
      ring: 'ring-blue-100',
      bg: 'bg-slate-50 text-slate-700',
      gradient: 'from-blue-600 to-sky-500',
      avatarBorder: 'border-blue-400',
      badge: 'bg-blue-600 text-white',
      progress: 'bg-blue-600',
      text: 'text-blue-600',
      accentIconColor: 'text-blue-600'
    };
  };

  const teamTheme = getTeamColorTheme(player.team);

  const getTeamLogoUrl = (teamName: string) => {
    if (!config) return undefined;
    const name = teamName.toLowerCase();
    if (name.includes('azuup')) return config.logoAzuup;
    if (name.includes('campinense')) return config.logoCampinense;
    return undefined;
  };

  const handleVoteClick = () => {
    setIsClicking(true);
    onVote(player.id);
    setTimeout(() => setIsClicking(false), 2000);
  };

  return (
    <>
      <div
        id={`player-card-${player.id}`}
        className={`relative bg-white rounded-[32px] border transition-all duration-300 overflow-hidden flex flex-col justify-between group ${
          isVotedByMe
            ? `${teamTheme.border} ring-4 ${teamTheme.ring} shadow-lg scale-[1.01]`
            : 'border-slate-150 shadow-xs hover:shadow-2xl hover:border-slate-300 hover:-translate-y-1'
        }`}
      >
        {/* Large Rectangular Image Header - Max visibility as requested, NO OVERLAYS */}
        <div className="relative h-72 w-full bg-slate-100 overflow-hidden group">
          <button
            onClick={() => setIsZoomed(true)}
            className="absolute inset-0 w-full h-full cursor-zoom-in flex items-center justify-center overflow-hidden bg-slate-200"
            title="Clique para ampliar a foto do jogador"
          >
            {player.imageUrl ? (
              <img
                src={player.imageUrl}
                alt={player.name}
                referrerPolicy="no-referrer"
                className={`w-full h-full bg-slate-200 transition-transform duration-500 group-hover:scale-105 ${
                  fitMode === 'cover' 
                    ? `object-cover ${player.imagePosition === 'bottom' ? 'object-bottom' : player.imagePosition === 'center' ? 'object-center' : 'object-top'}` 
                    : 'object-contain'
                }`}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={`w-full h-full bg-gradient-to-tr ${teamTheme.gradient} flex items-center justify-center text-white font-black text-5xl tracking-wider font-display`}>
                {getInitials(player.name)}
              </div>
            )}
            
            {/* Visualizer Floating Action (only on hover, small) */}
            <div className="absolute top-3 right-3 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 p-2 rounded-full backdrop-blur-md">
              <Search className="w-4 h-4 text-white" />
            </div>
          </button>
          

        </div>

        {/* Main content body */}
        <div className="p-6 flex-grow flex flex-col justify-between border-t-4 border-transparent" style={{ borderTopColor: player.team.toLowerCase().includes('campinense') ? '#facc15' : '#2563eb' }}>
          <div>
            {/* Badges moved below the photo so they don't cover the face */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full border shadow-xs ${teamTheme.bg} ${teamTheme.border}`}>
                {getTeamLogoUrl(player.team) ? (
                  <img src={getTeamLogoUrl(player.team)} alt={player.team} className="w-3.5 h-3.5 object-contain drop-shadow-sm" />
                ) : (
                  <Shield className={`w-3.5 h-3.5 ${teamTheme.accentIconColor}`} />
                )}
                <span className="text-[10px] font-black uppercase tracking-wider truncate max-w-[120px]">
                  {player.team}
                </span>
              </div>
              <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border shadow-xs ${teamTheme.bg} ${teamTheme.border}`}>
                {player.position || 'Atleta'}
              </span>
            </div>

            {/* Player Name */}
            <h3 className="text-xl font-black text-slate-900 tracking-tight font-display mb-4 transition-colors line-clamp-1" title={player.name}>
              {player.name}
            </h3>

            {/* Real-time Vote Meter */}
            <div className="space-y-2">
              <div className="w-full bg-slate-100 h-3 rounded-full overflow-hidden shadow-inner">
                <div
                  className={`${teamTheme.progress} h-full rounded-full transition-all duration-1000 ease-out`}
                  style={{ width: `${percentage}%` }}
                ></div>
              </div>
              
              <div className="flex justify-between items-center text-xs">
                <span className="font-extrabold text-slate-500">{player.votesCount} {player.votesCount === 1 ? 'voto' : 'votos'}</span>
                <span className={`font-black text-sm ${teamTheme.text}`}>{percentage.toFixed(1)}%</span>
              </div>
            </div>
          </div>

          {/* Button controls - Fast, one-click layout */}
          <div className="mt-6 flex flex-col gap-2.5">
            {isVotedByMe ? (
              <div className="w-full py-3.5 rounded-2xl bg-blue-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-500/10 border border-blue-500 animate-scale-up">
                <Check className="w-5 h-5 text-white stroke-[3] animate-bounce" />
                <span>Seu Voto de Hoje</span>
              </div>
            ) : isLocked ? (
              <button
                disabled={true}
                className="w-full py-3.5 rounded-2xl bg-slate-50 text-slate-400 border border-slate-200 cursor-not-allowed font-extrabold text-sm"
              >
                Votação Encerrada
              </button>
            ) : (
              <button
                id={`vote-btn-${player.id}`}
                onClick={handleVoteClick}
                disabled={hasVotedToday || isVoting}
                className={`w-full py-3.5 rounded-2xl font-black text-sm tracking-wide transition-all duration-300 transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2 ${
                  hasVotedToday
                    ? 'bg-slate-50 text-slate-400 border border-slate-150 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white shadow-md shadow-blue-500/15 hover:shadow-lg hover:shadow-blue-500/25'
                }`}
              >
                {isClicking ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div> Computando...</>
                ) : hasVotedToday ? 'Votação Bloqueada' : 'Votar neste Craque'}
              </button>
            )}

            <button
              onClick={handleShare}
              className={`w-full py-2.5 rounded-xl border font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                copied
                  ? 'bg-blue-50 text-blue-700 border-blue-300'
                  : 'bg-white hover:bg-slate-50 text-slate-600 border-slate-200 hover:border-blue-500 hover:text-blue-700'
              }`}
            >
              <Share2 className="w-4 h-4" />
              <span>{copied ? 'Link Copiado!' : 'Indicar Jogador'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 5. Stunning Fullscreen Player Photo Zoom Modal */}
      {isZoomed && (
        <div
          className="fixed inset-0 bg-slate-950/90 backdrop-blur-md flex items-center justify-center z-50 p-4 transition-all duration-300 animate-fade-in"
          onClick={() => setIsZoomed(false)}
        >
          <div
            className="bg-white rounded-[32px] overflow-hidden max-w-lg w-full shadow-2xl relative border border-slate-100 animate-scale-up"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setIsZoomed(false)}
              className="absolute top-4 right-4 z-20 p-2.5 text-slate-500 hover:text-slate-950 bg-white/80 hover:bg-white rounded-full transition-colors cursor-pointer border border-slate-100 shadow-md backdrop-blur-xs"
              aria-label="Fechar zoom"
            >
              <X className="w-5 h-5 stroke-[2.5]" />
            </button>

            <div className="relative w-full aspect-square md:h-[500px] bg-slate-100">
              {player.imageUrl ? (
                <img
                  src={player.imageUrl}
                  alt={player.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain bg-black"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
              ) : (
                <div className={`w-full h-full bg-gradient-to-br ${teamTheme.gradient} flex items-center justify-center text-white font-black text-6xl tracking-wider font-display`}>
                  {getInitials(player.name)}
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 bg-slate-50 border-t border-slate-100">
              <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight mb-4">
                {player.name}
              </h2>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Total de Votos</span>
                  <span className={`text-2xl font-black ${teamTheme.text} font-display block mt-1`}>{player.votesCount}</span>
                </div>
                <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">Porcentagem</span>
                  <span className="text-2xl font-black text-slate-900 font-display block mt-1">{percentage.toFixed(1)}%</span>
                </div>
              </div>

              {!isVotedByMe && !hasVotedToday && !isLocked && (
                <button
                  onClick={() => {
                    onVote(player.id);
                    setIsZoomed(false);
                  }}
                  className="w-full mt-6 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-blue-600 to-sky-500 hover:from-blue-500 hover:to-sky-400 text-white font-black text-sm tracking-wide shadow-md shadow-blue-500/10 hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer text-center"
                >
                  Votar neste Jogador
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
