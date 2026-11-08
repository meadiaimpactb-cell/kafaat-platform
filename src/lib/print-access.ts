import 'server-only';
import { notFound } from 'next/navigation';
import { requireUser, can } from './auth';
import type { Permission } from './permissions';

/** صاحب الجهة أو موظف يملك الصلاحية */
export async function requireOwnerOrStaff(orgId: string, perm: Permission) {
  const u = await requireUser();
  if (u.role === 'ORG_USER' ? u.orgId !== orgId : !(u.role === 'SUPER_ADMIN' || can(u, perm) || u.role === 'ASSESSOR')) notFound();
  return u;
}
