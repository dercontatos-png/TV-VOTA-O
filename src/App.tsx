import { useState, useEffect } from 'react';
import { Loader2, Calendar, UserCheck, ShieldAlert, X, ShieldCheck } from 'lucide-react';
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

export default function App() {
  const [view, setView] = useState<'voting' | 'admin'>('voting');
  const [players, setPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVoting, setIsVoting] = useState(false);

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
    }
  }, []);

  // Confirmatory Success Modal State
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [votedPlayerName, setVotedPlayerName] = useState('');

  // Firebase Auth Observer to persist admin session
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (user.email === 'der.contatos@gmail.com') {
          setAdminUser(user);
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
        }
      } else {
        setAdminUser(null);
        // Do not clear voterInfo if they just haven't signed in today, but 
        // to be secure, if firebase says not logged in, we should clear it.
        setVoterInfo(null);
        localStorage.removeItem('craque_voter_info');
        setView('voting');
      }
      setCheckingAdmin(false);
    });
    return () => unsubscribe();
  }, []);

  // Generic Google Sign-In with popup trigger
  const handleGoogleLogin = async () => {
    try {
      setAuthError(null);
      const result = await signInWithPopup(auth, googleProvider);
      const user = result.user;
      
      if (user.email === 'der.contatos@gmail.com') {
        setAdminUser(user);
        setView('admin');
      } else {
        // Handled by onAuthStateChanged, they become a voter
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

  const activeView = (view === 'admin' && adminUser) ? 'admin' : 'voting';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans text-slate-900 selection:bg-emerald-500 selection:text-white" id="app-root-container">
      {/* 1. Header Navigation */}
      <Header 
        onNavigate={setView} 
        currentView={activeView} 
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
        ) : activeView === 'voting' ? (
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
        ) : (
          <AdminPanel 
            players={players} 
            onRefresh={loadAppData} 
            config={config} 
            onUpdateConfig={handleUpdateConfig} 
          />
        )}
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
