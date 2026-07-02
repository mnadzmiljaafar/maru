// Data-access helpers for the SaaS account / subscription registry.
// The `accounts` table is the source of truth for who may sign in and whether
// their subscription is still valid. See scripts/migrate-saas.js for the schema.

import { query } from '@/lib/db';

export type AccountRole = 'superadmin' | 'user';
export type AccountStatus = 'active' | 'inactive';

export interface Account {
  email: string;
  full_name: string | null;
  phone: string | null;
  role: AccountRole;
  status: AccountStatus;
  subscription_expires_at: string | null; // ISO string or null (= unlimited)
  created_at: string;
  updated_at: string;
}

export async function getAccount(email?: string | null): Promise<Account | null> {
  if (!email) return null;
  const res = await query(
    `SELECT email, full_name, phone, role, status, subscription_expires_at, created_at, updated_at
     FROM accounts WHERE email = $1`,
    [email.toLowerCase()]
  );
  return (res.rows[0] as Account) || null;
}

// An account may sign in when it is active and its subscription has not lapsed.
// A NULL expiry means unlimited. Superadmins are always considered valid.
export function isAccountValid(acc: Account | null): boolean {
  if (!acc) return false;
  if (acc.role === 'superadmin') return true;
  if (acc.status !== 'active') return false;
  if (!acc.subscription_expires_at) return true; // unlimited
  return new Date(acc.subscription_expires_at).getTime() > Date.now();
}

// Grant `months` of access. Extends from the later of "now" or the current
// expiry so that renewing early doesn't lose remaining days. Used on payment
// approval. Also (re)activates the account.
export async function extendSubscription(
  email: string,
  months: number
): Promise<Account | null> {
  const res = await query(
    `INSERT INTO accounts (email, role, status, subscription_expires_at)
     VALUES ($1, 'user', 'active',
             (NOW() + ($2 || ' months')::interval))
     ON CONFLICT (email) DO UPDATE SET
       status = 'active',
       subscription_expires_at =
         GREATEST(COALESCE(accounts.subscription_expires_at, NOW()), NOW())
         + ($2 || ' months')::interval,
       ended_notified_at = NULL,
       updated_at = NOW()
     RETURNING email, full_name, phone, role, status, subscription_expires_at, created_at, updated_at`,
    [email.toLowerCase(), String(months)]
  );
  return (res.rows[0] as Account) || null;
}
