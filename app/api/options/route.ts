import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Fetch unique teachers
    const teachersResult = await query(
      `SELECT DISTINCT name FROM teachers WHERE name IS NOT NULL AND name != '' ORDER BY name`
    );

    // Fetch unique classes
    const classesResult = await query(
      `SELECT DISTINCT name FROM classes WHERE name IS NOT NULL AND name != '' ORDER BY name`
    );

    // Fetch unique topics/subjects
    const topicsResult = await query(
      `SELECT DISTINCT name FROM subjects WHERE name IS NOT NULL AND name != '' ORDER BY name`
    );

    return NextResponse.json({
      success: true,
      teachers: teachersResult.rows.map((r: any) => r.name),
      classes: classesResult.rows.map((r: any) => r.name),
      topics: topicsResult.rows.map((r: any) => r.name),
    });
  } catch (error) {
    console.error('Error fetching options:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch options' },
      { status: 500 }
    );
  }
}
