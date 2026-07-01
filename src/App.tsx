import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, UserCheck, ShieldAlert, X, ShieldCheck, Trophy, Smartphone, User } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import VotingPanel from './components/VotingPanel';
import AdminPanel from './components/AdminPanel';
import { Player, SystemConfig, VoterInfo } from './types';
import { getPlayers, castVote, hasVotedToday, getBahiaDateStr, getSystemConfig, updateSystemConfig } from './dbService';
import { auth, googleProvider } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';

// Helper to generate or fetch unique voter fingerprint
function getOrCreateVoterId(): string {
  let voterId = localStorage.getItem('craque_voter_id');
  if (!voterId) {
    voterId = 'voter_' + Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    localStorage.setItem('craque_voter_id', voterId);
  }
  return voterId;
}

// Defina aqui quais e-mails têm permissão de Administrador
const ADMIN_EMAILS = [
  'der.contatos@gmail.com'
];

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isSharedLink = urlParams.has('vote') || urlParams.has('player') || urlParams.has('p');

  const [view, setView] = useState<'voting' | 'admin'>(isSharedLink ? 'voting' : 'admin');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [votedPlayerName, setVotedPlayerName] = useState('');

  // Secure Admin Authentication State
  const [adminUser, setAdminUser] = useState<FirebaseUser | null>(null);
  const [checkingAdmin, setCheckingAdmin] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Voter State (Login do Eleitor)
  const [voterInfo, setVoterInfo] = useState<VoterInfo | null>(() => {
    const saved = localStorage.getItem('craque_voter_info');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        return null;
      }
    }
    return null;
  });

  // Reactive voterId computation based on identification
  const voterId = voterInfo 
    ? `voter_${voterInfo.id}`
    : getOrCreateVoterId();

  // Voter login with Name and Phone states
  const [loginMethod, setLoginMethod] = useState<'google' | 'phone'>('google');
  const [voterNameInput, setVoterNameInput] = useState('');
  const [voterPhoneInput, setVoterPhoneInput] = useState('');
  const [phoneError, setPhoneError] = useState<string | null>(null);

  // Voting restriction states
  const [votedToday, setVotedToday] = useState(false);
  const [votedPlayerId, setVotedPlayerId] = useState<string | undefined>(undefined);
  const [recommendedPlayerId, setRecommendedPlayerId] = useState<string | null>(null);

  // System Configuration state
  const [config, setConfig] = useState<SystemConfig | null>(null);

  // Parse sharing URL for recommended player
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const pId = params.get('player') || params.get('p');
    if (pId) {
      setRecommendedPlayerId(pId);
      setView('voting');
    }
  }, []);

  // Firebase Auth Observer to persist admin session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email && ADMIN_EMAILS.includes(user.email)) {
          setAdminUser(user);
          if (!isSharedLink) {
            setView('admin');
          }
        } else {
          setAdminUser(null);
          // Set voter info from Google Auth
          const vInfo: VoterInfo = {
            id: user.uid,
            name: user.displayName || 'Eleitor',
            email: user.email || ''
          };
          setVoterInfo(vInfo);
          localStorage.setItem('craque_voter_info', JSON.stringify(vInfo));
          
          if (isSharedLink) {
            setView('voting');
          }
        }
      } else {
        setAdminUser(null);
        // Do not clear voterInfo if they just haven't signed in today, but 
        // to be secure, if firebase says not logged in, we should clear it.
        setVoterInfo(null);
        localStorage.removeItem('craque_voter_info');
        if (isSharedLink) {
          setView('voting');
        } else {
          setView('admin');
        }
      }
      setCheckingAdmin(false);
    });
    return () => unsubscribe();
  }, [isSharedLink]);

  const formatPhoneNumber = (value: string) => {
    const num = value.replace(/\D/g, '');
    if (num.length <= 10) {
      return num.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').substring(0, 14);
    } else {
      return num.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').substring(0, 15);
    }
  };

  const handlePhoneLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setPhoneError(null);

    const trimmedName = voterNameInput.trim();
    const cleanPhone = voterPhoneInput.replace(/\D/g, '');

    if (trimmedName.length < 3) {
      setPhoneError('Por favor, informe seu nome completo (mínimo de 3 caracteres).');
      return;
    }

    if (cleanPhone.length < 10) {
      setPhoneError('Por favor, informe um número de WhatsApp/Telefone válido com DDD.');
      return;
    }

    // Save voter info deterministically
    const voterPhoneId = 'phone_' + cleanPhone;
    const vInfo: VoterInfo = {
      id: voterPhoneId,
      name: trimmedName,
      email: '',
      phone: voterPhoneInput
    };

    setVoterInfo(vInfo);
    localStorage.setItem('craque_voter_info', JSON.stringify(vInfo));
    
    // Smooth reset fields
    setVoterNameInput('');
    setVoterPhoneInput('');
    setPhoneError(null);
    
    // Redirect / confirm
    setView('voting');
  };

  // Generic Google Sign-In with popup trigger
  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email && ADMIN_EMAILS.includes(user.email)) {
        setAdminUser(user);
        setView('admin');
      } else {
        if (!isSharedLink && view === 'admin') {
          setAuthError('Acesso Negado. Este painel é exclusivo para o organizador.');
        } else {
          setView('voting');
        }
      }
    } catch (error: any) {
      console.error("Error signing in with Google:", error);
      if (error.code !== 'auth/popup-closed-by-user') {
        setAuthError("Não foi possível autenticar com o Google. Verifique se as permissões de pop-up estão ativas no navegador.");
      }
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setAdminUser(null);
      setVoterInfo(null);
      localStorage.removeItem('craque_voter_info');
      setView('voting');
    } catch (error) {
      console.error("Error signing out:", error);
    }
  };

  // Fetch all players and check if user has voted today
  const loadAppData = async () => {
    try {
      // 1. Fetch system config
      const fetchedConfig = await getSystemConfig();
      setConfig(fetchedConfig);

      // 2. Fetch players list
      const fetchedPlayers = await getPlayers();
      setPlayers(fetchedPlayers);

      // 3. Query Firestore if this voter already voted today
      const voteState = await hasVotedToday(voterId);
      setVotedToday(voteState.voted);
      setVotedPlayerId(voteState.playerVotedId);
    } catch (err) {
      console.error("Error loading application data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateConfig = async (newConfig: SystemConfig) => {
    await updateSystemConfig(newConfig);
    setConfig(newConfig);
  };

  useEffect(() => {
    loadAppData();
  }, [voterId]);

  // Cast vote for a player
  const handleVote = async (playerId: string) => {
    if (votedToday) return;
    setIsVoting(true);
    
    try {
      const selectedPlayer = players.find(p => p.id === playerId);
      const playerName = selectedPlayer ? selectedPlayer.name : 'seu jogador preferido';
      
      // Perform transactional vote casting
      await castVote(playerId, voterId, voterInfo || undefined);
      
      setVotedPlayerName(playerName);
      setVotedToday(true);
      setVotedPlayerId(playerId);
      setShowSuccessModal(true);
      setRecommendedPlayerId(null); // Clear recommended after successful vote
      
      // Reload updated lists to sync percentages in real-time
      const updatedPlayers = await getPlayers();
      setPlayers(updatedPlayers);
    } catch (err) {
      console.error("Failed to cast vote:", err);
      alert("Não foi possível registrar seu voto. Por favor, tente novamente em instantes.");
    } finally {
      setIsVoting(false);
    }
  };

  if (checkingAdmin) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (view === 'admin' && !adminUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-96 bg-gradient-to-b from-blue-900 to-slate-50 z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-blue-500/20 rounded-full blur-3xl z-0"></div>
        <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl z-0"></div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center">
          {/* Logo / Branding */}
          <div className="mb-8 flex items-center gap-3">
            <div className="w-12 h-12 bg-white rounded-xl shadow-md flex items-center justify-center">
              <Trophy className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h2 className="text-xl font-black text-white font-display tracking-tight leading-none">Prata da Casa</h2>
              <p className="text-blue-200 text-xs font-bold uppercase tracking-wider mt-1">Painel do Organizador</p>
            </div>
          </div>

          {authError && (
            <div className="mb-6 w-full p-4 bg-rose-50 border border-rose-200 text-rose-600 text-sm font-bold rounded-xl animate-fade-in text-center shadow-sm">
              {authError}
            </div>
          )}

          <div className="bg-white p-8 md:p-10 rounded-[32px] shadow-2xl w-full border border-slate-100 flex flex-col items-center animate-fade-in">
            <div className="w-16 h-16 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 mb-6 border border-blue-100">
              <UserCheck className="w-8 h-8 stroke-[2]" />
            </div>
            <h1 className="text-2xl font-black text-slate-900 mb-3 font-display text-center">Acesso Restrito</h1>
            <p className="text-slate-500 text-sm mb-8 text-center leading-relaxed">
              Faça login com a conta Google de administrador para gerenciar a votação, adicionar jogadores e gerar links de compartilhamento.
            </p>
            
            {voterInfo ? (
              <div className="w-full text-center">
                <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl mb-6 text-xs text-amber-800 font-semibold text-left flex flex-col gap-1 leading-relaxed animate-fade-in">
                  <span className="font-extrabold text-amber-950 text-sm">Olá, {voterInfo.name}!</span>
                  <span>Sua conta <strong>{voterInfo.email}</strong> não possui privilégios de administrador.</span>
                  <span className="mt-2 text-amber-950 font-bold block">Quer votar?</span>
                  <span className="text-amber-900 font-medium">Este endereço principal é de uso exclusivo dos organizadores. Para votar, utilize o <strong>link oficial de votação</strong> compartilhado por eles.</span>
                </div>
                <button
                  onClick={handleLogout}
                  className="w-full py-3.5 px-4 rounded-xl border-2 border-slate-200 hover:border-slate-300 hover:bg-slate-50 text-slate-700 font-bold transition-all cursor-pointer text-sm shadow-xs"
                >
                  Sair desta conta / Trocar conta
                </button>
              </div>
            ) : (
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold py-3.5 px-4 rounded-xl shadow-sm transition-all hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>Entrar com o Google</span>
              </button>
            )}
          </div>
          
          <p className="mt-8 text-xs font-medium text-slate-400 text-center">
            Este ambiente é exclusivo para a organização do evento.
          </p>
        </div>
      </div>
    );
  }

  // Voter View Login Screen (Fullscreen)
  if (view === 'voting' && !voterInfo && !adminUser) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden">
        {/* Decorative background elements */}
        <div className="absolute top-0 left-0 w-full h-[50vh] bg-gradient-to-b from-blue-600 to-slate-50 z-0"></div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/20 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-emerald-500/20 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-md flex flex-col items-center mt-[-5vh]">
          {/* Logo / Branding */}
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-3 border border-blue-50">
              <Trophy className="w-8 h-8 text-blue-600" />
            </div>
            <h1 className="text-3xl font-black text-white font-display tracking-tight leading-tight">
              Prata da Casa
            </h1>
            <p className="text-blue-100 text-xs font-bold uppercase tracking-widest mt-1.5">
              Votação Oficial 2026
            </p>
          </div>

          <div className="bg-white p-6 md:p-8 rounded-[32px] shadow-2xl w-full border border-slate-100 flex flex-col items-center animate-fade-in relative">
            <div className="absolute -top-6 bg-gradient-to-r from-emerald-500 to-emerald-400 text-white text-xs font-black uppercase tracking-widest px-4 py-2 rounded-full shadow-lg border-2 border-white">
              Acesso Seguro
            </div>
            
            <h2 className="text-xl font-black text-slate-900 mb-2 font-display text-center mt-3">Identifique-se para votar</h2>
            <p className="text-slate-500 text-xs md:text-sm mb-6 text-center leading-relaxed">
              Para garantir a validade e justiça da votação, escolha uma das opções abaixo para entrar.
            </p>

            {/* Tab switchers */}
            <div className="flex w-full bg-slate-100 p-1.5 rounded-2xl mb-6 border border-slate-200/50">
              <button
                type="button"
                onClick={() => setLoginMethod('google')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  loginMethod === 'google'
                    ? 'bg-white text-blue-600 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                <span>Google</span>
              </button>
              <button
                type="button"
                onClick={() => setLoginMethod('phone')}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                  loginMethod === 'phone'
                    ? 'bg-white text-emerald-600 shadow-sm font-black'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                <Smartphone className="w-4 h-4 text-emerald-500" />
                <span>WhatsApp</span>
              </button>
            </div>

            {loginMethod === 'google' ? (
              <div className="w-full flex flex-col items-center animate-fade-in">
                <p className="text-xs text-slate-400 text-center mb-5 leading-normal">
                  Entre usando sua conta Google de forma rápida e totalmente segura.
                </p>
                <button
                  onClick={handleGoogleLogin}
                  className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 border-2 border-slate-200 text-slate-700 font-bold py-4 px-4 rounded-xl shadow-sm transition-all hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 cursor-pointer text-[15px]"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                  <span>Entrar com o Google</span>
                </button>
              </div>
            ) : (
              <form onSubmit={handlePhoneLogin} className="w-full flex flex-col gap-4 animate-fade-in">
                {phoneError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-[11px] font-bold rounded-xl text-center leading-relaxed">
                    {phoneError}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
                    Seu Nome Completo
                  </label>
                  <div className="relative">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      required
                      placeholder="Ex: João da Silva"
                      value={voterNameInput}
                      onChange={(e) => setVoterNameInput(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-400 focus:bg-white transition-all font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5 ml-1">
                    Seu WhatsApp / Telefone
                  </label>
                  <div className="relative">
                    <Smartphone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="tel"
                      required
                      placeholder="Ex: (74) 99999-9999"
                      value={voterPhoneInput}
                      onChange={(e) => setVoterPhoneInput(formatPhoneNumber(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:border-emerald-400 focus:bg-white transition-all font-mono"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3.5 px-4 rounded-xl shadow-xs transition-all hover:shadow-md hover:-translate-y-0.5 cursor-pointer text-sm uppercase tracking-widest mt-2"
                >
                  Confirmar e Entrar
                </button>
              </form>
            )}
            
            <div className="mt-8 flex items-center gap-2 text-xs font-bold text-slate-400 justify-center w-full pt-6 border-t border-slate-100">
              <UserCheck className="w-4 h-4 text-emerald-500" />
              <span>Apenas 1 voto por pessoa por dia</span>
            </div>
          </div>
          
          <button 
             onClick={() => setView('admin')}
             className="mt-6 text-xs font-bold text-slate-400 hover:text-blue-600 transition-colors uppercase tracking-wider bg-white/50 px-4 py-2 rounded-full hover:bg-white border border-transparent hover:border-blue-200 cursor-pointer"
          >
             Acesso Organizador
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white" id="app-root-container">
      {/* 1. Header Navigation */}
      <Header 
        onNavigate={setView} 
        currentView={view} 
        config={config} 
        isAdmin={!!adminUser}
        adminEmail={adminUser?.email}
        onAdminLogout={handleLogout}
      />

      {/* 2. Main Content Stage */}
      <main className="flex-grow pb-12">
        {loading ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in" id="loading-spinner">
            <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-slate-400 mt-4">Carregando dados da votação...</p>
          </div>
        ) : view === 'voting' ? (
          <VotingPanel
            players={players}
            onVote={handleVote}
            hasVotedToday={votedToday}
            votedPlayerId={votedPlayerId}
            isVoting={isVoting}
            recommendedPlayerId={recommendedPlayerId}
            config={config}
            voterInfo={voterInfo}
            onLogin={handleGoogleLogin}
            onLogout={handleLogout}
          />
        ) : view === 'admin' && adminUser ? (
          <AdminPanel 
            players={players} 
            onRefresh={loadAppData} 
            config={config} 
            onUpdateConfig={handleUpdateConfig} 
          />
        ) : null}
      </main>

      {/* 3. Footer Section */}
      <Footer 
        onNavigate={setView} 
        isAdmin={!!adminUser}
        onLogin={handleGoogleLogin}
      />

      {/* 4. Elegant Success Confirmation Modal */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-md flex items-center justify-center z-50 p-4" id="success-modal-overlay">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-sm w-full shadow-2xl relative border border-slate-100 text-center animate-scale-up">
            <button
              onClick={() => setShowSuccessModal(false)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-100"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-emerald-50 border border-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4.5 text-emerald-600 shadow-xs">
              <UserCheck className="w-8 h-8 stroke-[2.5]" />
            </div>

            <h3 className="text-xl font-display font-black text-slate-950 tracking-tight">Voto Confirmado!</h3>
            
            <p className="text-sm text-slate-600 mt-3 leading-relaxed">
              Seu voto foi registrado com sucesso para o craque <strong className="text-emerald-600 font-extrabold">{votedPlayerName}</strong> na disputa pelo Melhor Prata da Casa.
            </p>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mt-5.5 text-xs text-slate-600 font-bold flex items-center gap-2.5 justify-center">
              <Calendar className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Obrigado! Retorne amanhã para um novo voto.</span>
            </div>

            <button
              onClick={() => setShowSuccessModal(false)}
              className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-sm tracking-wide shadow-md shadow-emerald-500/10 hover:shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0 mt-6 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}

      {/* 5. Elegant Restricted Access Warning Modal */}
      {authError && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="auth-error-modal">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-sm w-full shadow-2xl relative border border-slate-100 text-center animate-scale-up">
            <button
              onClick={() => setAuthError(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-100"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4.5 text-rose-600 shadow-lg shadow-rose-500/5">
              <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-display font-black text-slate-950 tracking-tight">Acesso Restrito</h3>
            
            <p className="text-sm text-slate-500 mt-3 leading-relaxed font-medium">
              {authError}
            </p>

            <div className="bg-slate-50 border border-slate-100 p-3.5 rounded-2xl mt-5 text-xs text-slate-600 font-bold flex items-center gap-2 justify-center leading-normal">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 animate-pulse" />
              <span>Logado como conta pública de eleitor.</span>
            </div>

            <button
              onClick={() => setAuthError(null)}
              className="w-full py-3.5 px-4 rounded-2xl bg-slate-950 hover:bg-slate-905 text-white font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all mt-6 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
