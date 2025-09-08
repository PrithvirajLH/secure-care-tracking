-- SecureCare comprehensive insert-only seed
-- 10 advisors, 50 employees. Covers: assigned, completed, scheduled, awaiting approval,
-- approved, rejected, various video/session states, and awarded rules.
-- Re-runnable: clears rows and inserts deterministic sample data.

SET NOCOUNT ON;
SET XACT_ABORT ON;
BEGIN TRAN;

-- 0) Clear existing data (respect FK order)
IF OBJECT_ID('dbo.SecureCareEmployee','U') IS NOT NULL DELETE FROM dbo.SecureCareEmployee;
IF OBJECT_ID('dbo.Advisor','U') IS NOT NULL DELETE FROM dbo.Advisor;

-- 1) Advisors (10 total, identity auto-increment)
INSERT INTO dbo.Advisor (firstName, lastName) VALUES
('Miguel','Li'),('Taylor','Gupta'),('Nina','Lopez'),('Avery','Wilson'),('Morgan','Li'),
('Sam','Gupta'),('Riley','Lopez'),('Alex','Wilson'),('Chen','Li'),('Jordan','Gupta');

-- 2) Capture advisor IDs in order 1..10
;WITH adv AS (
  SELECT advisorId, ROW_NUMBER() OVER (ORDER BY advisorId) AS rn
  FROM dbo.Advisor
), base AS (
  SELECT TOP (50) ROW_NUMBER() OVER (ORDER BY (SELECT 1)) AS i FROM sys.all_objects
)
INSERT INTO dbo.SecureCareEmployee (
  area, facility, staffRoll, name, employeeNumber, awardType,
  assignedDate, completedDate, conferenceCompleted, secureCareAwardedDate,
  secureCareAwarded, notes, advisorId,
  scheduleStandingVideo, standingVideo,
  scheduleSleepingVideo, sleepingVideo,
  scheduleFeedGradVideo, feedGradVideo,
  schedulenoHandnoSpeak, noHandnoSpeak,
  [scheduleSession#1], [session#1],
  [scheduleSession#2], [session#2],
  [scheduleSession#3], [session#3],
  awaiting
)
SELECT
  CONCAT('Area ', ((b.i-1)%16)+1) AS area,
  CASE ((b.i-1)%10)
    WHEN 0 THEN 'Elm Grove'
    WHEN 1 THEN 'Southridge'
    WHEN 2 THEN 'Eastwood'
    WHEN 3 THEN 'Pinecrest'
    WHEN 4 THEN 'Westlake'
    WHEN 5 THEN 'Northview'
    WHEN 6 THEN 'Central Park'
    WHEN 7 THEN 'Hillcrest'
    WHEN 8 THEN 'Lakeside'
    ELSE 'Granbury Care'
  END AS facility,
  CASE ((b.i-1)%7)
    WHEN 0 THEN 'CNA'
    WHEN 1 THEN 'RN'
    WHEN 2 THEN 'LVN'
    WHEN 3 THEN 'Med Aide'
    WHEN 4 THEN 'Therapist'
    WHEN 5 THEN 'Housekeeping'
    ELSE 'Administrator'
  END AS staffRoll,
  CONCAT(
    CASE ((b.i-1)%10)
      WHEN 0 THEN 'Chen' WHEN 1 THEN 'Riley' WHEN 2 THEN 'Nina' WHEN 3 THEN 'Sam' WHEN 4 THEN 'Alex'
      WHEN 5 THEN 'Jordan' WHEN 6 THEN 'Taylor' WHEN 7 THEN 'Avery' WHEN 8 THEN 'Morgan' ELSE 'Miguel'
    END,
    ' ',
    CASE ((b.i-1)%10)
      WHEN 0 THEN 'Hassan' WHEN 1 THEN 'Li' WHEN 2 THEN 'Nguyen' WHEN 3 THEN 'Carter' WHEN 4 THEN 'Gupta'
      WHEN 5 THEN 'Wilson' WHEN 6 THEN 'Lopez' WHEN 7 THEN 'Patel' WHEN 8 THEN 'Kim' ELSE 'Reed'
    END
  ) AS name,
  CONCAT('E', 1000 + b.i) AS employeeNumber,
  CASE ((b.i-1)%5)
    WHEN 0 THEN 'Level 1' WHEN 1 THEN 'Level 2' WHEN 2 THEN 'Level 3' WHEN 3 THEN 'Consultant' ELSE 'Coach' END AS awardType,

  -- Assigned dates
  CASE WHEN ((b.i-1)%5)=0 THEN DATEADD(DAY, ((b.i-1)%20), '2025-08-01')
       WHEN ((b.i-1)%5) IN (1,2,3,4) AND (b.i%2)=0 THEN DATEADD(DAY, ((b.i-1)%20), '2025-08-05') END AS assignedDate,
  -- Level 1 completed sometimes
  CASE WHEN ((b.i-1)%5)=0 AND (b.i%3) IN (0,1) THEN DATEADD(DAY, ((b.i-1)%20)+7, '2025-08-01') END AS completedDate,
  -- Conference completion (L2+)
  CASE WHEN ((b.i-1)%5) IN (1,2,3,4) AND (b.i%2)=1 THEN DATEADD(DAY, ((b.i-1)%20)+12, '2025-08-01') END AS conferenceCompleted,

  -- Awarded per rules: L1 some awarded; L2/L3/Consultant/Coach only subset, requires approved (awaiting=1)
  CASE WHEN ((b.i-1)%5)=0 AND (b.i%3)=0 THEN DATEADD(DAY, ((b.i-1)%20)+12, '2025-08-01')
       WHEN ((b.i-1)%5) IN (1,2,3,4) AND (b.i%10)=0 AND (b.i%4)=0 THEN DATEADD(DAY, ((b.i-1)%20)+28, '2025-08-01') END AS secureCareAwardedDate,
  CASE WHEN ((b.i-1)%5)=0 AND (b.i%3)=0 THEN 1
       WHEN ((b.i-1)%5) IN (1,2,3,4) AND (b.i%10)=0 AND (b.i%4)=0 THEN 1 ELSE 0 END AS secureCareAwarded,

  CASE ((b.i-1)%6) WHEN 0 THEN 'seed-l1' WHEN 1 THEN 'seed-l2' WHEN 2 THEN 'seed-l3' WHEN 3 THEN 'seed-cons' WHEN 4 THEN 'seed-coach' ELSE NULL END AS notes,
  a.advisorId,

  -- Level 2/3 videos (with schedules and completions mixed)
  CASE WHEN ((b.i-1)%5) IN (1,2) AND (b.i%2)=0 THEN DATEADD(DAY, 5, '2025-08-10') END AS scheduleStandingVideo,
  CASE WHEN ((b.i-1)%5) IN (1,2) AND (b.i%6) IN (0,1) THEN DATEADD(DAY, 12, '2025-08-10') END AS standingVideo,
  CASE WHEN ((b.i-1)%5) IN (1,2) AND (b.i%3)=0 THEN DATEADD(DAY, 6, '2025-08-10') END AS scheduleSleepingVideo,
  CASE WHEN ((b.i-1)%5) IN (1,2) AND (b.i%5)=0 THEN DATEADD(DAY, 13, '2025-08-10') END AS sleepingVideo,
  CASE WHEN ((b.i-1)%5) IN (1,2) AND (b.i%4)=0 THEN DATEADD(DAY, 7, '2025-08-10') END AS scheduleFeedGradVideo,
  CASE WHEN ((b.i-1)%5) IN (1,2) AND (b.i%7)=0 THEN DATEADD(DAY, 14, '2025-08-10') END AS feedGradVideo,

  -- Level 3 special pair
  CASE WHEN ((b.i-1)%5)=2 AND (b.i%3)=0 THEN DATEADD(DAY, 8, '2025-08-10') END AS schedulenoHandnoSpeak,
  CASE WHEN ((b.i-1)%5)=2 AND (b.i%6)=0 THEN DATEADD(DAY, 16, '2025-08-10') END AS noHandnoSpeak,

  -- Consultant/Coach sessions (scheduled/completed variety)
  CASE WHEN ((b.i-1)%5) IN (3,4) AND (b.i%2)=1 THEN DATEADD(DAY, 5, '2025-08-15') END AS [scheduleSession#1],
  CASE WHEN ((b.i-1)%5) IN (3,4) AND (b.i%5)=0 THEN DATEADD(DAY, 12, '2025-08-15') END AS [session#1],
  CASE WHEN ((b.i-1)%5) IN (3,4) AND (b.i%3)=1 THEN DATEADD(DAY, 8, '2025-08-15') END AS [scheduleSession#2],
  CASE WHEN ((b.i-1)%5) IN (3,4) AND (b.i%7)=0 THEN DATEADD(DAY, 15, '2025-08-15') END AS [session#2],
  CASE WHEN ((b.i-1)%5) IN (3,4) AND (b.i%4)=2 THEN DATEADD(DAY, 10, '2025-08-15') END AS [scheduleSession#3],
  CASE WHEN ((b.i-1)%5) IN (3,4) AND (b.i%9)=0 THEN DATEADD(DAY, 18, '2025-08-15') END AS [session#3],

  -- Awaiting/approved/rejected for L2+ (awaiting=0 means awaiting, 1 approved, NULL rejected)
  CASE WHEN ((b.i-1)%5) IN (1,2,3,4)
       THEN CASE WHEN (b.i%10) IN (1,2,3) THEN 0 WHEN (b.i%10) IN (4,5,6) THEN 1 WHEN (b.i%10)=7 THEN NULL ELSE 0 END
       ELSE 0 END AS awaiting
FROM base b
JOIN adv a ON a.rn = ((b.i-1)%10)+1;

COMMIT;
