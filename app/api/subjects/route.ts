import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const result = await query(
      'SELECT id, name, description, created_at, updated_at FROM subjects ORDER BY name',
      []
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching subjects:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Valid name is required' },
        { status: 400 }
      );
    }

    // Check if subject already exists
    const existingSubject = await query(
      'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingSubject.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Subject with this name already exists' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO subjects (name, description) VALUES ($1, $2) RETURNING *',
      [name.trim(), description?.trim() || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating subject:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
