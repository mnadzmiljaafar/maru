import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { student_id, assessment_id, rating_type } = body;

    if (!student_id || !assessment_id) {
      return NextResponse.json(
        { success: false, error: 'Student ID and assessment ID are required' },
        { status: 400 }
      );
    }

    // Update the single rating record for this student-assessment combination
    // rating_type can be one of: TP1-TP6, TD, or NULL (no rating)
    const result = await query(
      `UPDATE ratings 
       SET rating_type = $3, updated_at = CURRENT_TIMESTAMP
       WHERE student_id = $1 AND assessment_id = $2
       RETURNING *`,
      [student_id, assessment_id, rating_type || null]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Rating record not found' },
        { status: 404 }
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
}
