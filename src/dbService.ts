import { Player, Vote, SystemConfig } from './types';
import { castVoteInSupabase, hasVotedTodayInSupabase, getVotesFromSupabase } from './supabase';
import { db } from './firebase';
import { collection, doc, getDocs, getDoc, setDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// Cache of the last reset time, initialized from localStorage if in a browser context
const storedReset = typeof window !== 'undefined' ? localStorage.getItem('craque_last_reset') : null;
let lastResetAtCache: number | undefined = storedReset ? parseInt(storedReset, 10) : undefined;

export function getBahiaDateStr(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const bahiaDate = new Date(utc + (3600000 * -3));
  
  const year = bahiaDate.getFullYear();
  const month = String(bahiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(bahiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export async function getPlayers(): Promise<Player[]> {
  const playersList: Player[] = [];
  try {
    const playersCol = collection(db, 'players');
    const snapshot = await getDocs(playersCol);
    snapshot.forEach((doc) => {
      const data = doc.data();
      playersList.push({ id: doc.id, ...data } as Player);
    });
  } catch (err) {
    console.error("Error fetching players from Firestore:", err);
  }

  try {
    // Dynamically retrieve real-time votes from Supabase and count them in-memory
    const votes = await getVotesFromSupabase();
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

    // Merge Supabase vote count values over player objects
    return playersList.map(p => ({
      ...p,
      votesCount: countsMap[p.id] || 0
    }));
  } catch (err) {
    console.error("Error aggregating Supabase votes for players:", err);
    return playersList;
  }
}

export async function addPlayer(name: string, team: string, position?: string, imageUrl?: string, imageFit?: 'cover'|'contain', imagePosition?: 'top'|'center'|'bottom', order?: number): Promise<string> {
  const newPlayerId = 'p' + Date.now();
  const playerDoc = doc(db, 'players', newPlayerId);
  await setDoc(playerDoc, {
    name, team, position, imageUrl, imageFit, imagePosition, order, createdAt: Date.now()
  });
  return newPlayerId;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  const playerDoc = doc(db, 'players', id);
  await updateDoc(playerDoc, updates);
}

export async function deletePlayer(id: string): Promise<void> {
  const playerDoc = doc(db, 'players', id);
  await deleteDoc(playerDoc);
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

export async function getAllVotes(): Promise<Vote[]> {
  try {
    // Query directly from Supabase
    const { data, error } = await import('./supabase').then(m => {
      let query = m.supabase.from('votos').select('*').order('created_at', { ascending: false });
      return query;
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
    console.error("Failed to fetch all votes from Supabase:", err);
    return [];
  }
}

export async function resetAllVotes(): Promise<void> {
  // Try to clear votes from Supabase using REST API (must be allowed by policy or RLS disabled/enabled)
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
  if (typeof window !== 'undefined') {
    localStorage.setItem('craque_last_reset', lastResetAtCache.toString());
  }

  try {
    const configDoc = doc(db, 'settings', 'config');
    await updateDoc(configDoc, { lastResetAt: lastResetAtCache });
  } catch (e) {
    console.error("Could not update lastResetAt in Firestore", e);
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
    const configDoc = doc(db, 'settings', 'config');
    const docSnap = await getDoc(configDoc);
    
    if (docSnap.exists()) {
      const config = docSnap.data() as SystemConfig;
      if (config && typeof config.lastResetAt === 'number') {
        lastResetAtCache = config.lastResetAt;
        if (typeof window !== 'undefined') {
          localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
        }
      }
      return { ...DEFAULT_CONFIG, ...config };
    }
    
    return DEFAULT_CONFIG;
  } catch (error) {
    console.error("Failed to fetch settings from Firestore:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateSystemConfig(config: SystemConfig): Promise<void> {
  try {
    const configDoc = doc(db, 'settings', 'config');
    await setDoc(configDoc, config, { merge: true });
    
    if (config && typeof config.lastResetAt === 'number') {
      lastResetAtCache = config.lastResetAt;
      if (typeof window !== 'undefined') {
        localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
      }
    }
  } catch (err) {
    console.error("Failed to update system config in Firestore:", err);
    throw new Error('Failed to update config');
  }
}

export async function deleteVote(voteId: string): Promise<void> {
  const { deleteVoteInSupabase } = await import('./supabase');
  await deleteVoteInSupabase(voteId);
}
