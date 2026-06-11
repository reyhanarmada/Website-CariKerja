import pkg from 'pg';
const { Pool } = pkg;
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'db',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'jobstreet_db',
});

// Test connection and retry if it fails (crucial for Docker orchestration)
const connectWithRetry = async () => {
  let retries = 10;
  while (retries) {
    try {
      const client = await pool.connect();
      console.log('Successfully connected to PostgreSQL Database!');
      client.release();
      break;
    } catch (err) {
      console.error(`Database connection failed. Retries remaining: ${retries - 1}. Error: ${err.message}`);
      retries -= 1;
      // Wait 5 seconds before retrying
      await new Promise((resolve) => setTimeout(resolve, 5000));
    }
  }
  if (retries === 0) {
    console.error('Could not connect to PostgreSQL Database. Exiting.');
    process.exit(1);
  }
};

connectWithRetry();

export default pool;
