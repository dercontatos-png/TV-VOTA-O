const fs = require('fs');

let content = fs.readFileSync('src/dbService.ts', 'utf8');

// In getPlayers, we map supabasePlayers to Player
content = content.replace(/playersList = supabasePlayers.map\(\(p: any\) => \(\{[\s\S]*?\}\)\) as Player\[\];/m, `playersList = supabasePlayers.map((p: any) => ({
          id: p.id,
          name: p.nome || '',
          team: p.time || '',
          position: '',
          imageUrl: p.logo_url || '',
          imageFit: 'cover',
          imagePosition: 'top',
          order: 0,
          createdAt: p.criado_em ? new Date(p.criado_em).getTime() : Date.now(),
          votesCount: 0
        })) as Player[];`);


fs.writeFileSync('src/dbService.ts', content);
