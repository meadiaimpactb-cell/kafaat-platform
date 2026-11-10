// أدوات مشتركة لقوائم الإدارة: بحث وفلاتر وترقيم صفحات
export const PAGE_SIZE = 20;
export type SP = Record<string, string | undefined>;
export const pageOf = (sp: SP) => Math.max(1, Number(sp.page) || 1);
/** يهرّب محارف LIKE الخاصة لئلا يتحول البحث إلى نمط */
export const likeOf = (q: string) => `%${q.replace(/[\\%_]/g, m => '\\' + m)}%`;
/** يبني رابطاً يحافظ على المعاملات الحالية مع تغيير بعضها */
export function withParams(base: string, sp: SP, patch: SP) {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries({ ...sp, ...patch })) if (v) p.set(k, v);
  const q = p.toString();
  return q ? `${base}?${q}` : base;
}
