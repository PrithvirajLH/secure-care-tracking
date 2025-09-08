-- Level 3 entries for 4 employees (awaiting = 1 per your note)
-- awaiting: 1 = Awaiting, 0 = Approved, NULL = Rejected

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
 'Level 3', NULL, NULL, '2025-08-25',
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, 0, 'Level 3 - Awaiting', 86, 1),

-- 2) Ava White
('D1','Hillview','CNA','Ava White','E2010',
 'Level 3', NULL, NULL, '2025-08-25',
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, 0, 'Level 3 - Awaiting', 86, 1),

-- 3) Charlotte Perez
('D1','Hillview','CNA','Charlotte Perez','E2020',
 'Level 3', NULL, NULL, '2025-08-25',
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, 0, 'Level 3 - Awaiting', 87, 1),

-- 4) Daniel Young
('C1','Westlake','CNA','Daniel Young','E2014',
 'Level 3', NULL, NULL, '2025-08-25',
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, 0, 'Level 3 - Awaiting', 88, 1);
