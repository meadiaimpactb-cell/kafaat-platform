import { drizzle } from 'drizzle-orm/mysql2';
import mysql from 'mysql2/promise';
import * as schema from './schema';

const g = globalThis as unknown as { __kafaatPool?: mysql.Pool };
const pool = g.__kafaatPool ?? mysql.createPool({ uri: process.env.DATABASE_URL!, connectionLimit: 10, charset: 'utf8mb4', timezone: 'Z', decimalNumbers: true });
if (process.env.NODE_ENV !== 'production') g.__kafaatPool = pool;

export const db = drizzle(pool, { schema, mode: 'default' });
export { schema };
export * from './schema';
