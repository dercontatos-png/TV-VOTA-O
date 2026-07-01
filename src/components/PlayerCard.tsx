import React, { useState } from 'react';
import { Award, User, Shield, Check, Share2 } from 'lucide-react';
import { Player } from '../types';

interface PlayerCardProps {
  key?: string | number;
  player: Player;
  totalVotes: number;
  onVote: (playerId: string) => void;
  hasVotedToday: boolean;
  votedPlayerId?: string;
  isVoting: boolean;
  isLocked?: boolean;
}

export default function PlayerCard({
  player,
  totalVotes,
  onVote,
  hasVotedToday,
  votedPlayerId,
  isVoting,
  isLocked = false,
}: PlayerCardProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    // Generate sharing URL with player query parameter
    const shareUrl = `${window.location.origin}${window.location.pathname}?player=${player.id}`;
    
    // Copy to clipboard
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch((err) => {
      console.error('Failed to copy link:', err);
    });
  };

  const percentage = totalVotes > 0 ? (player.votesCount / totalVotes) * 100 : 0;
  const isVotedByMe = votedPlayerId === player.id;


  // Helper to generate initials for default player avatar
  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length >= 2) {
      return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    }
    return name.slice(0, 2).toUpperCase();
  };

  // Dynamically assign team colors based on team name to make cards look alive!
  const getTeamColorTheme = (teamName: string) => {
    const name = teamName.toLowerCase();
    if (name.includes('azuup')) {
      return {
        border: 'border-blue-500',
        ring: 'ring-blue-100',
        bg: 'bg-blue-50 text-blue-700',
        gradient: 'from-blue-600/80 to-blue-900/90',
        avatarBorder: 'border-blue-400',
        badge: 'bg-blue-600 text-white',
        progress: 'bg-blue-600',
        text: 'text-blue-700',
        accentIconColor: 'text-blue-600'
      };
    }
    if (name.includes('campinense')) {
      return {
        border: 'border-red-500',
        ring: 'ring-red-100',
        bg: 'bg-red-50 text-red-700',
        gradient: 'from-red-600/80 to-red-950/90',
        avatarBorder: 'border-red-400',
        badge: 'bg-red-600 text-white',
        progress: 'bg-red-600',
        text: 'text-red-700',
        accentIconColor: 'text-red-600'
      };
    }
    // Default nice sports theme colors
    return {
      border: 'border-emerald-500',
      ring: 'ring-emerald-100',
      bg: 'bg-emerald-50 text-emerald-700',
      gradient: 'from-emerald-600/80 to-emerald-900/90',
      avatarBorder: 'border-emerald-400',
      badge: 'bg-emerald-600 text-white',
      progress: 'bg-emerald-600',
      text: 'text-emerald-700',
      accentIconColor: 'text-emerald-600'
    };
  };

  const teamTheme = getTeamColorTheme(player.team);

  return (
    <div
      id={`player-card-${player.id}`}
      className={`relative bg-white rounded-3xl border transition-all duration-300 overflow-hidden flex flex-col justify-between ${
        isVotedByMe
          ? `border-emerald-500 ring-4 ${teamTheme.ring} shadow-lg scale-[1.02]`
          : 'border-slate-100 shadow-xs hover:shadow-md hover:border-slate-200 hover:-translate-y-0.5'
      }`}
    >
      {/* Percentage Indicator Badge */}
      <div className="absolute top-3.5 right-3.5 z-10 bg-slate-950/80 backdrop-blur-md text-white text-[11px] font-black px-3 py-1.5 rounded-full flex items-center gap-1 shadow-xs border border-white/10">
        <Award className="w-3.5 h-3.5 text-amber-400 fill-amber-400/20" />
        <span>{percentage.toFixed(1)}%</span>
      </div>

      {/* Top Background Pattern */}
      <div className={`h-24 bg-gradient-to-br ${teamTheme.gradient} relative overflow-hidden flex items-center px-5 pt-2`}>
        {/* Soccer field subtle markings */}
        <div className="absolute inset-0 opacity-10 bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:16px_16px]"></div>
        
        {/* Team Logo Badge */}
        <div className="flex items-center gap-1.5 bg-white/15 backdrop-blur-xs px-2.5 py-1 rounded-full border border-white/10 max-w-[85%]">
          <Shield className="w-3.5 h-3.5 text-white fill-white/10 shrink-0" />
          <span className="text-[10px] font-black text-white truncate uppercase tracking-wider" title={player.team}>
            {player.team}
          </span>
        </div>
      </div>

      {/* Main content body */}
      <div className="px-5 pb-5 -mt-10 flex-grow flex flex-col items-center relative z-10">
        {/* Profile Image container */}
        <div className={`relative w-20 h-20 rounded-full border-4 border-white shadow-md overflow-hidden bg-slate-50 flex items-center justify-center mb-3.5 ${teamTheme.border}`}>
          {player.imageUrl ? (
            <img
              src={player.imageUrl}
              alt={player.name}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
              onError={(e) => {
                // If image fails, clear it to show initials placeholder
                (e.target as HTMLImageElement).style.display = 'none';
              }}
            />
          ) : (
            <div className={`w-full h-full bg-gradient-to-tr ${teamTheme.gradient} flex items-center justify-center text-white font-black text-xl tracking-wider`}>
              {getInitials(player.name)}
            </div>
          )}
        </div>

        {/* Player Name and Position */}
        <h3 className="text-base font-black text-slate-900 text-center line-clamp-1 font-display tracking-tight" title={player.name}>
          {player.name}
        </h3>
        
        {player.position ? (
          <span className={`text-[10px] font-extrabold uppercase tracking-widest ${teamTheme.bg} px-3 py-1 rounded-full mt-2`}>
            {player.position}
          </span>
        ) : (
          <span className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400 bg-slate-100 px-3 py-1 rounded-full mt-2">
            Jogador
          </span>
        )}

        {/* Real-time Vote Meter */}
        <div className="w-full mt-6 bg-slate-100 h-2 rounded-full overflow-hidden">
          <div
            className={`${teamTheme.progress} h-full rounded-full transition-all duration-1000 ease-out`}
            style={{ width: `${percentage}%` }}
          ></div>
        </div>
        
        <div className="w-full flex justify-between text-xs font-bold text-slate-500 mt-2.5">
          <span>{player.votesCount} {player.votesCount === 1 ? 'voto' : 'votos'}</span>
          <span className={teamTheme.text}>{percentage.toFixed(0)}%</span>
        </div>
      </div>

      {/* Button controls */}
      <div className="px-5 pb-5 pt-1 border-t border-gray-50/60 bg-gray-50/30 flex flex-col gap-2">
        {isVotedByMe ? (
          <div className="w-full py-2.5 rounded-xl bg-emerald-500 text-white font-bold text-sm flex items-center justify-center gap-1.5 shadow-sm">
            <Check className="w-4 h-4 text-white animate-bounce" />
            <span>Seu Voto de Hoje</span>
          </div>
        ) : isLocked ? (
          <button
            disabled={true}
            className="w-full py-2.5 rounded-xl bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed font-bold text-sm"
          >
            Votação Inativa
          </button>
        ) : (
          <button
            id={`vote-btn-${player.id}`}
            onClick={() => onVote(player.id)}
            disabled={hasVotedToday || isVoting}
            className={`w-full py-2.5 rounded-xl font-bold text-sm transition-all duration-200 cursor-pointer ${
              hasVotedToday
                ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm hover:shadow-md hover:-translate-y-0.5 active:translate-y-0'
            }`}
          >
            {hasVotedToday ? 'Votado Hoje' : 'Votar neste Jogador'}
          </button>
        )}

        <button
          onClick={handleShare}
          className={`w-full py-2 rounded-xl border font-bold text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer ${
            copied
              ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
              : 'bg-white hover:bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-500 hover:text-emerald-700'
          }`}
        >
          <Share2 className="w-3.5 h-3.5" />
          <span>{copied ? 'Link de Votação Copiado!' : 'Compartilhar Link de Voto'}</span>
        </button>
      </div>
    </div>
  );
}
