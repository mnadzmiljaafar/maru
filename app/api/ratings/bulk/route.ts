import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Only the binary mastery scale (or clearing) can be applied in bulk. TP levels
// are a per-student judgement and stay on the single-rating PATCH endpoint.
const ALLOWED_RATINGS = ['M', 'TM'];

// Applies one mastery rating to many students at once.
//
// scope 'overall'   -> the subtopic_id IS NULL row (direct, no-subtopic assessments)
// scope 'subtopics' -> every subtopic row of the assessment (subtopic-based assessments)
//
// The UNIQUE(student_id, assessment_id, subtopic_id) constraint cannot be used
// with ON CONFLICT here because Postgres treats NULL subtopic_id values as
// distinct, so each scope does an UPDATE followed by an INSERT of the rows that
// did not exist yet.
export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { assessment_id, student_ids, rating_type, scope } = body;

    const assessmentIdInt = parseInt(String(assessment_id), 10);
    if (isNaN(assessmentIdInt)) {
      return NextResponse.json({ success: false, error: 'Invalid assessment ID' }, { status: 400 });
    }

    if (!Array.isArray(student_ids) || student_ids.length === 0) {
      return NextResponse.json({ success: false, error: 'No students selected' }, { status: 400 });
    }

    const studentIds = student_ids
      .map((id: any) => parseInt(String(id), 10))
      .filter((id: number) => !isNaN(id));

    if (studentIds.length === 0) {
      return NextResponse.json({ success: false, error: 'Invalid student IDs' }, { status: 400 });
    }

    const ratingType: string | null = rating_type ?? null;
    if (ratingType !== null && !ALLOWED_RATINGS.includes(ratingType)) {
      return NextResponse.json({ success: false, error: 'Invalid rating type' }, { status: 400 });
    }

    if (scope !== 'overall' && scope !== 'subtopics') {
      return NextResponse.json({ success: false, error: 'Invalid scope' }, { status: 400 });
    }

    // Verify ownership and get the class the assessment belongs to
    const assessmentRes = await query(
      'SELECT class_id, owner_email FROM assessments WHERE id = $1',
      [assessmentIdInt]
    );
    if (
      assessmentRes.rows.length === 0 ||
      (!user.isAdmin && assessmentRes.rows[0].owner_email !== user.email)
    ) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

    // Drop any student that is not in this assessment's class
    const validStudents = await query(
      'SELECT id FROM students WHERE class_id = $1 AND id = ANY($2::int[])',
      [assessmentRes.rows[0].class_id, studentIds]
    );
    const validIds: number[] = validStudents.rows.map((r: any) => r.id);

    if (validIds.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid students for this assessment' },
        { status: 400 }
      );
    }

    if (scope === 'overall') {
      await query(
        `UPDATE ratings
         SET rating_type = $3, updated_at = CURRENT_TIMESTAMP
         WHERE assessment_id = $2 AND subtopic_id IS NULL AND student_id = ANY($1::int[])`,
        [validIds, assessmentIdInt, ratingType]
      );

      await query(
        `INSERT INTO ratings (student_id, assessment_id, subtopic_id, rating_type)
         SELECT s.id, $2, NULL, $3
         FROM unnest($1::int[]) AS s(id)
         WHERE NOT EXISTS (
           SELECT 1 FROM ratings r
           WHERE r.student_id = s.id AND r.assessment_id = $2 AND r.subtopic_id IS NULL
         )`,
        [validIds, assessmentIdInt, ratingType]
      );
    } else {
      await query(
        `UPDATE ratings
         SET rating_type = $3, updated_at = CURRENT_TIMESTAMP
         WHERE assessment_id = $2 AND subtopic_id IS NOT NULL AND student_id = ANY($1::int[])`,
        [validIds, assessmentIdInt, ratingType]
      );

      await query(
        `INSERT INTO ratings (student_id, assessment_id, subtopic_id, rating_type)
         SELECT s.id, $2, sub.id, $3
         FROM unnest($1::int[]) AS s(id)
         CROSS JOIN subtopics sub
         WHERE sub.assessment_id = $2
           AND NOT EXISTS (
             SELECT 1 FROM ratings r
             WHERE r.student_id = s.id AND r.assessment_id = $2 AND r.subtopic_id = sub.id
           )`,
        [validIds, assessmentIdInt, ratingType]
      );
    }

    return NextResponse.json({
      success: true,
      data: { updated_students: validIds, rating_type: ratingType, scope },
    });
  } catch (error: any) {
    console.error('Bulk rating update error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update ratings' },
      { status: 500 }
    );
  }
}
