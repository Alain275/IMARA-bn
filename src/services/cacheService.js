/**
 * Redis caching service for improved performance
 */
import Redis from 'ioredis';

let redisClient = null;

/**
 * Initialize Redis connection
 */
export function initRedis() {
  try {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    
    redisClient = new Redis(redisUrl, {
      retryStrategy: (times) => {
        // Stop retrying after 3 attempts
        if (times > 3) {
          console.log('⚠️  Redis unavailable - running without cache');
          return null; // Stop retrying
        }
        const delay = Math.min(times * 1000, 3000);
        return delay;
      },
      maxRetriesPerRequest: 1,
      enableReadyCheck: true,
      lazyConnect: true,
      showFriendlyErrorStack: false,
    });

    let hasConnected = false;

    redisClient.on('connect', () => {
      hasConnected = true;
      console.log('✅ Connected to Redis');
    });

    redisClient.on('error', (err) => {
      // Only log error once if never connected
      if (!hasConnected && err.message.includes('ECONNREFUSED')) {
        console.log('⚠️  Redis not available - running without cache');
        redisClient.disconnect();
      }
    });

    redisClient.on('close', () => {
      if (hasConnected) {
        console.log('⚠️  Redis connection closed');
      }
    });

    // Connect
    redisClient.connect().catch(err => {
      if (!hasConnected) {
        console.log('⚠️  Redis not running - caching disabled (this is optional)');
      }
    });

    return redisClient;
  } catch (error) {
    console.log('⚠️  Redis initialization failed - running without cache');
    return null;
  }
}

/**
 * Get Redis client instance
 */
export function getRedisClient() {
  return redisClient;
}

/**
 * Cache wrapper functions
 */
export const cache = {
  /**
   * Get value from cache
   */
  async get(key) {
    if (!redisClient || redisClient.status !== 'ready') return null;
    try {
      const value = await redisClient.get(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Cache get error:', error.message);
      return null;
    }
  },

  /**
   * Set value in cache with optional TTL (in seconds)
   */
  async set(key, value, ttl = 3600) {
    if (!redisClient || redisClient.status !== 'ready') return false;
    try {
      const serialized = JSON.stringify(value);
      if (ttl) {
        await redisClient.setex(key, ttl, serialized);
      } else {
        await redisClient.set(key, serialized);
      }
      return true;
    } catch (error) {
      console.error('Cache set error:', error.message);
      return false;
    }
  },

  /**
   * Delete key from cache
   */
  async del(key) {
    if (!redisClient || redisClient.status !== 'ready') return false;
    try {
      await redisClient.del(key);
      return true;
    } catch (error) {
      console.error('Cache delete error:', error.message);
      return false;
    }
  },

  /**
   * Delete multiple keys matching a pattern
   */
  async delPattern(pattern) {
    if (!redisClient || redisClient.status !== 'ready') return false;
    try {
      const keys = await redisClient.keys(pattern);
      if (keys.length > 0) {
        await redisClient.del(...keys);
      }
      return true;
    } catch (error) {
      console.error('Cache delete pattern error:', error.message);
      return false;
    }
  },

  /**
   * Check if key exists
   */
  async exists(key) {
    if (!redisClient || redisClient.status !== 'ready') return false;
    try {
      const result = await redisClient.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Cache exists error:', error.message);
      return false;
    }
  },

  /**
   * Get or set pattern: try to get from cache, if miss, execute function and cache result
   */
  async getOrSet(key, fn, ttl = 3600) {
    const cached = await this.get(key);
    if (cached !== null) {
      return cached;
    }
    
    const result = await fn();
    await this.set(key, result, ttl);
    return result;
  },

  /**
   * Increment counter
   */
  async incr(key, ttl = null) {
    if (!redisClient || redisClient.status !== 'ready') return null;
    try {
      const value = await redisClient.incr(key);
      if (ttl && value === 1) {
        await redisClient.expire(key, ttl);
      }
      return value;
    } catch (error) {
      console.error('Cache incr error:', error.message);
      return null;
    }
  },

  /**
   * Set expiration on key
   */
  async expire(key, ttl) {
    if (!redisClient || redisClient.status !== 'ready') return false;
    try {
      await redisClient.expire(key, ttl);
      return true;
    } catch (error) {
      console.error('Cache expire error:', error.message);
      return false;
    }
  },
};

/**
 * Cache key generators for consistency
 */
export const cacheKeys = {
  locations: () => 'locations:all',
  userSession: (userId) => `session:user:${userId}`,
  sensorRecent: (deviceId, limit) => `sensor:recent:${deviceId}:${limit}`,
  sensorSummary: (deviceId, hours) => `sensor:summary:${deviceId}:${hours}`,
  reportKpis: (deviceId, hours) => `report:kpis:${deviceId}:${hours}`,
  courses: (filters) => `courses:${JSON.stringify(filters)}`,
  userDevices: (userId) => `user:devices:${userId}`,
};

/**
 * Close Redis connection
 */
export async function closeRedis() {
  if (redisClient) {
    await redisClient.quit();
    console.log('Redis connection closed');
  }
}
