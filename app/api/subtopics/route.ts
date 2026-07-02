import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser, type CurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

// Confirms the assessment exists and the user owns it (admins may access any).
async function ownsAssessment(assessmentId: number, user: CurrentUser): Promise<boolean> {
  const res = await query('SELECT owner_email FROM assessments WHERE id = $1', [assessmentId]);
  if (res.rows.length === 0) return false;
  return user.isAdmin || res.rows[0].owner_email === user.email;
}

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessment_id');

    if (!assessmentId) {
      return NextResponse.json({ success: false, error: 'Assessment ID is required' }, { status: 400 });
    }

    const assessmentIdInt = parseInt(assessmentId, 10);
    if (isNaN(assessmentIdInt)) {
      return NextResponse.json({ success: false, error: 'Invalid assessment ID' }, { status: 400 });
    }

    if (!(await ownsAssessment(assessmentIdInt, user))) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

    const result = await query(
      `SELECT id, assessment_id, name, created_at, updated_at
       FROM subtopics WHERE assessment_id = $1 ORDER BY created_at ASC`,
      [assessmentIdInt]
    );

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching subtopics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch subtopics' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { assessment_id, name } = body;

    if (!assessment_id || !name?.trim()) {
      return NextResponse.json({ success: false, error: 'Assessment ID and name are required' }, { status: 400 });
    }

    const assessmentIdInt = parseInt(assessment_id.toString(), 10);
    if (isNaN(assessmentIdInt)) {
      return NextResponse.json({ success: false, error: 'Invalid assessment ID' }, { status: 400 });
    }

    if (!(await ownsAssessment(assessmentIdInt, user))) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

    const result = await query(
      `INSERT INTO subtopics (assessment_id, name)
       VALUES ($1, $2)
       RETURNING id, assessment_id, name, created_at, updated_at`,
      [assessmentIdInt, name.trim()]
    );

    const studentsResult = await query(
      `SELECT DISTINCT s.id FROM students s
       JOIN assessments a ON s.class_id = a.class_id
       WHERE a.id = $1`,
      [assessmentIdInt]
    );

    const subtopicId = result.rows[0].id;
    for (const student of studentsResult.rows) {
      await query(
        `INSERT INTO ratings (student_id, assessment_id, subtopic_id, rating_type)
         VALUES ($1, $2, $3, NULL)
         ON CONFLICT (student_id, assessment_id, subtopic_id) DO NOTHING`,
        [student.id, assessmentIdInt, subtopicId]
      );
    }

    return NextResponse.json({ success: true, data: result.rows[0] }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating subtopic:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to create subtopic' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const subtopicId = searchParams.get('id');

    if (!subtopicId) {
      return NextResponse.json({ success: false, error: 'Subtopic ID is required' }, { status: 400 });
    }

    const subtopicIdInt = parseInt(subtopicId, 10);
    if (isNaN(subtopicIdInt)) {
      return NextResponse.json({ success: false, error: 'Invalid subtopic ID' }, { status: 400 });
    }

    // Verify ownership via the parent assessment
    const owner = await query(
      `SELECT a.owner_email FROM subtopics st
       JOIN assessments a ON st.assessment_id = a.id
       WHERE st.id = $1`,
      [subtopicIdInt]
    );
    if (owner.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subtopic not found' }, { status: 404 });
    }
    if (!user.isAdmin && owner.rows[0].owner_email !== user.email) {
      return NextResponse.json({ success: false, error: 'Subtopic not found' }, { status: 404 });
    }

    await query(`DELETE FROM subtopics WHERE id = $1`, [subtopicIdInt]);
    return NextResponse.json({ success: true, message: 'Subtopic deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subtopic:', error);
    return NextResponse.json({ success: false, error: error.message || 'Failed to delete subtopic' }, { status: 500 });
  }
}
