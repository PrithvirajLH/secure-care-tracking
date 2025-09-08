-- ===========================
-- SecureCare SIMPLE SEED
-- (no explicit IDs, minimal columns)
-- ===========================

-- 1) Advisors (let identity auto-increment)
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

-- 2) Capture advisor IDs by name for use below
DECLARE @MiguelLi      INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Miguel' AND lastName='Li');
DECLARE @TaylorGupta   INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Taylor' AND lastName='Gupta');
DECLARE @NinaLopez     INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Nina'   AND lastName='Lopez');
DECLARE @AveryWilson   INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Avery'  AND lastName='Wilson');
DECLARE @MorganLi      INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Morgan' AND lastName='Li');
DECLARE @SamGupta      INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Sam'    AND lastName='Gupta');
DECLARE @MiguelLopez   INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Miguel' AND lastName='Lopez');
DECLARE @TaylorWilson  INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Taylor' AND lastName='Wilson');
DECLARE @NinaLi        INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Nina'   AND lastName='Li');
DECLARE @AveryGupta    INT = (SELECT advisorId FROM dbo.Advisor WHERE firstName='Avery'  AND lastName='Gupta');

-- 3) Employees (minimal columns only)
-- Columns:
-- (area, facility, staffRoll, name, employeeNumber, awardType,
--  assignedDate, completedDate, conferenceCompleted, secureCareAwardedDate,
--  secureCareAwarded, notes, advisorId, awaiting)

