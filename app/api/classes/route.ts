import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const result = user.isAdmin
      ? await query(`SELECT id, name, description FROM classes ORDER BY name ASC`)
      : await query(
          `SELECT id, name, description FROM classes WHERE owner_email = $1 ORDER BY name ASC`,
          [user.email]
        );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch classes' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name, description } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Class name is required' }, { status: 400 });
    }

    const result = await query(
      `INSERT INTO classes (name, description, owner_email) VALUES ($1, $2, $3) RETURNING id, name, description`,
      [name.trim(), description?.trim() || null, user.email]
    );

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating class:', error);
    if (error?.code === '23505') {
      return NextResponse.json({ success: false, error: 'Class with this name already exists' }, { status: 400 });
    }
    return NextResponse.json({ success: false, error: error.message || 'Failed to create class' }, { status: 500 });
  }
}
