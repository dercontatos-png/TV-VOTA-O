const fs = require('fs');
let code = fs.readFileSync('package.json', 'utf8');

const replace1 = `"dev": "vite --port=3000 --host=0.0.0.0",
    "build": "vite build",`;

const target1 = `"dev": "tsx server.ts",
    "build": "vite build && esbuild server.ts --bundle --platform=node --format=cjs --packages=external --sourcemap --outfile=dist/server.cjs",
    "start": "node dist/server.cjs",`;

code = code.replace(replace1, target1);
fs.writeFileSync('package.json', code);
