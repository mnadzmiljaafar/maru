import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = params.id;

    // Get assessment details
    const assessmentResult = await query(
      `SELECT 
        a.id,
        a.class_id,
        a.teacher_id,
        a.subject_id,
        a.topic,
        a.assessment_date,
        c.name as class_name,
        t.name as teacher_name,
        s.name as subject_name
      FROM assessments a
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = $1`,
      [assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const assessment = assessmentResult.rows[0];

    // Get all students and their single rating for this assessment
    const studentsResult = await query(
      `SELECT 
        st.id,
        st.name,
        st.class_id,
        r.rating_type
      FROM students st
      LEFT JOIN ratings r ON st.id = r.student_id AND r.assessment_id = $1
      WHERE st.class_id = $2
      ORDER BY st.name`,
      [assessmentId, assessment.class_id]
    );

    return NextResponse.json({
      success: true,
      data: {
        assessment,
        students: studentsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching assessment details:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assessment details' },
      { status: 500 }
    );
  }
}
export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = params.id;

    // Delete assessment and all related ratings (cascade delete handles this)
    const result = await query(
      `DELETE FROM assessments WHERE id = $1 RETURNING id`,
      [assessmentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Assessment deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting assessment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete assessment' },
      { status: 500 }
    );
  }
}