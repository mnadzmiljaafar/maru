import { NextResponse } from 'next/server';
import { query } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface AnalyticsResponse {
  success: boolean;
  data?: {
    totalStudents: number;
    totalAssessments: number;
    uniqueClasses: number;
    uniqueTeachers: number;
    byClass: Record<string, number>;
    byTeacher: Record<string, number>;
    bySubject: Record<string, number>;
    recentAssessments: any[];
  };
  error?: string;
}

export async function GET(): Promise<NextResponse<AnalyticsResponse>> {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    // Admins see everything; teachers see only their own data. `w(alias)` builds
    // the owner filter appended to each query, with the owner as $1 when scoped.
    const scoped = !user.isAdmin;
    const w = (alias: string) => (scoped ? ` WHERE ${alias}.owner_email = $1` : '');
    const p: any[] = scoped ? [user.email] : [];

    const [
      totalStudentsResult,
      totalAssessmentsResult,
      uniqueClassesResult,
      uniqueTeachersResult,
      studentsByClassResult,
      assessmentsByTeacherResult,
      assessmentsBySubjectResult,
      recentAssessmentsResult,
    ] = await Promise.all([
      query(`SELECT COUNT(*) as count FROM students s${w('s')}`, p),
      query(`SELECT COUNT(*) as count FROM assessments a${w('a')}`, p),
      query(`SELECT COUNT(*) as count FROM classes c${w('c')}`, p),
      query(`SELECT COUNT(*) as count FROM teachers t${w('t')}`, p),
      query(
        `SELECT c.name, COUNT(s.id) as count
         FROM classes c
         LEFT JOIN students s ON c.id = s.class_id
         ${scoped ? 'WHERE c.owner_email = $1' : ''}
         GROUP BY c.id, c.name
         ORDER BY count DESC`,
        p
      ),
      query(
        `SELECT COALESCE(t.name, 'Tidak ditentukan') as teacher_name, COUNT(a.id) as count
         FROM assessments a
         LEFT JOIN teachers t ON a.teacher_id = t.id
         ${scoped ? 'WHERE a.owner_email = $1' : ''}
         GROUP BY t.id, t.name
         ORDER BY count DESC
         LIMIT 10`,
        p
      ),
      query(
        `SELECT COALESCE(s.name, 'Tidak ditentukan') as subject_name, COUNT(a.id) as count
         FROM assessments a
         LEFT JOIN subjects s ON a.subject_id = s.id
         ${scoped ? 'WHERE a.owner_email = $1' : ''}
         GROUP BY s.id, s.name
         ORDER BY count DESC
         LIMIT 10`,
        p
      ),
      query(
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
        ${scoped ? 'WHERE a.owner_email = $1' : ''}
        ORDER BY a.assessment_date DESC
        LIMIT 10`,
        p
      ),
    ]);

    const byClass = Object.fromEntries(
      studentsByClassResult.rows.map((row: any) => [row.name, parseInt(row.count)])
    );
    const byTeacher = Object.fromEntries(
      assessmentsByTeacherResult.rows.map((row: any) => [row.teacher_name, parseInt(row.count)])
    );
    const bySubject = Object.fromEntries(
      assessmentsBySubjectResult.rows.map((row: any) => [row.subject_name, parseInt(row.count)])
    );

    return NextResponse.json({
      success: true,
      data: {
        totalStudents: parseInt(totalStudentsResult.rows[0]?.count || 0),
        totalAssessments: parseInt(totalAssessmentsResult.rows[0]?.count || 0),
        uniqueClasses: parseInt(uniqueClassesResult.rows[0]?.count || 0),
        uniqueTeachers: parseInt(uniqueTeachersResult.rows[0]?.count || 0),
        byClass,
        byTeacher,
        bySubject,
        recentAssessments: recentAssessmentsResult.rows,
      },
    });
  } catch (error) {
    console.error('Error fetching analytics:', error);
    return NextResponse.json({ success: false, error: 'Failed to fetch analytics' }, { status: 500 });
  }
}
