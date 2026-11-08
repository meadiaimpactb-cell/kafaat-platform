// تحميل .env للسكربتات المستقلة (البذر)
import fs from 'fs';
if (fs.existsSync('.env')) for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)="?(.*?)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }
