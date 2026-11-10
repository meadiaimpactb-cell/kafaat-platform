import 'server-only';
import fs from 'fs/promises';
import path from 'path';
import { createId } from '@paralleldrive/cuid2';
import { sha256 } from './crypto';

export const STORAGE_DIR = path.resolve(process.env.STORAGE_DIR || './storage/uploads');
export const ALLOWED_TYPES: Record<string, string> = {
  'application/pdf': 'pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'xlsx',
  'application/vnd.ms-excel': 'xls',
  'application/msword': 'doc',
  'text/csv': 'csv',
  'text/plain': 'txt',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'pptx',
};
export const MAX_UPLOAD_MB = 30;

const EXT_TYPES: Record<string, string> = Object.fromEntries(Object.entries(ALLOWED_TYPES).map(([m, e]) => [e, m]).concat([['jpeg', 'image/jpeg'], ['doc', 'application/msword']]));
/** بعض المتصفحات (خصوصاً على ويندوز) تسلّم الملف المسحوب بنوع فارغ أو octet-stream؛ نستنتج النوع من الامتداد */
export function resolveType(file: { name: string; type: string }): string {
  if (file.type && file.type !== 'application/octet-stream') return file.type;
  const ext = file.name.split('.').pop()?.toLowerCase() ?? '';
  return EXT_TYPES[ext] ?? file.type ?? '';
}
export const isAllowed = (file: { name: string; type: string }) => !!ALLOWED_TYPES[resolveType(file)];

export async function saveFile(folder: string, file: File) {
  const buf = Buffer.from(await file.arrayBuffer());
  const type = resolveType(file);
  const ext = ALLOWED_TYPES[type] || path.extname(file.name).slice(1).toLowerCase() || 'bin';
  const rel = path.join(folder, `${createId()}.${ext}`);
  const abs = path.join(STORAGE_DIR, rel);
  await fs.mkdir(path.dirname(abs), { recursive: true });
  await fs.writeFile(abs, buf);
  return { storedPath: rel, size: buf.length, sha256: sha256(buf), mimeType: type || 'application/octet-stream' };
}
export async function readFile(rel: string) {
  const abs = path.join(STORAGE_DIR, rel);
  if (!abs.startsWith(STORAGE_DIR)) throw new Error('invalid path');
  return fs.readFile(abs);
}
