import React, { useState, useRef } from 'react';
import { 
  Plus, Edit2, Trash2, KeyRound, LogOut, RefreshCw, 
  Upload, Shield, FileImage, ClipboardList, Info, HelpCircle, Eye
} from 'lucide-react';
import { Player, SystemConfig } from '../types';
import { addPlayer, updatePlayer, deletePlayer, resetAllVotes } from '../dbService';

interface AdminPanelProps {
  players: Player[];
  onRefresh: () => void;
  config: SystemConfig | null;
  onUpdateConfig: (newConfig: SystemConfig) => Promise<void>;
}

export default function AdminPanel({ players, onRefresh, config, onUpdateConfig }: AdminPanelProps) {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('craque_admin_logged') === 'true';
  });
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

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
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [votingEnabled, setVotingEnabled] = useState(true);
  const [isSavingConfig, setIsSavingConfig] = useState(false);
  const [configMsg, setConfigMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const logoAzuupRef = useRef<HTMLInputElement>(null);
  const logoCampinenseRef = useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (config) {
      setVotingQuestion(config.votingQuestion || '');
      setLogoAzuup(config.logoAzuup || '');
      setLogoCampinense(config.logoCampinense || '');
      setStartDate(config.startDate || '');
      setEndDate(config.endDate || '');
      setVotingEnabled(config.votingEnabled !== false);
    }
  }, [config]);

  const handleSaveConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingConfig(true);
    setConfigMsg(null);

    try {
      await onUpdateConfig({
        votingQuestion: votingQuestion.trim(),
        logoAzuup,
        logoCampinense,
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

  const processTeamLogoFile = (file: File, teamId: 'azuup' | 'campinense') => {
    if (!file.type.startsWith('image/')) {
      alert('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 200;
        const MAX_HEIGHT = 200;
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
          const dataUrl = canvas.toDataURL('image/png');
          if (teamId === 'azuup') {
            setLogoAzuup(dataUrl);
          } else {
            setLogoCampinense(dataUrl);
          }
        } else {
          if (teamId === 'azuup') {
            setLogoAzuup(reader.result as string);
          } else {
            setLogoCampinense(reader.result as string);
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // Constants
  const DEFAULT_ADMIN_PASSWORD = 'morro2026'; // Simple password for local championship organizers

  // Authenticate Admin
  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === DEFAULT_ADMIN_PASSWORD) {
      setIsAuthenticated(true);
      setLoginError('');
      localStorage.setItem('craque_admin_logged', 'true');
    } else {
      setLoginError('Senha incorreta! Use a senha padrão indicada abaixo.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('craque_admin_logged');
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
        // Create canvas to resize image
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 450;
        const MAX_HEIGHT = 450;
        let width = img.width;
        let height = img.height;

        // Calculate proportional aspect ratio
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
          // Export as compressed JPEG to guarantee small size (usually < 30KB - 50KB)
          const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
          setImageUrl(dataUrl);
        } else {
          // Fallback if canvas context fails
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

  // Handle Form submit (Create or Update)
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
        // Prevent exceeding 10 players if strict local rule, but let's be flexible
        if (players.length >= 15) {
          alert("Por segurança do banco de dados gratuito, o limite é de 15 jogadores cadastrados.");
          setIsSubmitting(false);
          return;
        }
        await addPlayer(name.trim(), team.trim(), position.trim(), imageUrl);
        setOperationMsg({ type: 'success', text: 'Jogador cadastrado com sucesso!' });
      }

      // Reset form fields
      resetForm();
      onRefresh();
    } catch (err) {
      console.error(err);
      let errorMsg = 'Ocorreu um erro ao salvar o jogador.';
      if (err instanceof Error) {
        try {
          const parsed = JSON.parse(err.message);
          if (parsed && parsed.error) {
            errorMsg = `Erro no Firestore: ${parsed.error}`;
          } else {
            errorMsg = `Erro: ${err.message}`;
          }
        } catch {
          errorMsg = `Erro: ${err.message}`;
        }
      }
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

  // Prepare form for editing
  const handleEditClick = (player: Player) => {
    setName(player.name);
    setTeam(player.team);
    setPosition(player.position || '');
    setImageUrl(player.imageUrl || '');
    setIsEditing(true);
    setEditingPlayerId(player.id);
    
    // Scroll form into view
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle Player Delete
  const handleDeleteClick = async (id: string, name: string) => {
    if (confirm(`Tem certeza que deseja excluir o jogador "${name}"? Todos os votos dele serão perdidos permanentemente.`)) {
      try {
        await deletePlayer(id);
        setOperationMsg({ type: 'success', text: 'Jogador excluído com sucesso!' });
        onRefresh();
        if (editingPlayerId === id) {
          resetForm();
        }
      } catch (err) {
        console.error(err);
        setOperationMsg({ type: 'error', text: 'Erro ao excluir o jogador.' });
      }
    }
  };

  // Handle Reset All Votes
  const handleResetVotes = async () => {
    const confirmation = prompt(
      `ATENÇÃO: Isso irá zerar TODOS os votos de todos os jogadores de forma irreversível!\nDigite "ZERAR" para confirmar:`
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

  // 1. Render Login Screen
  if (!isAuthenticated) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 flex flex-col justify-center min-h-[60vh] animate-fade-in" id="admin-login-screen">
        <div className="bg-white rounded-3xl border border-slate-150 p-8 md:p-10 shadow-xl shadow-slate-200/40 relative">
          <div className="text-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl flex items-center justify-center mx-auto mb-4 text-white shadow-md shadow-emerald-500/20">
              <KeyRound className="w-7 h-7 stroke-[2]" />
            </div>
            <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight">Painel de Controle</h2>
            <p className="text-xs font-semibold text-slate-500 mt-2">Acesso restrito para os administradores de Morro do Chapéu.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-5">
            <div>
              <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Senha de Acesso</label>
              <input
                id="admin-password-input"
                type="password"
                placeholder="Insira a senha de acesso"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4.5 py-3 rounded-2xl border border-slate-200 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 focus:outline-hidden text-sm text-slate-800 font-mono transition-all placeholder:text-slate-400"
                required
              />
            </div>

            {loginError && (
              <div className="text-xs font-bold text-rose-600 bg-rose-50 p-3.5 rounded-2xl border border-rose-100 animate-fade-in">
                {loginError}
              </div>
            )}

            <button
              id="admin-login-submit"
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-sm tracking-wide shadow-md shadow-emerald-500/15 hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 cursor-pointer"
            >
              Entrar no Painel
            </button>
          </form>

          {/* Secure Instruction Label to help user test immediately */}
          <div className="mt-8 border-t border-slate-100 pt-6 text-center">
            <span className="inline-flex items-center gap-1.5 text-[10px] font-extrabold text-amber-800 bg-amber-50 px-4 py-2 rounded-full border border-amber-200/60 shadow-xs">
              <Info className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <span>Senha de Acesso: <strong className="font-mono text-xs">{DEFAULT_ADMIN_PASSWORD}</strong></span>
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Render Full Admin Panel View
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-fade-in" id="admin-panel-dashboard">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-6 mb-8">
        <div>
          <h2 className="text-2xl font-display font-black text-slate-900 tracking-tight flex items-center gap-2">
            Controle do Campeonato
          </h2>
          <p className="text-xs font-bold text-slate-500 mt-1">Gerencie os atletas, acompanhe a votação e configure os prazos.</p>
        </div>

        <button
          id="admin-logout-btn"
          onClick={handleLogout}
          className="flex items-center gap-1.5 text-xs font-black uppercase tracking-wider text-slate-500 hover:text-rose-600 hover:bg-rose-50 border border-slate-200 hover:border-rose-100 px-4.5 py-2.5 rounded-2xl transition-all cursor-pointer bg-white"
        >
          <LogOut className="w-4 h-4 stroke-[2.5]" />
          <span>Sair Administrativo</span>
        </button>
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

        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-xs flex flex-col justify-between relative overflow-hidden">
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

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
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
                  placeholder="Ex: Flamengo de Morro"
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
                  placeholder="Ex: Atacante, Goleiro, Meio-Campo"
                  value={position}
                  onChange={(e) => setPosition(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                />
              </div>

              {/* Advanced Drag-and-Drop / URL Image selector */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">Foto do Jogador</label>
                
                {/* Visual Drag and Drop container */}
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
                      <span className="text-xs font-bold text-gray-700">Arraste a foto ou clique para escolher</span>
                      <span className="text-[10px] text-gray-400 mt-1">Limite recomendado de 1.5 MB</span>
                    </>
                  )}
                </div>

                <div className="relative flex py-3 items-center">
                  <div className="flex-grow border-t border-gray-100"></div>
                  <span className="flex-shrink mx-3 text-[10px] font-bold text-gray-400 uppercase tracking-wider">Ou colar link da foto</span>
                  <div className="flex-grow border-t border-gray-100"></div>
                </div>

                <input
                  id="form-player-image-url"
                  type="url"
                  placeholder="Ex: https://link-da-foto.com/jogador.jpg"
                  value={imageUrl.startsWith('data:') ? '' : imageUrl}
                  onChange={(e) => setImageUrl(e.target.value)}
                  className="w-full px-4 py-2 text-xs rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                />
                {imageUrl.startsWith('data:') && (
                  <p className="text-[10px] text-emerald-600 font-medium mt-1">✓ Foto carregada do dispositivo</p>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  id="form-submit-btn"
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-grow py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-sm transition-colors cursor-pointer"
                >
                  {isSubmitting ? 'Salvando...' : isEditing ? 'Atualizar Jogador' : 'Adicionar Jogador'}
                </button>

                {isEditing && (
                  <button
                    id="form-cancel-btn"
                    type="button"
                    onClick={resetForm}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 text-gray-500 font-bold text-sm transition-colors cursor-pointer"
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </form>
          </div>

          {/* Voting Settings Card */}
          <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-xs">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Configurações Gerais da Votação
            </h3>

            {configMsg && (
              <div className={`text-xs font-semibold p-3 rounded-xl border mb-4 ${
                configMsg.type === 'success' 
                  ? 'bg-emerald-50 text-emerald-800 border-emerald-100' 
                  : 'bg-red-50 text-red-800 border-red-100'
              }`}>
                {configMsg.text}
              </div>
            )}

            <form onSubmit={handleSaveConfig} className="space-y-4">
              {/* Question */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                  Pergunta de Votação
                </label>
                <textarea
                  id="settings-question-input"
                  rows={3}
                  placeholder='Ex: Quem é o seu favorito para conquistar o título...'
                  value={votingQuestion}
                  onChange={(e) => setVotingQuestion(e.target.value)}
                  className="w-full px-4 py-2 text-sm rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800 resize-none"
                  required
                />
              </div>

              {/* Logos Uploaders Grid */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">
                  Logos / Escudos dos Times
                </label>
                
                <div className="grid grid-cols-2 gap-4">
                  {/* Team 1 Logo Uploader */}
                  <div className="border border-gray-200 rounded-xl p-3 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">AZUUP</span>
                    
                    <div 
                      onClick={() => logoAzuupRef.current?.click()}
                      className="w-14 h-14 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-colors overflow-hidden"
                    >
                      <input
                        type="file"
                        ref={logoAzuupRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) processTeamLogoFile(e.target.files[0], 'azuup');
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                      {logoAzuup ? (
                        <img src={logoAzuup} alt="Azuup Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <FileImage className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex gap-2.5 mt-2">
                      <button
                        type="button"
                        onClick={() => logoAzuupRef.current?.click()}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        {logoAzuup ? 'Alterar' : 'Enviar'}
                      </button>
                      {logoAzuup && (
                        <button
                          type="button"
                          onClick={() => setLogoAzuup('')}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Team 2 Logo Uploader */}
                  <div className="border border-gray-200 rounded-xl p-3 flex flex-col items-center text-center">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-2">CAMPINENSE</span>
                    
                    <div 
                      onClick={() => logoCampinenseRef.current?.click()}
                      className="w-14 h-14 bg-gray-50 border border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:bg-gray-100/50 transition-colors overflow-hidden"
                    >
                      <input
                        type="file"
                        ref={logoCampinenseRef}
                        onChange={(e) => {
                          if (e.target.files && e.target.files[0]) processTeamLogoFile(e.target.files[0], 'campinense');
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                      {logoCampinense ? (
                        <img src={logoCampinense} alt="Campinense Logo" className="w-full h-full object-contain p-1" />
                      ) : (
                        <FileImage className="w-5 h-5 text-gray-400" />
                      )}
                    </div>
                    
                    <div className="flex gap-2.5 mt-2">
                      <button
                        type="button"
                        onClick={() => logoCampinenseRef.current?.click()}
                        className="text-[10px] font-bold text-emerald-600 hover:text-emerald-700 cursor-pointer"
                      >
                        {logoCampinense ? 'Alterar' : 'Enviar'}
                      </button>
                      {logoCampinense && (
                        <button
                          type="button"
                          onClick={() => setLogoCampinense('')}
                          className="text-[10px] font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
                        >
                          Remover
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Voting Start and End Dates */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Início da Votação
                  </label>
                  <input
                    id="settings-start-date"
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1">
                    Término da Votação
                  </label>
                  <input
                    id="settings-end-date"
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-emerald-500 focus:outline-hidden text-gray-800"
                  />
                </div>
              </div>

              {/* Enabled / Disabled Toggle */}
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Status de Execução da Votação
                </label>
                <div className="flex items-center gap-3">
                  <button
                    id="toggle-voting-active"
                    type="button"
                    onClick={() => setVotingEnabled(!votingEnabled)}
                    className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-hidden ${
                      votingEnabled ? 'bg-emerald-600' : 'bg-gray-300'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                        votingEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                  <span className="text-sm font-semibold text-gray-700">
                    {votingEnabled ? 'Votação Ativada' : 'Votação Suspensa'}
                  </span>
                </div>
              </div>

              {/* Save Button */}
              <button
                id="save-settings-btn"
                type="submit"
                disabled={isSavingConfig}
                className="w-full py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-sm shadow-sm transition-colors mt-2 cursor-pointer"
              >
                {isSavingConfig ? 'Salvando Configurações...' : 'Salvar Configurações'}
              </button>
            </form>
          </div>
        </div>

        {/* Players List Table - Right (or Bottom) */}
        <div className="lg:col-span-7">
          <div className="bg-white border border-gray-100 rounded-2xl p-6 shadow-xs">
            <h3 className="text-base font-extrabold text-gray-900 border-b border-gray-100 pb-3 mb-4">
              Jogadores Cadastrados ({players.length})
            </h3>

            {players.length === 0 ? (
              <div className="text-center py-12 bg-gray-50/50 rounded-xl border border-dashed border-gray-100">
                <ClipboardList className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-gray-700">Nenhum jogador cadastrado</h4>
                <p className="text-xs text-gray-400 mt-1">Insira os dados no formulário ao lado para começar.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse" id="players-admin-table">
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
                      <tr key={player.id} className="hover:bg-gray-50/50 transition-colors" id={`admin-row-${player.id}`}>
                        <td className="py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full overflow-hidden shrink-0 border border-gray-100 bg-gray-50 flex items-center justify-center">
                              {player.imageUrl ? (
                                <img src={player.imageUrl} alt={player.name} className="w-full h-full object-cover" />
                              ) : (
                                <span className="font-extrabold text-xs text-emerald-700">
                                  {player.name.slice(0, 2).toUpperCase()}
                                </span>
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-gray-900">{player.name}</div>
                              {player.position && (
                                <div className="text-[10px] text-emerald-700 font-semibold uppercase">{player.position}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="py-3 font-semibold text-gray-600 uppercase text-xs">{player.team}</td>
                        <td className="py-3 text-center">
                          <span className="inline-flex items-center justify-center px-2.5 py-1 text-xs font-black bg-emerald-50 text-emerald-800 rounded-full">
                            {player.votesCount}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              id={`edit-player-${player.id}`}
                              onClick={() => handleEditClick(player)}
                              className="p-1.5 text-gray-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                              title="Editar jogador"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              id={`delete-player-${player.id}`}
                              onClick={() => handleDeleteClick(player.id, player.name)}
                              className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                              title="Excluir jogador"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
