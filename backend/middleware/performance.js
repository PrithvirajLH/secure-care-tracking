// Performance monitoring middleware
const performanceLog = new Map();

const performanceMiddleware = (req, res, next) => {
  const startTime = Date.now();
  const originalSend = res.send;
  
  res.send = function(data) {
    const endTime = Date.now();
    const duration = endTime - startTime;
    
    // Log slow queries (>1 second)
    if (duration > 1000) {
      console.warn(`🐌 Slow API call: ${req.method} ${req.path} took ${duration}ms`);
    }
    
    // Track analytics performance
    if (req.path.includes('/analytics/')) {
      const key = `${req.method}_${req.path}`;
      const stats = performanceLog.get(key) || { count: 0, totalTime: 0, maxTime: 0 };
      stats.count++;
      stats.totalTime += duration;
      stats.maxTime = Math.max(stats.maxTime, duration);
      performanceLog.set(key, stats);
      
      // Performance monitoring - log every 10 calls
      if (stats.count % 10 === 0) {
      }
    }
    
    originalSend.call(this, data);
  };
  
  next();
};

module.exports = performanceMiddleware;
