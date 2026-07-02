import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Update subtopic name
export async function PATCH(request: Request, context: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { name } = body;
    const subtopicId = parseInt(context.params.id, 10);

    if (isNaN(subtopicId)) {
      return NextResponse.json({ error: 'Invalid subtopic ID' }, { status: 400 });
    }

    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ error: 'Valid name is required' }, { status: 400 });
    }

    // Verify ownership via the parent assessment
    const owner = await query(
      `SELECT a.owner_email FROM subtopics st
       JOIN assessments a ON st.assessment_id = a.id
       WHERE st.id = $1`,
      [subtopicId]
    );
    if (owner.rows.length === 0) {
      return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 });
    }
    if (!user.isAdmin && owner.rows[0].owner_email !== user.email) {
      return NextResponse.json({ error: 'Subtopic not found' }, { status: 404 });
    }

    const result = await query(
      'UPDATE subtopics SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name.trim(), subtopicId]
    );

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating subtopic:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
