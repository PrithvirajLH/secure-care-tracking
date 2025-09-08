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

module.exports = router;
