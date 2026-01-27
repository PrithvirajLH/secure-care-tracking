-- ===========================
-- SecureCare Audit Log Table
-- Track all changes made to employee records
-- ===========================

-- Create the AuditLog table
IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='AuditLog' AND xtype='U')
BEGIN
    CREATE TABLE dbo.AuditLog (
        auditId INT IDENTITY(1,1) PRIMARY KEY,
        timestamp DATETIME2 DEFAULT GETUTCDATE(),
        userIdentifier NVARCHAR(255) NOT NULL,
        action NVARCHAR(100) NOT NULL,
        tableName NVARCHAR(100),
        recordId INT,
        employeeNumber NVARCHAR(50),
        employeeName NVARCHAR(255),
        awardType NVARCHAR(50),
        fieldName NVARCHAR(100),
        oldValue NVARCHAR(MAX),
        newValue NVARCHAR(MAX),
        details NVARCHAR(MAX),
        ipAddress NVARCHAR(50)
    );
    PRINT 'AuditLog table created successfully';
END
ELSE
BEGIN
    PRINT 'AuditLog table already exists';
END
GO

-- Create indexes for better query performance
IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_Timestamp' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_Timestamp ON dbo.AuditLog(timestamp DESC);
    PRINT 'Index IX_AuditLog_Timestamp created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_UserIdentifier' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_UserIdentifier ON dbo.AuditLog(userIdentifier);
    PRINT 'Index IX_AuditLog_UserIdentifier created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_Action' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_Action ON dbo.AuditLog(action);
    PRINT 'Index IX_AuditLog_Action created';
END
GO

IF NOT EXISTS (SELECT * FROM sys.indexes WHERE name = 'IX_AuditLog_EmployeeNumber' AND object_id = OBJECT_ID('dbo.AuditLog'))
BEGIN
    CREATE INDEX IX_AuditLog_EmployeeNumber ON dbo.AuditLog(employeeNumber);
    PRINT 'Index IX_AuditLog_EmployeeNumber created';
END
GO

-- Example of how audit entries will look:
-- INSERT INTO dbo.AuditLog (userIdentifier, action, tableName, recordId, employeeNumber, employeeName, fieldName, oldValue, newValue, details)
-- VALUES ('admin@company.com', 'TRAINING_SCHEDULED', 'SecureCareEmployee', 1001, 'E1001', 'John Smith', 'scheduleStandingVideo', NULL, '2026-02-15', 'Scheduled Standing Video training');
