const fs = require('fs');

let content = fs.readFileSync('src/dbService.ts', 'utf8');

// Replace imports from supabase
content = content.replace(
  "import { castVoteInSupabase, hasVotedTodayInSupabase, getVotesFromSupabase } from './supabase';",
  "import { castVoteInSupabase, hasVotedTodayInSupabase, getVotesFromSupabase, getPlayersFromSupabase, upsertPlayerInSupabase, deletePlayerInSupabase, getSettingsFromSupabase, upsertSettingsInSupabase } from './supabase';"
);

// getPlayers
const newGetPlayers = `
export async function getPlayers(): Promise<Player[]> {
  try {
    let playersList: Player[] = [];

    if (isClientOnly()) {
      // 1. Fetch directly from Supabase for Netlify static hosting
      const supabasePlayers = await getPlayersFromSupabase();
      if (supabasePlayers.length === 0) {
        // Seed predefined players to Supabase if it's completely empty
        for (const p of DEFAULT_PLAYERS) {
          await upsertPlayerInSupabase(p);
        }
        playersList = [...DEFAULT_PLAYERS];
      } else {
        playersList = supabasePlayers.map((p: any) => ({
          id: p.id,
          name: p.name,
          team: p.team,
          position: p.position || '',
          imageUrl: p.imageUrl || '',
          imageFit: p.imageFit || 'cover',
          imagePosition: p.imagePosition || 'top',
          order: p.order || 0,
          createdAt: p.createdAt || Date.now(),
          votesCount: 0
        })) as Player[];
      }
    } else {
      // Fetch from Express backend API in AI Studio container environment
      const response = await fetch('/api/players');
      if (!response.ok) {
        throw new Error('Failed to fetch players from API');
      }
      playersList = await response.json();
    }

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
`;

content = content.replace(/export async function getPlayers\(\): Promise<Player\[]> \{[\s\S]*?\}\s*export async function addPlayer/m, newGetPlayers + "\nexport async function addPlayer");

// addPlayer
const newAddPlayer = `
export async function addPlayer(
  name: string, 
  team: string, 
  position?: string, 
  imageUrl?: string, 
  imageFit?: 'cover'|'contain', 
  imagePosition?: 'top'|'center'|'bottom', 
  order?: number
): Promise<string> {
  const id = \`player_\${Date.now()}\`;
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

  if (isClientOnly()) {
    await upsertPlayerInSupabase(player);
    return id;
  } else {
    const response = await fetch('/api/players', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(player)
    });
    if (!response.ok) {
      throw new Error('Failed to add player');
    }
    const result = await response.json();
    return result.id;
  }
}
`;

content = content.replace(/export async function addPlayer\([\s\S]*?\}\s*export async function updatePlayer/m, newAddPlayer + "\nexport async function updatePlayer");

// updatePlayer
const newUpdatePlayer = `
export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  if (isClientOnly()) {
    // First get the player
    const supabasePlayers = await getPlayersFromSupabase();
    const existing = supabasePlayers.find((p: any) => p.id === id);
    if (existing) {
      const merged = { ...existing, ...updates };
      await upsertPlayerInSupabase(merged);
    }
  } else {
    const response = await fetch(\`/api/players/\${id}\`, {
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
`;

content = content.replace(/export async function updatePlayer\([\s\S]*?\}\s*export async function deletePlayer/m, newUpdatePlayer + "\nexport async function deletePlayer");

// deletePlayer
const newDeletePlayer = `
export async function deletePlayer(id: string): Promise<void> {
  if (isClientOnly()) {
    await deletePlayerInSupabase(id);
  } else {
    const response = await fetch(\`/api/players/\${id}\`, {
      method: 'DELETE'
    });
    if (!response.ok) {
      throw new Error('Failed to delete player');
    }
  }
}
`;

content = content.replace(/export async function deletePlayer\([\s\S]*?\}\s*export async function hasVotedToday/m, newDeletePlayer + "\nexport async function hasVotedToday");


// getSystemConfig
const newGetConfig = `
export async function getSystemConfig(): Promise<SystemConfig> {
  try {
    let config: SystemConfig;

    if (isClientOnly()) {
      const supabaseConfig = await getSettingsFromSupabase();
      if (supabaseConfig) {
        config = supabaseConfig;
      } else {
        await upsertSettingsInSupabase(DEFAULT_CONFIG);
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
`;

content = content.replace(/export async function getSystemConfig\(\): Promise<SystemConfig> \{[\s\S]*?\}\s*export async function updateSystemConfig/m, newGetConfig + "\nexport async function updateSystemConfig");

// updateSystemConfig
const newUpdateConfig = `
export async function updateSystemConfig(config: SystemConfig): Promise<void> {
  try {
    if (isClientOnly()) {
      await upsertSettingsInSupabase(config);
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
`;

content = content.replace(/export async function updateSystemConfig\([\s\S]*?\}\s*export async function resetAllVotes/m, newUpdateConfig + "\nexport async function resetAllVotes");

// resetAllVotes
const newResetAllVotes = `
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
`;

content = content.replace(/export async function resetAllVotes\(\): Promise<void> \{[\s\S]*?\}\s*export async function deleteVote/m, newResetAllVotes + "\nexport async function deleteVote");


fs.writeFileSync('src/dbService.ts', content);

