import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const result = await query(
      'SELECT id, name, email, phone, created_at, updated_at FROM teachers ORDER BY name',
      []
    );

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error: any) {
    console.error('Error fetching teachers:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, email, phone } = body;

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json(
        { success: false, error: 'Valid name is required' },
        { status: 400 }
      );
    }

    // Check if teacher already exists
    const existingTeacher = await query(
      'SELECT id FROM teachers WHERE LOWER(name) = LOWER($1)',
      [name.trim()]
    );

    if (existingTeacher.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Teacher with this name already exists' },
        { status: 400 }
      );
    }

    const result = await query(
      'INSERT INTO teachers (name, email, phone) VALUES ($1, $2, $3) RETURNING *',
      [name.trim(), email?.trim() || null, phone?.trim() || null]
    );

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error creating teacher:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
