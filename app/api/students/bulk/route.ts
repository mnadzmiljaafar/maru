import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { students: studentsList } = body;

    if (!Array.isArray(studentsList) || studentsList.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No students provided' },
        { status: 400 }
      );
    }

    const results = {
      successCount: 0,
      failureCount: 0,
      errors: [] as string[],
      createdStudentIds: [] as number[],
    };

    // Process each student - only create unique_students, no enrollments yet
    for (let i = 0; i < studentsList.length; i++) {
      try {
        const { name, class: studentClass } = studentsList[i];

        if (!name || !name.trim()) {
          results.failureCount++;
          results.errors.push(`Row ${i + 1}: Student name is required`);
          continue;
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

        results.successCount++;
        results.createdStudentIds.push(uniqueStudentId);
      } catch (error: any) {
        results.failureCount++;
        results.errors.push(`Row ${i + 1}: ${error.message}`);
      }
    }

    return NextResponse.json({
      success: true,
      results,
    }, { status: 201 });
  } catch (error) {
    console.error('Error bulk importing students:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to bulk import students' },
      { status: 500 }
    );
  }
}
