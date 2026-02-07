import { Pool } from 'pg';

let pool: Pool | null = null;

export function getPool(): Pool {
  if (!pool) {
    // Support both connection string and individual parameters
    const connectionString = process.env.DATABASE_URL;
    
    if (connectionString) {
      pool = new Pool({
        connectionString,
        // SSL configuration for production (like Heroku, Railway, etc.)
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
      });
    } else {
      pool = new Pool({
        user: process.env.DB_USER || 'postgres',
        password: process.env.DB_PASSWORD,
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || 'teacher_assessment',
      });
    }

    // Handle pool errors
    pool.on('error', (err) => {
      console.error('Unexpected error on idle client', err);
      process.exit(-1);
    });
  }

  return pool;
}

export async function query(text: string, params?: any[]) {
  const pool = getPool();
  const start = Date.now();
  
  try {
    const res = await pool.query(text, params);
    const duration = Date.now() - start;
    console.log('Executed query', { text, duration, rows: res.rowCount });
    return res;
  } catch (error) {
    console.error('Database query error:', error);
    throw error;
  }
}

export async function getClient() {
  const pool = getPool();
  return await pool.connect();
}

// Close pool (useful for cleanup in tests or scripts)
export async function closePool() {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
