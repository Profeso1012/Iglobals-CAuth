import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20, // maximum number of clients in the pool
  idleTimeoutMillis: 30000, // close idle clients after 30 seconds
  connectionTimeoutMillis: 10000, // return an error after 10 seconds if connection could not be established
  ssl: process.env.DATABASE_URL?.includes('sslmode=') ? undefined : {
    rejectUnauthorized: false
  }
});

// Handle pool errors
pool.on('error', (err) => {
  console.error('[DB Pool] Unexpected error on idle client', err);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export { pool };
