const { redisClient } = require('../config/redis');

/**
 * Middleware for caching API responses in Redis.
 * @param {number} duration Expiration time in seconds
 */
const cache = (duration) => {
  return async (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    


    const key = `__express__${req.originalUrl || req.url}`;
    
    try {
      const cachedResponse = await redisClient.get(key);
      
      if (cachedResponse) {
        res.setHeader('X-Cache', 'HIT');
        return res.json(JSON.parse(cachedResponse));
      } else {
        res.setHeader('X-Cache', 'MISS');
        
        // Hijack res.json to save the response to Redis before sending it
        const originalJson = res.json.bind(res);
        res.json = (body) => {
          // Only cache successful responses
          if (res.statusCode >= 200 && res.statusCode < 300) {
            redisClient.setEx(key, duration, JSON.stringify(body))
              .catch(err => console.error('Redis cache error:', err));
          }
          return originalJson(body);
        };
        next();
      }
    } catch (err) {
      console.error('Redis get error:', err);
      next();
    }
  };
};

module.exports = cache;