INSERT INTO dbo.SecureCareEmployee (
  area, facility, staffRoll, name, employeeNumber, awardType,
  assignedDate, completedDate, conferenceCompleted, secureCareAwardedDate,
  secureCareAwarded, notes, advisorId, awaiting
) VALUES
-- 2000
('A2','Elm Grove','CNA','Chen Hassan','E1001','Level 1','2025-08-02','2025-08-09',NULL,NULL,0,'seed-l1',@TaylorGupta,0),
-- 2001
('A2','Elm Grove','CNA','Chen Hassan','E1001','Level 2',NULL,NULL,'2025-08-16',NULL,0,'seed-l2',@TaylorGupta,1),
-- 2002
('A2','Elm Grove','CNA','Chen Hassan','E1001','Level 3',NULL,NULL,'2025-08-17',NULL,0,'seed-l3',@TaylorGupta,1),
-- 2003
('A2','Northview','CNA','Nina Nguyen','E1002','Level 1','2025-08-03','2025-08-10',NULL,'2025-08-13',1,'seed-l1',@SamGupta,0),
-- 2004
('A1','Southridge','CNA','Riley Li','E1003','Level 1','2025-08-04','2025-08-16',NULL,NULL,0,'seed-l1',@MiguelLi,0),
-- 2005
('A1','Southridge','CNA','Riley Li','E1003','Level 2',NULL,NULL,'2025-08-18','2025-08-28',1,'seed-l2',@MiguelLi,1),
-- 2006
('E2','Lakeside','Med Aide','Sam Carter','E1004','Level 1','2025-08-05',NULL,NULL,NULL,0,'seed-l1',@AveryGupta,0),
-- 2007
('B1','Elm Grove','CNA','Chen Rao','E1005','Level 1','2025-08-06','2025-08-13',NULL,NULL,0,'seed-l1',@NinaLopez,0),
-- 2008
('A1','Eastwood','Therapist','Nina Gupta','E1006','Level 1','2025-08-07','2025-08-14',NULL,'2025-08-17',1,'seed-l1',@TaylorWilson,0),
-- 2009
('A1','Eastwood','Therapist','Nina Gupta','E1006','Level 2',NULL,NULL,'2025-08-21',NULL,0,'seed-l2',@TaylorWilson,1),
-- 2010
('A1','Eastwood','Therapist','Nina Gupta','E1006','Level 3',NULL,NULL,'2025-08-22','2025-09-02',1,'seed-l3',@TaylorWilson,1),
-- 2011
('A2','Southridge','Housekeeping','Riley Patel','E1007','Level 1','2025-08-08','2025-08-20',NULL,NULL,0,'seed-l1',@NinaLi,0),
-- 2012
('A2','Southridge','Housekeeping','Riley Patel','E1007','Level 2',NULL,NULL,'2025-08-22','2025-09-01',1,'seed-l2',@NinaLi,1),
-- 2013
('A2','Southridge','Housekeeping','Riley Patel','E1007','Consultant',NULL,NULL,'2025-08-23',NULL,0,'seed-side',@NinaLi,1),
-- 2014
('A2','Elm Grove','Therapist','Sam Reed','E1008','Level 1','2025-08-09',NULL,NULL,NULL,0,'seed-l1',@TaylorGupta,0),
-- 2015
('E2','Pinecrest','CNA','Chen Lopez','E1009','Level 1','2025-08-10','2025-08-17',NULL,NULL,0,'seed-l1',@MorganLi,0),
-- 2016
('E2','Pinecrest','CNA','Chen Lopez','E1009','Level 2',NULL,NULL,'2025-08-24',NULL,0,'seed-l2',@MorganLi,1),
-- 2017
('A2','Pinecrest','CNA','Nina Santos','E1010','Level 1','2025-08-11','2025-08-18',NULL,'2025-08-21',1,'seed-l1',@MorganLi,0),
-- 2018
('C2','Elm Grove','RN','Riley Kim','E1011','Level 1','2025-08-12','2025-08-24',NULL,NULL,0,'seed-l1',@AveryWilson,0),
-- 2019
('C2','Elm Grove','RN','Riley Kim','E1011','Level 2',NULL,NULL,'2025-08-26','2025-09-05',1,'seed-l2',@AveryWilson,1),
-- 2020
('D2','Southridge','Therapist','Sam Wilson','E1012','Level 1','2025-08-13','2025-08-21',NULL,NULL,0,'seed-l1',@MiguelLi,0),
-- 2021
('D2','Southridge','Therapist','Sam Wilson','E1012','Level 2',NULL,NULL,'2025-08-27',NULL,0,'seed-l2',@MiguelLi,0),
-- 2022
('D2','Southridge','Therapist','Sam Wilson','E1012','Level 3',NULL,NULL,'2025-08-28',NULL,0,'seed-l3',@MiguelLi,1),
-- 2023
('A2','Pinecrest','CNA','Chen Hassan','E1013','Level 1','2025-08-14','2025-08-21',NULL,NULL,0,'seed-l1',@SamGupta,0),
-- 2024
('A2','Pinecrest','CNA','Chen Hassan','E1013','Level 2',NULL,NULL,'2025-08-28',NULL,0,'seed-l2',@SamGupta,1),
-- 2025
('A2','Pinecrest','CNA','Chen Hassan','E1013','Level 3',NULL,NULL,'2025-08-29',NULL,0,'seed-l3',@SamGupta,1),
-- 2026
('D2','Westlake','Housekeeping','Nina Nguyen','E1014','Level 1','2025-08-15','2025-09-07',NULL,'2025-09-10',1,'seed-l1',@MiguelLopez,0),
-- 2027
('D2','Westlake','Housekeeping','Nina Nguyen','E1014','Level 2',NULL,NULL,'2025-08-29',NULL,0,'seed-l2',@MiguelLopez,1),
-- 2028
('D2','Westlake','Housekeeping','Nina Nguyen','E1014','Level 3',NULL,NULL,'2025-08-30','2025-09-10',1,'seed-l3',@MiguelLopez,1),
-- 2029
('A1','Westlake','CNA','Riley Li','E1015','Level 1','2025-08-16','2025-08-28',NULL,NULL,0,'seed-l1',@AveryGupta,0),
-- 2030
('B1','Elm Grove','CNA','Sam Carter','E1016','Level 1','2025-08-17',NULL,NULL,NULL,0,'seed-l1',@NinaLi,0),
-- 2031
('B1','Southridge','CNA','Chen Rao','E1017','Level 1','2025-08-18','2025-08-25',NULL,NULL,0,'seed-l1',@SamGupta,0),
-- 2032
('B1','Southridge','CNA','Chen Rao','E1017','Level 2',NULL,NULL,'2025-09-01',NULL,0,'seed-l2',@SamGupta,1),
-- 2033
('B1','Southridge','CNA','Chen Rao','E1017','Level 3',NULL,NULL,'2025-09-02',NULL,0,'seed-l3',@SamGupta,1),
-- 2034
('B1','Southridge','CNA','Chen Rao','E1017','Consultant',NULL,NULL,'2025-09-03',NULL,0,'seed-consultant',@SamGupta,1),
-- 2035
('E1','Eastwood','LVN','Nina Gupta','E1018','Level 1','2025-08-19','2025-08-26',NULL,'2025-08-29',1,'seed-l1',@MorganLi,0),
-- 2036
('E1','Eastwood','LVN','Nina Gupta','E1018','Level 2',NULL,NULL,'2025-09-02',NULL,0,'seed-l2',@MorganLi,1),
-- 2037
('E1','Eastwood','LVN','Nina Gupta','E1018','Level 3',NULL,NULL,'2025-09-03','2025-09-14',1,'seed-l3',@MorganLi,1),
-- 2038
('A1','Elm Grove','Med Aide','Riley Patel','E1019','Level 1','2025-08-20','2025-09-01',NULL,NULL,0,'seed-l1',@MorganLi,0),
-- 2039
('A1','Elm Grove','Med Aide','Riley Patel','E1019','Level 2',NULL,NULL,'2025-09-03','2025-09-13',1,'seed-l2',@MorganLi,1),
-- 2040
('B1','Northview','RN','Sam Reed','E1020','Level 1','2025-08-21',NULL,NULL,NULL,0,'seed-l1',@NinaLopez,0),
-- 2041
('B1','Central Park','Med Aide','Chen Lopez','E1021','Level 1','2025-08-22','2025-08-29',NULL,NULL,0,'seed-l1',@MiguelLi,0),
-- 2042
('C2','Hillcrest','Med Aide','Nina Santos','E1022','Level 1','2025-08-23','2025-08-30',NULL,'2025-09-02',1,'seed-l1',@SamGupta,0),
-- 2043
('C2','Hillcrest','Med Aide','Nina Santos','E1022','Level 2',NULL,NULL,'2025-09-06',NULL,0,'seed-l2',@SamGupta,1),
-- 2044
('D2','Elm Grove','CNA','Riley Kim','E1023','Level 1','2025-08-24','2025-09-05',NULL,NULL,0,'seed-l1',@TaylorWilson,0),
-- 2045
('D2','Elm Grove','CNA','Riley Kim','E1023','Level 2',NULL,NULL,'2025-09-07','2025-09-17',1,'seed-l2',@TaylorWilson,1),
-- 2046
('D2','Westlake','Housekeeping','Sam Wilson','E1024','Level 1','2025-08-25','2025-09-02',NULL,NULL,0,'seed-l1',@NinaLi,0),
-- 2047
('D2','Westlake','Housekeeping','Sam Wilson','E1024','Level 2',NULL,NULL,'2025-09-08',NULL,0,'seed-l2',@NinaLi,0),
-- 2048
('D2','Westlake','Housekeeping','Sam Wilson','E1024','Level 3',NULL,NULL,'2025-09-09',NULL,0,'seed-l3',@NinaLi,1),
-- 2049
('D2','Westlake','Housekeeping','Sam Wilson','E1024','Coach',NULL,NULL,'2025-09-10',NULL,0,'seed-coach',@NinaLi,1),
-- 2050
('C1','Elm Grove','RN','Chen Hassan','E1025','Level 1','2025-08-26','2025-09-02',NULL,NULL,0,'seed-l1',@TaylorGupta,0),
-- 2051
('C1','Elm Grove','RN','Chen Hassan','E1025','Level 2',NULL,NULL,'2025-09-09',NULL,0,'seed-l2',@TaylorGupta,1),
-- 2052
('C1','Elm Grove','RN','Chen Hassan','E1025','Level 3',NULL,NULL,'2025-09-10',NULL,0,'seed-l3',@TaylorGupta,1),
-- 2053
('D1','Westlake','Med Aide','Nina Nguyen','E1026','Level 1','2025-08-27','2025-09-03',NULL,'2025-09-06',1,'seed-l1',@TaylorGupta,0),
-- 2054
('D1','Westlake','Med Aide','Nina Nguyen','E1026','Level 2',NULL,NULL,'2025-09-10',NULL,0,'seed-l2',@TaylorGupta,1),
-- 2055
('D1','Westlake','Med Aide','Nina Nguyen','E1026','Level 3',NULL,NULL,'2025-09-11',NULL,0,'seed-l3',@TaylorGupta,1),
-- 2056
('D1','Westlake','Med Aide','Nina Nguyen','E1026','Coach',NULL,NULL,'2025-09-12','2025-09-26',1,'seed-coach',@TaylorGupta,1),
-- 2057
('A2','Pinecrest','Med Aide','Riley Li','E1027','Level 1','2025-08-28','2025-09-09',NULL,NULL,0,'seed-l1',@MiguelLopez,0),
-- 2058
('A2','Pinecrest','Med Aide','Riley Li','E1027','Level 2',NULL,NULL,'2025-09-11','2025-09-21',1,'seed-l2',@MiguelLopez,1),
-- 2059
('A2','Pinecrest','Med Aide','Riley Li','E1027','Level 3',NULL,NULL,'2025-09-12',NULL,0,'seed-l3',@MiguelLopez,0),
-- 2060
('B2','Central Park','RN','Sam Carter','E1028','Level 1','2025-08-29','2025-09-06',NULL,NULL,0,'seed-l1',@TaylorGupta,0),
-- 2061
('B2','Central Park','RN','Sam Carter','E1028','Level 2',NULL,NULL,'2025-09-12',NULL,0,'seed-l2',@TaylorGupta,0),
-- 2062
('B2','Central Park','RN','Sam Carter','E1028','Level 3',NULL,NULL,'2025-09-13',NULL,0,'seed-l3',@TaylorGupta,1),
-- 2063
('B2','Central Park','RN','Sam Carter','E1028','Coach',NULL,NULL,'2025-09-14','2025-09-28',1,'seed-coach',@TaylorGupta,1),
-- 2064
('E2','Westlake','RN','Chen Rao','E1029','Level 1','2025-08-30','2025-09-06',NULL,NULL,0,'seed-l1',@NinaLopez,0),
-- 2065
('E2','Westlake','RN','Chen Rao','E1029','Level 2',NULL,NULL,'2025-09-13',NULL,0,'seed-l2',@NinaLopez,1),
-- 2066
('D2','Lakeside','Housekeeping','Nina Gupta','E1030','Level 1','2025-08-31','2025-09-07',NULL,'2025-09-10',1,'seed-l1',@TaylorGupta,0);
