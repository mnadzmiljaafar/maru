import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { getSelfTeacher, ensureSelfTeacherId } from '@/lib/self-teacher';

export const dynamic = 'force-dynamic';

// The signed-in user's own teacher profile. Email comes from Google (read-only);
// the name is editable.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  const teacher = await getSelfTeacher(user.email, user.name);
  return NextResponse.json({
    success: true,
    data: { email: user.email, name: teacher.name },
  });
}

// Update only the display name of the user's own teacher record.
export async function PATCH(request: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    if (!name) {
      return NextResponse.json({ success: false, error: 'Nama diperlukan' }, { status: 400 });
    }

    const id = await ensureSelfTeacherId(user.email, user.name);
    const res = await query(
      `UPDATE teachers SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
       RETURNING id, name, email`,
      [name, id]
    );
    return NextResponse.json({ success: true, data: res.rows[0] });
  } catch (error: any) {
    console.error('Error updating profile:', error);
    return NextResponse.json({ success: false, error: 'Gagal kemaskini profil' }, { status: 500 });
  }
}
