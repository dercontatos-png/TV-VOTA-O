const fs = require('fs');
let content = fs.readFileSync('src/dbService.ts', 'utf8');

const regex = /export async function deleteVote[\s\S]*/m;
content = content.replace(regex, `export async function deleteVote(voteId: string, playerId?: string): Promise<void> {
  cachedSupabaseVotes = null; // Clear cached votes to update counts instantly
  try {
    const { deleteVoteInSupabase } = await import('./supabase');
    await deleteVoteInSupabase(voteId);
  } catch (err: any) {
    console.error("Could not delete vote from Supabase:", err);
    throw new Error(\`Erro ao deletar voto no Supabase: \${err.message || err}\`);
  }
}
`);

fs.writeFileSync('src/dbService.ts', content);
