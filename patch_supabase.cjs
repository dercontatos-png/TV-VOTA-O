const fs = require('fs');

let content = fs.readFileSync('src/supabase.ts', 'utf8');

content += `
export async function getPlayersFromSupabase() {
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
          name: player.name,
          team: player.team,
          position: player.position || '',
          imageUrl: player.imageUrl || '',
          imageFit: player.imageFit || 'cover',
          imagePosition: player.imagePosition || 'top',
          order: player.order || 0,
          createdAt: player.createdAt || Date.now()
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
    if (data && data.name) {
      return JSON.parse(data.name); // We store the JSON in the name field
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
          name: JSON.stringify(settings), // Serialize entire config into name
          team: 'SYSTEM',
          position: 'CONFIG',
          order: -1
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
}
`;

fs.writeFileSync('src/supabase.ts', content);
