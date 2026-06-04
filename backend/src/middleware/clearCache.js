const { redisClient } = require('../config/redis');

/**
 * Middleware to clear cache based on a key pattern after a successful request.
 * @param {string} pattern The path prefix to clear (e.g. '/api/admin/inventory')
 */
const clearCache = (pattern) => {
  return async (req, res, next) => {
    // Only apply on write operations
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) {
      res.on('finish', async () => {
        // Only clear cache if the request was successful
        if (res.statusCode >= 200 && res.statusCode < 300) {

          try {
            // Find all keys that start with the cache prefix + the given pattern
            const keys = await redisClient.keys(`__express__${pattern}*`);
            if (keys.length > 0) {
              await redisClient.del(keys);
              console.log(`Cleared ${keys.length} cache keys for pattern: ${pattern}`);
            }
          } catch (err) {
            console.error('Redis cache clear error:', err);
          }
        }
      });
    }
    next();
  };
};

module.exports = clearCache;
