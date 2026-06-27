const cache = new Map();

/**
 * Set a key-value pair in cache with expiration
 * @param {string} key 
 * @param {any} value 
 * @param {number} ttlMs time-to-live in milliseconds (default 60000 - 1 minute)
 */
const set = (key, value, ttlMs = 60000) => {
  const expiry = Date.now() + ttlMs;
  cache.set(key, { value, expiry });
};

/**
 * Get a cached value
 * @param {string} key 
 * @returns {any|null} value or null if expired/not found
 */
const get = (key) => {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiry) {
    cache.delete(key);
    return null;
  }
  return entry.value;
};

/**
 * Delete a specific key from cache
 * @param {string} key 
 */
const del = (key) => {
  cache.delete(key);
};

/**
 * Delete all keys matching a pattern/substring
 * @param {string} pattern 
 */
const deletePattern = (pattern) => {
  for (const key of cache.keys()) {
    if (key.includes(pattern)) {
      cache.delete(key);
    }
  }
};

/**
 * Clear the entire cache
 */
const clear = () => {
  cache.clear();
};

module.exports = {
  set,
  get,
  del,
  deletePattern,
  clear
};
