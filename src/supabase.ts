import { createClient } from '@supabase/supabase-js';

// Safe check for process environment in browser
if (typeof window !== 'undefined' && !(window as any).process) {
  (window as any).process = { env: {} };
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "https://dvpnwzinajfqxmfylkiy.supabase.co";
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cG53emluYWpmcXhtZnlsa2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTA0NzIsImV4cCI6MjA5ODQ4NjQ3Mn0.zyRm4dkQmthVvnKdg0fLT9KNm0pdHDqivbYRvxaO2hI";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Helper to get Bahia timezone date string (YYYY-MM-DD)
export function getBahiaDateStr(): string {
  const d = new Date();
  const utc = d.getTime() + (d.getTimezoneOffset() * 60000);
  const bahiaDate = new Date(utc + (3600000 * -3));
  
  const year = bahiaDate.getFullYear();
  const month = String(bahiaDate.getMonth() + 1).padStart(2, '0');
  const day = String(bahiaDate.getDate()).padStart(2, '0');
  
  return `${year}-${month}-${day}`;
}

export interface SupabaseVote {
  player_id: string;
  voter_id: string;
  date_str: string;
  voter_name?: string;
  voter_email?: string;
  voter_phone?: string;
  ip_address?: string;
  location_info?: string;
  user_agent?: string;
}

/**
 * Cast a vote directly to Supabase votos table.
 */
export async function castVoteInSupabase(
  playerId: string,
  voterId: string,
  voterInfo: { name?: string; email?: string; phone?: string; ipAddress?: string; locationInfo?: string },
  userAgent?: string,
  lastResetAt?: number
): Promise<void> {
  const dateStr = getBahiaDateStr();

  // 1. Check if already voted today on Supabase to prevent fraud/double-voting
  const checkState = await hasVotedTodayInSupabase(voterId, lastResetAt);
  if (checkState.voted) {
    throw new Error('Você já votou hoje nesta campanha!');
  }

  // 2. Perform direct insert into Supabase
  const payload: SupabaseVote = {
    player_id: playerId,
    voter_id: voterId,
    date_str: dateStr,
    voter_name: voterInfo.name || 'Anônimo',
    voter_email: voterInfo.email || '',
    voter_phone: voterInfo.phone || '',
    ip_address: voterInfo.ipAddress || 'N/A',
    location_info: voterInfo.locationInfo || 'N/A',
    user_agent: userAgent || 'N/A'
  };

  const { error: insertError } = await supabase
    .from('votos')
    .insert([payload]);

  if (insertError) {
    console.error("Supabase direct insert error:", insertError);
    if (insertError.message && insertError.message.includes('row-level security')) {
      throw new Error('Erro de permissão no Supabase. Certifique-se de configurar a política RLS para permitir inserções públicas.');
    }
    throw new Error(`Erro ao salvar voto no Supabase: ${insertError.message}`);
  }
}

/**
 * Check if a voter has already voted today on Supabase
 */
export async function hasVotedTodayInSupabase(voterId: string, lastResetAt?: number): Promise<{ voted: boolean; playerVotedId?: string }> {
  try {
    const { data, error } = await supabase
      .from('votos')
      .select('player_id, created_at, date_str')
      .eq('voter_id', voterId);

    if (error) {
      console.error("Error checking vote in Supabase:", error);
      return { voted: false };
    }

    if (data && data.length > 0) {
      // Filter today's votes in Bahia timezone
      const rawDate = getBahiaDateStr();
      const todayVotes = data.filter(v => v.date_str === rawDate);

      if (todayVotes.length > 0) {
        if (lastResetAt) {
          // Find if there is a vote created AFTER the lastResetAt
          const validVote = todayVotes.find(v => {
            const voteTime = new Date(v.created_at).getTime();
            return voteTime >= lastResetAt;
          });
          if (validVote) {
            return { voted: true, playerVotedId: validVote.player_id };
          }
          return { voted: false };
        }
        return { voted: true, playerVotedId: todayVotes[0].player_id };
      }
    }
    return { voted: false };
  } catch (err) {
    console.error("Exception checking vote in Supabase:", err);
    return { voted: false };
  }
}

/**
 * Retrieve all votes from Supabase to dynamically aggregate vote counts in real-time
 */
export async function getVotesFromSupabase(): Promise<{ player_id: string; created_at: string; date_str: string }[]> {
  try {
    const { data, error } = await supabase
      .from('votos')
      .select('player_id, created_at, date_str');

    if (error) {
      console.error("Error fetching votes from Supabase:", error);
      return [];
    }

    return (data || []) as any;
  } catch (err) {
    console.error("Exception fetching votes from Supabase:", err);
    return [];
  }
}

export async function deleteVoteInSupabase(voteId: string): Promise<void> {
  const numId = Number(voteId);
  const { error } = await supabase
    .from('votos')
    .delete()
    .eq('id', isNaN(numId) ? voteId : numId);

  if (error) {
    console.error("Error deleting vote in Supabase:", error);
    throw new Error(`Erro ao apagar voto: ${error.message}`);
  }
}

let resolvedPlayersTable: string | null = null;

export async function getPlayersTableName(): Promise<string> {
  if (resolvedPlayersTable) return resolvedPlayersTable;
  
  try {
    const { error } = await supabase.from('jogadores').select('id').limit(1);
    if (!error) {
      resolvedPlayersTable = 'jogadores';
      return 'jogadores';
    }
  } catch (e) {}
  
  try {
    const { error } = await supabase.from('cara').select('id').limit(1);
    if (!error) {
      resolvedPlayersTable = 'cara';
      return 'cara';
    }
  } catch (e) {}
  
  // Default to 'jogadores'
  return 'jogadores';
}

export async function getPlayersFromSupabase() {
  try {
    const tableName = await getPlayersTableName();
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .neq('id', 'configuracao_do_sistema');
    
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
    const tableName = await getPlayersTableName();
    // Serialize extra fields into the logo_url field to preserve them under basic table schema
    const logoUrlData = JSON.stringify({
      url: player.imageUrl || '',
      position: player.position || '',
      order: player.order || 0,
      imageFit: player.imageFit || 'cover',
      imagePosition: player.imagePosition || 'top'
    });

    const { error } = await supabase
      .from(tableName)
      .upsert([
        {
          id: player.id,
          nome: player.name,
          time: player.team,
          logo_url: logoUrlData,
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
    const tableName = await getPlayersTableName();
    const { error } = await supabase
      .from(tableName)
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
  // 1. Try to fetch from the 'configuracoes' table first
  try {
    const { data, error } = await supabase
      .from('configuracoes')
      .select('*')
      .eq('id', 'configuracao_do_sistema')
      .single();
    
    if (!error && data) {
      if (data.dados) {
        return JSON.parse(data.dados);
      }
      if (data.nome) {
        return JSON.parse(data.nome);
      }
    }
  } catch (err) {
    // Silently proceed to fallback
  }

  // 2. Fallback to players table with id 'configuracao_do_sistema'
  try {
    const tableName = await getPlayersTableName();
    const { data, error } = await supabase
      .from(tableName)
      .select('*')
      .eq('id', 'configuracao_do_sistema')
      .single();
    
    if (!error && data) {
      // If the data is stored in 'nome' field
      if (data.nome) {
        return JSON.parse(data.nome);
      }
      // If the data is stored in 'logo_url' field or something else
      if (data.logo_url && data.logo_url.startsWith('{')) {
        return JSON.parse(data.logo_url);
      }
    }
    return null;
  } catch (err) {
    console.error("Exception fetching settings from both tables:", err);
    return null;
  }
}

export async function upsertSettingsInSupabase(settings: any) {
  let success = false;

  // 1. Try to save to 'configuracoes' table
  try {
    const { error } = await supabase
      .from('configuracoes')
      .upsert([
        {
          id: 'configuracao_do_sistema',
          dados: JSON.stringify(settings)
        }
      ]);
    if (!error) {
      success = true;
    }
  } catch (err) {
    // Silently proceed
  }

  // 2. Fallback / Sync with players table (stores in 'nome' column as serialized JSON)
  try {
    const tableName = await getPlayersTableName();
    const { error } = await supabase
      .from(tableName)
      .upsert([
        {
          id: 'configuracao_do_sistema',
          nome: JSON.stringify(settings),
          time: 'SISTEMA',
          logo_url: '',
          criado_em: new Date().toISOString()
        }
      ]);
    if (error) {
      if (!success) {
        throw error;
      }
    } else {
      success = true;
    }
  } catch (err) {
    if (!success) {
      console.error("Exception upserting settings in fallback:", err);
      throw err;
    }
  }
}