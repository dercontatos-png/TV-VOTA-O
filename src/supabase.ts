import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://dvpnwzinajfqxmfylkiy.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR2cG53emluYWpmcXhtZnlsa2l5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODI5MTA0NzIsImV4cCI6MjA5ODQ4NjQ3Mn0.zyRm4dkQmthVvnKdg0fLT9KNm0pdHDqivbYRvxaO2hI';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
