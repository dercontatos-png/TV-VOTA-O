const fs = require('fs');
let content = fs.readFileSync('src/dbService.ts', 'utf8');

content = content.replace(/export async function getPlayers\(\): Promise<Player\[]> \{[\s\S]*?export async function addPlayer/m, `export async function getPlayers(): Promise<Player[]> {
  try {
    let playersList: Player[] = [];

    // 1. Fetch directly from Supabase for Netlify static hosting
    const supabasePlayers = await getPlayersFromSupabase();
    if (supabasePlayers.length === 0) {
      // Seed predefined players to Supabase if it's completely empty
      for (const p of DEFAULT_PLAYERS) {
        await upsertPlayerInSupabase({
          id: p.id,
          name: p.name,
          team: p.team,
          imageUrl: p.imageUrl || '',
          createdAt: Date.now()
        });
      }
      playersList = [...DEFAULT_PLAYERS];
    } else {
      playersList = supabasePlayers.map((p: any) => ({
        id: p.id,
        name: p.nome || '',
        team: p.time || '',
        position: '',
        imageUrl: p.logo_url || '',
        imageFit: 'cover',
        imagePosition: 'top',
        order: 0,
        createdAt: p.criado_em ? new Date(p.criado_em).getTime() : Date.now(),
        votesCount: 0
      })) as Player[];
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

export async function addPlayer`);

content = content.replace(/export async function addPlayer[\s\S]*?export async function updatePlayer/m, `export async function addPlayer(
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

  await upsertPlayerInSupabase(player);
  return id;
}

export async function updatePlayer`);

content = content.replace(/export async function updatePlayer[\s\S]*?export async function deletePlayer/m, `export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  // First get the player
  const supabasePlayers = await getPlayersFromSupabase();
  const existing = supabasePlayers.find((p: any) => p.id === id);
  if (existing) {
    const merged = { 
      id: existing.id,
      name: existing.nome || '',
      team: existing.time || '',
      imageUrl: existing.logo_url || '',
      createdAt: existing.criado_em ? new Date(existing.criado_em).getTime() : Date.now(),
      ...updates 
    };
    await upsertPlayerInSupabase(merged);
  }
}

export async function deletePlayer`);

content = content.replace(/export async function deletePlayer[\s\S]*?export async function hasVotedToday/m, `export async function deletePlayer(id: string): Promise<void> {
  await deletePlayerInSupabase(id);
}

export async function hasVotedToday`);

content = content.replace(/export async function getSystemConfig[\s\S]*?export async function updateSystemConfig/m, `export async function getSystemConfig(): Promise<SystemConfig> {
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
    console.error("Failed to fetch settings from API:", error);
    return DEFAULT_CONFIG;
  }
}

export async function updateSystemConfig`);

content = content.replace(/export async function updateSystemConfig[\s\S]*?export async function resetAllVotes/m, `export async function updateSystemConfig(config: SystemConfig): Promise<void> {
  try {
    await upsertSettingsInSupabase(config);
    
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

export async function resetAllVotes`);

content = content.replace(/export async function resetAllVotes[\s\S]*?export async function deleteVote/m, `export async function resetAllVotes(): Promise<void> {
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

export async function deleteVote`);

content = content.replace(/export async function deleteVote[\s\S]*?\}\s*$/m, `export async function deleteVote(voteId: string, playerId?: string): Promise<void> {
  cachedSupabaseVotes = null; // Clear cached votes to update counts instantly
  // 1. Delete from Supabase
  try {
    const { deleteVoteInSupabase } = await import('./supabase');
    await deleteVoteInSupabase(voteId);
  } catch (err: any) {
    console.error("Could not delete vote from Supabase:", err);
    throw new Error(\`Erro ao deletar voto no Supabase: \${err.message || err}. Certifique-se de que executou as permissões (políticas de exclusão RLS) no editor SQL do Supabase.\`);
  }
}
`);


fs.writeFileSync('src/dbService.ts', content);
