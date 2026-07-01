import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, Edit2, Trash2, KeyRound, LogOut, RefreshCw, 
  Upload, Shield, FileImage, ClipboardList, Info, HelpCircle, Eye, Download,
  Link, Copy, Check
} from 'lucide-react';
import { Player, SystemConfig, Vote } from '../types';
import { addPlayer, updatePlayer, deletePlayer, resetAllVotes, getVotesHistory } from '../dbService';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

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
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [votesHistory, setVotesHistory] = useState<Vote[]>([]);

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

  useEffect(() => {
    if (config) {
      setVotingQuestion(config.votingQuestion || '');
      setLogoAzuup(config.logoAzuup || '');
      setLogoCampinense(config.logoCampinense || '');
      setLogoPrincipal(config.logoPrincipal || '');
      setStartDate(config.startDate || '');
      setEndDate(config.endDate || '');
      setVotingEnabled(config.votingEnabled !== false);
    }
  }, [config]);

  useEffect(() => {
    loadVotesHistory();
  }, [players]);

  const loadVotesHistory = async () => {
    try {
      const history = await getVotesHistory(50);
      setVotesHistory(history);
    } catch (e) {
      console.error(e);
    }
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
        votingEnabled
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
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-8" id="admin-analytics-grid">
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
      <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs mb-8">
        <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-6">
          Desempenho da Votação
        </h3>
        <div className="h-80 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 50 }}>
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={60} tick={{ fontSize: 12, fill: '#64748b' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 12, fill: '#64748b' }} />
              <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '12px', border: '1px solid #e2e8f0', fontWeight: 'bold' }} />
              <Bar dataKey="votos" radius={[6, 6, 0, 0]}>
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.fill} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
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
                      <td className="py-3 font-semibold text-gray-800">{vote.voterName || 'Anônimo'}</td>
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
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Nome do Jogador *</label>
                <input
                  id="form-player-name"
                  type="text"
                  placeholder="Ex: João Silva"
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
