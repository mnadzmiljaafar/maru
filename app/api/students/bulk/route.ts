import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      );
    }

    // Read CSV file
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    
    if (lines.length === 0) {
      return NextResponse.json(
        { success: false, error: 'CSV file is empty' },
        { status: 400 }
      );
    }

    // Parse CSV (format: name,class - no header row)
    const students = [];
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const parts = line.split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
      if (parts.length >= 2) {
        students.push({
          name: parts[0],
          class: parts[1]
        });
      }
    }

    if (students.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No valid students found in CSV' },
        { status: 400 }
      );
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    // Process each student
    for (let i = 0; i < students.length; i++) {
      try {
        const { name, class: studentClass } = students[i];

        if (!name || !name.trim()) {
          failed++;
          errors.push(`Row ${i + 1}: Student name is required`);
          continue;
        }

        if (!studentClass || !studentClass.trim()) {
          failed++;
          errors.push(`Row ${i + 1}: Class is required`);
          continue;
        }

        // Get or create class scoped to this owner
        let classResult = await query(
          `SELECT id FROM classes WHERE name = $1 AND owner_email = $2`,
          [studentClass.trim(), user.email]
        );

        if (classResult.rows.length === 0) {
          classResult = await query(
            `INSERT INTO classes (name, owner_email) VALUES ($1, $2) RETURNING id`,
            [studentClass.trim(), user.email]
          );
        }
        const classId = classResult.rows[0].id;

        // Check if student already exists in this class
        const existingStudent = await query(
          `SELECT id FROM students WHERE name = $1 AND class_id = $2`,
          [name.trim(), classId]
        );

        if (existingStudent.rows.length > 0) {
          // Student already exists, skip
          imported++;
          continue;
        }

        // Insert student
        await query(
          `INSERT INTO students (name, class_id, owner_email) VALUES ($1, $2, $3) RETURNING id`,
          [name.trim(), classId, user.email]
        );

        imported++;
      } catch (error: any) {
        failed++;
        errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        imported,
        failed,
        errors: errors.length > 0 ? errors : undefined
      }
    }, { status: 200 });
  } catch (error) {
    console.error('Error bulk importing students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk import students' },
      { status: 500 }
    );
  }
}
