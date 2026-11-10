import { NextResponse, type NextRequest } from 'next/server';
import { cookies } from 'next/headers';
import { isProvider, providerConfig, endpoints, callbackUrl, SOCIAL, appUrl } from '@/lib/social';
import { randomToken } from '@/lib/crypto';

/** بداية الدخول الاجتماعي: يوجّه المستخدم إلى المزوّد مع حالة (state) عشوائية للحماية من التزوير */
export async function GET(req: NextRequest, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const back = (e: string) => NextResponse.redirect(new URL(`/login?social_error=${e}&p=${provider}`, appUrl()));
  if (!isProvider(provider)) return back('unknown');
  const cfg = await providerConfig(provider);
  if (!cfg.enabled) return back('disabled');
  const state = randomToken(24); const next = req.nextUrl.searchParams.get('next') ?? '';
  const jar = await cookies(); const opts = { httpOnly: true, sameSite: 'lax' as const, secure: appUrl().startsWith('https'), path: '/', maxAge: 600 };
  jar.set('oauth_state', `${state}.${provider}`, opts); jar.set('oauth_next', next.startsWith('/') && !next.startsWith('//') ? next : '', opts);
  const u = new URL(endpoints(provider).auth);
  u.search = new URLSearchParams({ response_type: 'code', client_id: cfg.clientId, redirect_uri: callbackUrl(provider), scope: SOCIAL[provider].scope, state }).toString();
  return NextResponse.redirect(u);
}
