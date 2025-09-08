-- Level 2 entries for the 10 Level 1–Awarded employees (all awaiting approval)
-- awaiting: 0 = Awaiting, 1 = Approved, NULL = Rejected

INSERT INTO dbo.SecureCareEmployee (
    area, facility, staffRoll, [name], employeeNumber,
    awardType, assignedDate, completedDate, conferenceCompleted,
    scheduleStandingVideo, standingVideo,
    scheduleSleepingVideo, sleepingVideo,
    scheduleFeedGradVideo, feedGradVideo,
    schedulenoHandnoSpeak, noHandnoSpeak,
    [scheduleSession#1], [session#1],
    [scheduleSession#2], [session#2],
    [scheduleSession#3], [session#3],
    secureCareAwardedDate, secureCareAwarded, notes, advisorId, awaiting
) VALUES
-- 1) Amelia Baker
('C1','Lakeside','LVN','Amelia Baker','E2019',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',86,0),

-- 2) Ava White
('D1','Hillview','CNA','Ava White','E2010',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',86,0),

-- 3) Charlotte Perez
('D1','Hillview','CNA','Charlotte Perez','E2020',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',87,0),

-- 4) Daniel Young
('C1','Westlake','CNA','Daniel Young','E2014',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',88,0),

-- 5) Ethan Martin
('A2','Southridge','RN','Ethan Martin','E2012',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',89,0),

-- 6) Isabella Scott
('A2','Central Park','CNA','Isabella Scott','E2017',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',90,0),

-- 7) Matthew Lee
('B1','Eastwood','LVN','Matthew Lee','E2013',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',91,0),

-- 8) Mia Adams
('B1','Hillcrest','RN','Mia Adams','E2018',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',92,0),

-- 9) Michael Hall
('D1','Pinecrest','Therapist','Michael Hall','E2015',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',93,0),

-- 10) Sophia Allen
('A1','Northview','Housekeeping','Sophia Allen','E2016',
 'Level 2', NULL,NULL,'2025-08-20',
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,NULL,
 NULL,0,'Level 2 - Awaiting approval',94,0);
