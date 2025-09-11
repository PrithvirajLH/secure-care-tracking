-- Date column indexes for SecureCareEmployee to accelerate server-side date filtering
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_completedDate' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_completedDate ON dbo.SecureCareEmployee (completedDate);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_assignedDate' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_assignedDate ON dbo.SecureCareEmployee (assignedDate);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_conferenceCompleted' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_conferenceCompleted ON dbo.SecureCareEmployee (conferenceCompleted);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_secureCareAwardedDate' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_secureCareAwardedDate ON dbo.SecureCareEmployee (secureCareAwardedDate);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_scheduleStandingVideo' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_scheduleStandingVideo ON dbo.SecureCareEmployee (scheduleStandingVideo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_standingVideo' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_standingVideo ON dbo.SecureCareEmployee (standingVideo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_scheduleSleepingVideo' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_scheduleSleepingVideo ON dbo.SecureCareEmployee (scheduleSleepingVideo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_sleepingVideo' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_sleepingVideo ON dbo.SecureCareEmployee (sleepingVideo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_scheduleFeedGradVideo' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_scheduleFeedGradVideo ON dbo.SecureCareEmployee (scheduleFeedGradVideo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_feedGradVideo' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_feedGradVideo ON dbo.SecureCareEmployee (feedGradVideo);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_schedulenoHandnoSpeak' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_schedulenoHandnoSpeak ON dbo.SecureCareEmployee (schedulenoHandnoSpeak);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_noHandnoSpeak' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_noHandnoSpeak ON dbo.SecureCareEmployee (noHandnoSpeak);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_scheduleSession1' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_scheduleSession1 ON dbo.SecureCareEmployee ([scheduleSession#1]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_session1' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_session1 ON dbo.SecureCareEmployee ([session#1]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_scheduleSession2' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_scheduleSession2 ON dbo.SecureCareEmployee ([scheduleSession#2]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_session2' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_session2 ON dbo.SecureCareEmployee ([session#2]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_scheduleSession3' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_scheduleSession3 ON dbo.SecureCareEmployee ([scheduleSession#3]);

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE name = 'IX_SecureCareEmployee_session3' AND object_id = OBJECT_ID('dbo.SecureCareEmployee'))
CREATE INDEX IX_SecureCareEmployee_session3 ON dbo.SecureCareEmployee ([session#3]);
-- Performance Indexes for SecureCare Database
-- Optimized for 15,000+ employee records

-- Primary performance indexes
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_awardType 
ON dbo.SecureCareEmployee(awardType) 
INCLUDE (employeeId, name, facility, area, secureCareAwarded, assignedDate, secureCareAwardedDate);

CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_facility 
ON dbo.SecureCareEmployee(facility) 
INCLUDE (employeeId, name, awardType, secureCareAwarded, area);

CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_secureCareAwarded 
ON dbo.SecureCareEmployee(secureCareAwarded) 
INCLUDE (employeeId, awardType, assignedDate, secureCareAwardedDate);

CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_area 
ON dbo.SecureCareEmployee(area) 
INCLUDE (employeeId, name, facility, awardType, secureCareAwarded);

-- Composite indexes for common query patterns
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_awardType_secureCareAwarded 
ON dbo.SecureCareEmployee(awardType, secureCareAwarded) 
INCLUDE (employeeId, name, facility, area, assignedDate, secureCareAwardedDate);

CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_facility_awardType 
ON dbo.SecureCareEmployee(facility, awardType) 
INCLUDE (employeeId, name, secureCareAwarded, area);

-- Date-based indexes for analytics
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_assignedDate 
ON dbo.SecureCareEmployee(assignedDate) 
INCLUDE (employeeId, awardType, secureCareAwarded);

CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_secureCareAwardedDate 
ON dbo.SecureCareEmployee(secureCareAwardedDate) 
INCLUDE (employeeId, awardType, secureCareAwarded);

-- Search optimization
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_name 
ON dbo.SecureCareEmployee(name) 
INCLUDE (employeeId, employeeNumber, facility, area, awardType);

CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_employeeNumber 
ON dbo.SecureCareEmployee(employeeNumber) 
INCLUDE (employeeId, name, facility, area, awardType);

-- Advisor relationship optimization
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_advisorId 
ON dbo.SecureCareEmployee(advisorId) 
INCLUDE (employeeId, name, awardType);

-- Awaiting status optimization
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_awaiting 
ON dbo.SecureCareEmployee(awaiting) 
INCLUDE (employeeId, awardType, secureCareAwarded, assignedDate);

-- Staff role optimization
CREATE NONCLUSTERED INDEX IX_SecureCareEmployee_staffRoll 
ON dbo.SecureCareEmployee(staffRoll) 
INCLUDE (employeeId, name, facility, area, awardType);

-- Advisor table optimization
CREATE NONCLUSTERED INDEX IX_Advisor_name 
ON dbo.Advisor(firstName, lastName) 
INCLUDE (advisorId);

-- Statistics update for better query planning
UPDATE STATISTICS dbo.SecureCareEmployee;
UPDATE STATISTICS dbo.Advisor;
