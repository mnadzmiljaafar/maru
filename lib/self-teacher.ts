// Each subscription maps to exactly ONE teacher: the account owner themselves.
// Teachers are no longer added manually — this resolves (and lazily creates) the
// owner's single teacher record so assessments can reference it.
//
// The name defaults to the Google display name on first creation, but is NEVER
// overwritten afterwards — the user may rename themselves via /api/profile.

import { query } from '@/lib/db';

// Returns the teacher id representing this owner, creating it if needed.
export async function ensureSelfTeacherId(
  ownerEmail: string,
  googleName: string | null
): Promise<number> {
  const existing = await query(
    `SELECT id FROM teachers WHERE owner_email = $1 ORDER BY id LIMIT 1`,
    [ownerEmail]
  );
  if (existing.rows.length > 0) {
    return existing.rows[0].id;
  }
  const name = (googleName && googleName.trim()) || ownerEmail;
  const created = await query(
    `INSERT INTO teachers (name, email, owner_email) VALUES ($1, $2, $3) RETURNING id`,
    [name, ownerEmail, ownerEmail]
  );
  return created.rows[0].id;
}

// Returns the owner's teacher row (creating it if needed) — used by the profile
// endpoint so the user can view/edit their own name.
export async function getSelfTeacher(
  ownerEmail: string,
  googleName: string | null
): Promise<{ id: number; name: string; email: string | null }> {
  const id = await ensureSelfTeacherId(ownerEmail, googleName);
  const res = await query(`SELECT id, name, email FROM teachers WHERE id = $1`, [id]);
  return res.rows[0];
}
