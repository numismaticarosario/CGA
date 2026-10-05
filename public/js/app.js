// ── CGA Dashboard JS ──────────────────────────────────────────────────────

let refreshTimer = null;
const REFRESH_INTERVAL = 60 * 1000;

// ── User info ─────────────────────────────────────────────────────────────
async function loadUser() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return;
    const user = await res.json();
    if (user.name) document.getElementById('user-name').textContent = user.name.split(' ')[0];
    if (user.avatar) {
      const img = document.getElementById('user-avatar');
      img.src = user.avatar;
      img.style.display = 'block';
    }
  } catch (_) {}
}

// ── Update par trading card (ADA/BTC, ADA/SOL) ───────────────────────────
function updateCard(id, data) {
  const card = document.getElementById(id);
  const zEl  = document.getElementById(`${id}-zscore`);
  const sEl  = document.getElementById(`${id}-status`);
  if (!card || !data) return;
  card.classList.remove('loading', 'green', 'red');
  card.classList.add(data.status);
  zEl.textContent = data.zScore.toFixed(2);
  sEl.textContent = data.status.toUpperCase();
}

// ── Update USD price card (ADA/USDT, BTC/USDT) ───────────────────────────
function updateUsdCard(id, data) {
  const card  = document.getElementById(id);
  const prEl  = document.getElementById(`${id}-price`);
  const zEl   = document.getElementById(`${id}-zscore`);
  const sEl   = document.getElementById(`${id}-status`);
  if (!card || !data) return;
  card.classList.remove('loading', 'green', 'red');
  card.classList.add(data.status);
  prEl.textContent = '$ ' + data.price;
  zEl.textContent  = data.zScore.toFixed(2);
  sEl.textContent  = data.status === 'green' ? 'COMPRA' : 'ESPERAR';
}

// ── Error banner ──────────────────────────────────────────────────────────
function showError(msg) {
  const banner = document.getElementById('error-banner');
  document.getElementById('error-text').textContent = msg;
  banner.classList.add('visible');
}
function clearError() {
  document.getElementById('error-banner').classList.remove('visible');
}

// ── Loading state ─────────────────────────────────────────────────────────
function setLoading() {
  [
    'adabtc-context', 'adabtc-entry',
    'btcada-context', 'btcada-entry',
    'ada-context',    'ada-entry',
    'sol-context',    'sol-entry'
  ].forEach(id => {
    const card = document.getElementById(id);
    const zEl  = document.getElementById(`${id}-zscore`);
    const sEl  = document.getElementById(`${id}-status`);
    if (card) { card.classList.remove('green', 'red'); card.classList.add('loading'); }
    if (zEl) zEl.textContent = '—';
    if (sEl) sEl.textContent = '—';
  });

  ['adausdt-4h', 'adausdt-5m', 'btcusdt-4h', 'btcusdt-5m'].forEach(id => {
    const card = document.getElementById(id);
    const prEl = document.getElementById(`${id}-price`);
    const zEl  = document.getElementById(`${id}-zscore`);
    const sEl  = document.getElementById(`${id}-status`);
    if (card) { card.classList.remove('green', 'red'); card.classList.add('loading'); }
    if (prEl) prEl.textContent = '—';
    if (zEl)  zEl.textContent  = '—';
    if (sEl)  sEl.textContent  = '—';
  });
}

// ── Fetch and render ──────────────────────────────────────────────────────
async function fetchDashboard() {
  const btn = document.getElementById('btn-refresh');
  if (btn) btn.disabled = true;
  clearError();

  try {
    const res  = await fetch('/api/dashboard');
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || `Server error ${res.status}`);

    // Par trading cards
    updateCard('adabtc-context', data.adaBtcEnvironment?.context);
    updateCard('adabtc-entry',   data.adaBtcEnvironment?.entry);
    updateCard('btcada-context', data.btcAdaEnvironment?.context);
    updateCard('btcada-entry',   data.btcAdaEnvironment?.entry);
    updateCard('ada-context',    data.adaEnvironment?.context);
    updateCard('ada-entry',      data.adaEnvironment?.entry);
    updateCard('sol-context',    data.solEnvironment?.context);
    updateCard('sol-entry',      data.solEnvironment?.entry);

    // USD price cards
    updateUsdCard('adausdt-4h', data.adaUsdtEnvironment?.tf4h);
    updateUsdCard('adausdt-5m', data.adaUsdtEnvironment?.tf5m);
    updateUsdCard('btcusdt-4h', data.btcUsdtEnvironment?.tf4h);
    updateUsdCard('btcusdt-5m', data.btcUsdtEnvironment?.tf5m);

    // Last updated
    if (data.lastUpdated) {
      const d = new Date(data.lastUpdated);
      document.getElementById('last-updated-text').textContent =
        d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        + '  ' + d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
    }

    if (data.cache) {
      document.getElementById('cache-info').textContent =
        `Cache: ${data.cache.entries} entries · TTL ${data.cache.ttlSeconds}s`;
    }

  } catch (err) {
    showError(`Failed to load data: ${err.message}`);
    document.getElementById('last-updated-text').textContent = 'Error — retrying in 60s';
  } finally {
    if (btn) btn.disabled = false;
  }
}

// ── Auto-refresh ──────────────────────────────────────────────────────────
function startAutoRefresh() {
  if (refreshTimer) clearInterval(refreshTimer);
  refreshTimer = setInterval(fetchDashboard, REFRESH_INTERVAL);
}

// ── Init ──────────────────────────────────────────────────────────────────
(async function init() {
  setLoading();
  await loadUser();
  await fetchDashboard();
  startAutoRefresh();
})();
