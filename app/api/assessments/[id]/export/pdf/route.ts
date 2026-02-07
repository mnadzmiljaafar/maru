import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import PDFDocument from 'pdfkit';

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

    // Generate PDF
    const pdfBuffer = await generatePDF(assessment, studentsResult.rows);

    // Return PDF as file
    const headers = new Headers();
    headers.append('Content-Type', 'application/pdf');
    headers.append('Content-Disposition', `attachment; filename="penilaian-${assessment.class_name}-${new Date().toISOString().split('T')[0]}.pdf"`);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: headers,
    });
  } catch (error) {
    console.error('Error exporting assessment to PDF:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to export assessment to PDF' },
      { status: 500 }
    );
  }
}

async function generatePDF(assessment: any, students: any[]): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', margin: 40 });
    const chunks: Buffer[] = [];

    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    // Title
    doc.fontSize(18).font('Helvetica-Bold').text('Laporan Penilaian Murid', { align: 'center' });
    doc.moveDown(0.5);

    // Assessment details
    doc.fontSize(11).font('Helvetica');
    doc.text(`Kelas: ${assessment.class_name}`);
    doc.text(`Guru: ${assessment.teacher_name || 'Tidak Ditentukan'}`);
    doc.text(`Subjek: ${assessment.subject_name || 'Tidak Ditentukan'}`);
    if (assessment.topic) {
      doc.text(`Topik: ${assessment.topic}`);
    }
    doc.text(`Tarikh: ${new Date(assessment.assessment_date).toLocaleDateString('ms-MY')}`);
    doc.moveDown(0.8);

    // Table headers
    const tableTop = doc.y;
    const col1X = 40;
    const col2X = 80;
    const col3X = 300;
    const rowHeight = 20;

    doc.fontSize(10).font('Helvetica-Bold');
    doc.text('BIL', col1X, tableTop);
    doc.text('NAMA MURID', col2X, tableTop);
    doc.text('TAHAP PENGUASAAN', col3X, tableTop);

    // Draw line under header
    doc.moveTo(40, tableTop + rowHeight - 2).lineTo(550, tableTop + rowHeight - 2).stroke();

    // Table data
    doc.fontSize(9).font('Helvetica');
    let yPos = tableTop + rowHeight;
    const pageHeight = doc.page.height;
    const bottomMargin = 40;

    students.forEach((student, index) => {
      // Check if we need a new page
      if (yPos + rowHeight > pageHeight - bottomMargin) {
        doc.addPage();
        yPos = 40;
        // Repeat header on new page
        doc.fontSize(10).font('Helvetica-Bold');
        doc.text('BIL', col1X, yPos);
        doc.text('NAMA MURID', col2X, yPos);
        doc.text('TAHAP PENGUASAAN', col3X, yPos);
        doc.moveTo(40, yPos + rowHeight - 2).lineTo(550, yPos + rowHeight - 2).stroke();
        yPos += rowHeight;
        doc.fontSize(9).font('Helvetica');
      }

      const ratingText = student.rating_type || 'Belum dinilai';
      doc.text(`${index + 1}`, col1X, yPos);
      doc.text(student.name, col2X, yPos);
      doc.text(ratingText, col3X, yPos);

      yPos += rowHeight;
    });

    // Footer
    doc.fontSize(8).text(`Dijana pada: ${new Date().toLocaleString('ms-MY')}`, 40, pageHeight - 20, { align: 'center' });

    doc.end();
  });
}
