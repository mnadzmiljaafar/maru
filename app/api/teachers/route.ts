import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = user.isAdmin
      ? await query('SELECT id, name, email, phone, created_at, updated_at FROM teachers ORDER BY name')
      : await query(
          'SELECT id, name, email, phone, created_at, updated_at FROM teachers WHERE owner_email = $1 ORDER BY name',
          [user.email]
        );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error: any) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Valid name is required' }, { status: 400 });
    }

    const existingTeacher = await query(
      'SELECT id FROM teachers WHERE LOWER(name) = LOWER($1) AND owner_email = $2',
      [name.trim(), user.email]
    );
    if (existingTeacher.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Teacher with this name already exists' }, { status: 400 });
    }

    const result = await query(
      'INSERT INTO teachers (name, email, phone, owner_email) VALUES ($1, $2, $3, $4) RETURNING *',
      [name.trim(), email?.trim() || null, phone?.trim() || null, user.email]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
