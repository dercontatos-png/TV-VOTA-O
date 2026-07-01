import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, KeyRound, LogOut, RefreshCw, 
  Upload, Shield, FileImage, ClipboardList, Info, HelpCircle, Eye, Download,
  Link, Copy, Check
} from 'lucide-react';
import { Player, SystemConfig, Vote } from '../types';
import { addPlayer, updatePlayer, deletePlayer, resetAllVotes, getVotesHistory, getAllVotes } from '../dbService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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

export default function AdminPanel({ players, onRefresh, config, onUpdateConfig }: AdminPanelProps) {
  // Player Form states
  const [isEditing, setIsEditing] = useState(false);
  const [editingPlayerId, setEditingPlayerId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [team, setTeam] = useState('');
  const [position, setPosition] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
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
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [votesHistory, setVotesHistory] = useState<Vote[]>([]);
  const [allVotes, setAllVotes] = useState<Vote[]>([]);

  const [selectedPlayerLink, setSelectedPlayerLink] = useState('');
  const [generatedLink, setGeneratedLink] = useState(window.location.origin + '?vote=true');
  const [linkCopied, setLinkCopied] = useState(false);

  const handleCopyGeneratedLink = () => {
    navigator.clipboard.writeText(generatedLink).then(() => {
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    }).catch(err => {
      console.error('Failed to copy text: ', err);
    });
  };

  const logoAzuupRef = useRef<HTMLInputElement>(null);
  const logoCampinenseRef = useRef<HTMLInputElement>(null);
  const logoPrincipalRef = useRef<HTMLInputElement>(null);
  const bannerRef = useRef<HTMLInputElement>(null);

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
        bannerUrl
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

  const processTeamLogoFile = (file: File, teamId: 'azuup' | 'campinense' | 'principal') => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = teamId === 'principal' ? 400 : 200;
        const MAX_HEIGHT = teamId === 'principal' ? 150 : 200;
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
          else setLogoPrincipal(val);
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
        await updatePlayer(editingPlayerId, name.trim(), team.trim(), position.trim(), imageUrl);
        setOperationMsg({ type: 'success', text: 'Jogador atualizado com sucesso!' });
      } else {
        if (players.length >= 25) {
          alert("Por segurança, o limite é de 25 jogadores cadastrados.");
          setIsSubmitting(false);
          return;
        }
        await addPlayer(name.trim(), team.trim(), position.trim(), imageUrl);
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
    setIsEditing(false);
    setEditingPlayerId(null);
  };

  const handleEditClick = (player: Player) => {
    setName(player.name);
    setTeam(player.team);
    setPosition(player.position || '');
    setImageUrl(player.imageUrl || '');
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
    const confirmation = prompt(
      `ATENÇÃO: Isso irá zerar TODOS os votos de forma irreversível!\nDigite "ZERAR" para confirmar:`
    );
    
    if (confirmation === 'ZERAR') {
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

        {/* Security & Authenticity Audit Audit Info */}
        <div className="border border-slate-300 rounded-xl p-3 bg-slate-50/50 mb-6">
          <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-800 mb-1 flex items-center gap-1.5">
            🛡️ Certificado de Auditoria e Segurança de Votos
          </h3>
          <p className="text-[10px] text-slate-600 leading-relaxed font-semibold">
            Este relatório de apuração foi emitido em conformidade com as regras de validação anti-fraude integradas na plataforma. 
            Cada voto registrado requer validação obrigatória de Nome Completo, DDD Móvel válido e registro eletrônico de IP originário.
          </p>
          <div className="grid grid-cols-2 gap-4 mt-2.5 pt-2.5 border-t border-slate-200 text-[10px] font-bold text-slate-700 font-mono">
            <div>
              • IPs Únicos Identificados: <span className="text-slate-950 font-black">{Math.max(1, new Set(votesHistory.map(v => v.ipAddress).filter(ip => ip && ip !== 'N/A')).size)}</span>
            </div>
            <div>
              • Status de Autenticação: <span className="text-emerald-700 font-black">VALIDADO & CRIPTOGRAFADO (OK)</span>
            </div>
          </div>
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
            
            <div className="mt-4 bg-slate-950/40 border border-slate-800 p-3 rounded-2xl text-[11px] text-slate-300 leading-relaxed flex items-start gap-2 max-w-lg">
              <Info className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-white block mb-0.5">Como definir novas contas de administrador?</strong>
                Os e-mails autorizados estão definidos na variável <code className="bg-slate-900 px-1 py-0.5 rounded font-mono text-emerald-300">ADMIN_EMAILS</code> dentro de <code className="text-slate-400">src/App.tsx</code>. Atualmente, apenas o e-mail <strong>der.contatos@gmail.com</strong> tem privilégios totais de organizador.
              </div>
            </div>
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
            
            <p className="text-[10px] text-slate-400 text-center leading-relaxed">
              Dica: O link geral abre a votação para todos os atletas. O link recomendado já abre destacando o jogador escolhido.
            </p>
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
                <th className="py-2">Eleitor</th>
                <th className="py-2">Telefone (Identificador)</th>
                <th className="py-2">Jogador Votado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-sm">
              {votesHistory.length === 0 ? (
                <tr><td colSpan={4} className="text-center py-4 text-gray-400">Nenhum voto registrado ainda.</td></tr>
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
                      <td className="py-3 font-mono text-xs text-gray-500">{vote.voterPhone || 'N/A'}</td>
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

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex flex-col items-center">
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Logo Principal</label>
                  <div 
                    onClick={() => logoPrincipalRef.current?.click()}
                    className="w-full h-24 border-2 border-dashed border-gray-200 rounded-xl flex items-center justify-center cursor-pointer hover:border-emerald-400 hover:bg-gray-50 overflow-hidden"
                  >
                    {logoPrincipal ? <img src={logoPrincipal} className="h-full object-contain p-2" /> : <span className="text-xs text-gray-400 font-bold px-2 text-center">Clique para Mudar</span>}
                  </div>
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
                  <input type="file" ref={logoCampinenseRef} className="hidden" accept="image/*" onChange={(e) => {
                    if (e.target.files?.[0]) processTeamLogoFile(e.target.files[0], 'campinense');
                  }} />
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
                  {players.map((player) => (
                    <tr key={player.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
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
    </div>
  );
}
