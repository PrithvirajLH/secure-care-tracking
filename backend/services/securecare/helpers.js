const { getPool, sql } = require('../../config/database');

const normalizeSortOrder = (value) => (String(value).toLowerCase() === 'desc' ? 'DESC' : 'ASC');
const normalizeSortBy = (value, allowed, fallback) => {
  if (!value) {
    return fallback;
  }
  const key = String(value);
  return allowed.has(key) ? key : fallback;
};

const DATE_FIELD_MAP = {
  completedDate: 'e.completedDate',
  standingVideo: 'e.standingVideo',
  sleepingVideo: 'e.sleepingVideo',
  feedGradVideo: 'e.feedGradVideo',
  noHandnoSpeak: 'e.noHandnoSpeak',
  session1: 'e.[session#1]',
  session2: 'e.[session#2]',
  session3: 'e.[session#3]',
  conferenceCompleted: 'e.conferenceCompleted',
  secureCareAwardedDate: 'e.secureCareAwardedDate',
  scheduleStandingVideo: 'e.scheduleStandingVideo',
  scheduleSleepingVideo: 'e.scheduleSleepingVideo',
  scheduleFeedGradVideo: 'e.scheduleFeedGradVideo',
  schedulenoHandnoSpeak: 'e.schedulenoHandnoSpeak',
  scheduleSession1: 'e.[scheduleSession#1]',
  scheduleSession2: 'e.[scheduleSession#2]',
  scheduleSession3: 'e.[scheduleSession#3]'
};

const SCHEDULE_FIELD_MAP = {
  standingVideo: 'scheduleStandingVideo',
  sleepingVideo: 'scheduleSleepingVideo',
  feedGradVideo: 'scheduleFeedGradVideo',
  noHandnoSpeak: 'schedulenoHandnoSpeak',
  session1: 'scheduleSession1',
  session2: 'scheduleSession2',
  session3: 'scheduleSession3'
};

const SORT_BY_EMPLOYEES = new Set([
  'latest',
  'conference',
  'name',
  'facility',
  'area',
  'jobTitle',
  'employeeId',
  'latestCompletion'
]);
const SORT_BY_EMPLOYEE_DATA = new Set(['name', 'facility', 'area', 'employeeId']);
const SORT_BY_READY_LIST = new Set(['name', 'facility', 'area', 'employeeId']);

const resolveDateFields = (dateField) => {
  const key = String(dateField || '');
  const column = DATE_FIELD_MAP[key];
  if (!column) {
    return null;
  }
  const scheduleKey = SCHEDULE_FIELD_MAP[key];
  const scheduleColumn = scheduleKey ? DATE_FIELD_MAP[scheduleKey] : null;
  return { column, scheduleColumn };
};

module.exports = {
  getPool,
  sql,
  normalizeSortOrder,
  normalizeSortBy,
  resolveDateFields,
  SORT_BY_EMPLOYEES,
  SORT_BY_EMPLOYEE_DATA,
  SORT_BY_READY_LIST
};
