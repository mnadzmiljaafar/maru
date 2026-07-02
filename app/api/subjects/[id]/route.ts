import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid subject ID' }, { status: 400 });
    }

    const body = await request.json();
    const { name, description } = body;
    if (!name || typeof name !== 'string' || name.trim() === '') {
      return NextResponse.json({ success: false, error: 'Valid name is required' }, { status: 400 });
    }

    const existing = await query('SELECT owner_email FROM subjects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }
    const rowOwner = existing.rows[0].owner_email;
    if (!user.isAdmin && rowOwner !== user.email) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }

    const dup = await query(
      'SELECT id FROM subjects WHERE LOWER(name) = LOWER($1) AND id != $2 AND owner_email = $3',
      [name.trim(), id, rowOwner]
    );
    if (dup.rows.length > 0) {
      return NextResponse.json({ success: false, error: 'Subject with this name already exists' }, { status: 400 });
    }

    const result = await query(
      'UPDATE subjects SET name = $1, description = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3 RETURNING *',
      [name.trim(), description?.trim() || null, id]
    );

    return NextResponse.json({ success: true, data: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const id = parseInt(params.id);
    if (isNaN(id)) {
      return NextResponse.json({ success: false, error: 'Invalid subject ID' }, { status: 400 });
    }

    const existing = await query('SELECT owner_email FROM subjects WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }
    if (!user.isAdmin && existing.rows[0].owner_email !== user.email) {
      return NextResponse.json({ success: false, error: 'Subject not found' }, { status: 404 });
    }

    await query('DELETE FROM subjects WHERE id = $1', [id]);
    return NextResponse.json({ success: true, message: 'Subject deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting subject:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
