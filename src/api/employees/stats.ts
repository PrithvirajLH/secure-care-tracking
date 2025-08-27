import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { level } = req.query;

      let statsQuery = '';
      let params = [];

      if (level) {
        // Get stats for specific level
        switch (level) {
          case 'care-partner':
            statsQuery = `
              SELECT 
                COUNT(*) as total,
                COUNT(CASE WHEN level1_awarded = true THEN 1 END) as completed,
                COUNT(CASE WHEN level1_relias_assigned IS NOT NULL AND level1_relias_completed IS NULL THEN 1 END) as in_progress,
                COUNT(CASE WHEN level1_relias_assigned IS NULL THEN 1 END) as pending,
                COUNT(CASE WHEN level1_relias_assigned IS NOT NULL AND level1_relias_completed IS NULL AND level1_relias_assigned < NOW() - INTERVAL '30 days' THEN 1 END) as overdue
              FROM employees 
              WHERE status = 'active'
            `;
            break;
          case 'associate':
            statsQuery = `
              SELECT 
                COUNT(CASE WHEN level1_awarded = true THEN 1 END) as total,
                COUNT(CASE WHEN level2_awarded = true THEN 1 END) as completed,
                COUNT(CASE WHEN level2_relias_assigned IS NOT NULL AND level2_relias_completed IS NULL THEN 1 END) as in_progress,
                COUNT(CASE WHEN level1_awarded = true AND level2_relias_assigned IS NULL THEN 1 END) as pending,
                COUNT(CASE WHEN level2_relias_assigned IS NOT NULL AND level2_relias_completed IS NULL AND level2_relias_assigned < NOW() - INTERVAL '45 days' THEN 1 END) as overdue
              FROM employees 
              WHERE status = 'active'
            `;
            break;
          case 'champion':
            statsQuery = `
              SELECT 
                COUNT(CASE WHEN level2_awarded = true THEN 1 END) as total,
                COUNT(CASE WHEN level3_awarded = true THEN 1 END) as completed,
                COUNT(CASE WHEN level3_relias_assigned IS NOT NULL AND level3_relias_completed IS NULL THEN 1 END) as in_progress,
                COUNT(CASE WHEN level2_awarded = true AND level3_relias_assigned IS NULL THEN 1 END) as pending,
                COUNT(CASE WHEN level3_relias_assigned IS NOT NULL AND level3_relias_completed IS NULL AND level3_relias_assigned < NOW() - INTERVAL '60 days' THEN 1 END) as overdue
              FROM employees 
              WHERE status = 'active'
            `;
            break;
          case 'consultant':
            statsQuery = `
              SELECT 
                COUNT(CASE WHEN level3_awarded = true THEN 1 END) as total,
                COUNT(CASE WHEN consultant_awarded = true THEN 1 END) as completed,
                COUNT(CASE WHEN consultant_relias_assigned IS NOT NULL AND consultant_relias_completed IS NULL THEN 1 END) as in_progress,
                COUNT(CASE WHEN level3_awarded = true AND consultant_relias_assigned IS NULL THEN 1 END) as pending,
                COUNT(CASE WHEN consultant_relias_assigned IS NOT NULL AND consultant_relias_completed IS NULL AND consultant_relias_assigned < NOW() - INTERVAL '90 days' THEN 1 END) as overdue
              FROM employees 
              WHERE status = 'active'
            `;
            break;
          case 'coach':
            statsQuery = `
              SELECT 
                COUNT(CASE WHEN consultant_awarded = true THEN 1 END) as total,
                COUNT(CASE WHEN coach_awarded = true THEN 1 END) as completed,
                COUNT(CASE WHEN coach_relias_assigned IS NOT NULL AND coach_relias_completed IS NULL THEN 1 END) as in_progress,
                COUNT(CASE WHEN consultant_awarded = true AND coach_relias_assigned IS NULL THEN 1 END) as pending,
                COUNT(CASE WHEN coach_relias_assigned IS NOT NULL AND coach_relias_completed IS NULL AND coach_relias_assigned < NOW() - INTERVAL '120 days' THEN 1 END) as overdue
              FROM employees 
              WHERE status = 'active'
            `;
            break;
          default:
            return res.status(400).json({ error: 'Invalid level parameter' });
        }
      } else {
        // Get overall stats
        statsQuery = `
          SELECT 
            COUNT(*) as total_employees,
            COUNT(CASE WHEN status = 'active' THEN 1 END) as active_employees,
            COUNT(CASE WHEN level1_awarded = true THEN 1 END) as level1_completed,
            COUNT(CASE WHEN level2_awarded = true THEN 1 END) as level2_completed,
            COUNT(CASE WHEN level3_awarded = true THEN 1 END) as level3_completed,
            COUNT(CASE WHEN consultant_awarded = true THEN 1 END) as consultant_completed,
            COUNT(CASE WHEN coach_awarded = true THEN 1 END) as coach_completed
          FROM employees
        `;
      }

      const result = await sql.query(statsQuery, params);
      const stats = result.rows[0];

      if (level) {
        // Calculate completion rate
        const completionRate = stats.total > 0 ? Math.round((stats.completed / stats.total) * 100) : 0;

        res.status(200).json({
          total: parseInt(stats.total),
          completed: parseInt(stats.completed),
          inProgress: parseInt(stats.in_progress),
          pending: parseInt(stats.pending),
          overdue: parseInt(stats.overdue),
          completionRate
        });
      } else {
        res.status(200).json({
          totalEmployees: parseInt(stats.total_employees),
          activeEmployees: parseInt(stats.active_employees),
          level1Completed: parseInt(stats.level1_completed),
          level2Completed: parseInt(stats.level2_completed),
          level3Completed: parseInt(stats.level3_completed),
          consultantCompleted: parseInt(stats.consultant_completed),
          coachCompleted: parseInt(stats.coach_completed)
        });
      }
    } catch (error) {
      console.error('Error fetching employee stats:', error);
      res.status(500).json({ error: 'Failed to fetch employee statistics' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
