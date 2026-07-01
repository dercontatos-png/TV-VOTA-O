const fs = require('fs');
let content = fs.readFileSync('src/dbService.ts', 'utf8');

// Find export async function updatePlayer to the start of export async function deletePlayer
content = content.replace(/export async function updatePlayer[\s\S]*?export async function deletePlayer/m, `export async function updatePlayer(id: string, updates: Partial<Player>): Promise<void> {
  if (isClientOnly()) {
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

export async function deletePlayer`);

fs.writeFileSync('src/dbService.ts', content);
