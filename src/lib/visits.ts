import 'server-only';
import { db, visitEvents } from '@/db';

/** يسجل حدثاً في الخط الزمني للزيارة (يظهر للإدارة والخبير والجهة) */
export async function addVisitEvent(visitId: string, type: string, o: { actor?: { id: string; role: string } | null; note?: string | null; data?: Record<string, unknown> } = {}) {
  await db.insert(visitEvents).values({ visitId, type, actorId: o.actor?.id ?? null, actorRole: o.actor?.role ?? null, note: o.note ?? null, data: o.data });
}
