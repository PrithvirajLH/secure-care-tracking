import { NextApiRequest, NextApiResponse } from 'next';
import { sql } from '@vercel/postgres';

interface EmployeeFilters {
  level?: string;
  facility?: string;
  area?: string;
  status?: string;
  search?: string;
}

interface PaginationParams {
  page: number;
  limit: number;
  filters: EmployeeFilters;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method === 'GET') {
    try {
      const { page = 1, limit = 50, level, facility, area, status, search } = req.query;
      
      // Build WHERE clause based on filters
      const whereConditions = [];
      const params = [];
      let paramIndex = 1;

      if (level) {
        whereConditions.push(`level = $${paramIndex}`);
        params.push(level);
        paramIndex++;
      }

      if (facility) {
        whereConditions.push(`facility = $${paramIndex}`);
        params.push(facility);
        paramIndex++;
      }

      if (area) {
        whereConditions.push(`area = $${paramIndex}`);
        params.push(area);
        paramIndex++;
      }

      if (status === 'active') {
        whereConditions.push(`status = 'active'`);
      }

      if (search) {
        whereConditions.push(`(name ILIKE $${paramIndex} OR employee_id ILIKE $${paramIndex})`);
        params.push(`%${search}%`);
        paramIndex++;
      }

      const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

      // Get total count
      const countQuery = `
        SELECT COUNT(*) as total 
        FROM employees 
        ${whereClause}
      `;
      
      const countResult = await sql.query(countQuery, params);
      const total = parseInt(countResult.rows[0].total);

      // Calculate pagination
      const offset = (parseInt(page as string) - 1) * parseInt(limit as string);
      const totalPages = Math.ceil(total / parseInt(limit as string));

      // Get paginated data
      const dataQuery = `
        SELECT 
          employee_id,
          name,
          facility,
          area,
          staff_roles,
          level1_relias_assigned,
          level1_relias_completed,
          level1_conference_completed,
          level1_awarded,
          level1_awarded_date,
          level2_conference_completed,
          level2_standing_video,
          level2_sleeping_sitting_video,
          level2_feeding_video,
          level2_awarded,
          level2_awarded_date,
          level3_conference_completed,
          level3_sitting_standing_approaching,
          level3_no_hand_no_speak,
          level3_challenge_sleeping,
          level3_awarded,
          level3_awarded_date,
          consultant_conference_completed,
          consultant_coaching_session_1,
          consultant_coaching_session_2,
          consultant_coaching_session_3,
          consultant_awarded,
          consultant_awarded_date,
          coach_conference_completed,
          coach_coaching_session_1,
          coach_coaching_session_2,
          coach_coaching_session_3,
          coach_awarded,
          coach_awarded_date,
          status,
          created_at,
          updated_at
        FROM employees 
        ${whereClause}
        ORDER BY name
        LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
      `;

      const dataParams = [...params, parseInt(limit as string), offset];
      const dataResult = await sql.query(dataQuery, dataParams);

      // Transform data to match frontend expectations
      const employees = dataResult.rows.map(row => ({
        employeeId: row.employee_id,
        name: row.name,
        facility: row.facility,
        area: row.area,
        staffRoles: row.staff_roles,
        level1ReliasAssigned: row.level1_relias_assigned ? new Date(row.level1_relias_assigned) : null,
        level1ReliasCompleted: row.level1_relias_completed ? new Date(row.level1_relias_completed) : null,
        level1ConferenceCompleted: row.level1_conference_completed ? new Date(row.level1_conference_completed) : null,
        level1Awarded: row.level1_awarded,
        level1AwardedDate: row.level1_awarded_date ? new Date(row.level1_awarded_date) : null,
        level2ConferenceCompleted: row.level2_conference_completed ? new Date(row.level2_conference_completed) : null,
        level2StandingVideo: row.level2_standing_video ? new Date(row.level2_standing_video) : null,
        level2SleepingSittingVideo: row.level2_sleeping_sitting_video ? new Date(row.level2_sleeping_sitting_video) : null,
        level2FeedingVideo: row.level2_feeding_video ? new Date(row.level2_feeding_video) : null,
        level2Awarded: row.level2_awarded,
        level2AwardedDate: row.level2_awarded_date ? new Date(row.level2_awarded_date) : null,
        level3ConferenceCompleted: row.level3_conference_completed ? new Date(row.level3_conference_completed) : null,
        level3SittingStandingApproaching: row.level3_sitting_standing_approaching ? new Date(row.level3_sitting_standing_approaching) : null,
        level3NoHandNoSpeak: row.level3_no_hand_no_speak ? new Date(row.level3_no_hand_no_speak) : null,
        level3ChallengeSleeping: row.level3_challenge_sleeping ? new Date(row.level3_challenge_sleeping) : null,
        level3Awarded: row.level3_awarded,
        level3AwardedDate: row.level3_awarded_date ? new Date(row.level3_awarded_date) : null,
        consultantConferenceCompleted: row.consultant_conference_completed ? new Date(row.consultant_conference_completed) : null,
        consultantCoachingSession1: row.consultant_coaching_session_1 ? new Date(row.consultant_coaching_session_1) : null,
        consultantCoachingSession2: row.consultant_coaching_session_2 ? new Date(row.consultant_coaching_session_2) : null,
        consultantCoachingSession3: row.consultant_coaching_session_3 ? new Date(row.consultant_coaching_session_3) : null,
        consultantAwarded: row.consultant_awarded,
        consultantAwardedDate: row.consultant_awarded_date ? new Date(row.consultant_awarded_date) : null,
        coachConferenceCompleted: row.coach_conference_completed ? new Date(row.coach_conference_completed) : null,
        coachCoachingSession1: row.coach_coaching_session_1 ? new Date(row.coach_coaching_session_1) : null,
        coachCoachingSession2: row.coach_coaching_session_2 ? new Date(row.coach_coaching_session_2) : null,
        coachCoachingSession3: row.coach_coaching_session_3 ? new Date(row.coach_coaching_session_3) : null,
        coachAwarded: row.coach_awarded,
        coachAwardedDate: row.coach_awarded_date ? new Date(row.coach_awarded_date) : null,
        status: row.status,
        createdAt: new Date(row.created_at),
        updatedAt: new Date(row.updated_at),
      }));

      res.status(200).json({
        employees,
        total,
        page: parseInt(page as string),
        totalPages,
        hasNextPage: parseInt(page as string) < totalPages,
      });
    } catch (error) {
      console.error('Error fetching employees:', error);
      res.status(500).json({ error: 'Failed to fetch employees' });
    }
  } else {
    res.setHeader('Allow', ['GET']);
    res.status(405).end(`Method ${req.method} Not Allowed`);
  }
}
