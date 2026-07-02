import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const { searchParams } = new URL(request.url);
    const classId = searchParams.get('class_id');

    let queryText = `
      SELECT
        s.id,
        s.name,
        s.class_id,
        c.name as class_name,
        s.created_at
      FROM students s
      JOIN classes c ON s.class_id = c.id
      WHERE 1=1
    `;

    const params: any[] = [];
    let paramCount = 1;

    if (!user.isAdmin) {
      queryText += ` AND s.owner_email = $${paramCount}`;
      params.push(user.email);
      paramCount++;
    }

    if (classId) {
      queryText += ` AND s.class_id = $${paramCount}`;
      params.push(classId);
      paramCount++;
    }

    queryText += ` ORDER BY c.name, s.name`;

    const result = await query(queryText, params);

    return NextResponse.json({ success: true, data: result.rows });
  } catch (error) {
    console.error('Error fetching students:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch students' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await request.json();
    const { students: studentsList } = body;

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return NextResponse.json({ success: false, error: 'No students provided' }, { status: 400 });
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
    };

    for (let i = 0; i < studentsList.length; i++) {
      try {
        const { name, class_name } = studentsList[i];

        if (!name || !name.trim() || !class_name || !class_name.trim()) {
          results.failureCount++;
          results.errors.push(`Row ${i + 1}: Name and class are required`);
          continue;
        }

        // Get or create class scoped to this owner
        let classResult = await query(
          `SELECT id FROM classes WHERE name = $1 AND owner_email = $2`,
          [class_name.trim(), user.email]
        );

        if (classResult.rows.length === 0) {
          classResult = await query(
            `INSERT INTO classes (name, owner_email) VALUES ($1, $2) RETURNING id`,
            [class_name.trim(), user.email]
          );
        }

        const classId = classResult.rows[0].id;

        // Check if student already exists in this class (owner-scoped via class)
        const existingStudent = await query(
          `SELECT id FROM students WHERE name = $1 AND class_id = $2`,
          [name.trim(), classId]
        );

        if (existingStudent.rows.length > 0) {
          results.failureCount++;
          results.errors.push(`Row ${i + 1}: "${name.trim()}" already exists in class "${class_name.trim()}"`);
          continue;
        }

        await query(
          `INSERT INTO students (name, class_id, owner_email) VALUES ($1, $2, $3)`,
          [name.trim(), classId, user.email]
        );

        results.successCount++;
      } catch (error: any) {
        results.failureCount++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({ success: true, results }, { status: 201 });
  } catch (error) {
    console.error('Error registering students:', error);
    return NextResponse.json({ success: false, error: 'Failed to register students' }, { status: 500 });
  }
}
