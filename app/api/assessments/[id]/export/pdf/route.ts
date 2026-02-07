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

    // Generate CSV (PDF is now generated client-side with jsPDF)
    const csvContent = generateCSV(assessment, studentsResult.rows);

    // Return CSV as file
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv');
    headers.append('Content-Disposition', `attachment; filename="penilaian-${assessment.class_name}-${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csvContent, {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('Error exporting assessment to CSV:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export assessment to CSV' },
      { status: 500 }
    );
  }
}

function generateCSV(assessment: any, students: any[]): string {
  // CSV generation
  const lines: string[] = [];
  
  // Header info
  lines.push('Laporan Penilaian Murid');
  lines.push(`Kelas,${assessment.class_name}`);
  lines.push(`Guru,${assessment.teacher_name || 'Tidak Ditentukan'}`);
  lines.push(`Subjek,${assessment.subject_name || 'Tidak Ditentukan'}`);
  if (assessment.topic) {
    lines.push(`Topik,${assessment.topic}`);
  }
  lines.push(`Tarikh,${new Date(assessment.assessment_date).toLocaleDateString('ms-MY')}`);
  lines.push('');
  
  // Table headers
  lines.push('BIL,NAMA MURID,TAHAP PENGUASAAN');
  
  // Table data
  students.forEach((student, index) => {
    const ratingText = student.rating_type || 'Belum dinilai';
    const name = student.name.replace(/,/g, ';'); // Replace commas with semicolons in names
    lines.push(`${index + 1},${name},${ratingText}`);
  });
  
  lines.push('');
  lines.push(`Dijana pada,${new Date().toLocaleString('ms-MY')}`);
  
  return lines.join('\n');
}
