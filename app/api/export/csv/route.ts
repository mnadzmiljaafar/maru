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
        t.name as teacher_name,
        sb.name as subject,
        c.name as class,
        COALESCE(
          json_agg(
            json_build_object(
              'rating_type', r.rating_type,
              'is_selected', r.is_selected
            )
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

    // Generate CSV
    const headers = ['BIL', 'NAMA MURID', 'TARIKH', 'NAMA GURU', 'TOPIK', 'KELAS', 'TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'];
    
    const rows = result.rows.map((student: any, index: number) => {
      const ratingsMap: Record<string, boolean> = {};
      if (Array.isArray(student.ratings)) {
        student.ratings.forEach((r: any) => {
          ratingsMap[r.rating_type] = r.is_selected;
        });
      }

      return [
        index + 1,
        student.name || '',
        student.date ? new Date(student.date).toISOString().split('T')[0] : '',
        student.teacher_name || '',
        student.subject || '',
        student.class || '',
        ratingsMap.TP1 ? '✓' : '',
        ratingsMap.TP2 ? '✓' : '',
        ratingsMap.TP3 ? '✓' : '',
        ratingsMap.TP4 ? '✓' : '',
        ratingsMap.TP5 ? '✓' : '',
        ratingsMap.TP6 ? '✓' : '',
        ratingsMap.TD ? '✓' : '',
      ];
    });

    const csvContent = [headers, ...rows]
      .map(row => row.map((cell: string) => `"${cell}"`).join(','))
      .join('\n');

    // Add BOM for proper UTF-8 encoding in Excel
    const csvWithBOM = '\uFEFF' + csvContent;

    return new NextResponse(csvWithBOM, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="penilaian_murid_${new Date().toISOString().split('T')[0]}.csv"`,
      },
    });
  } catch (error) {
    console.error('Error generating CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to generate CSV' },
      { status: 500 }
    );
  }
}
