import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;
    const body = await request.json();
    const { name, class_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json(
        { success: false, error: 'Name is required' },
        { status: 400 }
      );
    }

    if (!class_id) {
      return NextResponse.json(
        { success: false, error: 'Class is required' },
        { status: 400 }
      );
    }

    // Check if new name/class combination would be duplicate
    const existingStudent = await query(
      `SELECT id FROM students WHERE name = $1 AND class_id = $2 AND id != $3`,
      [name.trim(), class_id, id]
    );

    if (existingStudent.rows.length > 0) {
      return NextResponse.json(
        { success: false, error: 'Student with this name already exists in this class' },
        { status: 400 }
      );
    }

    // Update student
    const result = await query(
      `UPDATE students SET name = $1, class_id = $2 WHERE id = $3 RETURNING *`,
      [name.trim(), class_id, id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

    // Get updated student with class name
    const updatedStudent = await query(
      `
      SELECT 
        s.id,
        s.name,
        s.class_id,
        c.name as class_name,
        s.created_at
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE s.id = $1
      `,
      [id]
    );

    return NextResponse.json({
      success: true,
      data: updatedStudent.rows[0],
    });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update student' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { id } = params;

    // Delete student and all related ratings
    const result = await query(
      `DELETE FROM students WHERE id = $1 RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Student not found' },
        { status: 404 }
      );
    }

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
