const axios = require('axios');

const BASE_URL = 'https://api.binance.com';
const CACHE_TTL = parseInt(process.env.CACHE_TTL_SECONDS || '60') * 1000;

// In-memory cache
const cache = new Map();

function getCacheKey(symbol, interval, limit) {
  return `klines:${symbol}:${interval}:${limit}`;
}

function getFromCache(key) {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key, data) {
  cache.set(key, { data, timestamp: Date.now() });
}

/**
 * Fetch klines (candlestick data) from Binance
 * Returns closing prices as an array of numbers
 */
async function getKlines(symbol, interval, limit = 120) {
  const key = getCacheKey(symbol, interval, limit);
  const cached = getFromCache(key);
  if (cached) {
    console.log(`[Cache HIT] ${key}`);
    return cached;
  }

  console.log(`[Binance] Fetching ${symbol} ${interval} x${limit}`);

  try {
    const response = await axios.get(`${BASE_URL}/api/v3/klines`, {
      params: { symbol, interval, limit },
      timeout: 10000,
      headers: {
        'X-MBX-APIKEY': process.env.BINANCE_API_KEY || ''
      }
    });

    // Each kline: [openTime, open, high, low, close, volume, ...]
    const closes = response.data.map(k => parseFloat(k[4]));
    setCache(key, closes);
    return closes;
  } catch (err) {
    const status = err.response?.status;
    const msg = err.response?.data?.msg || err.message;

    if (status === 418 || status === 429) {
      throw new Error(`Binance rate limit hit (${status}). Try increasing CACHE_TTL_SECONDS.`);
    }
    if (status === 451) {
      throw new Error('Binance blocked this region (451). Use Frankfurt/EU server on Render.');
    }
    throw new Error(`Binance API error [${status}]: ${msg}`);
  }
}

/**
 * Get cache stats for diagnostics
 */
function getCacheStats() {
  return {
    entries: cache.size,
    ttlSeconds: CACHE_TTL / 1000
  };
}

module.exports = { getKlines, getCacheStats };
