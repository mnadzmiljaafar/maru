import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const { ids } = body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No student IDs provided' },
        { status: 400 }
      );
    }

    // Delete multiple students (ratings will be cascade deleted)
    const placeholders = ids.map((_, i) => `$${i + 1}`).join(',');
    const result = await query(
      `DELETE FROM students WHERE id IN (${placeholders})`,
      ids
    );

    return NextResponse.json({
      success: true,
      message: `Successfully deleted ${result.rowCount} student(s)`,
      deletedCount: result.rowCount,
    });
  } catch (error) {
    console.error('Error bulk deleting students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to delete students' },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body;

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No updates provided' },
        { status: 400 }
      );
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < updates.length; i++) {
      try {
        const { id, name, date, teacher_name, subject, class: studentClass } = updates[i];

        if (!id || !name || !name.trim()) {
          results.failureCount++;
          results.errors.push(`Row ${i + 1}: Missing ID or name`);
          continue;
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

        // Check for duplicate (same unique_student_id, class, teacher, subject, date) before updating
        const duplicateCheck = await query(
          `SELECT id FROM students 
           WHERE id != $1 AND unique_student_id = $2 AND class_id = $3 AND teacher_id = $4 AND subject_id = $5 AND enrollment_date = $6`,
          [id, uniqueStudentId, classId, teacherId, subjectId, date]
        );

        if (duplicateCheck.rows.length > 0) {
          results.failureCount++;
          results.errors.push(`Row ${i + 1}: Cannot update - would create duplicate record`);
          continue;
        }

        const result = await query(
          `UPDATE students 
           SET unique_student_id = $1, class_id = $2, teacher_id = $3, subject_id = $4, enrollment_date = $5, updated_at = CURRENT_TIMESTAMP
           WHERE id = $6`,
          [uniqueStudentId, classId, teacherId, subjectId, date, id]
        );

        if (result.rowCount === 0) {
          results.failureCount++;
          results.errors.push(`Row ${i + 1}: Student not found`);
        } else {
          results.successCount++;
        }
      } catch (error: any) {
        results.failureCount++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error) {
    console.error('Error bulk updating students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update students' },
      { status: 500 }
    );
  }
}
