const fs = require('fs');
let content = fs.readFileSync('src/dbService.ts', 'utf8');

content = content.replace(/export function isClientOnly\(\): boolean \{[\s\S]*?\}\s*export async function getPlayers/m, `export function isClientOnly(): boolean {
  return true; // Always use direct Supabase client for all environments (Netlify, AI Studio, local)
}

export async function getPlayers`);

fs.writeFileSync('src/dbService.ts', content);
