import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { unique_student_ids, teacher_name, subject, class_name, enrollment_date } = body;

    if (!Array.isArray(unique_student_ids) || unique_student_ids.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No unique students provided' },
        { status: 400 }
      );
    }

    if (!teacher_name?.trim() || !subject?.trim() || !enrollment_date?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Teacher, subject, and date are required' },
        { status: 400 }
      );
    }

    // Validate date format
    if (!/^\d{4}-\d{2}-\d{2}$/.test(enrollment_date)) {
      return NextResponse.json(
        { success: false, error: 'Invalid date format. Use YYYY-MM-DD' },
        { status: 400 }
      );
    }

    // Get or create teacher
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

    const teacherId = teacherResult.rows[0].id;

    // Get or create subject
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

    const subjectId = subjectResult.rows[0].id;

    let classId = null;
    // Get or create class if provided
    if (class_name?.trim()) {
      let classResult = await query(
        `SELECT id FROM classes WHERE name = $1`,
        [class_name.trim()]
      );

      if (classResult.rows.length === 0) {
        classResult = await query(
          `INSERT INTO classes (name) VALUES ($1) RETURNING id`,
          [class_name.trim()]
        );
      }
      classId = classResult.rows[0].id;
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
      createdEnrollmentIds: [] as number[],
    };

    // Create enrollment records for each unique student
    for (let i = 0; i < unique_student_ids.length; i++) {
      try {
        const uniqueStudentId = unique_student_ids[i];

        // Verify unique student exists
        const studentCheck = await query(
          `SELECT id FROM unique_students WHERE id = $1`,
          [uniqueStudentId]
        );

        if (studentCheck.rows.length === 0) {
          results.failureCount++;
          results.errors.push(`Unique student ID ${uniqueStudentId} does not exist`);
          continue;
        }

        // Check for duplicate enrollment (same unique_student, class, teacher, subject, date)
        const existingEnrollment = await query(
          `SELECT id FROM students 
           WHERE unique_student_id = $1 AND teacher_id = $2 AND subject_id = $3 AND enrollment_date = $4`,
          [uniqueStudentId, teacherId, subjectId, enrollment_date]
        );

        if (existingEnrollment.rows.length > 0) {
          results.failureCount++;
          results.errors.push(`Enrollment already exists for this student on this date with this teacher and subject`);
          continue;
        }

        // Create enrollment record
        const enrollmentResult = await query(
          `INSERT INTO students (unique_student_id, class_id, teacher_id, subject_id, enrollment_date) 
           VALUES ($1, $2, $3, $4, $5) 
           RETURNING id`,
          [uniqueStudentId, classId, teacherId, subjectId, enrollment_date]
        );

        const enrollmentId = enrollmentResult.rows[0].id;

        // Insert default ratings for this enrollment
        const ratingTypes = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'];
        for (const ratingType of ratingTypes) {
          await query(
            `INSERT INTO ratings (student_id, rating_type, is_selected) 
             VALUES ($1, $2, $3)`,
            [enrollmentId, ratingType, false]
          );
        }

        results.successCount++;
        results.createdEnrollmentIds.push(enrollmentId);
      } catch (error: any) {
        results.failureCount++;
        results.errors.push(`Failed to create assessment: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating assessments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create assessments' },
      { status: 500 }
    );
  }
}
