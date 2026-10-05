const express = require('express');
const router = express.Router();
const { getKlines, getCacheStats } = require('../utils/binance');
const { calculateZScore, getStatus } = require('../utils/zscore');
const { requireAuth } = require('../middleware/auth');

// Context threshold: z >= 1 = green (pair trading)
const CONTEXT_THRESHOLD = 1.0;
// Entry threshold: z >= 1.5 = green (pair trading)
const ENTRY_THRESHOLD = 1.5;

// USD price thresholds (inverted: z <= -1 = green = buy signal)
const USD_CONTEXT_THRESHOLD = -1.0;
const USD_ENTRY_THRESHOLD = -1.5;

// Apply auth to all API routes
router.use(requireAuth);

router.get('/dashboard', async (req, res) => {
  try {
    const [adaClose4h, adaClose5m, solClose4h, solClose5m, btcClose4h, btcClose5m] = await Promise.all([
      getKlines('ADAUSDT', '4h', 120),
      getKlines('ADAUSDT', '5m', 120),
      getKlines('SOLUSDT', '4h', 120),
      getKlines('SOLUSDT', '5m', 120),
      getKlines('BTCUSDT', '4h', 120),
      getKlines('BTCUSDT', '5m', 120)
    ]);

    // ── ADA/BTC ratios ──
    const adaBtcRatio4h = adaClose4h.map((ada, i) => ada / btcClose4h[i]);
    const adaBtcRatio5m = adaClose5m.map((ada, i) => ada / btcClose5m[i]);
    const btcAdaRatio4h = btcClose4h.map((btc, i) => btc / adaClose4h[i]);
    const btcAdaRatio5m = btcClose5m.map((btc, i) => btc / adaClose5m[i]);

    // ── ADA/SOL ratios ──
    const adaSolRatio4h = adaClose4h.map((ada, i) => ada / solClose4h[i]);
    const adaSolRatio5m = adaClose5m.map((ada, i) => ada / solClose5m[i]);
    const solAdaRatio4h = solClose4h.map((sol, i) => sol / adaClose4h[i]);
    const solAdaRatio5m = solClose5m.map((sol, i) => sol / adaClose5m[i]);

    // ── Z-Scores ADA/BTC ──
    const adaBtcContext = calculateZScore(adaBtcRatio4h);
    const adaBtcEntry   = calculateZScore(adaBtcRatio5m);
    const btcAdaContext = calculateZScore(btcAdaRatio4h);
    const btcAdaEntry   = calculateZScore(btcAdaRatio5m);

    // ── Z-Scores ADA/SOL ──
    const adaContext = calculateZScore(adaSolRatio4h);
    const adaEntry   = calculateZScore(adaSolRatio5m);
    const solContext = calculateZScore(solAdaRatio4h);
    const solEntry   = calculateZScore(solAdaRatio5m);

    // ── Z-Scores precios USD (precio directo, lógica invertida) ──
    const adaUsdt4h = calculateZScore(adaClose4h);
    const adaUsdt5m = calculateZScore(adaClose5m);
    const btcUsdt4h = calculateZScore(btcClose4h);
    const btcUsdt5m = calculateZScore(btcClose5m);

    // Para USD: verde cuando z <= threshold (precio barato = señal de compra)
    const getUsdStatus = (z, threshold) => z <= threshold ? 'green' : 'red';

    res.json({
      adaBtcEnvironment: {
        context: {
          pair: 'ADA/BTC', timeframe: '4h', candles: 120,
          zScore: parseFloat(adaBtcContext.zScore.toFixed(4)),
          status: getStatus(adaBtcContext.zScore, CONTEXT_THRESHOLD)
        },
        entry: {
          pair: 'ADA/BTC', timeframe: '5m', candles: 120,
          zScore: parseFloat(adaBtcEntry.zScore.toFixed(4)),
          status: getStatus(adaBtcEntry.zScore, ENTRY_THRESHOLD)
        }
      },
      btcAdaEnvironment: {
        context: {
          pair: 'BTC/ADA', timeframe: '4h', candles: 120,
          zScore: parseFloat(btcAdaContext.zScore.toFixed(4)),
          status: getStatus(btcAdaContext.zScore, CONTEXT_THRESHOLD)
        },
        entry: {
          pair: 'BTC/ADA', timeframe: '5m', candles: 120,
          zScore: parseFloat(btcAdaEntry.zScore.toFixed(4)),
          status: getStatus(btcAdaEntry.zScore, ENTRY_THRESHOLD)
        }
      },
      adaEnvironment: {
        context: {
          pair: 'ADA/SOL', timeframe: '4h', candles: 120,
          zScore: parseFloat(adaContext.zScore.toFixed(4)),
          status: getStatus(adaContext.zScore, CONTEXT_THRESHOLD)
        },
        entry: {
          pair: 'ADA/SOL', timeframe: '5m', candles: 120,
          zScore: parseFloat(adaEntry.zScore.toFixed(4)),
          status: getStatus(adaEntry.zScore, ENTRY_THRESHOLD)
        }
      },
      solEnvironment: {
        context: {
          pair: 'SOL/ADA', timeframe: '4h', candles: 120,
          zScore: parseFloat(solContext.zScore.toFixed(4)),
          status: getStatus(solContext.zScore, CONTEXT_THRESHOLD)
        },
        entry: {
          pair: 'SOL/ADA', timeframe: '5m', candles: 120,
          zScore: parseFloat(solEntry.zScore.toFixed(4)),
          status: getStatus(solEntry.zScore, ENTRY_THRESHOLD)
        }
      },
      adaUsdtEnvironment: {
        tf4h: {
          pair: 'ADA/USDT', timeframe: '4h', candles: 120,
          zScore: parseFloat(adaUsdt4h.zScore.toFixed(4)),
          price: parseFloat(adaClose4h[adaClose4h.length - 1].toFixed(4)),
          status: getUsdStatus(adaUsdt4h.zScore, USD_CONTEXT_THRESHOLD)
        },
        tf5m: {
          pair: 'ADA/USDT', timeframe: '5m', candles: 120,
          zScore: parseFloat(adaUsdt5m.zScore.toFixed(4)),
          price: parseFloat(adaClose5m[adaClose5m.length - 1].toFixed(4)),
          status: getUsdStatus(adaUsdt5m.zScore, USD_ENTRY_THRESHOLD)
        }
      },
      btcUsdtEnvironment: {
        tf4h: {
          pair: 'BTC/USDT', timeframe: '4h', candles: 120,
          zScore: parseFloat(btcUsdt4h.zScore.toFixed(4)),
          price: Math.round(btcClose4h[btcClose4h.length - 1]),
          status: getUsdStatus(btcUsdt4h.zScore, USD_CONTEXT_THRESHOLD)
        },
        tf5m: {
          pair: 'BTC/USDT', timeframe: '5m', candles: 120,
          zScore: parseFloat(btcUsdt5m.zScore.toFixed(4)),
          price: Math.round(btcClose5m[btcClose5m.length - 1]),
          status: getUsdStatus(btcUsdt5m.zScore, USD_ENTRY_THRESHOLD)
        }
      },
      lastUpdated: new Date().toISOString(),
      cache: getCacheStats()
    });

  } catch (err) {
    console.error('[API /dashboard]', err.message);
    res.status(500).json({ error: err.message || 'Failed to fetch dashboard data', lastUpdated: null });
  }
});

module.exports = router;
