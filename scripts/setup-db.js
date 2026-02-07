const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function setupDatabase() {
  // Read environment variables
  require('dotenv').config({ path: '.env.local' });

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

    console.log('\nReading schema.sql...');
    const schemaSQL = fs.readFileSync(path.join(__dirname, '..', 'schema.sql'), 'utf8');

    console.log('Executing SQL commands...');
    await client.query(schemaSQL);

    console.log('\n✅ Database setup completed successfully!');
    console.log('\nTables created:');
    console.log('  - subjects');
    console.log('  - classes');
    console.log('  - teachers');
    console.log('  - students');
    console.log('  - ratings');
    console.log('\nIndexes created for optimal query performance.');
    console.log('\nYou can now run: npm run dev');

  } catch (error) {
    console.error('\n❌ Error setting up database:');
    console.error(error.message);
    console.error('\nPlease check:');
    console.error('1. PostgreSQL is running');
    console.error('2. Database credentials in .env.local are correct');
    console.error('3. Database "teacher_assessment" exists (or create it first)');
    process.exit(1);
  } finally {
    await client.end();
  }
}

setupDatabase();
