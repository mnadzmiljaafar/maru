import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Public routes: the marketing landing page (/), the subscribe/payment flow,
  // the login page, NextAuth + subscribe endpoints, and static assets
  // (images/fonts/etc.) served from /public — these must load pre-login.
  if (
    pathname === '/' ||
    pathname === '/login' ||
    pathname === '/subscribe' ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/subscribe') ||
    pathname.startsWith('/api/cron') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon') ||
    /\.(png|jpe?g|svg|gif|webp|ico|bmp|woff2?|ttf|otf)$/i.test(pathname)
  ) {
    return NextResponse.next();
  }

  // Validate the NextAuth session token (JWT signed with NEXTAUTH_SECRET).
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
  });

  if (!token) {
    // API routes get a 401; page routes redirect to the login screen.
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
