const fs = require('fs');
let content = fs.readFileSync('src/dbService.ts', 'utf8');

content = content.replace(/export async function updatePlayer\([\s\S]*?\}\s*\}/m, `export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  if (isClientOnly()) {
    // First get the player
    const supabasePlayers = await getPlayersFromSupabase();
    const existing = supabasePlayers.find((p: any) => p.id === id);
    if (existing) {
      const merged = { 
        id: existing.id,
        name: existing.nome,
        team: existing.time,
        imageUrl: existing.logo_url,
        createdAt: existing.criado_em ? new Date(existing.criado_em).getTime() : Date.now(),
        ...updates 
      };
      await upsertPlayerInSupabase(merged);
    }
  } else {
    // Fallback logic not used since isClientOnly is true
  }
}`);

fs.writeFileSync('src/dbService.ts', content);
