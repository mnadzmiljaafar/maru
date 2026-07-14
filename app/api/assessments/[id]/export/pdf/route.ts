import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const assessmentId = parseInt(params.id, 10);

    if (isNaN(assessmentId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid assessment ID' },
        { status: 400 }
      );
    }

    // Verify ownership before exporting
    const owner = await query('SELECT owner_email FROM assessments WHERE id = $1', [assessmentId]);
    if (owner.rows.length === 0 || (!user.isAdmin && owner.rows[0].owner_email !== user.email)) {
      return NextResponse.json({ success: false, error: 'Assessment not found' }, { status: 404 });
    }

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

    // Get subtopics
    const subtopicsResult = await query(
      'SELECT id, name FROM subtopics WHERE assessment_id = $1 ORDER BY id',
      [assessmentId]
    );
    const subtopics = subtopicsResult.rows;

    // Get all students and their ratings for this assessment
    const studentsResult = await query(
      `SELECT 
        st.id,
        st.name,
        st.class_id
      FROM students st
      WHERE st.class_id = $1
      ORDER BY st.name`,
      [assessment.class_id]
    );

    // For each student, get all ratings (subtopic-specific and overall)
    const studentsWithRatings = await Promise.all(
      studentsResult.rows.map(async (student: any) => {
        const ratingsResult = await query(
          `SELECT 
            r.rating_type,
            r.subtopic_id,
            sub.name as subtopic_name
          FROM ratings r
          LEFT JOIN subtopics sub ON r.subtopic_id = sub.id
          WHERE r.student_id = $1 AND r.assessment_id = $2`,
          [student.id, assessmentId]
        );

        // The overall/PURATA is stored in the subtopic_id IS NULL row for both
        // subtopic-based (editable TP level) and direct (binary) assessments.
        const overallRating = ratingsResult.rows.find((r: any) => r.subtopic_id === null);
        const averageRating = overallRating?.rating_type || null;

        return {
          ...student,
          ratings: ratingsResult.rows,
          averageRating,
        };
      })
    );

    // Generate CSV with UTF-8 BOM for proper encoding (supports Arabic and special characters)
    const csvContent = generateCSV(assessment, studentsWithRatings, subtopics);
    const utf8BOM = '\uFEFF'; // UTF-8 BOM for proper encoding in Excel
    const csvWithBOM = utf8BOM + csvContent;

    // Return CSV as file
    const headers = new Headers();
    headers.append('Content-Type', 'text/csv; charset=utf-8');
    headers.append('Content-Disposition', `attachment; filename="penilaian-${assessment.class_name}-${new Date().toISOString().split('T')[0]}.csv"`);

    return new NextResponse(csvWithBOM, {
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

// Maps a stored rating code to its human-readable label. Binary codes become
// Menguasai / Tidak Menguasai; TP levels (used for the overall PURATA) pass through.
function ratingLabel(code: string | null | undefined): string {
  if (!code) return '';
  if (code === 'M') return 'Menguasai';
  if (code === 'TM') return 'Tidak Menguasai';
  return code;
}

function generateCSV(assessment: any, students: any[], subtopics: any[]): string {
  // CSV generation
  const lines: string[] = [];
  
  // Header info
  lines.push('REKOD PERKEMBANGAN MURID');
  lines.push(`Kelas,${assessment.class_name}`);
  lines.push(`Guru,${assessment.teacher_name || 'Tidak Ditentukan'}`);
  lines.push(`Subjek,${assessment.subject_name || 'Tidak Ditentukan'}`);
  if (assessment.topic) {
    lines.push(`Topik,${assessment.topic}`);
  }
  lines.push(`Tarikh,${new Date(assessment.assessment_date).toLocaleDateString('ms-MY')}`);
  lines.push('');
  
  // Table headers
  const headerCols = ['BIL', 'NAMA MURID'];
  
  if (subtopics.length > 0) {
    subtopics.forEach((st: any) => {
      headerCols.push(st.name.replace(/,/g, ';'));
    });
  }
  
  headerCols.push('PURATA');
  lines.push(headerCols.join(','));
  
  // Table data
  students.forEach((student, index) => {
    const rowCols = [
      (index + 1).toString(),
      student.name.replace(/,/g, ';'), // Replace commas with semicolons in names
    ];
    
    if (subtopics.length > 0) {
      subtopics.forEach((st: any) => {
        const rating = student.ratings.find((r: any) => r.subtopic_id === st.id);
        rowCols.push(ratingLabel(rating?.rating_type) || 'Tidak Dinilai');
      });
    }

    rowCols.push(ratingLabel(student.averageRating) || 'Belum dinilai');
    lines.push(rowCols.join(','));
  });
  
  lines.push('');
  lines.push(`Dijana pada,${new Date().toLocaleString('ms-MY')}`);
  
  return lines.join('\n');
}
