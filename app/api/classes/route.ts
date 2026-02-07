import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const result = await query(
      `SELECT id, name FROM classes ORDER BY name ASC`
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching classes:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch classes' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Class name is required' },
        { status: 400 }
      );
    }

    const result = await query(
      `INSERT INTO classes (name) VALUES ($1) RETURNING id, name`,
      [name.trim()]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating class:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create class' },
      { status: 500 }
    );
  }
}
