import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, KeyRound, LogOut, RefreshCw, 
  Upload, Shield, FileImage, ClipboardList, Info, HelpCircle, Eye, Download,
  Link, Copy, Check, Monitor, ExternalLink, ArrowUp, ArrowDown, Image as ImageIcon
} from 'lucide-react';
import { Player, SystemConfig, Vote } from '../types';
import { addPlayer, updatePlayer, deletePlayer, resetAllVotes, getVotesHistory, getAllVotes, DEFAULT_CONFIG } from '../dbService';
import { MuralPanel } from './MuralPanel';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as htmlToImage from 'html-to-image';

const PRESET_PLAYERS = [
  { name: 'Jefinho', team: 'Azuup', position: 'Meia (MEI)' },
  { name: 'Didio', team: 'Azuup', position: 'Meia-Atacante (MEI-ATAC)' },
  { name: 'Gabriel', team: 'Azuup', position: 'Lateral (LAT)' },
  { name: 'Valdevando', team: 'Azuup', position: 'Lateral (LAT)' },
  { name: 'Kauê', team: 'Azuup', position: 'Goleiro' },
  { name: 'Marcel', team: 'Campinense', position: 'Lateral (LAT)' },
  { name: 'Sujeirinha', team: 'Campinense', position: 'Meia-Atacante (MEI-ATAC)' },
  { name: 'Peep', team: 'Campinense', position: 'Volante (VOL)' },
  { name: 'Rafael', team: 'Campinense', position: 'Lateral (LAT)' },
  { name: 'Leuzinho', team: 'Campinense', position: 'Volante (VOL)' }
];

interface AdminPanelProps {
  players: Player[];
  onRefresh: () => void;
  config: SystemConfig | null;
  onUpdateConfig: (newConfig: SystemConfig) => Promise<void>;
}

// --- EXPORT NODE COMPONENTS ---

