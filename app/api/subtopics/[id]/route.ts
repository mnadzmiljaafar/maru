import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

// Update subtopic name
export async function PATCH(
  request: Request,
  context: { params: { id: string } }
) {
  try {
    const body = await request.json();
    const { name } = body;
    const subtopicId = parseInt(context.params.id, 10);

    if (isNaN(subtopicId)) {
      return NextResponse.json({ error: 'Invalid subtopic ID' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }

    const result = await query(
      'UPDATE subtopics SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name.trim(), subtopicId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating subtopic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
