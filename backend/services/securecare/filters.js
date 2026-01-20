const { getPool } = require('./helpers');

module.exports = {
  async getFilterOptions() {
    const pool = await getPool();

    const facilitiesQuery = `
      SELECT DISTINCT facility 
      FROM dbo.SecureCareEmployee 
      WHERE facility IS NOT NULL AND facility != ''
      ORDER BY facility
    `;
    
    const areasQuery = `
      SELECT DISTINCT area 
      FROM dbo.SecureCareEmployee 
      WHERE area IS NOT NULL AND area != ''
      ORDER BY area
    `;
    
    const jobTitlesQuery = `
      SELECT DISTINCT staffRoll 
      FROM dbo.SecureCareEmployee 
      WHERE staffRoll IS NOT NULL AND staffRoll != ''
      ORDER BY staffRoll
    `;
    
    const [facilitiesResult, areasResult, jobTitlesResult] = await Promise.all([
      pool.request().query(facilitiesQuery),
      pool.request().query(areasQuery),
      pool.request().query(jobTitlesQuery)
    ]);
    
    return {
      facilities: facilitiesResult.recordset.map(row => row.facility),
      areas: areasResult.recordset.map(row => row.area),
      jobTitles: jobTitlesResult.recordset.map(row => row.staffRoll)
    };
  }
};
