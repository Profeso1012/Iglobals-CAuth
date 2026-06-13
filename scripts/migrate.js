require('dotenv').config();
const { Client } = require('pg');
const fs = require('fs');
const path = require('path');

async function migrate() {
  const client = new Client({
    connectionString: process.env.DATABASE_URL,
  });

  try {
    await client.connect();
    console.log('Connected to database');

    const migrationsDir = path.join(__dirname, '../migrations');
    const files = fs.readdirSync(migrationsDir).sort();

    for (const file of files) {
      if (file.endsWith('.sql')) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
          await client.query('BEGIN');
          await client.query(sql);
          await client.query('COMMIT');
          console.log(`Successfully migrated: ${file}`);
        } catch (e) {
          await client.query('ROLLBACK');
          console.error(`Error migrating ${file}:`, e);
          process.exit(1);
        }
      }
    }
    console.log('All migrations completed successfully.');
  } catch (err) {
    console.error('Database connection error:', err);
  } finally {
    await client.end();
  }
}

migrate();