const ExportNodeTV = ({ config, totalVotes, players }: any) => {
  return (
    <div 
      id="export-node-tv" 
      style={{ 
        display: 'block', 
        width: '1920px', 
        height: '1080px', 
        backgroundColor: '#020617',
        backgroundImage: 'linear-gradient(to bottom right, #020617, #001e3b)',
        position: 'fixed', 
        top: '-10000px',
        left: '-10000px',
        pointerEvents: 'none',
        zIndex: -9999,
        padding: '0',
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', padding: '60px 80px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* Top Section */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
          {/* Left side: Teams */}
          <div style={{ display: 'flex', gap: '24px', alignItems: 'center' }}>
            {config?.logoAzuup && (
              <img crossOrigin="anonymous" src={config.logoAzuup} style={{ height: '140px', objectFit: 'contain' }} />
            )}
            {config?.logoAzuup && config?.logoCampinense && (
              <span style={{ fontSize: '48px', fontWeight: 900, color: 'white', opacity: 0.8 }}>X</span>
            )}
            {config?.logoCampinense && (
              <img crossOrigin="anonymous" src={config.logoCampinense} style={{ height: '140px', objectFit: 'contain' }} />
            )}
          </div>

          {/* Center: Title */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '-20px' }}>
            <h1 style={{ fontSize: '64px', fontWeight: 900, color: 'white', textTransform: 'uppercase', margin: 0, letterSpacing: '4px', textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
              RESULTADO DA
            </h1>
            <h1 style={{ 
              fontSize: '120px', 
              fontWeight: 900, 
              color: '#ffffff', 
              textTransform: 'uppercase', 
              margin: '-20px 0 20px 0', 
              letterSpacing: '2px', 
              textShadow: '0 4px 0px #00509e, 0 8px 0px #003366, 0 12px 20px rgba(0,0,0,0.8)' 
            }}>
              VOTAÇÃO
            </h1>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(255, 255, 255, 0.5)', borderRadius: '16px', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: '24px', backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)' }}>
              <span style={{ fontSize: '24px', color: 'white', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>TOTAL DE VOTOS</span>
              <div style={{ width: '2px', height: '40px', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}></div>
              <span style={{ fontSize: '48px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>{totalVotes.toLocaleString('pt-BR')}</span>
            </div>
          </div>

          {/* Right side: Sponsor */}
          <div style={{ minWidth: '350px' }}>
            {config?.sponsorName && (
              <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(255, 255, 255, 0.5)', borderRadius: '24px', padding: '32px 48px', display: 'flex', alignItems: 'center', gap: '32px', backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', width: '100%' }}>
                  <span style={{ fontSize: '20px', fontWeight: 900, color: '#93c5fd', textTransform: 'uppercase', marginBottom: '8px', letterSpacing: '2px' }}>OFERECIMENTO</span>
                  <span style={{ fontSize: '36px', fontWeight: 900, color: 'white', textTransform: 'uppercase', wordBreak: 'normal', lineHeight: 1.1 }}>{config.sponsorName}</span>
                  {config.sponsorPrize && (
                    <span style={{ fontSize: '24px', fontWeight: 700, color: 'white', marginTop: '8px' }}>PRÊMIO: {config.sponsorPrize}</span>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Section: Bars */}
        <div style={{ display: 'flex', gap: '28px', alignItems: 'flex-end', justifyContent: 'center', height: '580px', paddingBottom: '0' }}>
          {[...players].sort((a: any, b: any) => b.votesCount - a.votesCount).slice(0, 10).map((player: any, index: number, arr: any[]) => {
            const topVotes = arr[0]?.votesCount || 1;
            const heightPercentage = Math.max(15, (player.votesCount / topVotes) * 100);
            
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '130px', flexShrink: 0, justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '16px' }}>
                  <span style={{ fontSize: '38px', fontWeight: 900, color: '#ffffff', textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
                    {player.votesCount}
                  </span>
                  <span style={{ fontSize: '20px', color: '#93c5fd', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div style={{ zIndex: 20, marginBottom: '-55px' }}>
                  {player.imageUrl ? (
                    <img crossOrigin="anonymous" src={player.imageUrl} style={{ width: '110px', height: '110px', borderRadius: '50%', objectFit: 'cover', border: '4px solid white', backgroundColor: '#020617', boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)' }} />
                  ) : (
                    <div style={{ width: '110px', height: '110px', borderRadius: '50%', backgroundColor: '#020617', border: '4px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '38px', fontWeight: 900, color: 'white', boxShadow: '0 0 20px rgba(255, 255, 255, 0.5)' }}>
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ 
                  width: '100%', 
                  height: `${(heightPercentage / 100) * 350}px`, 
                  minHeight: '140px',
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '65px 65px 0 0',
                  border: '3px solid #ffffff',
                  borderBottom: 'none',
                  boxShadow: '0 0 20px rgba(255, 255, 255, 0.3), inset 0 0 20px rgba(255, 255, 255, 0.1)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  paddingBottom: '0'
                }}>
                  <div style={{ backgroundColor: 'rgba(0, 30, 59, 0.9)', borderTop: '3px solid #ffffff', width: '100%', padding: '10px 4px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '60px' }}>
                    <div style={{ fontSize: '15px', fontWeight: 900, color: 'white', textTransform: 'uppercase', wordBreak: 'normal', lineHeight: 1.1, textAlign: 'center' }}>
                      {player.name}
                    </div>
                    {player.position && (
                       <div style={{ fontSize: '11px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', marginTop: '4px', textAlign: 'center' }}>
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
    </div>
  );
};

const ExportNodeFeed = ({ config, totalVotes, players }: any) => {
  return (
    <div 
      id="export-node-feed" 
      style={{ 
        display: 'block', 
        width: '1080px', 
        height: '1080px', 
        backgroundColor: '#020617',
        backgroundImage: 'linear-gradient(to bottom right, #020617, #001e3b)',
        position: 'fixed', 
        top: '-10000px',
        left: '-10000px',
        pointerEvents: 'none',
        zIndex: -9999,
        padding: '0',
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', padding: '60px 40px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        
        {/* Top Section */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '100%' }}>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginBottom: '20px' }}>
            {config?.logoAzuup && <img crossOrigin="anonymous" src={config.logoAzuup} style={{ height: '90px', objectFit: 'contain' }} />}
            {config?.logoAzuup && config?.logoCampinense && <span style={{ fontSize: '32px', fontWeight: 900, color: 'white', opacity: 0.8 }}>X</span>}
            {config?.logoCampinense && <img crossOrigin="anonymous" src={config.logoCampinense} style={{ height: '90px', objectFit: 'contain' }} />}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <h1 style={{ fontSize: '48px', fontWeight: 900, color: 'white', textTransform: 'uppercase', margin: 0, letterSpacing: '4px', textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
              RESULTADO DA
            </h1>
            <h1 style={{ fontSize: '90px', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', margin: '-10px 0 20px 0', letterSpacing: '2px', textShadow: '0 4px 0px #00509e, 0 8px 0px #003366, 0 12px 20px rgba(0,0,0,0.8)' }}>
              VOTAÇÃO
            </h1>
            <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(255, 255, 255, 0.5)', borderRadius: '16px', padding: '12px 30px', display: 'flex', alignItems: 'center', gap: '20px', backdropFilter: 'blur(10px)', boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)' }}>
              <span style={{ fontSize: '20px', color: 'white', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>TOTAL DE VOTOS</span>
              <div style={{ width: '2px', height: '30px', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}></div>
              <span style={{ fontSize: '40px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>{totalVotes.toLocaleString('pt-BR')}</span>
            </div>
          </div>
        </div>

        {/* Bottom Section: Bars */}
        <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-end', justifyContent: 'center', height: '450px', paddingBottom: '0' }}>
          {[...players].sort((a: any, b: any) => b.votesCount - a.votesCount).slice(0, 10).map((player: any, index: number, arr: any[]) => {
            const topVotes = arr[0]?.votesCount || 1;
            const heightPercentage = Math.max(15, (player.votesCount / topVotes) * 100);
            
            return (
              <div key={index} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '85px', flexShrink: 0, justifyContent: 'flex-end', height: '100%' }}>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '12px' }}>
                  <span style={{ fontSize: '28px', fontWeight: 900, color: '#ffffff', textShadow: '0 4px 15px rgba(0,0,0,0.8)' }}>
                    {player.votesCount}
                  </span>
                  <span style={{ fontSize: '14px', color: '#93c5fd', fontWeight: 800, textShadow: '0 2px 10px rgba(0,0,0,0.8)' }}>
                    {totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : 0}%
                  </span>
                </div>
                
                <div style={{ zIndex: 20, marginBottom: '-35px' }}>
                  {player.imageUrl ? (
                    <img crossOrigin="anonymous" src={player.imageUrl} style={{ width: '75px', height: '75px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', backgroundColor: '#020617', boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }} />
                  ) : (
                    <div style={{ width: '75px', height: '75px', borderRadius: '50%', backgroundColor: '#020617', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', fontWeight: 900, color: 'white', boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }}>
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                <div style={{ 
                  width: '100%', 
                  height: `${(heightPercentage / 100) * 280}px`, 
                  minHeight: '100px',
                  background: 'rgba(255, 255, 255, 0.1)', 
                  borderRadius: '40px 40px 0 0',
                  border: '2px solid #ffffff',
                  borderBottom: 'none',
                  boxShadow: '0 0 15px rgba(255, 255, 255, 0.3), inset 0 0 15px rgba(255, 255, 255, 0.1)',
                  zIndex: 10,
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'flex-end',
                  paddingBottom: '0'
                }}>
                  <div style={{ backgroundColor: 'rgba(0, 30, 59, 0.9)', borderTop: '2px solid #ffffff', width: '100%', padding: '8px 2px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '50px' }}>
                    <div style={{ fontSize: '11px', fontWeight: 900, color: 'white', textTransform: 'uppercase', wordBreak: 'normal', lineHeight: 1.1, textAlign: 'center' }}>
                      {player.name}
                    </div>
                    {player.position && (
                       <div style={{ fontSize: '9px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', marginTop: '2px', textAlign: 'center' }}>
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
    </div>
  );
};

const ExportNodeStory = ({ config, totalVotes, players }: any) => {
  return (
    <div 
      id="export-node-story" 
      style={{ 
        display: 'block', 
        width: '1080px', 
        height: '1920px', 
        backgroundColor: '#020617',
        backgroundImage: 'linear-gradient(to bottom right, #020617, #001e3b)',
        position: 'fixed', 
        top: '-10000px',
        left: '-10000px',
        pointerEvents: 'none',
        zIndex: -9999,
        padding: '0',
        boxSizing: 'border-box',
        fontFamily: 'Inter, sans-serif'
      }}
    >
      <div style={{ position: 'relative', zIndex: 10, width: '100%', height: '100%', padding: '250px 70px 250px 70px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        
        {/* Logos */}
        <div style={{ display: 'flex', gap: '30px', alignItems: 'center', marginBottom: '25px' }}>
          {config?.logoAzuup && <img crossOrigin="anonymous" src={config.logoAzuup} style={{ height: '100px', objectFit: 'contain' }} />}
          {config?.logoAzuup && config?.logoCampinense && <span style={{ fontSize: '32px', fontWeight: 900, color: 'white', opacity: 0.8 }}>X</span>}
          {config?.logoCampinense && <img crossOrigin="anonymous" src={config.logoCampinense} style={{ height: '100px', objectFit: 'contain' }} />}
        </div>

        {/* Title */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '25px' }}>
          <h1 style={{ fontSize: '42px', fontWeight: 900, color: 'white', textTransform: 'uppercase', margin: 0, letterSpacing: '4px', textShadow: '0 4px 15px rgba(0,0,0,0.5)' }}>
            RESULTADO DA
          </h1>
          <h1 style={{ fontSize: '80px', fontWeight: 900, color: '#ffffff', textTransform: 'uppercase', margin: '-5px 0 0 0', letterSpacing: '2px', textShadow: '0 4px 0px #00509e, 0 8px 0px #003366, 0 12px 20px rgba(0,0,0,0.8)' }}>
            VOTAÇÃO
          </h1>
        </div>

        <div style={{ background: 'rgba(255, 255, 255, 0.1)', border: '3px solid rgba(255, 255, 255, 0.5)', borderRadius: '24px', padding: '16px 40px', display: 'flex', alignItems: 'center', gap: '20px', backdropFilter: 'blur(10px)', marginBottom: '40px', boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)' }}>
          <span style={{ fontSize: '20px', color: 'white', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '2px' }}>TOTAL DE VOTOS</span>
          <div style={{ width: '3px', height: '30px', backgroundColor: 'rgba(255, 255, 255, 0.5)' }}></div>
          <span style={{ fontSize: '40px', fontWeight: 900, color: '#ffffff', fontFamily: 'monospace' }}>{totalVotes.toLocaleString('pt-BR')}</span>
        </div>

        {/* Horizontal Bars */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', width: '100%', flexGrow: 1, justifyContent: 'center' }}>
          {[...players].sort((a: any, b: any) => b.votesCount - a.votesCount).slice(0, 10).map((player: any, index: number, arr: any[]) => {
            const topVotes = arr[0]?.votesCount || 1;
            const widthPercentage = Math.max(15, (player.votesCount / topVotes) * 100);
            
            return (
              <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '20px', width: '100%' }}>
                {/* Avatar */}
                <div style={{ flexShrink: 0 }}>
                  {player.imageUrl ? (
                    <img crossOrigin="anonymous" src={player.imageUrl} style={{ width: '70px', height: '70px', borderRadius: '50%', objectFit: 'cover', border: '3px solid white', backgroundColor: '#020617', boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }} />
                  ) : (
                    <div style={{ width: '70px', height: '70px', borderRadius: '50%', backgroundColor: '#020617', border: '3px solid white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '30px', fontWeight: 900, color: 'white', boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)' }}>
                      {player.name.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>

                {/* Name & Bar Container */}
                <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingRight: '5px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                      <span style={{ fontSize: '20px', fontWeight: 900, color: 'white', textTransform: 'uppercase', lineHeight: 1, wordBreak: 'normal' }}>{player.name}</span>
                      {player.position && (
                         <span style={{ fontSize: '13px', fontWeight: 700, color: '#93c5fd', textTransform: 'uppercase', marginTop: '2px' }}>{player.position}</span>
                      )}
                    </div>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'baseline' }}>
                      <span style={{ fontSize: '22px', fontWeight: 900, color: '#ffffff', lineHeight: 1 }}>{player.votesCount}</span>
                      <span style={{ fontSize: '14px', fontWeight: 700, color: '#93c5fd' }}>({totalVotes > 0 ? ((player.votesCount / totalVotes) * 100).toFixed(1) : 0}%)</span>
                    </div>
                  </div>
                  
                  {/* Bar */}
                  <div style={{ width: '100%', height: '20px', backgroundColor: 'rgba(0,0,0,0.5)', borderRadius: '10px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                    <div style={{ 
                      width: `${widthPercentage}%`, 
                      height: '100%', 
                      background: 'linear-gradient(90deg, #00509e, #ffffff)',
                      borderRadius: '10px',
                      boxShadow: '0 0 15px rgba(255, 255, 255, 0.5)'
                    }}></div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        
        {/* Sponsor Bottom */}
        {config?.sponsorName && (
          <div style={{ marginTop: '30px', background: 'rgba(255, 255, 255, 0.1)', border: '2px solid rgba(255, 255, 255, 0.5)', borderRadius: '24px', padding: '20px 40px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', backdropFilter: 'blur(10px)', width: '100%', boxShadow: '0 0 20px rgba(255, 255, 255, 0.2)' }}>
            <span style={{ fontSize: '16px', fontWeight: 900, color: '#93c5fd', textTransform: 'uppercase', letterSpacing: '2px' }}>OFERECIMENTO</span>
            <span style={{ fontSize: '32px', fontWeight: 900, color: 'white', textTransform: 'uppercase', wordBreak: 'normal', textAlign: 'center' }}>{config.sponsorName}</span>
            {config.sponsorPrize && (
              <span style={{ fontSize: '18px', fontWeight: 700, color: 'white', marginTop: '2px' }}>PRÊMIO: {config.sponsorPrize}</span>
            )}
          </div>
        )}

      </div>
    </div>
  );
};

export default function AdminPanel({ players, onRefresh, config, onUpdateConfig }: AdminPanelProps) {
  // Player Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imageFit, setImageFit] = useState<'cover'|'contain'>('cover');
  const [imagePosition, setImagePosition] = useState<'top'|'center'|'bottom'>('top');
  const [order, setOrder] = useState<number>(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportingFormat, setExportingFormat] = useState<string | null>(null);
  const [operationMsg, setOperationMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // File Upload states
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Voting Settings states
  const [votingQuestion, setVotingQuestion] = useState('');
  const [logoAzuup, setLogoAzuup] = useState('');
  const [logoCampinense, setLogoCampinense] = useState('');
  const [logoPrincipal, setLogoPrincipal] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [primaryColor, setPrimaryColor] = useState('#2563eb');
  const [bannerUrl, setBannerUrl] = useState('');
  const [sponsorName, setSponsorName] = useState('Lourival Junior');
  const [sponsorPrize, setSponsorPrize] = useState('R$ 500');
  const [sponsorLogoUrl, setSponsorLogoUrl] = useState('');
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [votesHistory, setVotesHistory] = useState<Vote[]>([]);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);

  const [selectedPlayerLink, setSelectedPlayerLink] = useState('');
  const [generatedLink, setGeneratedLink] = useState(window.location.origin + '?vote=true');
  const [linkCopied, setLinkCopied] = useState(false);

  // Drag and Drop ordering state removed
  const handleCopyGeneratedLink = () => {
    navigator.clipboard.writeText(generatedLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const sortedPlayers = [...players].sort((a, b) => (a.order || 0) - (b.order || 0));

  const handleMoveUp = async (index: number) => {
    if (index === 0) return;
    const newPlayers = [...sortedPlayers];
    const temp = newPlayers[index];
    newPlayers[index] = newPlayers[index - 1];
    newPlayers[index - 1] = temp;

    try {
      const updates = newPlayers.map((player, idx) => {
        const newOrder = idx + 1;
        if (player.order !== newOrder) {
          return updatePlayer(player.id, { order: newOrder });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      onRefresh();
    } catch (err) {
      console.error("Error updating order", err);
    }
  };

  const handleMoveDown = async (index: number) => {
    if (index === sortedPlayers.length - 1) return;
    const newPlayers = [...sortedPlayers];
    const temp = newPlayers[index];
    newPlayers[index] = newPlayers[index + 1];
    newPlayers[index + 1] = temp;

    try {
      const updates = newPlayers.map((player, idx) => {
        const newOrder = idx + 1;
        if (player.order !== newOrder) {
          return updatePlayer(player.id, { order: newOrder });
        }
        return Promise.resolve();
      });
      await Promise.all(updates);
      onRefresh();
    } catch (err) {
      console.error("Error updating order", err);
    }
  };

  const logoAzuupRef = useRef<HTMLInputElement>(null);
  const logoCampinenseRef = useRef<HTMLInputElement>(null);
  const logoPrincipalRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);
  const sponsorLogoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (config) {
      setVotingQuestion(config.votingQuestion || '');
      setLogoAzuup(config.logoAzuup || '');
      setLogoCampinense(config.logoCampinense || '');
      setLogoPrincipal(config.logoPrincipal || '');
      setStartDate(config.startDate || '');
      setEndDate(config.endDate || '');
      setVotingEnabled(config.votingEnabled !== false);
      setPrimaryColor(config.primaryColor || '#2563eb');
      setBannerUrl(config.bannerUrl || '');
      setSponsorName(config.sponsorName || 'Lourival Junior');
      setSponsorPrize(config.sponsorPrize || 'R$ 500');
      setSponsorLogoUrl(config.sponsorLogoUrl || '');
    }
  }, [config]);

  useEffect(() => {
    loadVotesHistory();
  }, [players]);

  const loadVotesHistory = async () => {
    try {
      const history = await getVotesHistory(100);
      setVotesHistory(history);
      const all = await getAllVotes();
      setAllVotes(all);
    } catch (e) {
      console.error(e);
    }
  };

  const getVoterVoteCount = (vote: Vote) => {
    const listToSearch = allVotes.length > 0 ? allVotes : votesHistory;
    if (!listToSearch || listToSearch.length === 0) return 1;
    
    const phone = vote.voterPhone;
    const id = vote.voterId;
    
    if (phone && phone !== 'Não informado' && phone !== 'N/A') {
      return listToSearch.filter(v => v.voterPhone === phone).length;
    }
    if (id) {
      return listToSearch.filter(v => v.voterId === id).length;
    }
    return 1;
  };

  const handlePrintPDF = () => {
    window.print();
  };

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigMsg(null);

    try {
      await onUpdateConfig({
        votingQuestion: votingQuestion.trim(),
        logoAzuup,
        logoCampinense,
        logoPrincipal,
        startDate,
        endDate,
        votingEnabled,
        primaryColor,
        bannerUrl,
        sponsorName,
        sponsorPrize,
        sponsorLogoUrl
      });
      setConfigMsg({ type: 'success', text: 'Configurações da votação salvas com sucesso!' });
      setTimeout(() => setConfigMsg(null), 4000);
    } catch (err) {
      console.error(err);
      setConfigMsg({ type: 'error', text: 'Erro ao salvar as configurações.' });
    } finally {
      setIsSavingConfig(false);
    }
  };

  const processTeamLogoFile = (file: File, teamId: 'azuup' | 'campinense' | 'principal' | 'sponsor') => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = teamId === 'principal' || teamId === 'sponsor' ? 400 : 200;
        const MAX_HEIGHT = teamId === 'principal' || teamId === 'sponsor' ? 150 : 200;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        const applyLogo = (val: string) => {
          if (teamId === 'azuup') setLogoAzuup(val);
          else if (teamId === 'campinense') setLogoCampinense(val);
          else if (teamId === 'principal') setLogoPrincipal(val);
          else if (teamId === 'sponsor') setSponsorLogoUrl(val);
        };

        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/png');
          applyLogo(dataUrl);
        } else {
          applyLogo(reader.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const processBannerFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 400;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
          setBannerUrl(dataUrl);
        } else {
          setBannerUrl(reader.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Convert File to Base64 String and compress/resize client-side to fit Firestore Limits
  const processImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }

        canvas.width = width;
        canvas.height = height;

        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImageUrl(dataUrl);
        } else {
          setImageUrl(reader.result as string);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Drag and Drop Handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processImageFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processImageFile(e.target.files[0]);
    }
  };

  // Handle Form submit
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !team.trim()) {
      setOperationMsg({ type: 'error', text: 'Nome e Time são campos obrigatórios!' });
      return;
    }

    setIsSubmitting(true);
    setOperationMsg(null);

    try {
      if (isEditing && editingPlayerId) {
        await updatePlayer(editingPlayerId, {
          name: name.trim(),
          team: team.trim(),
          position: position.trim(),
          imageUrl,
          imageFit,
          imagePosition,
          order
        });
        setOperationMsg({ type: 'success', text: 'Jogador atualizado com sucesso!' });
      } else {
        if (players.length >= 25) {
          alert("Por segurança, o limite é de 25 jogadores cadastrados.");
          setIsSubmitting(false);
          return;
        }
        await addPlayer(name.trim(), team.trim(), position.trim(), imageUrl, imageFit, imagePosition, order);
        setOperationMsg({ type: 'success', text: 'Jogador cadastrado com sucesso!' });
      }

      resetForm();
      onRefresh();
    } catch (err) {
      console.error(err);
      let errorMsg = 'Ocorreu um erro ao salvar o jogador.';
      setOperationMsg({ type: 'error', text: errorMsg });
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setTeam('');
    setPosition('');
    setImageUrl('');
    setImageFit('cover');
    setImagePosition('top');
    setOrder(0);
    setIsEditing(false);
    setEditingPlayerId(null);
  };

  const handleEditClick = (player: Player) => {
    setName(player.name);
    setTeam(player.team);
    setPosition(player.position || '');
    setImageUrl(player.imageUrl || '');
    setImageFit(player.imageFit || 'cover');
    setImagePosition(player.imagePosition || 'top');
    setOrder(player.order || 0);
    setIsEditing(true);
    setEditingPlayerId(player.id);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o jogador "${name}"? Todos os votos dele serão perdidos permanentemente.`)) {
      try {
        await deletePlayer(id);
        setOperationMsg({ type: 'success', text: 'Jogador excluído com sucesso!' });
        onRefresh();
        if (editingPlayerId === id) resetForm();
      } catch (err) {
        console.error(err);
        setOperationMsg({ type: 'error', text: 'Erro ao excluir o jogador.' });
      }
    }
  };

  const handleResetVotes = async () => {
    if (confirm("ATENÇÃO: Isso irá zerar TODOS os votos de forma irreversível!\nTem certeza que deseja continuar?")) {
      try {
        await resetAllVotes();
        setOperationMsg({ type: 'success', text: 'A votação foi zerada com sucesso!' });
        onRefresh();
      } catch (err) {
        console.error(err);
        setOperationMsg({ type: 'error', text: 'Erro ao zerar os votos.' });
      }
    }
  };

  const totalVotes = players.reduce((sum, p) => sum + p.votesCount, 0);
  
  // Data for chart
  const chartData = players.map(p => ({
    name: p.name,
    votos: p.votesCount,
    fill: p.team.toLowerCase().includes('campinense') ? '#facc15' : '#2563eb'
  })).sort((a, b) => b.votos - a.votos);

  // 2. Render Full Admin Panel View
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in" id="admin-panel-dashboard">
      <div className="flex justify-end mb-6 print:hidden">
        <button 
          onClick={() => window.open(window.location.origin + '?view=voting', '_blank')}
          className="bg-slate-900 hover:bg-slate-800 text-white font-bold py-2 px-6 rounded-xl flex items-center gap-2 shadow-sm transition-colors text-sm"
        >
          <span>Ver Preview da Votação</span>
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path><polyline points="15 3 21 3 21 9"></polyline><line x1="10" y1="14" x2="21" y2="3"></line></svg>
        </button>
      </div>

      {/* 
        =========================================================
        PERSONALIZED PDF PRINT REPORT VIEW (VISIBLE ONLY WHEN PRINTING)
        =========================================================
      */}
      <div className="hidden print:block font-sans text-black bg-white p-4">
        {/* Header decoration */}
        <div className="border-b-4 border-slate-900 pb-5 mb-6">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">
                Boletim Oficial de Apuração
              </h1>
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider mt-0.5">
                Votação Craque Prata da Casa • Campeonato Municipal 2026
              </p>
              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1">
                Município de Morro do Chapéu - BA
              </p>
            </div>
            {config?.logoPrincipal && (
              <img 
                src={config.logoPrincipal} 
                alt="Logo Principal" 
                className="max-h-12 max-w-[150px] object-contain"
                referrerPolicy="no-referrer"
              />
            )}
          </div>
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-3 gap-4 mb-6">
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Total de Votos</span>
            <span className="text-xl font-black text-slate-950 font-mono mt-0.5 block">{totalVotes}</span>
          </div>
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Atletas Cadastrados</span>
            <span className="text-xl font-black text-slate-950 font-mono mt-0.5 block">{players.length}</span>
          </div>
          <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50">
            <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Líder Atual / Vencedor</span>
            <span className="text-sm font-black text-slate-950 truncate mt-1.5 block">
              {players.length > 0 
                ? [...players].sort((a,b) => b.votesCount - a.votesCount)[0].name.toUpperCase() 
                : 'Nenhum'
              }
            </span>
          </div>
        </div>

        {/* Detailed Leaderboard table */}
        <div className="mb-6">
          <h2 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-2.5">
            Classificação Geral dos Atletas
          </h2>
          <table className="w-full text-left border-collapse border border-slate-300">
            <thead>
              <tr className="bg-slate-100 border-b border-slate-300 text-[10px] font-black uppercase text-slate-700">
                <th className="p-2 border-r border-slate-300 text-center w-12">Pos</th>
                <th className="p-2 border-r border-slate-300">Atleta</th>
                <th className="p-2 border-r border-slate-300">Equipe</th>
                <th className="p-2 border-r border-slate-300">Posição em Campo</th>
                <th className="p-2 border-r border-slate-300 text-center w-24">Votos</th>
                <th className="p-2 text-center w-20">Percentual</th>
              </tr>
            </thead>
            <tbody className="text-xs divide-y divide-slate-300">
              {players.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-4 text-center text-slate-400 font-bold">Nenhum jogador cadastrado.</td>
                </tr>
              ) : (
                [...players]
                  .sort((a, b) => b.votesCount - a.votesCount)
                  .map((player, idx) => {
                    const pct = totalVotes > 0 ? (player.votesCount / totalVotes) * 100 : 0;
                    return (
                      <tr key={player.id} className="hover:bg-slate-50">
                        <td className="p-2 border-r border-slate-300 text-center font-bold text-slate-600">{idx + 1}º</td>
                        <td className="p-2 border-r border-slate-300 font-extrabold text-slate-900">{player.name}</td>
                        <td className="p-2 border-r border-slate-300 font-bold text-slate-700 uppercase">{player.team}</td>
                        <td className="p-2 border-r border-slate-300 text-slate-600 font-semibold">{player.position || 'N/A'}</td>
                        <td className="p-2 border-r border-slate-300 text-center font-mono font-bold text-slate-950">{player.votesCount}</td>
                        <td className="p-2 text-center font-mono font-bold text-slate-950">{pct.toFixed(1)}%</td>
                      </tr>
                    );
                  })
              )}
            </tbody>
          </table>
        </div>



        {/* Footer print section */}
        <div className="flex justify-between items-center text-[9px] text-slate-400 font-bold uppercase mt-8 pt-4 border-t border-slate-200">
          <div>
            Emitido em: {new Date().toLocaleString('pt-BR')}
          </div>
          <div>
            Plataforma Oficial Craque da Galera • Morro do Chapéu 2026
          </div>
        </div>
      </div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 mb-8 print:hidden">
        <div>
          <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
            Controle do Campeonato
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">Gerencie os atletas, acompanhe a votação e configure os prazos.</p>
        </div>

        <div className="flex gap-3">
          <button
            onClick={handlePrintPDF}
            className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-4.5 py-2.5 rounded-2xl transition-all cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>Exportar PDF</span>
          </button>
        </div>
      </div>

      {/* Link Generator and Admin Info Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-[32px] p-6 md:p-8 shadow-xl mb-8 border border-slate-800 relative overflow-hidden print:hidden" id="admin-link-generator-banner">
        {/* Soccer field abstract graphic elements */}
        <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#ffffff_1px,transparent_1px),linear-gradient(to_bottom,#ffffff_1px,transparent_1px)] bg-[size:24px_24px]"></div>
        <div className="absolute right-0 bottom-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-xl">
            <span className="bg-emerald-500/20 text-emerald-300 text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border border-emerald-500/30">
              Gerador de Link Seguro
            </span>
            <h3 className="text-xl md:text-2xl font-black font-display mt-3 tracking-tight">
              Compartilhar Votação Prata da Casa
            </h3>
            <p className="text-slate-300 text-xs md:text-sm mt-2 leading-relaxed">
              Gere o link oficial de votação para compartilhar com os eleitores no WhatsApp e redes sociais. 
              <strong> Quando as pessoas acessarem, precisarão se identificar com o Google logo de cara</strong> para garantir a validade e a segurança de cada voto (máximo de 1 voto por pessoa).
            </p>
          </div>

          <div className="bg-slate-950/50 p-6 rounded-3xl border border-slate-800 w-full lg:max-w-md shrink-0 flex flex-col gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-2">
                Tipo do Link de Votação
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedPlayerLink('');
                    setGeneratedLink(window.location.origin + '?vote=true');
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    !selectedPlayerLink 
                      ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-extrabold shadow-sm' 
                      : 'bg-slate-900/40 text-slate-300 border-slate-800 hover:bg-slate-900/60'
                  }`}
                >
                  Link Geral
                </button>
                <select
                  value={selectedPlayerLink}
                  onChange={(e) => {
                    const val = e.target.value;
                    setSelectedPlayerLink(val);
                    if (val) {
                      setGeneratedLink(window.location.origin + `?p=${val}`);
                    } else {
                      setGeneratedLink(window.location.origin + '?vote=true');
                    }
                  }}
                  className={`flex-1 py-2 px-3 text-xs font-bold rounded-xl border transition-all bg-slate-900/40 text-slate-300 border-slate-800 focus:outline-hidden cursor-pointer ${
                    selectedPlayerLink ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-extrabold shadow-sm' : ''
                  }`}
                >
                  <option value="" className="text-slate-800 font-bold bg-white">Recomendar Jogador...</option>
                  {players.map(p => (
                    <option key={p.id} value={p.id} className="text-slate-800 font-bold bg-white">
                      {p.name} ({p.team})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Link Gerado
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  readOnly
                  value={generatedLink}
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 font-mono flex-grow focus:outline-hidden"
                />
                <button
                  type="button"
                  onClick={handleCopyGeneratedLink}
                  className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 transition-all shadow-sm shrink-0 cursor-pointer"
                >
                  {linkCopied ? (
                    <>
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 stroke-[2.5]" />
                      <span>Copiar</span>
                    </>
                  )}
                </button>
              </div>
            </div>
            
            <div className="pt-4 border-t border-slate-800 mt-2">
              <label className="block text-[10px] font-black uppercase tracking-wider text-amber-400 mb-2 flex items-center gap-1.5">
                <ImageIcon className="w-3.5 h-3.5" /> Gerador de Imagens (Alta Qualidade)
              </label>
              
              <div className="grid grid-cols-1 gap-2">
                {/* TV/OBS Format */}
                <button
                  type="button"
                  disabled={exportingFormat !== null}
                  onClick={async () => {
                    setExportingFormat('tv');
                    try {
                      await new Promise(r => setTimeout(r, 1000));
                      const node = document.getElementById('export-node-tv');
                      if (node) {
                        const originalTop = node.style.top;
                        const originalLeft = node.style.left;
                        
                        node.style.top = '0px';
                        node.style.left = '0px';
                        
                        const dataUrl = await htmlToImage.toJpeg(node, { pixelRatio: 2, width: 1920, height: 1080, quality: 1.0 });
                        
                        node.style.top = originalTop;
                        node.style.left = originalLeft;
                        
                        const link = document.createElement('a');
                        link.download = 'ranking-tv-16x9.jpg';
                        link.href = dataUrl;
                        link.click();
                      }
                    } catch (err) {
                      console.error('Failed to export TV image', err);
                      alert('Erro ao exportar a imagem. Tente novamente.');
                    } finally {
                      setExportingFormat(null);
                    }
                  }}
                  className={`text-white px-3 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm text-[11px] font-bold w-full flex items-center justify-center gap-2 ${exportingFormat === 'tv' ? 'bg-amber-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {exportingFormat === 'tv' ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando TV (16:9)...</>
                  ) : (
                    <><Monitor className="w-3.5 h-3.5" /> Baixar TV / OBS (1920x1080)</>
                  )}
                </button>

                {/* Feed Format */}
                <button
                  type="button"
                  disabled={exportingFormat !== null}
                  onClick={async () => {
                    setExportingFormat('feed');
                    try {
                      await new Promise(r => setTimeout(r, 1000));
                      const node = document.getElementById('export-node-feed');
                      if (node) {
                        const originalTop = node.style.top;
                        const originalLeft = node.style.left;
                        
                        node.style.top = '0px';
                        node.style.left = '0px';
                        
                        const dataUrl = await htmlToImage.toJpeg(node, { pixelRatio: 2, width: 1080, height: 1080, quality: 1.0 });
                        
                        node.style.top = originalTop;
                        node.style.left = originalLeft;
                        
                        const link = document.createElement('a');
                        link.download = 'ranking-feed-1x1.jpg';
                        link.href = dataUrl;
                        link.click();
                      }
                    } catch (err) {
                      console.error('Failed to export Feed image', err);
                      alert('Erro ao exportar a imagem. Tente novamente.');
                    } finally {
                      setExportingFormat(null);
                    }
                  }}
                  className={`text-white px-3 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm text-[11px] font-bold w-full flex items-center justify-center gap-2 ${exportingFormat === 'feed' ? 'bg-indigo-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {exportingFormat === 'feed' ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando Feed (1:1)...</>
                  ) : (
                    <><ImageIcon className="w-3.5 h-3.5" /> Baixar Instagram Feed (1080x1080)</>
                  )}
                </button>

                {/* Story Format */}
                <button
                  type="button"
                  disabled={exportingFormat !== null}
                  onClick={async () => {
                    setExportingFormat('story');
                    try {
                      await new Promise(r => setTimeout(r, 1000));
                      const node = document.getElementById('export-node-story');
                      if (node) {
                        const originalTop = node.style.top;
                        const originalLeft = node.style.left;
                        
                        node.style.top = '0px';
                        node.style.left = '0px';
                        
                        const dataUrl = await htmlToImage.toJpeg(node, { pixelRatio: 2, width: 1080, height: 1920, quality: 1.0 });
                        
                        node.style.top = originalTop;
                        node.style.left = originalLeft;
                        
                        const link = document.createElement('a');
                        link.download = 'ranking-story-9x16.jpg';
                        link.href = dataUrl;
                        link.click();
                      }
                    } catch (err) {
                      console.error('Failed to export Story image', err);
                      alert('Erro ao exportar a imagem. Tente novamente.');
                    } finally {
                      setExportingFormat(null);
                    }
                  }}
                  className={`text-white px-3 py-2.5 rounded-xl transition-colors cursor-pointer shadow-sm text-[11px] font-bold w-full flex items-center justify-center gap-2 ${exportingFormat === 'story' ? 'bg-pink-600 cursor-not-allowed' : 'bg-slate-800 hover:bg-slate-700'}`}
                >
                  {exportingFormat === 'story' ? (
                    <><RefreshCw className="w-3.5 h-3.5 animate-spin" /> Gerando Story (9:16)...</>
                  ) : (
                    <><ImageIcon className="w-3.5 h-3.5" /> Baixar Story / Reels (1080x1920)</>
                  )}
                </button>
              </div>

              <p className="text-[10px] text-slate-400 text-left mt-2 leading-relaxed">
                Gere imagens prontas para suas redes sociais. Os layouts se ajustam automaticamente ao formato escolhido.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Analytics Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8 print:hidden" id="admin-analytics-grid">
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-emerald-500" />
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total de Jogadores</div>
          <div className="text-3xl font-black text-slate-900 mt-2 font-display">{players.length}</div>
          <p className="text-xs text-slate-500 mt-1">Jogadores cadastrados e ativos para votação.</p>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs relative overflow-hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-blue-500" />
          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Votos Computados</div>
          <div className="text-3xl font-black text-emerald-600 mt-2 font-display">{totalVotes}</div>
          <p className="text-xs text-slate-500 mt-1">Total acumulado de votos recebidos.</p>
        </div>

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex flex-col justify-between relative overflow-hidden print:hidden">
          <div className="absolute top-0 left-0 w-1.5 h-full bg-rose-500" />
          <div>
            <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Ações Rápidas</div>
            <div className="text-sm font-bold text-slate-700 mt-2">Zerar banco de dados</div>
          </div>
          <button
            id="reset-votes-btn"
            onClick={handleResetVotes}
            className="flex items-center justify-center gap-1.5 text-xs font-black uppercase tracking-wider text-rose-600 hover:text-white bg-rose-50 hover:bg-rose-600 border border-rose-100 hover:border-rose-600 px-4 py-2.5 rounded-2xl transition-all mt-3 cursor-pointer w-full text-center"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Zerar Todos os Votos</span>
          </button>
        </div>
      </div>

      {/* Chart Section */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs mb-8 print:hidden">
        <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-6">
          Desempenho da Votação
        </h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Interactive Recharts Column */}
          <div className="lg:col-span-7">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Gráfico Interativo</span>
            <div className="h-72 w-full">
              {chartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-gray-400 text-sm">Nenhum dado de votos cadastrado ainda.</div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 40 }}>
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 11, fill: '#64748b', fontWeight: 'bold' }} />
                    <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#64748b' }} />
                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px', fontWeight: 'bold' }} />
                    <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Custom Progressive HTML List Column */}
          <div className="lg:col-span-5 border-l border-gray-100 lg:pl-8 flex flex-col justify-center">
            <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-4">Classificação e Percentual</span>
            <div className="space-y-4 max-h-[280px] overflow-y-auto pr-2 custom-scrollbar">
              {players.length === 0 ? (
                <p className="text-gray-400 text-xs py-4 text-center">Nenhum jogador cadastrado ainda.</p>
              ) : (
                players
                  .slice()
                  .sort((a, b) => b.votesCount - a.votesCount)
                  .map((player, index) => {
                    const pct = totalVotes > 0 ? (player.votesCount / totalVotes) * 100 : 0;
                    const isCampinense = player.team.toLowerCase().includes('campinense');
                    const barColor = isCampinense ? 'bg-amber-500' : 'bg-blue-600';
                    const badgeBg = isCampinense ? 'bg-amber-50 text-amber-800' : 'bg-blue-50 text-blue-800';
                    
                    return (
                      <div key={player.id} className="text-xs">
                        <div className="flex justify-between items-center mb-1 font-semibold">
                          <div className="flex items-center gap-1.5 truncate">
                            <span className="font-bold text-gray-400 w-4">{index + 1}º</span>
                            <span className="font-extrabold text-gray-800 truncate">{player.name}</span>
                            <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full shrink-0 ${badgeBg}`}>
                              {player.team.toUpperCase()}
                            </span>
                          </div>
                          <div className="font-mono font-bold text-gray-900 shrink-0 ml-2">
                            {player.votesCount} <span className="text-gray-400 font-medium text-[10px]">({pct.toFixed(1)}%)</span>
                          </div>
                        </div>
                        <div className="w-full bg-gray-100 h-2.5 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${barColor} transition-all duration-1000`} 
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    );
                  })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs mb-8">
        <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
          Últimos Votos Registrados
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">
                <th className="py-2">Data/Hora</th>
                <th className="py-2">Eleitor (Google Auth & Identificadores)</th>
                <th className="py-2">Jogador Votado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {votesHistory.length === 0 ? (
                <tr><td colSpan={3} className="text-center py-4 text-gray-400">Nenhum voto registrado ainda.</td></tr>
              ) : (
                votesHistory.map((vote, idx) => {
                  const player = players.find(p => p.id === vote.playerId);
                  return (
                    <tr key={idx} className="hover:bg-gray-50/50">
                      <td className="py-3 text-xs text-gray-500 font-mono">
                        {new Date(vote.timestamp).toLocaleString('pt-BR')}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-800">{vote.voterName || 'Anônimo'}</span>
                          <span className="text-[10px] text-gray-500">{vote.voterEmail || 'Sem email'} {vote.voterPhone && `• ${vote.voterPhone}`}</span>
                          <span className="text-[9px] text-gray-400 mt-0.5 truncate max-w-[200px]" title={vote.userAgent || ''}>{vote.ipAddress || 'IP N/A'} • {vote.userAgent?.split(' ')[0] || 'Browser N/A'}</span>
                          {getVoterVoteCount(vote) > 1 ? (
                            <span className="inline-flex items-center gap-1 text-[10px] text-amber-600 font-extrabold mt-0.5">
                              ⚠️ Votou {getVoterVoteCount(vote)}x no total
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[9px] text-slate-400 font-bold mt-0.5">
                              ✓ 1º voto
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-bold text-emerald-700">{player?.name || 'Desconhecido'}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 print:hidden">
        {/* Form Column - Left (or Top) */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              {isEditing ? 'Editar Cadastro do Jogador' : 'Cadastrar Novo Jogador'}
            </h3>

            {operationMsg && (
              <div className={`text-xs font-semibold p-3 rounded-xl border mb-4 ${
                operationMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                  : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {operationMsg.text}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Quick Preset Autocomplete / Click selection */}
              {!isEditing && (
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 mb-4">
                  <span className="block text-[10px] font-extrabold text-slate-400 uppercase tracking-widest mb-2.5">
                    ⚡ Clique para auto-preencher jogador:
                  </span>
                  <div className="space-y-2">
                    <div>
                      <span className="text-[9px] font-black text-blue-600 block mb-1">AZUUP:</span>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_PLAYERS.filter(p => p.team === 'Azuup').map(p => {
                          const isAlreadyAdded = players.some(pl => pl.name.toLowerCase() === p.name.toLowerCase());
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setName(p.name);
                                setTeam(p.team);
                                setPosition(p.position);
                              }}
                              className={`text-[11px] font-bold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                                isAlreadyAdded 
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 line-through opacity-70' 
                                  : 'bg-white hover:bg-blue-50 text-slate-700 hover:text-blue-700 border-slate-200 hover:border-blue-300'
                              }`}
                              title={isAlreadyAdded ? "Jogador já cadastrado" : "Clique para auto-preencher"}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black text-amber-600 block mb-1">CAMPINENSE:</span>
                      <div className="flex flex-wrap gap-1">
                        {PRESET_PLAYERS.filter(p => p.team === 'Campinense').map(p => {
                          const isAlreadyAdded = players.some(pl => pl.name.toLowerCase() === p.name.toLowerCase());
                          return (
                            <button
                              key={p.name}
                              type="button"
                              onClick={() => {
                                setName(p.name);
                                setTeam(p.team);
                                setPosition(p.position);
                              }}
                              className={`text-[11px] font-bold px-2 py-1 rounded-md border transition-all cursor-pointer ${
                                isAlreadyAdded 
                                  ? 'bg-slate-100 border-slate-200 text-slate-400 line-through opacity-70' 
                                  : 'bg-white hover:bg-amber-50 text-slate-700 hover:text-amber-700 border-slate-200 hover:border-amber-300'
                              }`}
                              title={isAlreadyAdded ? "Jogador já cadastrado" : "Clique para auto-preencher"}
                            >
                              {p.name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Atleta *</label>
                <input
                  id="form-player-name"
                  type="text"
                  placeholder="Ex: Jefinho"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Time do Jogador *</label>
                <input
                  id="form-player-team"
                  type="text"
                  placeholder="Ex: Azuup ou Campinense"
                  value={team}
                  onChange={(e) => setTeam(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Posição (Opcional)</label>
                <input
                  id="form-player-position"
                  type="text"
                  placeholder="Ex: Atacante, Goleiro"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Foto do Jogador</label>
                
                <div
                  id="image-drop-zone"
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center ${
                    isDragging 
                      ? 'border-emerald-500 bg-emerald-50/50' 
                      : 'border-gray-200 hover:border-emerald-400 hover:bg-gray-50/30'
                  }`}
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept="image/*"
                    className="hidden"
                  />
                  
                  {imageUrl ? (
                    <div className="relative group w-20 h-20 rounded-full overflow-hidden border border-gray-200">
                      <img src={imageUrl} alt="Preview" className="w-full h-full object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold">
                        Trocar Foto
                      </div>
                    </div>
                  ) : (
                    <>
                      <Upload className="w-6 h-6 text-gray-400 mb-1" />
                      <span className="text-xs font-bold text-gray-700">Arraste a foto ou clique</span>
                    </>
                  )}
                </div>

                <div className="relative flex py-3 items-center">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ou colar link</span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>

                <input
                  id="form-player-image-url"
                  type="url"
                  placeholder="Ex: https://link.com/foto.jpg"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ajuste da Foto</label>
                  <select 
                    value={imageFit} 
                    onChange={(e) => setImageFit(e.target.value as 'cover'|'contain')}
                    className="w-full px-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                  >
                    <option value="cover">Preencher (Cover)</option>
                    <option value="contain">Enquadrar (Contain)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Posição da Foto</label>
                  <select 
                    value={imagePosition} 
                    onChange={(e) => setImagePosition(e.target.value as 'top'|'center'|'bottom')}
                    className="w-full px-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                  >
                    <option value="top">Topo (Rosto)</option>
                    <option value="center">Centro</option>
                    <option value="bottom">Base</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Ordem Manual (Opcional)</label>
                <input
                  type="number"
                  placeholder="Ex: 1"
                  value={order || ''}
                  onChange={(e) => setOrder(parseInt(e.target.value) || 0)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                />
                <span className="text-[9px] text-gray-400 mt-1 block">Se não preenchido (0), o sistema alternará jogadores de cada time.</span>
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="form-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-grow py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Jogador' : 'Adicionar'}
                </button>

                {isEditing && (
                  <button
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-sm cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>
          
          {/* Settings omitted for brevity in snippet but preserving full edit file size means I should include it... */}
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Configurações Gerais da Votação
            </h3>

            {configMsg && (
              <div className={`text-xs font-semibold p-3 rounded-xl border mb-4 ${
                configMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-100' : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {configMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Pergunta de Votação
                </label>
                <textarea
                  rows={3}
                  value={votingQuestion}
                  onChange={(e) => setVotingQuestion(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800 resize-none"
                  required
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="flex flex-col items-center">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Principal</label>
                  <div 
                    onClick={() => logoPrincipalRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-gray-50 overflow-hidden"
                  >
                    {logoPrincipal ? <img src={logoPrincipal} className="h-full object-contain p-2" /> : <span className="text-xs text-gray-400 font-bold px-2 text-center">Clique para Mudar</span>}
                  </div>
                  {logoPrincipal && (
                    <button type="button" onClick={() => setLogoPrincipal('')} className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider">
                      Remover
                    </button>
                  )}
                  <input type="file" ref={logoPrincipalRef} className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) processTeamLogoFile(e.target.files[0], 'principal');
                  }} />
                </div>

                <div className="flex flex-col items-center">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Azuup</label>
                  <div 
                    onClick={() => logoAzuupRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 overflow-hidden"
                  >
                    {logoAzuup ? <img src={logoAzuup} className="h-full object-contain p-2" /> : <span className="text-xs text-gray-400 font-bold px-2 text-center">Clique para Mudar</span>}
                  </div>
                  {logoAzuup && (
                    <button type="button" onClick={() => setLogoAzuup('')} className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider">
                      Remover
                    </button>
                  )}
                  <input type="file" ref={logoAzuupRef} className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) processTeamLogoFile(e.target.files[0], 'azuup');
                  }} />
                </div>

                <div className="flex flex-col items-center">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Campinense</label>
                  <div 
                    onClick={() => logoCampinenseRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 overflow-hidden"
                  >
                    {logoCampinense ? <img src={logoCampinense} className="h-full object-contain p-2" /> : <span className="text-xs text-gray-400 font-bold px-2 text-center">Clique para Mudar</span>}
                  </div>
                  {logoCampinense && (
                    <button type="button" onClick={() => setLogoCampinense('')} className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider">
                      Remover
                    </button>
                  )}
                  <input type="file" ref={logoCampinenseRef} className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) processTeamLogoFile(e.target.files[0], 'campinense');
                  }} />
                </div>
                
                <div className="flex flex-col items-center">
                  <label className="block text-xs font-bold text-amber-500 uppercase tracking-wider mb-2">Logo Patrocinador</label>
                  <div 
                    onClick={() => sponsorLogoRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-amber-400 hover:bg-amber-50 overflow-hidden"
                  >
                    {sponsorLogoUrl ? <img src={sponsorLogoUrl} className="h-full object-contain p-2" /> : <span className="text-xs text-gray-400 font-bold px-2 text-center">Clique para Mudar</span>}
                  </div>
                  {sponsorLogoUrl && (
                    <button type="button" onClick={() => setSponsorLogoUrl('')} className="mt-2 text-[10px] font-bold text-red-500 hover:text-red-700 uppercase tracking-wider">
                      Remover
                    </button>
                  )}
                  <input type="file" ref={sponsorLogoRef} className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) processTeamLogoFile(e.target.files[0], 'sponsor');
                  }} />
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Nome do Patrocinador
                  </label>
                  <input
                    type="text"
                    value={sponsorName}
                    onChange={(e) => setSponsorName(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-amber-500 focus:outline-hidden text-gray-800"
                    placeholder="Ex: Lourival Junior"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Prêmio do Patrocinador
                  </label>
                  <input
                    type="text"
                    value={sponsorPrize}
                    onChange={(e) => setSponsorPrize(e.target.value)}
                    className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-amber-500 focus:outline-hidden text-gray-800"
                    placeholder="Ex: R$ 500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Início da Votação</label>
                  <input type="datetime-local" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200" />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Término da Votação</label>
                  <input type="datetime-local" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Banner da Página de Votação (Upload ou URL)</label>
                <div className="flex gap-2">
                  <div 
                    onClick={() => bannerRef.current?.click()}
                    className="flex-1 h-10 border border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-gray-50 overflow-hidden text-xs font-bold text-gray-500 text-center"
                  >
                    {bannerUrl ? "✓ Banner Carregado" : "Upload Imagem"}
                  </div>
                  {bannerUrl && (
                    <button 
                      type="button"
                      onClick={() => setBannerUrl('')} 
                      className="h-10 px-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 text-xs font-bold transition-colors"
                      title="Remover Banner"
                    >
                      Remover
                    </button>
                  )}
                  <input type="file" ref={bannerRef} className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) processBannerFile(e.target.files[0]);
                  }} />
                  <input 
                    type="text" 
                    placeholder="Ou link da imagem do banner..." 
                    value={bannerUrl.startsWith('data:') ? '' : bannerUrl} 
                    onChange={(e) => setBannerUrl(e.target.value)} 
                    className="flex-[2] px-3 py-2 text-xs rounded-xl border border-gray-200 text-gray-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Cor de Destaque do Tema</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    className="w-8 h-8 rounded-lg cursor-pointer p-0 border border-gray-200"
                  />
                  <input 
                    type="text" 
                    value={primaryColor} 
                    onChange={(e) => setPrimaryColor(e.target.value)} 
                    placeholder="#2563eb"
                    className="w-24 px-3 py-1.5 text-xs rounded-xl border border-gray-200 text-gray-800 font-mono"
                  />
                  <div className="flex gap-1">
                    {['#2563eb', '#10b981', '#dc2626', '#d97706', '#0f172a', '#4f46e5'].map((color) => (
                      <button 
                        key={color} 
                        type="button" 
                        onClick={() => setPrimaryColor(color)} 
                        className="w-4 h-4 rounded-full border border-gray-200 hover:scale-110 transition-transform" 
                        style={{ backgroundColor: color }} 
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">Status de Execução da Votação</label>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setVotingEnabled(!votingEnabled)} className={`relative inline-flex h-6 w-11 rounded-full ${votingEnabled ? 'bg-emerald-600' : 'bg-gray-300'}`}>
                    <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition duration-200 ${votingEnabled ? 'translate-x-5' : 'translate-x-0'}`} />
                  </button>
                  <span className="text-sm font-semibold text-gray-700">{votingEnabled ? 'Votação Ativada' : 'Votação Suspensa'}</span>
                </div>
              </div>

              <button type="submit" disabled={isSavingConfig} className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-sm transition-colors mt-2 cursor-pointer">
                {isSavingConfig ? 'Salvando...' : 'Salvar Configurações'}
              </button>
            </form>
          </div>
        </div>

        {/* Players List Table */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Jogadores Cadastrados ({players.length})
            </h3>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-gray-100 text-[10px] font-bold text-gray-400 uppercase tracking-wider pb-2">
                    <th className="py-2">Jogador</th>
                    <th className="py-2">Time</th>
                    <th className="py-2 text-center">Votos</th>
                    <th className="py-2 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 text-sm">
                  {sortedPlayers.map((player, index) => (
                    <tr 
                      key={player.id}
                      className="transition-colors hover:bg-gray-50/50"
                    >
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex flex-col gap-1 items-center justify-center shrink-0 w-6">
                            <button 
                              type="button" 
                              onClick={() => handleMoveUp(index)} 
                              disabled={index === 0}
                              className={`p-0.5 rounded cursor-pointer ${index === 0 ? 'text-gray-200' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleMoveDown(index)} 
                              disabled={index === sortedPlayers.length - 1}
                              className={`p-0.5 rounded cursor-pointer ${index === sortedPlayers.length - 1 ? 'text-gray-200' : 'text-gray-400 hover:text-emerald-600 hover:bg-emerald-50'}`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </button>
                          </div>
                          <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                            {player.imageUrl ? <img src={player.imageUrl} className="w-full h-full object-cover" /> : <span className="text-xs text-emerald-700 font-bold">{player.name.slice(0, 2).toUpperCase()}</span>}
                          </div>
                          <div>
                            <div className="font-bold text-gray-900">{player.name}</div>
                            {player.position && <div className="text-[10px] text-emerald-700 font-semibold uppercase">{player.position}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 font-semibold text-gray-600 uppercase text-xs">{player.team}</td>
                      <td className="py-3 text-center">
                        <span className="inline-flex px-2.5 py-1 text-xs font-black bg-emerald-50 text-emerald-800 rounded-full">{player.votesCount}</span>
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button onClick={() => handleEditClick(player)} className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg cursor-pointer"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={() => handleDeleteClick(player.id, player.name)} className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Export Nodes for high-quality Images */}
      <ExportNodeTV config={config} totalVotes={totalVotes} players={players} />
      <ExportNodeFeed config={config} totalVotes={totalVotes} players={players} />
      <ExportNodeStory config={config} totalVotes={totalVotes} players={players} />
    </div>
  );
}
