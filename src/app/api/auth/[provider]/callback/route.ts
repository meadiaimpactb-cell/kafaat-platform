import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isProvider, fetchProfile, resolveSocialUser, appUrl } from '@/lib/social';
import { createSession, homeFor } from '@/lib/auth';
import { db, users } from '@/db';
import { eq } from 'drizzle-orm';
import { notifyStaff } from '@/lib/notify';

export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const go = (path: string) => NextResponse.redirect(new URL(path, appUrl()));
  const fail = (e: string) => go(`/login?social_error=${e}&p=${provider}`);
  if (!isProvider(provider)) return fail('unknown');
  const jar = await cookies();
  const saved = jar.get('oauth_state')?.value ?? ''; const next = jar.get('oauth_next')?.value ?? '';
  jar.delete('oauth_state'); jar.delete('oauth_next');
  const q = req.nextUrl.searchParams;
  if (q.get('error')) return fail('denied');
  const [state, p] = saved.split('.');
  if (!state || p !== provider || q.get('state') !== state) return fail('state');
  const code = q.get('code'); if (!code) return fail('code');
  let profile;
  try { profile = await fetchProfile(provider, code); } catch { return fail('exchange'); }
  const r = await resolveSocialUser(provider, profile);
  if ('error' in r) return go(`/login?social_error=custom&msg=${encodeURIComponent(r.error)}&p=${provider}`);
  await createSession(r.userId);
  if (r.isNew) await notifyStaff('حساب جديد على المنصة (دخول اجتماعي)', profile.name || profile.email || '', '/admin/users');
  const u = (await db.select().from(users).where(eq(users.id, r.userId)).limit(1))[0];
  return go(r.isNew ? '/portal/onboarding?new=1' : next || homeFor(u.role));
}
