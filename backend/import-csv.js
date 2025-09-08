require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse');
const sql = require('mssql');

function usageAndExit() {
  console.log('Usage: node import-csv.js <path-to-csv>');
  process.exit(1);
}

async function connect() {
  const cfg = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_DATABASE,
    port: parseInt(process.env.DB_PORT, 10) || 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
      enableArithAbort: true,
    },
  };
  return sql.connect(cfg);
}

async function ensureAdvisorByName(pool, firstName, lastName) {
  // Return advisorId; create if missing
  const fullName = `${firstName || ''} ${lastName || ''}`.trim();
  if (!fullName) return null;

  const existing = await pool
    .request()
    .input('firstName', sql.VarChar(100), firstName || null)
    .input('lastName', sql.VarChar(100), lastName || null)
    .query(
      `SELECT TOP 1 advisorId FROM dbo.Advisor WHERE 
         (firstName = @firstName OR (@firstName IS NULL AND firstName IS NULL)) AND
         (lastName = @lastName OR (@lastName IS NULL AND lastName IS NULL))`
    );
  if (existing.recordset.length > 0) return existing.recordset[0].advisorId;

  const inserted = await pool
    .request()
    .input('firstName', sql.VarChar(100), firstName || null)
    .input('lastName', sql.VarChar(100), lastName || null)
    .query(
      `INSERT INTO dbo.Advisor(firstName, lastName)
       OUTPUT INSERTED.advisorId
       VALUES(@firstName, @lastName)`
    );
  return inserted.recordset[0].advisorId;
}

async function ensureAdvisorById(pool, advisorId) {
  if (advisorId == null) return null;
  const existing = await pool
    .request()
    .input('advisorId', sql.Int, advisorId)
    .query('SELECT advisorId FROM dbo.Advisor WHERE advisorId = @advisorId');
  if (existing.recordset.length > 0) return advisorId;

  // Insert specific advisorId using IDENTITY_INSERT
  await pool.request().query('SET IDENTITY_INSERT dbo.Advisor ON');
  try {
    await pool
      .request()
      .input('advisorId', sql.Int, advisorId)
      .input('firstName', sql.VarChar(100), null)
      .input('lastName', sql.VarChar(100), null)
      .query('INSERT INTO dbo.Advisor (advisorId, firstName, lastName) VALUES(@advisorId, @firstName, @lastName)');
  } finally {
    await pool.request().query('SET IDENTITY_INSERT dbo.Advisor OFF');
  }
  return advisorId;
}

function parseBoolean(val) {
  if (val == null) return null;
  const s = String(val).trim().toLowerCase();
  if (s === 'true' || s === '1' || s === 'yes' || s === 'y') return 1;
  if (s === 'false' || s === '0' || s === 'no' || s === 'n') return 0;
  return null;
}

function parseDateOrNull(val) {
  if (!val) return null;
  const d = new Date(val);
  return isNaN(d.getTime()) ? null : d;
}

