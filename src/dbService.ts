import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import { Player, Vote, SystemConfig } from './types';
import { castVoteInSupabase, hasVotedTodayInSupabase, getVotesFromSupabase } from './supabase';
import { db } from './firebase';

// In-memory cache for Supabase votes to drastically optimize speeds and prevent API rate-limit lockouts
let cachedSupabaseVotes: any[] | null = null;
let lastSupabaseVotesFetchTime = 0;
const VOTES_CACHE_TTL_MS = 8000; // Cache for 8 seconds

// Cache of the last reset time, initialized from localStorage if in a browser context
const storedReset = typeof window !== 'undefined' ? localStorage.getItem('craque_last_reset') : null;
let lastResetAtCache: number | undefined = storedReset ? parseInt(storedReset, 10) : undefined;

// Default predefined players with alternating team order
const DEFAULT_PLAYERS: Player[] = [
  { id: 'p1', name: 'Jefinho', team: 'AZUUP', position: 'MEI (Meia)', votesCount: 0, order: 1, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p6', name: 'Marcel', team: 'Campinense', position: 'LAT (Lateral)', votesCount: 0, order: 2, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p2', name: 'Didio', team: 'AZUUP', position: 'MEI-ATAC (Meia-Atacante)', votesCount: 0, order: 3, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p7', name: 'Sujeirinha', team: 'Campinense', position: 'MEI-ATAC (Meia-Atacante)', votesCount: 0, order: 4, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p3', name: 'Gabriel', team: 'AZUUP', position: 'LAT (Lateral)', votesCount: 0, order: 5, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p8', name: 'Peep', team: 'Campinense', position: 'VOL (Volante)', votesCount: 0, order: 6, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p4', name: 'Valdevando', team: 'AZUUP', position: 'LAT (Lateral)', votesCount: 0, order: 7, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p9', name: 'Rafael', team: 'Campinense', position: 'LAT (Lateral)', votesCount: 0, order: 8, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p5', name: 'Kauê', team: 'AZUUP', position: 'GOLEIRO', votesCount: 0, order: 9, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 },
  { id: 'p10', name: 'Leuzinho', team: 'Campinense', position: 'VOL (Volante)', votesCount: 0, order: 10, imageUrl: '', imageFit: 'cover', imagePosition: 'top', createdAt: 1719854130000 }
];

