-- Level 4 (Consultant) — Awaiting = 1, with conferenceCompleted date
-- awaiting: 1 = Awaiting, 0 = Approved, NULL = Rejected

INSERT INTO dbo.SecureCareEmployee (
    area, facility, staffRoll, [name], employeeNumber,
    awardType, assignedDate, completedDate, conferenceCompleted,
    secureCareAwardedDate, secureCareAwarded, notes, advisorId,
    scheduleStandingVideo, standingVideo,
    scheduleSleepingVideo, sleepingVideo,
    scheduleFeedGradVideo, feedGradVideo,
    schedulenoHandnoSpeak, noHandnoSpeak,
    [scheduleSession#1], [session#1],
    [scheduleSession#2], [session#2],
    [scheduleSession#3], [session#3],
    awaiting
) VALUES
-- 1) Amelia Baker → Consultant (Awaiting)
('C1','Lakeside','LVN','Amelia Baker','E2019',
 'Coach', NULL, NULL, '2025-09-05',
 NULL, 0, 'Coach - Awaiting approval', 86,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 NULL, NULL,
 1);