async function insertEmployee(pool, row) {
  // Map CSV headers to DB columns; adjust as needed
  const name = row.name || row.Name || row.employeeName || null;
  const employeeNumber = row.employeeNumber || row.EmployeeNumber || row.empNumber || null;
  const area = row.area || row.Area || null;
  const facility = row.facility || row.Facility || null;
  const staffRoll = row.staffRoll || row.staffRole || row.JobTitle || null;
  const notes = row.notes || row.Notes || null;
  const awardType = row.awardType || row.AwardType || null;

  // Prefer explicit advisorId if provided; otherwise attempt creation via names
  let advisorId = null;
  if (row.advisorId || row.AdvisorId) {
    const parsed = parseInt(row.advisorId || row.AdvisorId, 10);
    advisorId = Number.isNaN(parsed) ? null : parsed;
    if (advisorId != null) {
      advisorId = await ensureAdvisorById(pool, advisorId).catch(() => null);
    }
  } else {
    const advisorFirst = row.advisorFirstName || row.AdvisorFirstName || row.advisorFirst || null;
    const advisorLast = row.advisorLastName || row.AdvisorLastName || row.advisorLast || null;
    advisorId = await ensureAdvisorByName(pool, advisorFirst, advisorLast).catch(() => null);
  }

  // Training fields (dates) and statuses
  const scheduleStandingVideo = parseDateOrNull(row.scheduleStandingVideo || row.ScheduleStandingVideo);
  const standingVideo = parseDateOrNull(row.standingVideo || row.StandingVideo);
  const scheduleSleepingVideo = parseDateOrNull(row.scheduleSleepingVideo || row.ScheduleSleepingVideo);
  const sleepingVideo = parseDateOrNull(row.sleepingVideo || row.SleepingVideo);
  const scheduleFeedGradVideo = parseDateOrNull(row.scheduleFeedGradVideo || row.ScheduleFeedGradVideo);
  const feedGradVideo = parseDateOrNull(row.feedGradVideo || row.FeedGradVideo);
  const schedulenoHandNoSpeak = parseDateOrNull(row.schedulenoHandNoSpeak || row.ScheduleNoHandNoSpeak);
  const noHandnoSpeak = parseDateOrNull(row.noHandnoSpeak || row.NoHandNoSpeak);

  const scheduleSession1 = parseDateOrNull(row.scheduleSession1 || row.ScheduleSession1 || row['scheduleSession#1']);
  const session1 = parseDateOrNull(row.session1 || row.Session1 || row['session#1']);
  const scheduleSession2 = parseDateOrNull(row.scheduleSession2 || row.ScheduleSession2 || row['scheduleSession#2']);
  const session2 = parseDateOrNull(row.session2 || row.Session2 || row['session#2']);
  const scheduleSession3 = parseDateOrNull(row.scheduleSession3 || row.ScheduleSession3 || row['scheduleSession#3']);
  const session3 = parseDateOrNull(row.session3 || row.Session3 || row['session#3']);

  const assignedDate = parseDateOrNull(row.assignedDate || row.AssignedDate);
  const completedDate = parseDateOrNull(row.completedDate || row.CompletedDate);
  const conferenceCompleted = parseDateOrNull(row.conferenceCompleted || row.ConferenceCompleted);
  const secureCareAwardedDate = parseDateOrNull(row.secureCareAwardedDate || row.SecureCareAwardedDate);
  const secureCareAwarded = parseBoolean(row.secureCareAwarded || row.SecureCareAwarded);
  const awaiting = (row.awaiting === '' || row.awaiting === undefined)
    ? null
    : parseBoolean(row.awaiting || row.Awaiting);

  const q = `INSERT INTO dbo.SecureCareEmployee (
      name, employeeNumber, area, facility, staffRoll, notes, awardType,
      advisorId,
      scheduleStandingVideo, standingVideo,
      scheduleSleepingVideo, sleepingVideo,
      scheduleFeedGradVideo, feedGradVideo,
      schedulenoHandNoSpeak, noHandnoSpeak,
      [scheduleSession#1], [session#1],
      [scheduleSession#2], [session#2],
      [scheduleSession#3], [session#3],
      assignedDate, completedDate, conferenceCompleted,
      secureCareAwardedDate, secureCareAwarded, awaiting
    ) VALUES (
      @name, @employeeNumber, @area, @facility, @staffRoll, @notes, @awardType,
      @advisorId,
      @scheduleStandingVideo, @standingVideo,
      @scheduleSleepingVideo, @sleepingVideo,
      @scheduleFeedGradVideo, @feedGradVideo,
      @schedulenoHandNoSpeak, @noHandnoSpeak,
      @scheduleSession1, @session1,
      @scheduleSession2, @session2,
      @scheduleSession3, @session3,
      @assignedDate, @completedDate, @conferenceCompleted,
      @secureCareAwardedDate, @secureCareAwarded, @awaiting
    )`;

  const req = pool.request();
  req.input('name', sql.VarChar(200), name);
  req.input('employeeNumber', sql.VarChar(20), employeeNumber);
  req.input('area', sql.VarChar(100), area);
  req.input('facility', sql.VarChar(100), facility);
  req.input('staffRoll', sql.VarChar(100), staffRoll);
  req.input('notes', sql.VarChar(100), notes);
  req.input('awardType', sql.VarChar(50), awardType);
  req.input('advisorId', sql.Int, advisorId);
  req.input('scheduleStandingVideo', sql.Date, scheduleStandingVideo);
  req.input('standingVideo', sql.Date, standingVideo);
  req.input('scheduleSleepingVideo', sql.Date, scheduleSleepingVideo);
  req.input('sleepingVideo', sql.Date, sleepingVideo);
  req.input('scheduleFeedGradVideo', sql.Date, scheduleFeedGradVideo);
  req.input('feedGradVideo', sql.Date, feedGradVideo);
  req.input('schedulenoHandNoSpeak', sql.Date, schedulenoHandNoSpeak);
  req.input('noHandnoSpeak', sql.Date, noHandnoSpeak);
  req.input('scheduleSession1', sql.Date, scheduleSession1);
  req.input('session1', sql.Date, session1);
  req.input('scheduleSession2', sql.Date, scheduleSession2);
  req.input('session2', sql.Date, session2);
  req.input('scheduleSession3', sql.Date, scheduleSession3);
  req.input('session3', sql.Date, session3);
  req.input('assignedDate', sql.Date, assignedDate);
  req.input('completedDate', sql.Date, completedDate);
  req.input('conferenceCompleted', sql.Date, conferenceCompleted);
  req.input('secureCareAwardedDate', sql.Date, secureCareAwardedDate);
  req.input('secureCareAwarded', sql.Bit, secureCareAwarded);
  req.input('awaiting', sql.Bit, awaiting);

  await req.query(q);
}

async function main() {
  const csvPath = process.argv[2];
  if (!csvPath) usageAndExit();
  const fullPath = path.resolve(csvPath);
  if (!fs.existsSync(fullPath)) {
    console.error('File not found:', fullPath);
    process.exit(1);
  }

  const pool = await connect();
  console.log('Connected to SQL Server');

  // Stream CSV rows
  const parser = fs.createReadStream(fullPath).pipe(
    parse({ columns: true, trim: true, skip_empty_lines: true })
  );

  let count = 0;
  for await (const row of parser) {
    try {
      await insertEmployee(pool, row);
      count++;
      if (count % 50 === 0) console.log(`Inserted ${count} employees...`);
    } catch (e) {
      console.error('Row insert failed:', e.message, 'Row:', row);
    }
  }

  console.log(`Done. Inserted ${count} employees.`);
  await pool.close();
}

main().catch((e) => {
  console.error('Import failed:', e.message);
  process.exit(1);
});


