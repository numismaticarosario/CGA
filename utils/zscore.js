/**
 * Calculate Z-Score from an array of ratio values
 * @param {number[]} ratios - Array of ratio values
 * @returns {{ zScore: number, mean: number, stdDev: number }}
 */
function calculateZScore(ratios) {
  if (!ratios || ratios.length < 2) {
    throw new Error('Need at least 2 data points to calculate Z-Score');
  }

  const n = ratios.length;
  const mean = ratios.reduce((sum, r) => sum + r, 0) / n;

  const variance = ratios.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / n;
  const stdDev = Math.sqrt(variance);

  if (stdDev === 0) {
    return { zScore: 0, mean, stdDev };
  }

  const current = ratios[ratios.length - 1];
  const zScore = (current - mean) / stdDev;

  return { zScore, mean, stdDev };
}

/**
 * Determine status color based on z-score and threshold
 * @param {number} zScore
 * @param {number} threshold
 * @returns {'green' | 'red'}
 */
function getStatus(zScore, threshold) {
  return zScore >= threshold ? 'green' : 'red';
}

module.exports = { calculateZScore, getStatus };
