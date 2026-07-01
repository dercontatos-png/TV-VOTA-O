import { Player, Vote, SystemConfig } from './types';
import { castVoteInSupabase, hasVotedTodayInSupabase, getVotesFromSupabase, getPlayersFromSupabase, upsertPlayerInSupabase, deletePlayerInSupabase, getSettingsFromSupabase, upsertSettingsInSupabase } from './supabase';

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
  return true; // Always use direct Supabase client for all environments (Netlify, AI Studio, local)
}

export async function getPlayers(): Promise<Player[]> {
  try {
    let playersList: Player[] = [];

    // 1. Fetch directly from Supabase for Netlify static hosting
    const supabasePlayers = await getPlayersFromSupabase();
    
    // Auto-seed any missing default players to the database
    const existingIds = new Set(supabasePlayers.map((p: any) => p.id));
    const missingPlayers = DEFAULT_PLAYERS.filter(p => !existingIds.has(p.id));
    
    if (missingPlayers.length > 0) {
      console.log(`Seeding ${missingPlayers.length} missing players to Supabase...`);
      for (const p of missingPlayers) {
        try {
          await upsertPlayerInSupabase({
            id: p.id,
            name: p.name,
            team: p.team,
            position: p.position || '',
            order: p.order || 0,
            imageFit: p.imageFit || 'cover',
            imagePosition: p.imagePosition || 'top',
            imageUrl: p.imageUrl || '',
            createdAt: p.createdAt || Date.now()
          });
          
          supabasePlayers.push({
            id: p.id,
            nome: p.name,
            time: p.team,
            logo_url: JSON.stringify({
              url: p.imageUrl || '',
              position: p.position || '',
              order: p.order || 0,
              imageFit: p.imageFit || 'cover',
              imagePosition: p.imagePosition || 'top'
            }),
            criado_em: new Date(p.createdAt || Date.now()).toISOString()
          });
        } catch (seedErr) {
          console.error(`Error auto-seeding player ${p.name}:`, seedErr);
        }
      }
    }

    playersList = supabasePlayers.map((p: any) => {
      let imageUrl = p.logo_url || '';
      let position = '';
      let imageFit = 'cover' as 'cover' | 'contain';
      let imagePosition = 'top' as 'top' | 'center' | 'bottom';
      let order = 0;

      if (p.logo_url && p.logo_url.startsWith('{')) {
        try {
          const parsed = JSON.parse(p.logo_url);
          imageUrl = parsed.url || '';
          position = parsed.position || '';
          imageFit = parsed.imageFit || 'cover';
          imagePosition = parsed.imagePosition || 'top';
          order = typeof parsed.order === 'number' ? parsed.order : 0;
        } catch (e) {
          // fallback
        }
      }

      return {
        id: p.id,
        name: p.nome || '',
        team: p.time || '',
        position,
        imageUrl,
        imageFit,
        imagePosition,
        order,
        createdAt: p.criado_em ? new Date(p.criado_em).getTime() : Date.now(),
        votesCount: 0
      };
    }) as Player[];

    // 2. Dynamically retrieve real-time votes from Supabase
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
  const id = crypto.randomUUID ? crypto.randomUUID() : `player_${Date.now()}`;
  const player = {
    id,
    name,
    team,
    position: position || '',
    imageUrl: imageUrl || '',
    imageFit: imageFit || 'cover',
    imagePosition: imagePosition || 'top',
    order: order || 0,
    votesCount: 0,
    createdAt: Date.now()
  };

  await upsertPlayerInSupabase(player);
  return id;
}

export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  const players = await getPlayers();
  const existing = players.find(p => p.id === id);
  if (existing) {
    const merged = { 
      ...existing,
      ...updates 
    };
    await upsertPlayerInSupabase(merged);
  }
}

export async function deletePlayer(id: string): Promise<void> {
  await deletePlayerInSupabase(id);
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

    const supabaseConfig = await getSettingsFromSupabase();
    if (supabaseConfig) {
      config = supabaseConfig;
    } else {
      await upsertSettingsInSupabase(DEFAULT_CONFIG);
      config = DEFAULT_CONFIG;
    }
    
    if (config && typeof config.lastResetAt === 'number') {
      lastResetAtCache = config.lastResetAt;
      if (typeof window !== 'undefined') {
        localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
      }
    }
    return { ...DEFAULT_CONFIG, ...config };
  } catch (error) {
    console.error("Error fetching settings from Supabase:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateSystemConfig(config: SystemConfig): Promise<void> {
  try {
    await upsertSettingsInSupabase(config);
    
    if (config && typeof config.lastResetAt === 'number') {
      lastResetAtCache = config.lastResetAt;
      if (typeof window !== 'undefined') {
        localStorage.setItem('craque_last_reset', config.lastResetAt.toString());
      }
    }
  } catch (err) {
    console.error("Failed to update system config in Supabase:", err);
    throw new Error('Failed to update config');
  }
}

export async function resetAllVotes(): Promise<void> {
  cachedSupabaseVotes = null; // Instantly invalidate votes cache

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

  // 2. Set lastResetAt in settings via Supabase
  try {
    const resetTime = Date.now();
    const currentConfig = await getSettingsFromSupabase() || DEFAULT_CONFIG;
    await upsertSettingsInSupabase({
      ...currentConfig,
      lastResetAt: resetTime
    });
    lastResetAtCache = resetTime;
  } catch (err) {
    console.error("Failed to set lastResetAt in Supabase:", err);
  }

  if (typeof window !== 'undefined') {
    localStorage.setItem('craque_last_reset', (lastResetAtCache || Date.now()).toString());
  }
}

export async function deleteVote(voteId: string, playerId?: string): Promise<void> {
  cachedSupabaseVotes = null; // Clear cached votes to update counts instantly
  try {
    const { deleteVoteInSupabase } = await import('./supabase');
    await deleteVoteInSupabase(voteId);
  } catch (err: any) {
    console.error("Could not delete vote from Supabase:", err);
    throw new Error(`Erro ao deletar voto no Supabase: ${err.message || err}`);
  }
}
