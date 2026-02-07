import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    // Total students
    const totalStudentsResult = await query(
      `SELECT COUNT(*) as count FROM students`
    );

    // Total assessments
    const totalAssessmentsResult = await query(
      `SELECT COUNT(*) as count FROM assessments`
    );

    // Unique classes
    const uniqueClassesResult = await query(
      `SELECT COUNT(*) as count FROM classes`
    );

    // Unique teachers
    const uniqueTeachersResult = await query(
      `SELECT COUNT(*) as count FROM teachers`
    );

    // Students by class
    const studentsByClassResult = await query(
      `SELECT c.name, COUNT(s.id) as count
       FROM classes c
       LEFT JOIN students s ON c.id = s.class_id
       GROUP BY c.id, c.name
       ORDER BY count DESC`
    );

    // Assessments by teacher
    const assessmentsByTeacherResult = await query(
      `SELECT COALESCE(t.name, 'Tidak ditentukan') as teacher_name, COUNT(a.id) as count
       FROM assessments a
       LEFT JOIN teachers t ON a.teacher_id = t.id
       GROUP BY t.id, t.name
       ORDER BY count DESC
       LIMIT 10`
    );

    // Assessments by subject
    const assessmentsBySubjectResult = await query(
      `SELECT COALESCE(s.name, 'Tidak ditentukan') as subject_name, COUNT(a.id) as count
       FROM assessments a
       LEFT JOIN subjects s ON a.subject_id = s.id
       GROUP BY s.id, s.name
       ORDER BY count DESC
       LIMIT 10`
    );

    // Recent assessments
    const recentAssessmentsResult = await query(
      `SELECT 
        a.id,
        a.topic,
        a.assessment_date,
        c.name as class_name,
        t.name as teacher_name,
        s.name as subject_name
      FROM assessments a
      JOIN classes c ON a.class_id = c.id
      LEFT JOIN teachers t ON a.teacher_id = t.id
      LEFT JOIN subjects s ON a.subject_id = s.id
      ORDER BY a.assessment_date DESC
      LIMIT 10`
    );

    const byClass: Record<string, number> = {};
    studentsByClassResult.rows.forEach((row: any) => {
      byClass[row.name] = parseInt(row.count);
    });

    const byTeacher: Record<string, number> = {};
    assessmentsByTeacherResult.rows.forEach((row: any) => {
      byTeacher[row.teacher_name] = parseInt(row.count);
    });

    const bySubject: Record<string, number> = {};
    assessmentsBySubjectResult.rows.forEach((row: any) => {
      bySubject[row.subject_name] = parseInt(row.count);
    });

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: parseInt(totalStudentsResult.rows[0].count),
        totalAssessments: parseInt(totalAssessmentsResult.rows[0].count),
        uniqueClasses: parseInt(uniqueClassesResult.rows[0].count),
        uniqueTeachers: parseInt(uniqueTeachersResult.rows[0].count),
        byClass,
        byTeacher,
        bySubject,
        recentAssessments: recentAssessmentsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to fetch analytics' },
      { status: 500 }
    );
  }
}
