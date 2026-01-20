const analyticsCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

const employeeMethods = require('./securecare/employees');
const trainingMethods = require('./securecare/training');
const advisorMethods = require('./securecare/advisors');
const filterMethods = require('./securecare/filters');
const analyticsMethods = require('./securecare/analytics');
const dashboardMethods = require('./securecare/dashboard');
const employeeDataMethods = require('./securecare/employeeData');
const readinessMethods = require('./securecare/readiness');

class SecureCareService {
  getCacheKey(method, filters) {
    return `${method}_${JSON.stringify(filters)}`;
  }

  getFromCache(key) {
    const cached = analyticsCache.get(key);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      return cached.data;
    }
    analyticsCache.delete(key);
    return null;
  }

  setCache(key, data) {
    analyticsCache.set(key, {
      data,
      timestamp: Date.now()
    });
  }
}

Object.assign(
  SecureCareService.prototype,
  employeeMethods,
  trainingMethods,
  advisorMethods,
  filterMethods,
  analyticsMethods,
  dashboardMethods,
  employeeDataMethods,
  readinessMethods
);

module.exports = new SecureCareService();
