const express = require('express');
const router = express.Router();
const secureCareService = require('../services/secureCareService');

// Get employees by level with filters
router.get('/employees/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const filters = {
      facility: req.query.facility,
      area: req.query.area,
      search: req.query.search,
      status: req.query.status,
      jobTitle: req.query.jobTitle,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };
    
    const result = await secureCareService.getEmployeesByLevel(level, filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get employees error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get unique employees by level (one entry per employee with highest status)
router.get('/employees-unique/:level', async (req, res) => {
  try {
    const { level } = req.params;
    const filters = {
      facility: req.query.facility,
      area: req.query.area,
      search: req.query.search,
      status: req.query.status,
      jobTitle: req.query.jobTitle,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };
    
    const result = await secureCareService.getUniqueEmployeesByLevel(level, filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get unique employees error:', error);
    res.status(500).json({ 
      error: 'Internal server error',
      message: error.message 
    });
  }
});

// Get employee by ID
router.get('/employee/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const employee = await secureCareService.getEmployeeById(parseInt(id));
    res.json(employee);
    
  } catch (error) {
    console.error('Get employee error:', error);
    if (error.message === 'Employee not found') {
      res.status(404).json({ error: 'Employee not found' });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Get all awardType records for an employee (by employeeId -> employeeNumber)
router.get('/employee/:id/levels', async (req, res) => {
  try {
    const { id } = req.params;
    const records = await secureCareService.getEmployeeLevelsByEmployeeId(parseInt(id));
    res.json(records);
  } catch (error) {
    console.error('Get employee levels error:', error);
    if (error.message === 'Employee not found') {
      res.status(404).json({ error: 'Employee not found' });
    } else {
      res.status(500).json({ 
        error: 'Internal server error',
        message: error.message 
      });
    }
  }
});

// Approve conference
router.post('/approve', async (req, res) => {
  try {
    const { employeeId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }
    
    const result = await secureCareService.approveConference(employeeId);
    res.json(result);
    
  } catch (error) {
    console.error('Approve conference error:', error);
    res.status(500).json({ 
      error: 'Failed to approve conference',
      message: error.message 
    });
  }
});

// Reject conference
router.post('/reject', async (req, res) => {
  try {
    const { employeeId } = req.body;
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }
    const result = await secureCareService.rejectConference(employeeId);
    res.json(result);
  } catch (error) {
    console.error('Reject conference error:', error);
    res.status(500).json({ 
      error: 'Failed to reject conference',
      message: error.message 
    });
  }
});

// Schedule training
router.post('/schedule', async (req, res) => {
  try {
    const { employeeId, columnName, date } = req.body;
    
    if (!employeeId || !columnName || !date) {
      return res.status(400).json({ 
        error: 'employeeId, columnName, and date are required' 
      });
    }
    
    const result = await secureCareService.scheduleTraining(employeeId, columnName, date);
    res.json(result);
    
  } catch (error) {
    console.error('Schedule training error:', error);
    res.status(500).json({ 
      error: 'Failed to schedule training',
      message: error.message 
    });
  }
});

// Complete training
router.post('/complete', async (req, res) => {
  try {
    const { employeeId, scheduleColumn, completeColumn } = req.body;
    
    if (!employeeId || !scheduleColumn || !completeColumn) {
      return res.status(400).json({ 
        error: 'employeeId, scheduleColumn, and completeColumn are required' 
      });
    }
    
    const result = await secureCareService.completeTraining(employeeId, scheduleColumn, completeColumn);
    res.json(result);
    
  } catch (error) {
    console.error('Complete training error:', error);
    res.status(500).json({ 
      error: 'Failed to complete training',
      message: error.message 
    });
  }
});

// Get advisors
router.get('/advisors', async (req, res) => {
  try {
    const advisors = await secureCareService.getAdvisors();
    res.json(advisors);
    
  } catch (error) {
    console.error('Get advisors error:', error);
    res.status(500).json({ 
      error: 'Failed to get advisors',
      message: error.message 
    });
  }
});

// Get filter options (facilities, areas, job titles)
router.get('/filter-options', async (req, res) => {
  try {
    const options = await secureCareService.getFilterOptions();
    res.json(options);
    
  } catch (error) {
    console.error('Get filter options error:', error);
    res.status(500).json({ 
      error: 'Failed to get filter options',
      message: error.message 
    });
  }
});

// Update employee notes
router.post('/update-notes', async (req, res) => {
  try {
    const { employeeId, notes } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }
    
    const result = await secureCareService.updateEmployeeNotes(employeeId, notes);
    res.json(result);
    
  } catch (error) {
    console.error('Update notes error:', error);
    res.status(500).json({ 
      error: 'Failed to update notes',
      message: error.message 
    });
  }
});

// Update employee advisor
router.post('/update-advisor', async (req, res) => {
  try {
    const { employeeId, advisorId } = req.body;
    
    if (!employeeId) {
      return res.status(400).json({ error: 'employeeId is required' });
    }
    
    const result = await secureCareService.updateEmployeeAdvisor(employeeId, advisorId);
    res.json(result);
    
  } catch (error) {
    console.error('Update advisor error:', error);
    res.status(500).json({ 
      error: 'Failed to update advisor',
      message: error.message 
    });
  }
});

// Analytics Routes
router.get('/analytics/overview', async (req, res) => {
  try {
    const filters = {
      facility: req.query.facility,
      area: req.query.area,
      level: req.query.level,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await secureCareService.getAnalyticsOverview(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get analytics overview error:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics overview',
      message: error.message 
    });
  }
});

router.get('/analytics/facility-performance', async (req, res) => {
  try {
    const filters = {
      level: req.query.level,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await secureCareService.getFacilityPerformance(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get facility performance error:', error);
    res.status(500).json({ 
      error: 'Failed to get facility performance',
      message: error.message 
    });
  }
});

router.get('/analytics/area-performance', async (req, res) => {
  try {
    const filters = {
      level: req.query.level,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await secureCareService.getAreaPerformance(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get area performance error:', error);
    res.status(500).json({ 
      error: 'Failed to get area performance',
      message: error.message 
    });
  }
});

router.get('/analytics/monthly-trends', async (req, res) => {
  try {
    const filters = {
      facility: req.query.facility,
      area: req.query.area,
      level: req.query.level
    };
    
    const result = await secureCareService.getMonthlyTrends(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get monthly trends error:', error);
    res.status(500).json({ 
      error: 'Failed to get monthly trends',
      message: error.message 
    });
  }
});

router.get('/analytics/certification-progress', async (req, res) => {
  try {
    const filters = {
      facility: req.query.facility,
      area: req.query.area,
      startDate: req.query.startDate,
      endDate: req.query.endDate
    };
    
    const result = await secureCareService.getCertificationProgress(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get certification progress error:', error);
    res.status(500).json({ 
      error: 'Failed to get certification progress',
      message: error.message 
    });
  }
});

router.get('/analytics/recent-activity', async (req, res) => {
  try {
    const filters = {
      facility: req.query.facility,
      area: req.query.area,
      level: req.query.level
    };
    
    const result = await secureCareService.getRecentActivity(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get recent activity error:', error);
    res.status(500).json({ 
      error: 'Failed to get recent activity',
      message: error.message 
    });
  }
});

router.get('/analytics/metrics', async (req, res) => {
  try {
    const filters = {
      facility: req.query.facility,
      area: req.query.area
    };
    
    const result = await secureCareService.getAnalyticsMetrics(filters);
    res.json(result);
    
  } catch (error) {
    console.error('Get analytics metrics error:', error);
    res.status(500).json({ 
      error: 'Failed to get analytics metrics',
      message: error.message 
    });
  }
});

module.exports = router;
