const fs = require('fs');

let content = fs.readFileSync('src/supabase.ts', 'utf8');

content = content.replace(/export async function upsertPlayerInSupabase[\s\S]*?\}\s*\}/m, `export async function upsertPlayerInSupabase(player: any) {
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
}`);

content = content.replace(/export async function getSettingsFromSupabase[\s\S]*?\}\s*\}/m, `export async function getSettingsFromSupabase() {
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
      return JSON.parse(data.nome); // We store the JSON in the nome field
    }
    return null;
  } catch (err) {
    return null;
  }
}`);


content = content.replace(/export async function upsertSettingsInSupabase[\s\S]*?\}\s*\}/m, `export async function upsertSettingsInSupabase(settings: any) {
  try {
    const { error } = await supabase
      .from('jogadores')
      .upsert([
        {
          id: 'system_config',
          nome: JSON.stringify(settings), // Serialize entire config into nome
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
