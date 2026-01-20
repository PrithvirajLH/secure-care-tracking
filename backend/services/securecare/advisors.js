const { getPool, sql } = require('./helpers');

module.exports = {
  async getAdvisors() {
    const pool = await getPool();
    const request = pool.request();
    
    const result = await request.query(`
      SELECT 
        advisorId,
        firstName,
        lastName,
        firstName + ' ' + ISNULL(lastName, '') as fullName
      FROM dbo.Advisor
      ORDER BY lastName, firstName
    `);
    
    return result.recordset;
  }

  // Add new advisor

  ,async addAdvisor(firstName, lastName) {
    const pool = await getPool();
    const request = pool.request();
    request.input('firstName', sql.NVarChar, firstName);
    request.input('lastName', sql.NVarChar, lastName);
    
    const result = await request.query(`
      INSERT INTO dbo.Advisor (firstName, lastName)
      OUTPUT INSERTED.advisorId, INSERTED.firstName, INSERTED.lastName, 
             INSERTED.firstName + ' ' + ISNULL(INSERTED.lastName, '') as fullName
      VALUES (@firstName, @lastName)
    `);
    
    if (result.recordset.length === 0) {
      throw new Error('Failed to create advisor');
    }
    
    return result.recordset[0];
  }
  
  // Update employee notes

};
