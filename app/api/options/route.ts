import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const scoped = !user.isAdmin;
    const where = scoped ? "AND owner_email = $1" : '';
    const p: any[] = scoped ? [user.email] : [];

    const teachersResult = await query(
      `SELECT DISTINCT name FROM teachers WHERE name IS NOT NULL AND name != '' ${where} ORDER BY name`,
      p
    );
    const classesResult = await query(
      `SELECT DISTINCT name FROM classes WHERE name IS NOT NULL AND name != '' ${where} ORDER BY name`,
      p
    );
    const topicsResult = await query(
      `SELECT DISTINCT name FROM subjects WHERE name IS NOT NULL AND name != '' ${where} ORDER BY name`,
      p
    );

    return NextResponse.json({
      success: true,
      teachers: teachersResult.rows.map((r: any) => r.name),
      classes: classesResult.rows.map((r: any) => r.name),
      topics: topicsResult.rows.map((r: any) => r.name),
    });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch options' }, { status: 500 });
  }
}
