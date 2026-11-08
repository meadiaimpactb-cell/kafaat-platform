import { defineConfig } from 'drizzle-kit';
import fs from 'fs';

// تحميل متغيرات .env عند تشغيل أوامر drizzle-kit
if (fs.existsSync('.env')) for (const l of fs.readFileSync('.env', 'utf8').split('\n')) { const m = l.match(/^([A-Z_]+)="?(.*?)"?$/); if (m && !process.env[m[1]]) process.env[m[1]] = m[2]; }

export default defineConfig({
  schema: './src/db/schema.ts',
  out: './database/migrations',
  dialect: 'mysql',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
