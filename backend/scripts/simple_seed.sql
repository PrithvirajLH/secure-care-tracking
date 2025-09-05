-- Simple seed data without explicit IDs

-- Advisors (let identity auto-increment)
INSERT INTO dbo.Advisor (firstName, lastName) VALUES
('Miguel', 'Li'),
('Taylor', 'Gupta'),
('Nina', 'Lopez'),
('Avery', 'Wilson'),
('Morgan', 'Li'),
('Sam', 'Gupta'),
('Miguel', 'Lopez'),
('Taylor', 'Wilson'),
('Nina', 'Li'),
('Avery', 'Gupta');

-- Get advisor IDs for reference
DECLARE @advisor1 INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName = 'Miguel' AND lastName = 'Li');
DECLARE @advisor2 INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName = 'Taylor' AND lastName = 'Gupta');
DECLARE @advisor3 INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName = 'Nina' AND lastName = 'Lopez');

-- Sample employees (let identity auto-increment)
INSERT INTO dbo.SecureCareEmployee (
  area, facility, staffRoll, name, employeeNumber, awardType, 
  assignedDate, completedDate, conferenceCompleted, secureCareAwardedDate, 
  secureCareAwarded, notes, advisorId, awaiting
) VALUES
-- Level 1 employees (read-only)
('A2', 'Elm Grove', 'CNA', 'Chen Hassan', 'E1001', 'Level 1', '2025-08-02', '2025-08-09', NULL, NULL, 0, 'Test Level 1', @advisor2, 0),
('A2', 'Northview', 'CNA', 'Nina Nguyen', 'E1002', 'Level 1', '2025-08-03', '2025-08-10', NULL, '2025-08-13', 1, 'Test Level 1 Awarded', @advisor3, 0),
('A1', 'Southridge', 'CNA', 'Riley Li', 'E1003', 'Level 1', '2025-08-04', NULL, NULL, NULL, 0, 'Test Level 1 Incomplete', @advisor1, 0),

-- Level 2 employees (interactive)
('A2', 'Elm Grove', 'CNA', 'Alex Johnson', 'E1011', 'Level 2', NULL, NULL, '2025-08-16', NULL, 0, 'Test Level 2 - Awaiting Approval', @advisor2, 0),
('A1', 'Southridge', 'CNA', 'Maria Garcia', 'E1012', 'Level 2', NULL, NULL, '2025-08-18', '2025-08-28', 1, 'Test Level 2 - Approved & Awarded', @advisor1, 1),
('E2', 'Lakeside', 'Med Aide', 'Sam Carter', 'E1004', 'Level 2', NULL, NULL, '2025-08-20', NULL, 0, 'Test Level 2 - Approved, Not Awarded', @advisor1, 1),

-- Level 3 employees (interactive)
('A2', 'Elm Grove', 'CNA', 'David Brown', 'E1021', 'Level 3', NULL, NULL, '2025-08-17', NULL, 0, 'Test Level 3 - Awaiting Approval', @advisor2, 0),
('A1', 'Eastwood', 'Therapist', 'Nina Gupta', 'E1006', 'Level 3', NULL, NULL, '2025-08-22', '2025-09-02', 1, 'Test Level 3 - Complete', @advisor3, 1),

-- Consultant employees (interactive)
('A2', 'Southridge', 'Housekeeping', 'Riley Patel', 'E1007', 'Consultant', NULL, NULL, '2025-08-23', NULL, 0, 'Test Consultant - Awaiting', @advisor1, 0),
('B1', 'Southridge', 'CNA', 'Chen Rao', 'E1031', 'Consultant', NULL, NULL, '2025-09-03', NULL, 0, 'Test Consultant - Approved', @advisor3, 1),

-- Coach employees (interactive)
('D2', 'Westlake', 'Housekeeping', 'Sam Wilson', 'E1041', 'Coach', NULL, NULL, '2025-09-10', NULL, 0, 'Test Coach - Awaiting', @advisor1, 0),
('B2', 'Central Park', 'RN', 'Lisa Martinez', 'E1051', 'Coach', NULL, NULL, '2025-09-14', '2025-09-28', 1, 'Test Coach - Complete', @advisor2, 1);
