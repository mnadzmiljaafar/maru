import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { student_id, assessment_id, subtopic_id, rating_type } = body;

    if (!student_id || !assessment_id) {
      return NextResponse.json(
        { success: false, error: 'Student ID and assessment ID are required' },
        { status: 400 }
      );
    }

    // Parse IDs to integers
    const studentIdInt = parseInt(student_id.toString(), 10);
    const assessmentIdInt = parseInt(assessment_id.toString(), 10);
    const subtopicIdInt = subtopic_id ? parseInt(subtopic_id.toString(), 10) : null;

    if (isNaN(studentIdInt) || isNaN(assessmentIdInt) || (subtopic_id && isNaN(subtopicIdInt!))) {
      return NextResponse.json(
        { success: false, error: 'Invalid ID format' },
        { status: 400 }
      );
    }

    // Update the rating record for this student-assessment combination
    // Can be with or without subtopic_id
    // rating_type can be one of: TP1-TP6, TD, or NULL (no rating)
    
    let result;
    if (subtopicIdInt === null) {
      result = await query(
        `UPDATE ratings 
         SET rating_type = $3, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $1 AND assessment_id = $2 AND subtopic_id IS NULL
         RETURNING *`,
        [studentIdInt, assessmentIdInt, rating_type || null]
      );
    } else {
      result = await query(
        `UPDATE ratings 
         SET rating_type = $4, updated_at = CURRENT_TIMESTAMP
         WHERE student_id = $1 AND assessment_id = $2 AND subtopic_id = $3
         RETURNING *`,
        [studentIdInt, assessmentIdInt, subtopicIdInt, rating_type || null]
      );
    }

    if (result.rows.length === 0) {
      // If record doesn't exist, create it
      const insertResult = await query(
        `INSERT INTO ratings (student_id, assessment_id, subtopic_id, rating_type)
         VALUES ($1, $2, $3, $4)
         RETURNING *`,
        [studentIdInt, assessmentIdInt, subtopicIdInt, rating_type || null]
      );

      return NextResponse.json({
        success: true,
        data: insertResult.rows[0],
      });
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
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const assessmentId = searchParams.get('assessment_id');
    const studentId = searchParams.get('student_id');

    if (!assessmentId) {
      return NextResponse.json(
        { success: false, error: 'Assessment ID is required' },
        { status: 400 }
      );
    }

    const assessmentIdInt = parseInt(assessmentId, 10);
    if (isNaN(assessmentIdInt)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    let queryText = `
      SELECT 
        r.id,
        r.student_id,
        r.assessment_id,
        r.subtopic_id,
        r.rating_type,
        r.created_at,
        r.updated_at,
        st.name as subtopic_name
      FROM ratings r
      LEFT JOIN subtopics st ON r.subtopic_id = st.id
      WHERE r.assessment_id = $1
    `;

    const params: any[] = [assessmentIdInt];

    if (studentId) {
      const studentIdInt = parseInt(studentId, 10);
      if (!isNaN(studentIdInt)) {
        queryText += ` AND r.student_id = $2`;
        params.push(studentIdInt);
      }
    }

    queryText += ` ORDER BY r.subtopic_id, r.created_at`;

    const result = await query(queryText, params);

    return NextResponse.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error('Error fetching ratings:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch ratings' },
      { status: 500 }
    );
  }
}
