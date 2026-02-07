import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const body = await request.json();
    const { rating_type, is_selected } = body;

    if (!rating_type || !['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'].includes(rating_type)) {
      return NextResponse.json(
        { success: false, error: 'Invalid rating type' },
        { status: 400 }
      );
    }

    // Update or insert rating
    try {
      const result = await query(
        `INSERT INTO ratings (student_id, rating_type, is_selected)
         VALUES ($1, $2, $3)
         ON CONFLICT (student_id, rating_type)
         DO UPDATE SET is_selected = $3, updated_at = CURRENT_TIMESTAMP
         RETURNING *`,
        [Number(studentId), rating_type, is_selected]
      );

      if (!result.rows[0]) {
        return NextResponse.json(
          { success: false, error: 'Failed to update rating' },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        data: result.rows[0],
      });
    } catch (error: any) {
      console.error('Rating update error:', error);
      return NextResponse.json(
        { success: false, error: error.message || 'Failed to update rating' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating rating:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update rating' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;

    // Delete student (ratings will be cascade deleted)
    await query('DELETE FROM students WHERE id = $1', [studentId]);

    return NextResponse.json({
      success: true,
      message: 'Student deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete student' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const studentId = params.id;
    const body = await request.json();
    const { name, date, teacher_name, subject, class: studentClass } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Student name is required' },
        { status: 400 }
      );
    }

    // Get or create unique student
    let uniqueStudentResult = await query(
      `SELECT id FROM unique_students WHERE name = $1`,
      [name.trim()]
    );

    if (uniqueStudentResult.rows.length === 0) {
      uniqueStudentResult = await query(
        `INSERT INTO unique_students (name) VALUES ($1) RETURNING id`,
        [name.trim()]
      );
    }

    const uniqueStudentId = uniqueStudentResult.rows[0].id;

    let classId = null;
    let teacherId = null;
    let subjectId = null;

    // Get or create class
    if (studentClass?.trim()) {
      let classResult = await query(
        `SELECT id FROM classes WHERE name = $1`,
        [studentClass.trim()]
      );
      if (classResult.rows.length === 0) {
        classResult = await query(
          `INSERT INTO classes (name) VALUES ($1) RETURNING id`,
          [studentClass.trim()]
        );
      }
      classId = classResult.rows[0].id;
    }

    // Get or create teacher
    if (teacher_name?.trim()) {
      let teacherResult = await query(
        `SELECT id FROM teachers WHERE name = $1`,
        [teacher_name.trim()]
      );
      if (teacherResult.rows.length === 0) {
        teacherResult = await query(
          `INSERT INTO teachers (name) VALUES ($1) RETURNING id`,
          [teacher_name.trim()]
        );
      }
      teacherId = teacherResult.rows[0].id;
    }

    // Get or create subject
    if (subject?.trim()) {
      let subjectResult = await query(
        `SELECT id FROM subjects WHERE name = $1`,
        [subject.trim()]
      );
      if (subjectResult.rows.length === 0) {
        subjectResult = await query(
          `INSERT INTO subjects (name) VALUES ($1) RETURNING id`,
          [subject.trim()]
        );
      }
      subjectId = subjectResult.rows[0].id;
    }

    // Check for duplicate before updating
    const duplicateCheck = await query(
      `SELECT id FROM students 
       WHERE id != $1 AND unique_student_id = $2 AND class_id = $3 AND teacher_id = $4 AND subject_id = $5 AND enrollment_date = $6`,
      [studentId, uniqueStudentId, classId, teacherId, subjectId, date]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Cannot update - would create duplicate record' },
        { status: 400 }
      );
    }

    const result = await query(
      `UPDATE students 
       SET unique_student_id = $1, class_id = $2, teacher_id = $3, subject_id = $4, enrollment_date = $5
       WHERE id = $6
       RETURNING *`,
      [uniqueStudentId, classId, teacherId, subjectId, date, studentId]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Fetch complete student with ratings and joined data
    const fullResult = await query(
      `SELECT 
        s.id,
        us.name,
        s.enrollment_date as date,
        COALESCE(c.name, '') as class,
        COALESCE(t.name, '') as teacher_name,
        COALESCE(sb.name, '') as subject,
        s.created_at,
        s.updated_at,
        COALESCE(
          json_agg(
            json_build_object(
              'rating_type', r.rating_type,
              'is_selected', r.is_selected
            ) ORDER BY r.rating_type
          ) FILTER (WHERE r.id IS NOT NULL),
          '[]'
        ) as ratings
       FROM students s
       JOIN unique_students us ON s.unique_student_id = us.id
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       LEFT JOIN ratings r ON s.id = r.student_id
       WHERE s.id = $1
       GROUP BY s.id, us.id, c.id, t.id, sb.id`,
      [studentId]
    );

    return NextResponse.json({
      success: true,
      data: fullResult.rows[0],
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student' },
      { status: 500 }
    );
  }
}
