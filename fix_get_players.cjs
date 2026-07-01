const fs = require('fs');
let content = fs.readFileSync('src/supabase.ts', 'utf8');

content = content.replace(/\.neq\('id', 'system_config'\);/, ";");

fs.writeFileSync('src/supabase.ts', content);
