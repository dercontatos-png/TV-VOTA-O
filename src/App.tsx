import React, { useState, useEffect } from 'react';
import { Loader2, Calendar, UserCheck, ShieldAlert, X, ShieldCheck, Trophy, Smartphone, User } from 'lucide-react';
import Header from './components/Header';
import Footer from './components/Footer';
import VotingPanel from './components/VotingPanel';
import AdminPanel from './components/AdminPanel';
import { MuralPanel } from './components/MuralPanel';
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

// Cookie helpers for anti-fraud device fingerprinting
function setCookie(name: string, value: string, days = 365) {
  const date = new Date();
  date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
  const expires = "; expires=" + date.toUTCString();
  document.cookie = name + "=" + (value || "") + expires + "; path=/; SameSite=Lax";
}

function getCookie(name: string): string | null {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

// Brazilian phone pattern and abuse validations
function validateBrazilianPhone(phone: string): string | null {
  const clean = phone.replace(/\D/g, '');
  
  if (clean.length < 10 || clean.length > 11) {
    return 'O número de telefone deve conter o DDD com 2 dígitos e mais 8 ou 9 dígitos.';
  }
  
  const ddd = parseInt(clean.substring(0, 2), 10);
  if (ddd < 11 || ddd > 99) {
    return 'DDD inválido. Por favor, insira um DDD real do Brasil.';
  }
  
  if (/^(\d)\1+$/.test(clean)) {
    return 'Número inválido. Evite usar sequências repetidas (Ex: 99999-9999).';
  }
  
  const fakeSequences = ['12345678', '98765432', '01234567'];
  for (const seq of fakeSequences) {
    if (clean.includes(seq)) {
      return 'Número de telefone inválido ou fictício detectado.';
    }
  }

  if (clean.length === 11) {
    const firstDigit = clean.charAt(2);
    if (firstDigit !== '9') {
      return 'Celulares com 11 dígitos devem começar com o dígito 9.';
    }
  }
  
  return null;
}

// Defina aqui quais e-mails têm permissão de Administrador
const ADMIN_EMAILS = [
  'der.contatos@gmail.com',
  'tvchapadaoficial@gmail.com'
];

export default function App() {
  const urlParams = new URLSearchParams(window.location.search);
  const isAdminParam = urlParams.has('admin') || window.location.hash === '#admin';
  const isSharedLink = urlParams.has('vote') || urlParams.has('player') || urlParams.has('p');
  const isMuralParam = urlParams.get('view') === 'mural' || urlParams.has('mural');

  const [view, setView] = useState<'voting' | 'admin' | 'mural'>(isMuralParam ? 'mural' : (isAdminParam ? 'admin' : 'voting'));
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isVoting, setIsVoting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [votedPlayerName, setVotedPlayerName] = useState('');
  const [voteError, setVoteError] = useState<string | null>(null);

  // IP & Location Tracking States
  const [ipAddress, setIpAddress] = useState<string>('');
  const [locationInfo, setLocationInfo] = useState<string>('');

  // Hidden admin click gesture counter
  const [adminClickCount, setAdminClickCount] = useState(0);

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
          const params = new URLSearchParams(window.location.search);
          const explicitVoting = params.get('view') === 'voting';
          if (!isSharedLink && !isMuralParam && !explicitVoting) {
            setView('admin');
          }
        } else {
          setAdminUser(null);
          // Set voter info from Google Auth
          const vInfo: VoterInfo = {
            id: user.uid,
            name: user.displayName || 'Eleitor',
            email: user.email || '',
            photoURL: user.photoURL || undefined,
            phone: user.phoneNumber || undefined
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
        if (isMuralParam) {
          setView('mural');
        } else if (isAdminParam) {
          setView('admin');
        } else {
          setView('voting');
        }
      }
      setCheckingAdmin(false);
    });
    return () => unsubscribe();
  }, [isSharedLink, isMuralParam, isAdminParam]);

  // Fetch IP & Location on mount
  useEffect(() => {
    const fetchGeoIP = async () => {
      try {
        const response = await fetch('https://ipapi.co/json/');
        if (response.ok) {
          const data = await response.json();
          setIpAddress(data.ip || '');
          setLocationInfo(`${data.city || 'Desconhecido'}, ${data.region_code || 'BA'} - ${data.country_name || 'Brasil'}`);
        } else {
          const fallback = await fetch('https://api.ipify.org?format=json');
          const fallbackData = await fallback.json();
          setIpAddress(fallbackData.ip || '');
          setLocationInfo('Localização Indisponível');
        }
      } catch (err) {
        console.warn("Failed to fetch geo IP, using fallback...", err);
        try {
          const fallback = await fetch('https://api.ipify.org?format=json');
          const fallbackData = await fallback.json();
          setIpAddress(fallbackData.ip || '');
          setLocationInfo('Localização Indisponível');
        } catch (e) {
          console.warn("Could not retrieve IP address", e);
        }
      }
    };
    fetchGeoIP();
  }, []);

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

    const fetchFreshData = async (showLoading = false) => {
      if (showLoading) setLoading(true);
      try {
        const configData = await getSystemConfig();
        const playersData = await getPlayers();
        
        const sortedPlayers = [...playersData].sort((a, b) => (a.order || 0) - (b.order || 0));
        setPlayers(sortedPlayers);
        setConfig(configData);
        setErrorMsg(null);
      } catch (err: any) {
        console.error("Error fetching data from API:", err);
        setErrorMsg("Erro ao carregar dados. Verifique sua conexão.");
      } finally {
        if (showLoading) setLoading(false);
      }
    };

    // Poll players and system configuration from our server API (cached on server-side)
  useEffect(() => {
    let intervalId: any;

    // Initial load
    fetchFreshData(true);

    // Poll every 3 seconds to keep the interface updated in near real-time
    intervalId = setInterval(() => {
      fetchFreshData(false);
    }, 3000);

    return () => {
      clearInterval(intervalId);
    };
  }, []);

  // Fetch all players and check if user has voted today
  const loadAppData = async () => {
    try {
      // Query device anti-fraud blocks first
      const dateStr = getBahiaDateStr();
      const localBlocked = localStorage.getItem(`craque_voted_${dateStr}`) === 'true';
      const cookieVal = getCookie('craque_voted_dates');
      let cookieBlocked = false;
      if (cookieVal) {
        try {
          const dates = JSON.parse(cookieVal) as string[];
          if (dates.includes(dateStr)) {
            cookieBlocked = true;
          }
        } catch (e) {}
      }

      if (localBlocked || cookieBlocked) {
        setVotedToday(true);
        const voteState = await hasVotedToday(voterId);
        setVotedPlayerId(voteState.playerVotedId);
      } else {
        // Query Firestore if this voter already voted today
        const voteState = await hasVotedToday(voterId);
        setVotedToday(voteState.voted);
        setVotedPlayerId(voteState.playerVotedId);
      }
    } catch (err) {
      console.error("Error loading application data:", err);
    }
  };

  const handleRefreshAll = async () => {
    await fetchFreshData(false);
    await loadAppData();
  };

  const handleUpdateConfig = async (newConfig: SystemConfig) => {
    await updateSystemConfig(newConfig);
    setConfig(newConfig);
    // Reload data when config changes
    await fetchFreshData(true);
    await loadAppData();
  };

  useEffect(() => {
    if (config?.lastResetAt) {
      const localLastReset = localStorage.getItem('craque_last_reset');
      if (localLastReset !== config.lastResetAt.toString()) {
        localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
        // Clear all craque_voted_ keys
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('craque_voted_')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        setCookie('craque_voted_dates', '', -1); // Clear cookie
        
        // Reset local state if we had voted
        setVotedToday(false);
        setVotedPlayerId(undefined);
      }
    }
  }, [config?.lastResetAt]);

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
      
      // Perform transactional vote casting with IP and Location tracked
      await castVote(playerId, voterId, {
        ...(voterInfo || { id: voterId, name: 'Anônimo', email: '' }),
        ipAddress: ipAddress || 'N/A',
        locationInfo: locationInfo || 'N/A'
      }, navigator.userAgent);
      
      // Save anti-fraud device records on client
      const dateStr = getBahiaDateStr();
      localStorage.setItem(`craque_voted_${dateStr}`, 'true');
      
      const currentCookieVal = getCookie('craque_voted_dates');
      let votedDates: string[] = [];
      if (currentCookieVal) {
        try {
          votedDates = JSON.parse(currentCookieVal);
        } catch (e) {}
      }
      if (!votedDates.includes(dateStr)) {
        votedDates.push(dateStr);
      }
      setCookie('craque_voted_dates', JSON.stringify(votedDates), 365);
      
      setVotedPlayerName(playerName);
      setVotedToday(true);
      setVotedPlayerId(playerId);
      setShowSuccessModal(true);
      setRecommendedPlayerId(null); // Clear recommended after successful vote
      
    } catch (err: any) {
      console.error("Failed to cast vote:", err);
      const msg = err instanceof Error ? err.message : "Não foi possível registrar seu voto. Por favor, tente novamente em instantes.";
      setVoteError(msg);
    } finally {
      setIsVoting(false);
    }
  };

  if (view === 'mural') {
    return <MuralPanel />;
  }

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
    const dynamicColor = config?.primaryColor || '#2563eb';
    const hasBanner = !!config?.bannerUrl;
    
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans">
        <style dangerouslySetInnerHTML={{__html: `
          :root {
            --primary-theme-color: ${dynamicColor};
          }
        `}} />

        {/* Decorative background elements */}
        <div 
          className="absolute top-0 left-0 w-full h-[50vh] z-0 transition-colors duration-300"
          style={{ backgroundColor: dynamicColor }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/20 to-transparent"></div>
        </div>
        <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>
        <div className="absolute top-[20%] right-[-5%] w-72 h-72 bg-white/10 rounded-full blur-3xl z-0 pointer-events-none"></div>

        <div className="relative z-10 w-full max-w-lg flex flex-col items-center my-6">
          {/* Main Branding Header with TV Logo if set */}
          <div className="mb-6 flex flex-col items-center text-center px-4">
            {config?.logoPrincipal ? (
              <div className="mb-6 transition-all hover:scale-105 flex items-center justify-center select-none drop-shadow-xl">
                <img 
                  src={config.logoPrincipal} 
                  alt="TV Logo" 
                  className="max-h-32 max-w-[280px] md:max-h-40 md:max-w-[360px] object-contain" 
                  referrerPolicy="no-referrer"
                />
              </div>
            ) : (
              <div className="w-16 h-16 bg-white rounded-3xl shadow-xl flex items-center justify-center mb-3 border border-slate-100 transition-transform hover:scale-105">
                <Trophy className="w-8 h-8" style={{ color: dynamicColor }} />
              </div>
            )}
            
            <h1 className="text-2xl md:text-3xl font-black text-white font-display tracking-tight leading-tight uppercase drop-shadow-md select-none">
              Prata da Casa
            </h1>
            <p className="text-white/90 text-xs font-black uppercase tracking-widest mt-1 bg-black/10 px-3 py-1 rounded-full border border-white/10 select-none">
              Campeonato Municipal 2026
            </p>
          </div>

          {/* Login Card */}
          <div className="bg-white rounded-[32px] shadow-2xl w-full border border-slate-100 overflow-hidden animate-fade-in relative">
            
            {/* Custom Banner if defined */}
            {hasBanner ? (
              <div className="w-full h-44 md:h-52 overflow-hidden relative border-b border-slate-100">
                <img 
                  src={config?.bannerUrl} 
                  alt="Banner Oficial" 
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent flex items-end p-6">
                  <div className="text-white">
                    <span className="bg-emerald-500 text-slate-950 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-md shadow-sm">
                      Vote Agora
                    </span>
                    <h2 className="text-lg md:text-xl font-black font-display tracking-tight mt-1.5 drop-shadow-sm">
                      Quem é o melhor Prata da Casa?
                    </h2>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-gradient-to-r from-blue-900 to-blue-800 p-8 md:p-10 text-white relative">
                <div className="absolute top-4 right-4 w-12 h-12 bg-white/5 rounded-full blur-lg"></div>
                <span className="bg-emerald-500 text-slate-950 text-[10px] md:text-xs font-black uppercase tracking-[0.2em] px-3 py-1.5 rounded-md shadow-sm inline-block mb-3">
                  Votação Oficial
                </span>
                <h2 className="text-2xl md:text-3xl font-black font-display tracking-tight text-balance leading-tight drop-shadow-sm">
                  Quem é o melhor Prata da Casa?
                </h2>
                <p className="text-blue-100 text-xs md:text-sm mt-3 leading-relaxed text-pretty font-medium max-w-lg">
                  Vote no melhor prata da casa das equipes finalistas (Azuup x Campinense) do Campeonato Municipal de Morro do Chapéu - BA 2026!
                </p>
              </div>
            )}

            <div className="p-8 md:p-10 bg-white">
              {/* Informative text below banner/header */}
              {hasBanner && (
                <div className="mb-6 bg-blue-50 border border-blue-100/50 rounded-2xl p-4 shadow-sm">
                  <p className="text-blue-900 text-xs md:text-sm font-semibold text-center leading-relaxed text-pretty">
                    Escolha seu favorito entre as equipes finalistas do Campeonato Municipal de <strong className="font-black text-blue-950 drop-shadow-sm">Morro do Chapéu - BA 2026</strong>!
                  </p>
                </div>
              )}

              <div className="text-center mb-8">
                <h3 className="text-xl md:text-2xl font-black text-slate-900 mb-2 font-display text-balance tracking-tight">Identifique-se para Votar</h3>
              </div>

              {/* Login Google Auth Form */}
              <div className="space-y-4">
                {authError && (
                  <div className="p-4 bg-rose-50 border-l-4 border-rose-500 text-rose-700 text-sm font-bold rounded-r-xl leading-relaxed animate-fade-in shadow-sm">
                    {authError}
                  </div>
                )}
                
                <button
                  onClick={handleGoogleLogin}
                  className="w-full bg-white hover:bg-slate-50 text-slate-700 border-2 border-slate-200 font-black py-4 px-4 rounded-2xl shadow-sm transition-all hover:shadow-md hover:border-emerald-500/30 hover:-translate-y-0.5 cursor-pointer text-xs md:text-sm tracking-widest mt-2 text-center flex items-center justify-center gap-3"
                >
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-6 h-6" />
                  ENTRAR COM O GOOGLE
                </button>
              </div>
              
              <div className="mt-10 flex items-center gap-2 text-[11px] md:text-xs font-black text-slate-400 justify-center w-full pt-6 border-t border-slate-100">
                <UserCheck className="w-5 h-5 text-emerald-500 shrink-0" />
                <span className="uppercase tracking-wider">Apenas 1 voto por pessoa por dia</span>
              </div>
            </div>
          </div>
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
        {errorMsg ? (
          <div className="flex flex-col items-center justify-center min-h-[50vh] animate-fade-in p-6">
            <ShieldAlert className="w-16 h-16 text-rose-500 mb-4" />
            <h2 className="text-xl font-black text-slate-800 text-center uppercase tracking-wider mb-2">Erro ao carregar</h2>
            <p className="text-sm font-medium text-slate-500 text-center max-w-md leading-relaxed">{errorMsg}</p>
          </div>
        ) : loading ? (
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
            onRefresh={handleRefreshAll} 
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

            <h3 className="text-2xl font-display font-black text-slate-950 tracking-tight text-balance">Voto Confirmado!</h3>
            
            <p className="text-sm md:text-base text-slate-600 mt-4 leading-relaxed text-balance">
              Seu voto foi registrado com sucesso para o craque <strong className="text-emerald-600 font-extrabold">{votedPlayerName}</strong> na disputa pelo Melhor Prata da Casa.
            </p>

            <div className="bg-slate-50 border border-slate-100 p-4 rounded-2xl mt-6 text-xs text-slate-600 font-bold flex items-center gap-2.5 justify-center text-balance leading-normal">
              <Calendar className="w-5 h-5 text-emerald-600 shrink-0" />
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

      {/* 6. Elegant Voting Error Modal */}
      {voteError && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center z-50 p-4" id="vote-error-modal">
          <div className="bg-white rounded-[32px] p-6 md:p-8 max-w-sm w-full shadow-2xl relative border border-slate-100 text-center animate-scale-up">
            <button
              onClick={() => setVoteError(null)}
              className="absolute top-5 right-5 p-2 text-slate-400 hover:text-slate-950 bg-slate-50 hover:bg-slate-100 rounded-full transition-colors cursor-pointer border border-slate-100"
              aria-label="Fechar"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 bg-rose-50 border border-rose-100 rounded-full flex items-center justify-center mx-auto mb-4.5 text-rose-600 shadow-lg shadow-rose-500/5">
              <ShieldAlert className="w-8 h-8 stroke-[2.2]" />
            </div>

            <h3 className="text-xl font-display font-black text-slate-950 tracking-tight">Não foi possível votar</h3>
            
            <p className="text-sm text-slate-500 mt-3 leading-relaxed font-semibold">
              {voteError}
            </p>

            <button
              onClick={() => setVoteError(null)}
              className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-500 text-white font-extrabold text-sm tracking-wide shadow-md hover:shadow-lg transition-all mt-6 cursor-pointer"
            >
              Entendido
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
