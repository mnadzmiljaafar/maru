const { Client } = require('pg');
require('dotenv').config({ path: '.env.local' });

async function verifyDatabase() {
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
    console.log('✅ Connected successfully!\n');

    // Check database name
    const dbResult = await client.query("SELECT current_database();");
    console.log(`📊 Current Database: ${dbResult.rows[0].current_database}\n`);

    // Count students
    const studentCount = await client.query('SELECT COUNT(*) FROM students;');
    console.log(`👥 Total Students: ${studentCount.rows[0].count}`);

    // Count ratings
    const ratingCount = await client.query('SELECT COUNT(*) FROM ratings;');
    console.log(`⭐ Total Ratings: ${ratingCount.rows[0].count}\n`);

    // Show all students
    const students = await client.query(`
      SELECT 
        id, 
        name, 
        date, 
        teacher_name, 
        subject, 
        class,
        created_at
      FROM students 
      ORDER BY id DESC
    `);

    if (students.rows.length === 0) {
      console.log('❌ NO STUDENTS FOUND IN DATABASE');
    } else {
      console.log('📋 Students in Database:');
      students.rows.forEach((s, i) => {
        console.log(`  ${i + 1}. ID: ${s.id} | ${s.name} | Class: ${s.class} | Teacher: ${s.teacher_name}`);
      });
    }

    console.log('\n');

    // Show ratings for first student
    if (students.rows.length > 0) {
      const firstStudent = students.rows[0];
      const ratings = await client.query(`
        SELECT rating_type, is_selected, created_at, updated_at
        FROM ratings
        WHERE student_id = $1
        ORDER BY rating_type
      `, [firstStudent.id]);

      console.log(`📊 Ratings for "${firstStudent.name}" (ID: ${firstStudent.id}):`);
      ratings.rows.forEach(r => {
        console.log(`   ${r.rating_type}: ${r.is_selected ? '✅' : '❌'}`);
      });
    }

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

verifyDatabase();
