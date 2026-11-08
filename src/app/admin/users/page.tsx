import { desc, inArray } from 'drizzle-orm';
import { UserPlus } from 'lucide-react';
import { db, users } from '@/db';
import { requireStaff, permissionsOf } from '@/lib/auth';
import { PERMISSIONS } from '@/lib/permissions';
import { PageHeader, Card, CardTitle, Table, Td, Badge, Avatar } from '@/components/ui';
import { ActionForm } from '@/components/admin/action-form';
import { Submit } from '@/components/client/submit';
import { saveUser } from '@/app/actions/admin';
import { ROLE_LABEL } from '@/lib/domain';
import { fmtRel } from '@/lib/format';

export const metadata = { title: 'الفريق والصلاحيات' };
const groups = [...new Set(PERMISSIONS.map(p => p.group))];

function UserFields({ u, isAdmin }: { u?: typeof users.$inferSelect; isAdmin: boolean }) {
  const perms = new Set(u?.permissions ?? []);
  return (
    <div className="space-y-4">
      {u && <input type="hidden" name="id" value={u.id} />}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label><span className="label">الاسم</span><input name="name" defaultValue={u?.name} className="input" /></label>
        <label><span className="label">البريد</span><input name="email" type="email" defaultValue={u?.email} className="input ltr" /></label>
        <label><span className="label">الجوال</span><input name="phone" defaultValue={u?.phone ?? ''} className="input ltr" /></label>
        <label><span className="label">الدور</span><select name="role" defaultValue={u?.role ?? 'ASSESSOR'} className="input">{isAdmin && <option value="SUPER_ADMIN">أدمن (كل الصلاحيات)</option>}{isAdmin && <option value="ACCOUNT_MANAGER">مدير حساب (صلاحيات محددة)</option>}<option value="ASSESSOR">مقيّم</option></select></label>
        <label><span className="label">{u ? 'كلمة مرور جديدة (اختياري)' : 'كلمة المرور'}</span><input name="password" type="password" className="input ltr" autoComplete="new-password" /></label>
        <label className="lg:col-span-2"><span className="label">التخصصات (للمقيّم)</span><input name="specialties" defaultValue={u?.specialties ?? ''} className="input" placeholder="الصحة، التمكين الاقتصادي…" /></label>
        <div className="flex flex-col justify-end gap-2 text-sm"><label className="flex items-center gap-2"><input type="checkbox" name="isFieldVerifier" defaultChecked={u?.isFieldVerifier} className="size-4 accent-forest-700" /> مستشار زيارات ميدانية</label><label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={u?.active ?? true} className="size-4 accent-forest-700" /> الحساب مفعّل</label></div>
      </div>
      {isAdmin && <details className="rounded-2xl bg-forest-50 p-4" open={u?.role === 'ACCOUNT_MANAGER'}><summary className="cursor-pointer font-semibold">صلاحيات مدير الحساب</summary><p className="mt-1 text-xs text-muted">تنطبق عند اختيار دور «مدير حساب». الأدمن يملك كل الصلاحيات.</p><div className="mt-3 grid gap-4 md:grid-cols-3">{groups.map(g => <div key={g}><div className="mb-1.5 text-xs font-bold text-forest-700">{g}</div>{PERMISSIONS.filter(p => p.group === g).map(p => <label key={p.code} className="flex items-center gap-2 py-0.5 text-sm"><input type="checkbox" name={'perm_' + p.code} defaultChecked={perms.has(p.code)} className="size-4 accent-forest-700" />{p.label}</label>)}</div>)}</div></details>}
    </div>
  );
}
export default async function Page({ searchParams }: { searchParams: Promise<{ created?: string }> }) {
  const me = await requireStaff('users.manage'); const sp = await searchParams;
  const isAdmin = me.role === 'SUPER_ADMIN';
  const rows = await db.select().from(users).where(inArray(users.role, ['SUPER_ADMIN', 'ACCOUNT_MANAGER', 'ASSESSOR'])).orderBy(desc(users.createdAt));
  return (
    <div className="space-y-6">
      <PageHeader title="الفريق والصلاحيات" subtitle="الأدمن يملك كل شيء، ومدير الحساب يملك ما تمنحه من صلاحيات، والمقيّم يرى الطلبات المسندة إليه فقط." />
      {sp.created && <div className="rounded-2xl bg-forest-100 p-4 font-semibold text-forest-800">أُنشئ الحساب، ويمكن لصاحبه الدخول الآن.</div>}
      <Card className="p-6"><CardTitle title="إضافة عضو" icon={<UserPlus className="size-5" />} /><ActionForm action={saveUser} className="mt-5 space-y-4"><UserFields isAdmin={isAdmin} /><Submit>إضافة</Submit></ActionForm></Card>
      <Table head={['العضو', 'الدور', 'الصلاحيات', 'آخر دخول', 'الحالة', '']}>
        {rows.map(u => <tr key={u.id}>
          <Td><div className="flex items-center gap-3"><Avatar name={u.name} /><div><div className="font-semibold">{u.name}</div><div className="ltr text-right text-xs text-muted">{u.email}</div></div></div></Td>
          <Td><Badge tone={u.role === 'SUPER_ADMIN' ? 'violet' : u.role === 'ACCOUNT_MANAGER' ? 'sky' : 'green'}>{ROLE_LABEL[u.role]}</Badge>{u.isFieldVerifier && <Badge tone="teal" className="ms-1">ميداني</Badge>}</Td>
          <Td className="max-w-xs text-xs text-muted">{u.role === 'SUPER_ADMIN' ? 'كل الصلاحيات' : u.role === 'ACCOUNT_MANAGER' ? `${permissionsOf(u).length} صلاحية` : 'الطلبات المسندة'}</Td>
          <Td className="text-muted">{fmtRel(u.lastLoginAt)}</Td><Td>{u.active ? <Badge tone="green" dot>مفعّل</Badge> : <Badge tone="rose">معطّل</Badge>}</Td>
          <Td>{(isAdmin || u.role === 'ASSESSOR') && <details className="relative"><summary className="cursor-pointer list-none text-sm font-semibold text-forest-700">تعديل</summary><div className="absolute left-0 z-10 mt-2 w-[min(92vw,60rem)] rounded-2xl bg-white p-5 shadow-2xl ring-1 ring-line"><ActionForm action={saveUser} className="space-y-4"><UserFields u={u} isAdmin={isAdmin} /><Submit size="sm">حفظ</Submit></ActionForm></div></details>}</Td>
        </tr>)}
      </Table>
    </div>
  );
}
