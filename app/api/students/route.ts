import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const teacher = searchParams.get('teacher');
    const subject = searchParams.get('subject');
    const classFilter = searchParams.get('class');

    let queryText = `
      SELECT 
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
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (date) {
      queryText += ` AND s.enrollment_date = $${paramCount}`;
      params.push(date);
      paramCount++;
    }

    if (teacher) {
      queryText += ` AND t.name ILIKE $${paramCount}`;
      params.push(`%${teacher}%`);
      paramCount++;
    }

    if (subject) {
      queryText += ` AND sb.name ILIKE $${paramCount}`;
      params.push(`%${subject}%`);
      paramCount++;
    }

    if (classFilter) {
      queryText += ` AND c.name ILIKE $${paramCount}`;
      params.push(`%${classFilter}%`);
      paramCount++;
    }

    queryText += ' GROUP BY s.id, us.id, c.id, t.id, sb.id ORDER BY s.enrollment_date DESC, s.id DESC';

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
      count: result.rows.length,
    });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch students' },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, date, teacher_name, subject, class: studentClass, ratings } = body;

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

    // Check for exact duplicate
    const enrollmentDate = date || new Date().toISOString().split('T')[0];
    const duplicateCheck = await query(
      `SELECT id FROM students 
       WHERE unique_student_id = $1 AND class_id = $2 AND teacher_id = $3 AND subject_id = $4 AND enrollment_date = $5`,
      [uniqueStudentId, classId, teacherId, subjectId, enrollmentDate]
    );

    if (duplicateCheck.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'This exact student enrollment already exists' },
        { status: 400 }
      );
    }

    // Create new student enrollment record
    const studentResult = await query(
      `INSERT INTO students (unique_student_id, class_id, teacher_id, subject_id, enrollment_date) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [uniqueStudentId, classId, teacherId, subjectId, enrollmentDate]
    );

    const student = studentResult.rows[0];
    const studentId = student.id;

    // Insert default ratings
    const ratingTypes = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'];
    for (const ratingType of ratingTypes) {
      await query(
        `INSERT INTO ratings (student_id, rating_type, is_selected) 
         VALUES ($1, $2, $3)`,
        [studentId, ratingType, false]
      );
    }

    // Fetch complete enrollment with ratings
    const fullStudentResult = await query(
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
      data: fullStudentResult.rows[0],
    }, { status: 201 });
  } catch (error) {
    console.error('Error creating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to create student' },
      { status: 500 }
    );
  }
}
