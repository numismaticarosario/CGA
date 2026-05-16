const express = require('express');
const router = express.Router();
const { getKlines, getCacheStats } = require('../utils/binance');
const { calculateZScore, getStatus } = require('../utils/zscore');
const { requireAuth } = require('../middleware/auth');

// Context threshold: z >= 1 = green
const CONTEXT_THRESHOLD = 1.0;
// Entry threshold: z >= 1.5 = green
const ENTRY_THRESHOLD = 1.5;

// Apply auth to all API routes
router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  try {
    // Fetch all 4 kline series (with caching, only new requests go to Binance)
    const [adaClose4h, adaClose5m, solClose4h, solClose5m] = await Promise.all([
      getKlines('ADAUSDT', '4h', 120),
      getKlines('ADAUSDT', '5m', 120),
      getKlines('SOLUSDT', '4h', 120),
      getKlines('SOLUSDT', '5m', 120)
    ]);

    // Build ratio arrays
    const adaSolRatio4h = adaClose4h.map((ada, i) => ada / solClose4h[i]);
    const adaSolRatio5m = adaClose5m.map((ada, i) => ada / solClose5m[i]);
    const solAdaRatio4h = solClose4h.map((sol, i) => sol / adaClose4h[i]);
    const solAdaRatio5m = solClose5m.map((sol, i) => sol / adaClose5m[i]);

    // Calculate Z-Scores
    const adaContext = calculateZScore(adaSolRatio4h);
    const adaEntry = calculateZScore(adaSolRatio5m);
    const solContext = calculateZScore(solAdaRatio4h);
    const solEntry = calculateZScore(solAdaRatio5m);

    res.json({
      adaEnvironment: {
        context: {
          pair: 'ADA/SOL',
          timeframe: '4h',
          candles: 120,
          zScore: parseFloat(adaContext.zScore.toFixed(4)),
          status: getStatus(adaContext.zScore, CONTEXT_THRESHOLD)
        },
        entry: {
          pair: 'ADA/SOL',
          timeframe: '5m',
          candles: 120,
          zScore: parseFloat(adaEntry.zScore.toFixed(4)),
          status: getStatus(adaEntry.zScore, ENTRY_THRESHOLD)
        }
      },
      solEnvironment: {
        context: {
          pair: 'SOL/ADA',
          timeframe: '4h',
          candles: 120,
          zScore: parseFloat(solContext.zScore.toFixed(4)),
          status: getStatus(solContext.zScore, CONTEXT_THRESHOLD)
        },
        entry: {
          pair: 'SOL/ADA',
          timeframe: '5m',
          candles: 120,
          zScore: parseFloat(solEntry.zScore.toFixed(4)),
          status: getStatus(solEntry.zScore, ENTRY_THRESHOLD)
        }
      },
      lastUpdated: new Date().toISOString(),
      cache: getCacheStats()
    });

  } catch (err) {
    console.error('[API /dashboard]', err.message);
    res.status(500).json({
      error: err.message || 'Failed to fetch dashboard data',
      lastUpdated: null
    });
  }
});

module.exports = router;
