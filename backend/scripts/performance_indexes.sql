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
