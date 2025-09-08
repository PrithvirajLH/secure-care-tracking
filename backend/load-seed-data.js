const sql = require('mssql');
const fs = require('fs');
require('dotenv').config();

const dbConfig = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_DATABASE,
  port: parseInt(process.env.DB_PORT) || 1433,
  options: {
    encrypt: false,
    trustServerCertificate: true,
    enableArithAbort: true
  }
};

async function loadSeedData() {
  try {
    // Connection logging removed
    const pool = await sql.connect(dbConfig);
    // Success logging removed
    
    // Optional: Clearing disabled for insert-only seeding
    // Seeding mode logging removed
    
    // Load complex seed data (10 advisors, 50 employees, varied states)
    const seedSQL = fs.readFileSync('./scripts/simple_seed.sql', 'utf8');
    
    // Loading logging removed
    await pool.request().query(seedSQL);
    // Success logging removed
    
    // Verify data was loaded
    const result = await pool.request().query('SELECT COUNT(*) as employeeCount FROM dbo.SecureCareEmployee');
    const advisorResult = await pool.request().query('SELECT COUNT(*) as advisorCount FROM dbo.Advisor');
    
    // Data count logging removed
    
    // Show some sample data
    // Sample data preview logging removed
    const sampleData = await pool.request().query(`
      SELECT TOP 5 
        employeeId, name, employeeNumber, awardType, facility, area, 
        assignedDate, secureCareAwarded, awaiting
      FROM dbo.SecureCareEmployee 
      ORDER BY employeeId
    `);
    
    console.table(sampleData.recordset);
    
    await pool.close();
    // Completion logging removed
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.originalError) {
      console.error('Original error:', err.originalError.message);
    }
    process.exit(1);
  }
}

loadSeedData();
