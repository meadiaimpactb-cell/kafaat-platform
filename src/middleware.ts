import { NextResponse, type NextRequest } from 'next/server';

const PROTECTED = ['/portal', '/assessor', '/admin', '/print'];
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PROTECTED.some(p => pathname === p || pathname.startsWith(p + '/')) && !req.cookies.get('kafaat_session')) {
    const url = req.nextUrl.clone(); url.pathname = '/login'; url.searchParams.set('next', pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}
export const config = { matcher: ['/portal/:path*', '/assessor/:path*', '/admin/:path*', '/print/:path*'] };
