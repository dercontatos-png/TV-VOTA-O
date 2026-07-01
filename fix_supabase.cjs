const fs = require('fs');
let content = fs.readFileSync('src/supabase.ts', 'utf8');

// Find the getPlayersFromSupabase and replace all the way down
content = content.replace(/export async function getPlayersFromSupabase[\s\S]*/m, `export async function getPlayersFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('jogadores')
      .select('*')
      .neq('id', 'system_config');
    
    if (error) {
      console.error("Error fetching players from Supabase:", error);
      return [];
    }
    return data || [];
  } catch (err) {
    console.error("Exception fetching players from Supabase:", err);
    return [];
  }
}

export async function upsertPlayerInSupabase(player: any) {
  try {
    const { error } = await supabase
      .from('jogadores')
      .upsert([
        {
          id: player.id,
          nome: player.name,
          time: player.team,
          logo_url: player.imageUrl || '',
          criado_em: player.createdAt ? new Date(player.createdAt).toISOString() : new Date().toISOString()
        }
      ]);
    if (error) {
      console.error("Error upserting player in Supabase:", error);
      throw error;
    }
  } catch (err) {
    console.error("Exception upserting player:", err);
    throw err;
  }
}

export async function deletePlayerInSupabase(id: string) {
  try {
    const { error } = await supabase
      .from('jogadores')
      .delete()
      .eq('id', id);
    if (error) {
      console.error("Error deleting player in Supabase:", error);
      throw error;
    }
  } catch (err) {
    console.error("Exception deleting player:", err);
    throw err;
  }
}

export async function getSettingsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('jogadores')
      .select('*')
      .eq('id', 'system_config')
      .single();
    
    if (error) {
      return null;
    }
    if (data && data.nome) {
      return JSON.parse(data.nome);
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function upsertSettingsInSupabase(settings: any) {
  try {
    const { error } = await supabase
      .from('jogadores')
      .upsert([
        {
          id: 'system_config',
          nome: JSON.stringify(settings),
          time: 'SYSTEM',
          logo_url: '',
          criado_em: new Date().toISOString()
        }
      ]);
    if (error) {
      console.error("Error upserting settings in Supabase:", error);
      throw error;
    }
  } catch (err) {
    console.error("Exception upserting settings:", err);
    throw err;
  }
}`);

fs.writeFileSync('src/supabase.ts', content);
