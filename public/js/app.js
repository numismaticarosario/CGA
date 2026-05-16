// ── CGA Dashboard JS ──────────────────────────────────────────────────────

let refreshTimer = null;
const REFRESH_INTERVAL = 60 * 1000; // 60 seconds

// ── User info ─────────────────────────────────────────────────────────────
async function loadUser() {
  try {
    const res = await fetch('/api/me');
    if (!res.ok) return;
    const user = await res.json();
    if (user.name) {
      document.getElementById('user-name').textContent = user.name.split(' ')[0];
    }
    if (user.avatar) {
      const img = document.getElementById('user-avatar');
      img.src = user.avatar;
      img.style.display = 'block';
    }
  } catch (_) {}
}

// ── Update a single indicator card ────────────────────────────────────────
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

// ── Show / hide error banner ──────────────────────────────────────────────
function showError(msg) {
  const banner = document.getElementById('error-banner');
  const text   = document.getElementById('error-text');
  text.textContent = msg;
  banner.classList.add('visible');
}

function clearError() {
  document.getElementById('error-banner').classList.remove('visible');
}

// ── Set all cards to loading state ────────────────────────────────────────
function setLoading() {
  ['ada-context', 'ada-entry', 'sol-context', 'sol-entry'].forEach(id => {
    const card = document.getElementById(id);
    const zEl  = document.getElementById(`${id}-zscore`);
    const sEl  = document.getElementById(`${id}-status`);
    if (card) { card.classList.remove('green', 'red'); card.classList.add('loading'); }
    if (zEl)  zEl.textContent = '—';
    if (sEl)  sEl.textContent = '—';
  });
}

// ── Fetch and render dashboard ────────────────────────────────────────────
async function fetchDashboard() {
  const btn = document.getElementById('btn-refresh');
  if (btn) btn.disabled = true;

  clearError();

  try {
    const res = await fetch('/api/dashboard');
    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || `Server error ${res.status}`);
    }

    // Update cards
    updateCard('ada-context', data.adaEnvironment?.context);
    updateCard('ada-entry',   data.adaEnvironment?.entry);
    updateCard('sol-context', data.solEnvironment?.context);
    updateCard('sol-entry',   data.solEnvironment?.entry);

    // Last updated
    if (data.lastUpdated) {
      const d = new Date(data.lastUpdated);
      const formatted = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
        + '  ' + d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: 'numeric' });
      document.getElementById('last-updated-text').textContent = formatted;
    }

    // Cache info
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
