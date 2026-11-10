import 'server-only';
import { cache } from 'react';
import { notFound } from 'next/navigation';
import { requireUser } from './auth';
import { getAssessment } from './workflow';

export const EDITABLE_STATUSES = ['DATA_COLLECTION', 'INFO_REQUESTED'];
export const RESULT_STATUSES = ['DESK_COMPLETED', 'VERIFICATION', 'CERTIFIED'];

/** تحميل طلب تقييم يخص جهة المستخدم الحالي */
export const loadOwn = cache(async (id: string) => {
  const u = await requireUser(['ORG_USER']);
  const a = await getAssessment(id);
  if (!a || !u.orgIds.includes(a.orgId)) notFound();
  return { u, a, editable: EDITABLE_STATUSES.includes(a.status), hasResult: RESULT_STATUSES.includes(a.status) };
});
