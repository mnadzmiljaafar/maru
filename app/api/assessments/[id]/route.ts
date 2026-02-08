import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10);

    if (isNaN(assessmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

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

    // Get all subtopics for this assessment
    const subtopicsResult = await query(
      `SELECT id, name FROM subtopics WHERE assessment_id = $1 ORDER BY created_at`,
      [assessmentId]
    );

    const subtopics = subtopicsResult.rows;

    // Get all students
    const studentsResult = await query(
      `SELECT 
        st.id,
        st.name,
        st.class_id
      FROM students st
      WHERE st.class_id = $1
      ORDER BY st.name`,
      [assessment.class_id]
    );

    // For each student, get their ratings
    const studentsWithRatings = await Promise.all(
      studentsResult.rows.map(async (student) => {
        let ratings: any[] = [];

        if (subtopics.length > 0) {
          // If there are subtopics, get ratings for each subtopic
          const ratingsResult = await query(
            `SELECT 
              r.subtopic_id,
              r.rating_type
            FROM ratings r
            WHERE r.student_id = $1 AND r.assessment_id = $2 AND r.subtopic_id IS NOT NULL
            ORDER BY r.subtopic_id`,
            [student.id, assessmentId]
          );
          ratings = ratingsResult.rows;
        } else {
          // No subtopics - get the overall rating
          const ratingResult = await query(
            `SELECT rating_type FROM ratings 
             WHERE student_id = $1 AND assessment_id = $2 AND subtopic_id IS NULL`,
            [student.id, assessmentId]
          );
          if (ratingResult.rows.length > 0) {
            ratings = [{ rating_type: ratingResult.rows[0].rating_type }];
          }
        }

        return {
          ...student,
          ratings,
        };
      })
    );

    return NextResponse.json({
      success: true,
      data: {
        assessment,
        subtopics,
        students: studentsWithRatings,
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

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10);

    if (isNaN(assessmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { teacher_id, subject_id, topic, assessment_date } = body;

    if (!teacher_id || !subject_id || !assessment_date) {
      return NextResponse.json(
        { success: false, error: 'Teacher ID, subject ID, and date are required' },
        { status: 400 }
      );
    }

    // Parse IDs to integers
    const teacherIdInt = parseInt(teacher_id.toString(), 10);
    const subjectIdInt = parseInt(subject_id.toString(), 10);

    if (isNaN(teacherIdInt) || isNaN(subjectIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(assessment_date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Update assessment
    const result = await query(
      `UPDATE assessments 
       SET teacher_id = $2, subject_id = $3, topic = $4, assessment_date = $5, updated_at = CURRENT_TIMESTAMP
       WHERE id = $1
       RETURNING id, class_id, teacher_id, subject_id, topic, assessment_date`,
      [assessmentId, teacherIdInt, subjectIdInt, topic || null, assessment_date]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error: any) {
    console.error('Error updating assessment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update assessment' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = parseInt(params.id, 10);

    if (isNaN(assessmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

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