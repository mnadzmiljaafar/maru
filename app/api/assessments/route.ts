import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');
    const assessmentId = searchParams.get('assessment_id');

    let queryText = `
      SELECT 
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
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (classId) {
      const classIdInt = parseInt(classId, 10);
      if (!isNaN(classIdInt)) {
        queryText += ` AND a.class_id = $${paramCount}`;
        params.push(classIdInt);
        paramCount++;
      }
    }

    if (assessmentId) {
      const assessmentIdInt = parseInt(assessmentId, 10);
      if (!isNaN(assessmentIdInt)) {
        queryText += ` AND a.id = $${paramCount}`;
        params.push(assessmentIdInt);
        paramCount++;
      }
    }

    queryText += ` ORDER BY a.assessment_date DESC`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching assessments:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch assessments' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { class_id, teacher_id, subject_id, topic, assessment_date, subtopics } = body;

    if (!class_id || !teacher_id || !subject_id || !assessment_date) {
      return NextResponse.json(
        { success: false, error: 'Class, teacher, subject, and date are required' },
        { status: 400 }
      );
    }

    // Parse IDs to integers
    const classIdInt = parseInt(class_id.toString(), 10);
    const teacherIdInt = parseInt(teacher_id.toString(), 10);
    const subjectIdInt = parseInt(subject_id.toString(), 10);

    if (isNaN(classIdInt) || isNaN(teacherIdInt) || isNaN(subjectIdInt)) {
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

    // Create assessment
    const assessmentResult = await query(
      `INSERT INTO assessments (class_id, teacher_id, subject_id, topic, assessment_date) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, class_id, teacher_id, subject_id, topic, assessment_date`,
      [classIdInt, teacherIdInt, subjectIdInt, topic || null, assessment_date]
    );

    const assessmentId = assessmentResult.rows[0].id;

    // Create default rating records for all students in this class
    const studentsResult = await query(
      `SELECT id FROM students WHERE class_id = $1`,
      [classIdInt]
    );

    // If subtopics are provided, create them and create ratings for each subtopic
    if (subtopics && Array.isArray(subtopics) && subtopics.length > 0) {
      for (const subtopicName of subtopics) {
        if (subtopicName?.trim()) {
          const subtopicResult = await query(
            `INSERT INTO subtopics (assessment_id, name)
             VALUES ($1, $2)
             RETURNING id`,
            [assessmentId, subtopicName.trim()]
          );

          const subtopicId = subtopicResult.rows[0].id;

          // Create rating record for each student for this subtopic
          for (const student of studentsResult.rows) {
            await query(
              `INSERT INTO ratings (student_id, assessment_id, subtopic_id, rating_type) 
               VALUES ($1, $2, $3, NULL)`,
              [student.id, assessmentId, subtopicId]
            );
          }
        }
      }
    } else {
      // No subtopics - create single rating per student (backward compatibility)
      for (const student of studentsResult.rows) {
        await query(
          `INSERT INTO ratings (student_id, assessment_id, rating_type) 
           VALUES ($1, $2, NULL)`,
          [student.id, assessmentId]
        );
      }
    }

    return NextResponse.json({
      success: true,
      data: assessmentResult.rows[0],
    }, { status: 201 });
  } catch (error: any) {
    console.error('Error creating assessment:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create assessment' },
      { status: 500 }
    );
  }
}
