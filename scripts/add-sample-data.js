const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function addSampleData() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL || undefined,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'teacher_assessment',
  });

  try {
    console.log('Connecting to PostgreSQL...');
    await client.connect();
    console.log('Connected successfully!');

    console.log('Adding sample data...');

    // Add sample students
    const studentData = [
      { name: 'Ahmad Ali', date: '2024-01-24', teacher_name: 'YANI', subject: 'KEKELUARGAAN', class: '1 TERBILANG' },
      { name: 'Siti binti Hassan', date: '2024-01-24', teacher_name: 'YANI', subject: 'KEKELUARGAAN', class: '1 TERBILANG' },
      { name: 'Muthu a/l Raman', date: '2024-01-24', teacher_name: 'YANI', subject: 'KEKELUARGAAN', class: '1 TERBILANG' },
      { name: 'Nur Azizah', date: '2024-01-25', teacher_name: 'CHEN', subject: 'SAINS', class: '1 CEMERLANG' },
      { name: 'Rahman bin Ismail', date: '2024-01-25', teacher_name: 'HUSSAIN', subject: 'MATEMATIK', class: '2 TERBILANG' },
      { name: 'Nurul Iman', date: '2024-01-25', teacher_name: 'FATIMAH', subject: 'SAINS', class: '2 CEMERLANG' },
    ];

    for (const student of studentData) {
      // Get or create unique student
      let uniqueStudentResult = await client.query(
        `SELECT id FROM unique_students WHERE name = $1`,
        [student.name]
      );

      if (uniqueStudentResult.rows.length === 0) {
        uniqueStudentResult = await client.query(
          `INSERT INTO unique_students (name) VALUES ($1) RETURNING id`,
          [student.name]
        );
      }

      const uniqueStudentId = uniqueStudentResult.rows[0].id;

      // Get or create class
      let classResult = await client.query(
        `SELECT id FROM classes WHERE name = $1`,
        [student.class]
      );

      if (classResult.rows.length === 0) {
        classResult = await client.query(
          `INSERT INTO classes (name) VALUES ($1) RETURNING id`,
          [student.class]
        );
      }

      const classId = classResult.rows[0].id;

      // Get or create teacher
      let teacherResult = await client.query(
        `SELECT id FROM teachers WHERE name = $1`,
        [student.teacher_name]
      );

      if (teacherResult.rows.length === 0) {
        teacherResult = await client.query(
          `INSERT INTO teachers (name) VALUES ($1) RETURNING id`,
          [student.teacher_name]
        );
      }

      const teacherId = teacherResult.rows[0].id;

      // Get or create subject
      let subjectResult = await client.query(
        `SELECT id FROM subjects WHERE name = $1`,
        [student.subject]
      );

      if (subjectResult.rows.length === 0) {
        subjectResult = await client.query(
          `INSERT INTO subjects (name) VALUES ($1) RETURNING id`,
          [student.subject]
        );
      }

      const subjectId = subjectResult.rows[0].id;

      // Insert student enrollment record
      const studentResult = await client.query(
        `INSERT INTO students (unique_student_id, class_id, teacher_id, subject_id, enrollment_date) 
         VALUES ($1, $2, $3, $4, $5) 
         RETURNING id`,
        [uniqueStudentId, classId, teacherId, subjectId, student.date]
      );

      const studentId = studentResult.rows[0].id;

      // Insert default ratings for this student
      const ratingTypes = ['TP1', 'TP2', 'TP3', 'TP4', 'TP5', 'TP6', 'TD'];
      for (const ratingType of ratingTypes) {
        await client.query(
          `INSERT INTO ratings (student_id, rating_type, is_selected) 
           VALUES ($1, $2, $3)`,
          [studentId, ratingType, false]
        );
      }
    }

    console.log(`✅ Added ${studentData.length} sample students with ratings!`);
    console.log('\nSample data included:');
    studentData.forEach((s, i) => {
      console.log(`  ${i + 1}. ${s.name} (${s.class}) - Guru: ${s.teacher_name}`);
    });

  } catch (error) {
    console.error('\n❌ Error adding sample data:');
    console.error(error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

addSampleData();
