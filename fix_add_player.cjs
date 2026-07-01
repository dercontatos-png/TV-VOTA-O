const fs = require('fs');
let content = fs.readFileSync('src/dbService.ts', 'utf8');

content = content.replace(/const id = \`player_\$\{Date\.now\(\)\}\`;/, "const id = crypto.randomUUID ? crypto.randomUUID() : `player_${Date.now()}`;");

fs.writeFileSync('src/dbService.ts', content);