export function getBahiaDateStr(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const bahiaDate = new Date(utc + (3600000 * -3));
  
  const year = bahiaDate.getFullYear();
  const month = String(bahiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(bahiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

/**
 * Automatically detects whether the application is running in a serverless environment (like Netlify)
 * or inside the development/preview container of Google AI Studio.
 */
export function isClientOnly(): boolean {
  if (typeof window === 'undefined') return false;
  
  // If explicitly requested via Vite environment variables
  if (import.meta.env.VITE_NETLIFY === 'true' || import.meta.env.VITE_CLIENT_ONLY === 'true') {
    return true;
  }
  
  const host = window.location.hostname;
  // AI Studio preview URLs end with run.app, and dev server runs on localhost
  const isStudioPreview = host.includes('run.app') || host.includes('localhost') || host.includes('127.0.0.1');
  return !isStudioPreview;
}

export async function getPlayers(): Promise<Player[]> {
  try {
    let playersList: Player[] = [];

    if (isClientOnly()) {
      // 1. Fetch directly from Firestore to support Netlify static hosting
      const playersCol = collection(db, 'players');
      const snapshot = await getDocs(playersCol);
      if (snapshot.empty) {
        // Seed predefined players to Firestore if it's completely empty
        for (const p of DEFAULT_PLAYERS) {
          await setDoc(doc(db, 'players', p.id), {
            name: p.name,
            team: p.team,
            position: p.position || '',
            imageUrl: p.imageUrl || '',
            imageFit: p.imageFit || 'cover',
            imagePosition: p.imagePosition || 'top',
            order: p.order || 0,
            votesCount: 0,
            createdAt: Date.now()
          });
        }
        playersList = [...DEFAULT_PLAYERS];
      } else {
        playersList = snapshot.docs.map(docSnap => ({
          id: docSnap.id,
          ...docSnap.data()
        })) as Player[];
      }
    } else {
      // 1. Fetch players from our Express backend API in AI Studio container environment
      const response = await fetch('/api/players');
      if (!response.ok) {
        throw new Error('Failed to fetch players from API');
      }
      playersList = await response.json();
    }

    // 2. Dynamically retrieve real-time votes from Supabase and count them in-memory (with 8s cache)
    const now = Date.now();
    let votes: any[] = [];
    if (cachedSupabaseVotes && (now - lastSupabaseVotesFetchTime < VOTES_CACHE_TTL_MS)) {
      votes = cachedSupabaseVotes;
    } else {
      votes = await getVotesFromSupabase();
      cachedSupabaseVotes = votes;
      lastSupabaseVotesFetchTime = now;
    }

    const countsMap: Record<string, number> = {};

    for (const v of votes) {
      if (v && v.player_id) {
        // Filter out votes older than lastResetAt timestamp
        if (lastResetAtCache && v.created_at) {
          const voteTime = new Date(v.created_at).getTime();
          if (voteTime < lastResetAtCache) {
            continue; // Skip votes cast before the reset
          }
        }
        countsMap[v.player_id] = (countsMap[v.player_id] || 0) + 1;
      }
    }

    // Sort players according to their assigned order field
    playersList.sort((a, b) => (a.order || 0) - (b.order || 0));

    // 3. Merge Supabase vote count values over player objects
    return playersList.map(p => ({
      ...p,
      votesCount: countsMap[p.id] || 0
    }));
  } catch (err) {
    console.error("Error aggregating Supabase votes for players:", err);
    return [];
  }
}

export async function addPlayer(
  name: string, 
  team: string, 
  position?: string, 
  imageUrl?: string, 
  imageFit?: 'cover'|'contain', 
  imagePosition?: 'top'|'center'|'bottom', 
  order?: number
): Promise<string> {
  if (isClientOnly()) {
    const id = `player_${Date.now()}`;
    const playerDocRef = doc(db, 'players', id);
    await setDoc(playerDocRef, {
      name,
      team,
      position: position || '',
      imageUrl: imageUrl || '',
      imageFit: imageFit || 'cover',
      imagePosition: imagePosition || 'top',
      order: order || 0,
      votesCount: 0,
      createdAt: Date.now()
    });
    return id;
  } else {
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ name, team, position, imageUrl, imageFit, imagePosition, order })
    });
    if (!response.ok) {
      throw new Error('Failed to add player');
    }
    const result = await response.json();
    return result.id;
  }
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  if (isClientOnly()) {
    const playerDocRef = doc(db, 'players', id);
    const filteredUpdates: any = {};
    Object.keys(updates).forEach(key => {
      if ((updates as any)[key] !== undefined) {
        filteredUpdates[key] = (updates as any)[key];
      }
    });
    await updateDoc(playerDocRef, filteredUpdates);
  } else {
    const response = await fetch(`/api/players/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updates)
    });
    if (!response.ok) {
      throw new Error('Failed to update player');
    }
  }
}

export async function deletePlayer(id: string): Promise<void> {
  if (isClientOnly()) {
    const playerDocRef = doc(db, 'players', id);
    await deleteDoc(playerDocRef);
  } else {
    const response = await fetch(`/api/players/${id}`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete player');
    }
  }
}

export async function hasVotedToday(voterId: string): Promise<{ voted: boolean; playerVotedId?: string }> {
  // Query Supabase directly
  return hasVotedTodayInSupabase(voterId, lastResetAtCache);
}

export async function castVote(
  playerId: string, 
  voterId: string, 
  voterInfo?: import('./types').VoterInfo & { ipAddress?: string; locationInfo?: string }, 
  userAgent?: string
): Promise<void> {
  // Cast vote directly in Supabase
  await castVoteInSupabase(playerId, voterId, voterInfo || {}, userAgent, lastResetAtCache);
  cachedSupabaseVotes = null; // Instantly invalidate votes cache to show updated counts
}

export async function getVotesHistory(limitCount = 10): Promise<Vote[]> {
  try {
    // Query directly from Supabase for total transparency and live display
    const { data, error } = await import('./supabase').then(m => {
      let query = m.supabase.from('votos').select('*').order('created_at', { ascending: false });
      return query.limit(limitCount);
    });

    if (error) throw error;

    return (data || []).map(v => ({
      id: String(v.id),
      playerId: v.player_id,
      voterId: v.voter_id,
      dateStr: v.date_str,
      timestamp: v.created_at ? new Date(v.created_at).getTime() : Date.now(),
      voterName: v.voter_name || 'Anônimo',
      voterEmail: v.voter_email || '',
      voterPhone: v.voter_phone || '',
      ipAddress: v.ip_address || 'N/A',
      locationInfo: v.location_info || 'N/A',
      userAgent: v.user_agent || 'N/A'
    }));
  } catch (err) {
    console.error("Failed to fetch vote history from Supabase:", err);
    return [];
  }
}

export const DEFAULT_CONFIG: SystemConfig = {
  votingQuestion: 'Quem é o melhor "Prata da Casa"?',
  logoAzuup: '',
  logoCampinense: '',
  logoPrincipal: '',
  startDate: '',
  endDate: '',
  votingEnabled: true,
  bannerUrl: '',
  primaryColor: '#2563eb',
  sponsorName: 'Lourival Junior',
  sponsorPrize: 'R$ 500',
  sponsorLogoUrl: '',
};

export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    let config: SystemConfig;

    if (isClientOnly()) {
      const configDocRef = doc(db, 'settings', 'voting');
      const docSnap = await getDoc(configDocRef);
      if (docSnap.exists()) {
        config = docSnap.data() as SystemConfig;
      } else {
        await setDoc(configDocRef, DEFAULT_CONFIG);
        config = DEFAULT_CONFIG;
      }
    } else {
      const response = await fetch('/api/settings');
      if (!response.ok) {
        throw new Error('Failed to fetch settings from API');
      }
      config = await response.json() as SystemConfig;
    }
    
    if (config && typeof config.lastResetAt === 'number') {
      lastResetAtCache = config.lastResetAt;
      if (typeof window !== 'undefined') {
        localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
      }
    }
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error("Failed to fetch settings from API:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateSystemConfig(config: SystemConfig): Promise<void> {
  try {
    if (isClientOnly()) {
      const configDocRef = doc(db, 'settings', 'voting');
      await setDoc(configDocRef, config);
    } else {
      const response = await fetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      if (!response.ok) {
        throw new Error('Failed to update config on server');
      }
    }
    
    if (config && typeof config.lastResetAt === 'number') {
      lastResetAtCache = config.lastResetAt;
      if (typeof window !== 'undefined') {
        localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
      }
    }
  } catch (err) {
    console.error("Failed to update system config in API:", err);
    throw new Error('Failed to update config');
  }
}

export async function resetAllVotes(): Promise<void> {
  cachedSupabaseVotes = null; // Instantly invalidate votes cache

  if (isClientOnly()) {
    // 1. Try to clear votes from Supabase using direct client
    try {
      const { error } = await import('./supabase').then(m => 
        m.supabase.from('votos').delete().neq('id', 0) // Delete all rows
      );
      if (error) {
        console.warn("Supabase votes deletion failed:", error);
      }
    } catch (err) {
      console.error("Exception clearing Supabase votes:", err);
    }

    // 2. Set lastResetAt in Firebase Firestore settings
    try {
      const resetTime = Date.now();
      const configDocRef = doc(db, 'settings', 'voting');
      const docSnap = await getDoc(configDocRef);
      const currentConfig = docSnap.exists() ? docSnap.data() : DEFAULT_CONFIG;
      await setDoc(configDocRef, {
        ...currentConfig,
        lastResetAt: resetTime
      });
      lastResetAtCache = resetTime;
    } catch (err) {
      console.error("Failed to set lastResetAt in Firestore:", err);
    }
  } else {
    // Reset via API
    const response = await fetch('/api/votes/reset', {
      method: 'POST'
    });
    if (!response.ok) {
      throw new Error('Failed to reset votes on server');
    }

    // Try to clear votes from Supabase using REST API
    try {
      const { error } = await import('./supabase').then(m => 
        m.supabase.from('votos').delete().neq('id', 0) // Delete all rows
      );
      if (error) {
        console.warn("Supabase votes deletion failed:", error);
      }
    } catch (err) {
      console.error("Exception clearing Supabase votes:", err);
    }

    // Update local cache of lastResetAt to current timestamp so we immediately start filtering
    lastResetAtCache = Date.now();
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('craque_last_reset', (lastResetAtCache || Date.now()).toString());
  }
}

export async function deleteVote(voteId: string, playerId?: string): Promise<void> {
  cachedSupabaseVotes = null; // Clear cached votes to update counts instantly

  // 1. Delete from Supabase
  try {
    const { deleteVoteInSupabase } = await import('./supabase');
    await deleteVoteInSupabase(voteId);
  } catch (err: any) {
    console.error("Could not delete vote from Supabase:", err);
    throw new Error(`Erro ao deletar voto no Supabase: ${err.message || err}. Certifique-se de que executou as permissões (políticas de exclusão RLS) no editor SQL do Supabase.`);
  }

  // 2. Delete from server's fallback DB / Firestore to maintain absolute sync
  if (!isClientOnly()) {
    try {
      const res = await fetch(`/api/votes/${voteId}`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        console.warn("Backend sync deletion responded with an error");
      }
    } catch (err) {
      console.warn("Could not sync vote deletion with Express backend:", err);
    }
  }
}
