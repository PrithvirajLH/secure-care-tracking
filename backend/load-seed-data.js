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
    console.log('🔌 Connecting to database...');
    const pool = await sql.connect(dbConfig);
    console.log('✅ Connected successfully');
    
    // Clear existing data first (carefully)
    console.log('🧹 Clearing existing data...');
    try {
      await pool.request().query('DELETE FROM dbo.SecureCareEmployee');
      console.log('  - SecureCareEmployee cleared');
    } catch (err) {
      console.log('  - SecureCareEmployee clear failed:', err.message);
    }
    
    try {
      await pool.request().query('DELETE FROM dbo.Advisor');
      console.log('  - Advisor cleared');
    } catch (err) {
      console.log('  - Advisor clear failed:', err.message);
    }
    console.log('✅ Data clearing attempted');
    
    // Load seed data
    const seedSQL = fs.readFileSync('./scripts/simple_seed.sql', 'utf8');
    
    console.log('📊 Loading seed data...');
    await pool.request().query(seedSQL);
    console.log('✅ Seed data loaded successfully');
    
    // Verify data was loaded
    const result = await pool.request().query('SELECT COUNT(*) as employeeCount FROM dbo.SecureCareEmployee');
    const advisorResult = await pool.request().query('SELECT COUNT(*) as advisorCount FROM dbo.Advisor');
    
    console.log(`📈 Data loaded: ${result.recordset[0].employeeCount} employees, ${advisorResult.recordset[0].advisorCount} advisors`);
    
    // Show some sample data
    console.log('\n📋 Sample data preview:');
    const sampleData = await pool.request().query(`
      SELECT TOP 5 
        employeeId, name, employeeNumber, awardType, facility, area, 
        assignedDate, secureCareAwarded, awaiting
      FROM dbo.SecureCareEmployee 
      ORDER BY employeeId
    `);
    
    console.table(sampleData.recordset);
    
    await pool.close();
    console.log('🎉 Database seeding complete!');
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (err.originalError) {
      console.error('Original error:', err.originalError.message);
    }
    process.exit(1);
  }
}

loadSeedData();
