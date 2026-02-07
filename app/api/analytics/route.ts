import { NextResponse } from 'next/server';
import { query } from '@/lib/db';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    const teacher = searchParams.get('teacher');
    const subject = searchParams.get('subject');
    const classFilter = searchParams.get('class');

    let whereConditions = ['1=1'];
    const params: any[] = [];
    let paramCount = 1;

    if (date) {
      whereConditions.push(`s.enrollment_date = $${paramCount}`);
      params.push(date);
      paramCount++;
    }

    if (teacher) {
      whereConditions.push(`t.name ILIKE $${paramCount}`);
      params.push(`%${teacher}%`);
      paramCount++;
    }

    if (subject) {
      whereConditions.push(`sb.name ILIKE $${paramCount}`);
      params.push(`%${subject}%`);
      paramCount++;
    }

    if (classFilter) {
      whereConditions.push(`c.name ILIKE $${paramCount}`);
      params.push(`%${classFilter}%`);
      paramCount++;
    }

    const whereClause = whereConditions.join(' AND ');

    // Get total students
    const totalStudentsResult = await query(
      `SELECT COUNT(DISTINCT s.id) as count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       WHERE ${whereClause}`,
      params
    );

    // Get average ratings per student
    const avgRatingsResult = await query(
      `SELECT AVG(rating_count) as avg_ratings
       FROM (
         SELECT s.id, COUNT(r.id) FILTER (WHERE r.is_selected = true) as rating_count
         FROM students s
         LEFT JOIN classes c ON s.class_id = c.id
         LEFT JOIN teachers t ON s.teacher_id = t.id
         LEFT JOIN subjects sb ON s.subject_id = sb.id
         LEFT JOIN ratings r ON s.id = r.student_id
         WHERE ${whereClause}
         GROUP BY s.id
       ) subquery`,
      params
    );

    // Get rating distribution
    const ratingDistResult = await query(
      `SELECT 
         r.rating_type,
         COUNT(*) FILTER (WHERE r.is_selected = true) as count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       JOIN ratings r ON s.id = r.student_id
       WHERE ${whereClause}
       GROUP BY r.rating_type
       ORDER BY r.rating_type`,
      params
    );

    // Get subject distribution
    const subjectDistResult = await query(
      `SELECT 
         COALESCE(sb.name, '') as name,
         COUNT(*) as count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       WHERE ${whereClause} AND sb.name IS NOT NULL AND sb.name != ''
       GROUP BY sb.name
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get teacher distribution
    const teacherDistResult = await query(
      `SELECT 
         COALESCE(t.name, '') as name,
         COUNT(*) as count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       WHERE ${whereClause} AND t.name IS NOT NULL AND t.name != ''
       GROUP BY t.name
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get class distribution
    const classDistResult = await query(
      `SELECT 
         COALESCE(c.name, '') as name,
         COUNT(*) as count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       WHERE ${whereClause} AND c.name IS NOT NULL AND c.name != ''
       GROUP BY c.name
       ORDER BY count DESC
       LIMIT 10`,
      params
    );

    // Get unique counts
    const uniqueCountsResult = await query(
      `SELECT 
         COUNT(DISTINCT sb.id) as subject_count,
         COUNT(DISTINCT t.id) as teacher_count,
         COUNT(DISTINCT c.id) as class_count
       FROM students s
       LEFT JOIN classes c ON s.class_id = c.id
       LEFT JOIN teachers t ON s.teacher_id = t.id
       LEFT JOIN subjects sb ON s.subject_id = sb.id
       WHERE ${whereClause}`,
      params
    );

    const ratingDistribution: Record<string, number> = {
      TP1: 0, TP2: 0, TP3: 0, TP4: 0, TP5: 0, TP6: 0, TD: 0
    };

    ratingDistResult.rows.forEach((row: any) => {
      ratingDistribution[row.rating_type] = parseInt(row.count);
    });

    const bySubject: Record<string, number> = {};
    subjectDistResult.rows.forEach((row: any) => {
      bySubject[row.name] = parseInt(row.count);
    });

    const byTeacher: Record<string, number> = {};
    teacherDistResult.rows.forEach((row: any) => {
      byTeacher[row.name] = parseInt(row.count);
    });

    const byClass: Record<string, number> = {};
    classDistResult.rows.forEach((row: any) => {
      byClass[row.name] = parseInt(row.count);
    });

    const totalStudents = parseInt(totalStudentsResult.rows[0].count);
    const avgRatings = parseFloat(avgRatingsResult.rows[0].avg_ratings || 0).toFixed(1);

    return NextResponse.json({
      success: true,
      data: {
        totalStudents,
        averageRatings: avgRatings,
        uniqueSubjects: parseInt(uniqueCountsResult.rows[0].subject_count),
        uniqueTeachers: parseInt(uniqueCountsResult.rows[0].teacher_count),
        uniqueClasses: parseInt(uniqueCountsResult.rows[0].class_count),
        ratingDistribution,
        bySubject,
        byTeacher,
        byClass,
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
