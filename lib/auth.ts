import { NextAuthOptions, getServerSession } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { getAccount, isAccountValid } from '@/lib/accounts';

function parseList(v?: string): string[] {
  return (v || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

// Legacy env whitelist — kept only as a cutover fallback so that a missed seed
// can never lock a known email out of production. The `accounts` table is the
// real source of truth. Safe to remove once fully migrated.
const LEGACY_SUPERADMIN = 'muhammadnadzmil@gmail.com';
const LEGACY_ADMIN_EMAILS = parseList(
  process.env.ADMIN_EMAILS || 'hafizatulamani02@gmail.com'
);
const LEGACY_ALLOWED_EMAILS = parseList(process.env.ALLOWED_EMAILS);

function isLegacyAllowed(email: string): boolean {
  return (
    email === LEGACY_SUPERADMIN ||
    LEGACY_ADMIN_EMAILS.includes(email) ||
    LEGACY_ALLOWED_EMAILS.includes(email)
  );
}

// Decide whether an email may sign in, and with what role. Consults the DB
// first, then falls back to the legacy env whitelist during cutover.
async function resolveAccess(
  email?: string | null
): Promise<{ allowed: boolean; role: 'superadmin' | 'user' }> {
  if (!email) return { allowed: false, role: 'user' };
  const e = email.toLowerCase();
  try {
    const acc = await getAccount(e);
    if (acc) {
      return { allowed: isAccountValid(acc), role: acc.role };
    }
  } catch (err) {
    // DB unreachable — fall through to legacy check so production stays up.
    console.error('resolveAccess DB error, using legacy fallback:', err);
  }
  if (isLegacyAllowed(e)) {
    return { allowed: true, role: e === LEGACY_SUPERADMIN ? 'superadmin' : 'user' };
  }
  return { allowed: false, role: 'user' };
}

export function isSuperadminEmail(email?: string | null): boolean {
  return !!email && email.toLowerCase() === LEGACY_SUPERADMIN;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    }),
  ],
  session: { strategy: 'jwt' },
  secret: process.env.NEXTAUTH_SECRET,
  pages: { signIn: '/login' },
  callbacks: {
    // Reject anyone who is not on an active, unexpired account.
    async signIn({ user }) {
      const { allowed } = await resolveAccess(user.email);
      return allowed;
    },
    async jwt({ token }) {
      const { role } = await resolveAccess(token.email as string | undefined);
      (token as any).role = role;
      (token as any).isSuperadmin = role === 'superadmin';
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        (session.user as any).role = (token as any).role || 'user';
        (session.user as any).isSuperadmin = !!(token as any).isSuperadmin;
      }
      return session;
    },
  },
};

export type CurrentUser = {
  email: string;
  role: 'superadmin' | 'user';
  isSuperadmin: boolean;
  // Retained for backward compatibility with data routes. Owner-scoping now
  // applies to every tenant (including the superadmin) so tenants stay
  // isolated; nobody bypasses the owner filter.
  isAdmin: boolean;
};

// Resolve the signed-in user for API route handlers. Returns null when there is
// no valid, active session (callers should respond 401 in that case). This is
// the live gate: it re-checks the account on every request, so a lapsed or
// deactivated subscription is blocked immediately.
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const session = await getServerSession(authOptions);
  const email = session?.user?.email;
  if (!email) return null;
  const { allowed, role } = await resolveAccess(email);
  if (!allowed) return null;
  return {
    email: email.toLowerCase(),
    role,
    isSuperadmin: role === 'superadmin',
    isAdmin: false,
  };
}

// Guard for superadmin-only (platform) API routes.
export async function requireSuperadmin(): Promise<CurrentUser | null> {
  const user = await getCurrentUser();
  if (!user || !user.isSuperadmin) return null;
  return user;
}
