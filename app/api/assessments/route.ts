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
      queryText += ` AND a.class_id = $${paramCount}`;
      params.push(classId);
      paramCount++;
    }

    if (assessmentId) {
      queryText += ` AND a.id = $${paramCount}`;
      params.push(assessmentId);
      paramCount++;
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
    const { class_id, teacher_name, subject_name, topic, assessment_date } = body;

    if (!class_id || !teacher_name || !subject_name || !assessment_date) {
      return NextResponse.json(
        { success: false, error: 'Class, teacher, subject, and date are required' },
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

    // Get teacher or create
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

    // Get subject or create
    let subjectResult = await query(
      `SELECT id FROM subjects WHERE name = $1`,
      [subject_name.trim()]
    );

    if (subjectResult.rows.length === 0) {
      subjectResult = await query(
        `INSERT INTO subjects (name) VALUES ($1) RETURNING id`,
        [subject_name.trim()]
      );
    }

    const subjectId = subjectResult.rows[0].id;

    // Create assessment
    const assessmentResult = await query(
      `INSERT INTO assessments (class_id, teacher_id, subject_id, topic, assessment_date) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING id, class_id, teacher_id, subject_id, topic, assessment_date`,
      [class_id, teacherId, subjectId, topic || null, assessment_date]
    );

    const assessmentId = assessmentResult.rows[0].id;

    // Create default rating record for all students in this class (with NULL rating_type = no rating yet)
    const studentsResult = await query(
      `SELECT id FROM students WHERE class_id = $1`,
      [class_id]
    );

    for (const student of studentsResult.rows) {
      await query(
        `INSERT INTO ratings (student_id, assessment_id, rating_type) 
         VALUES ($1, $2, NULL)`,
        [student.id, assessmentId]
      );
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
