const sql = require('mssql');
require('dotenv').config();

// Database configuration
const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false, // Set to true for Azure SQL, false for local SQL Server
    trustServerCertificate: true, // Trust self-signed certificates
    enableArithAbort: true
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000
  },
  connectionTimeout: 15000,
  requestTimeout: 15000
};

let pool = null;

// Initialize database connection
async function initDatabase() {
  try {
    if (!pool) {
      pool = await sql.connect(dbConfig);
      console.log('✅ Database connected successfully');
    }
    return pool;
  } catch (err) {
    console.error('❌ Database connection error:', err);
    throw err;
  }
}

// Get database connection pool
async function getPool() {
  if (!pool) {
    await initDatabase();
  }
  return pool;
}

// Close database connection
async function closeDatabase() {
  if (pool) {
    await pool.close();
    pool = null;
    console.log('🔌 Database connection closed');
  }
}

module.exports = {
  initDatabase,
  getPool,
  closeDatabase,
  sql
};
