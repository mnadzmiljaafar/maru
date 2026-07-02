import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = params;
    const body = await request.json();
    const { name, class_id } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ success: false, error: 'Name is required' }, { status: 400 });
    }
    if (!class_id) {
      return NextResponse.json({ success: false, error: 'Class is required' }, { status: 400 });
    }

    // Verify ownership of the student being edited
    const existing = await query('SELECT owner_email FROM students WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    if (!user.isAdmin && existing.rows[0].owner_email !== user.email) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    // Verify the target class belongs to the same owner (admins may use any)
    const rowOwner = existing.rows[0].owner_email;
    const classCheck = await query('SELECT owner_email FROM classes WHERE id = $1', [class_id]);
    if (classCheck.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    }
    if (!user.isAdmin && classCheck.rows[0].owner_email !== user.email) {
      return NextResponse.json({ success: false, error: 'Class not found' }, { status: 404 });
    }

    // Duplicate name check within the class
    const dup = await query(
      `SELECT id FROM students WHERE name = $1 AND class_id = $2 AND id != $3`,
      [name.trim(), class_id, id]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Student with this name already exists in this class' }, { status: 400 });
    }

    await query(`UPDATE students SET name = $1, class_id = $2 WHERE id = $3`, [name.trim(), class_id, id]);

    const updatedStudent = await query(
      `SELECT s.id, s.name, s.class_id, c.name as class_name, s.created_at
       FROM students s JOIN classes c ON s.class_id = c.id
       WHERE s.id = $1`,
      [id]
    );

    return NextResponse.json({ success: true, data: updatedStudent.rows[0] });
  } catch (error) {
    console.error('Error updating student:', error);
    return NextResponse.json({ success: false, error: 'Failed to update student' }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { id } = params;

    const existing = await query('SELECT owner_email FROM students WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }
    if (!user.isAdmin && existing.rows[0].owner_email !== user.email) {
      return NextResponse.json({ success: false, error: 'Student not found' }, { status: 404 });
    }

    await query(`DELETE FROM students WHERE id = $1`, [id]);
    return NextResponse.json({ success: true, message: 'Student deleted successfully' });
  } catch (error) {
    console.error('Error deleting student:', error);
    return NextResponse.json({ success: false, error: 'Failed to delete student' }, { status: 500 });
  }
}
