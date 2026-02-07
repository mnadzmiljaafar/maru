import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const assessmentId = params.id;

    // Get assessment details
    const assessmentResult = await query(
      `SELECT 
        a.id,
        a.class_id,
        a.teacher_id,
        a.subject_id,
        a.topic,
        a.assessment_date,
        c.name as class_name,
        t.name as teacher_name,
        s.name as subject_name
      FROM assessments a
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      WHERE a.id = $1`,
      [assessmentId]
    );

    if (assessmentResult.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Assessment not found' },
        { status: 404 }
      );
    }

    const assessment = assessmentResult.rows[0];

    // Get all students and their ratings for this assessment
    const studentsResult = await query(
      `SELECT 
        st.id,
        st.name,
        st.class_id,
        r.rating_type
      FROM students st
      LEFT JOIN ratings r ON st.id = r.student_id AND r.assessment_id = $1
      WHERE st.class_id = $2
      ORDER BY st.name`,
      [assessmentId, assessment.class_id]
    );

    // Generate Excel using base64 encoding of simple HTML table
    const excelContent = generateExcel(assessment, studentsResult.rows);

    // Return Excel as file
    const headers = new Headers();
    headers.append('Content-Type', 'application/vnd.ms-excel');
    headers.append('Content-Disposition', `attachment; filename="penilaian-${assessment.class_name}-${new Date().toISOString().split('T')[0]}.txt"`);

    return new NextResponse(excelContent, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('Error exporting assessment:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export assessment' },
      { status: 500 }
    );
  }
}

function generateExcel(assessment: any, students: any[]): string {
  // Simple TSV generation (Tab-Separated Values)
  // Excel can open this format natively
  
  const worksheetData = [
    ['Penilaian Murid', '', ''],
    ['', '', ''],
    ['Kelas', assessment.class_name, ''],
    ['Guru', assessment.teacher_name || '-', ''],
    ['Subjek', assessment.subject_name || '-', ''],
    ['Topik', assessment.topic || '-', ''],
    ['Tarikh', new Date(assessment.assessment_date).toLocaleDateString('ms-MY'), ''],
    ['', '', ''],
    ['BIL', 'NAMA MURID', 'TAHAP PENGUASAAN'],
    ...students.map((student, index) => [
      index + 1,
      student.name,
      student.rating_type || 'Belum dinilai'
    ])
  ];

  return worksheetData.map(row => row.join('\t')).join('\n');
}
