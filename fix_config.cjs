const fs = require('fs');
let content = fs.readFileSync('src/supabase.ts', 'utf8');

content = content.replace(/export async function getSettingsFromSupabase[\s\S]*?\}\s*$/m, `export async function getSettingsFromSupabase() {
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('id', 'system_config')
      .single();
    
    if (error) {
      return null;
    }
    if (data && data.dados) {
      return JSON.parse(data.dados);
    }
    return null;
  } catch (err) {
    return null;
  }
}

export async function upsertSettingsInSupabase(settings: any) {
  try {
    const { error } = await supabase
      .from('configuracoes')
      .upsert([
        {
          id: 'system_config',
          dados: JSON.stringify(settings)
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
