// script.js — vanilla JS implementation of the ServerStats page
//
// Updated to fetch Minecraft server status from the public mcsrvstat.us API
// Usage: set `MC_HOST` to your Minecraft server hostname (optionally include :port). 
// Falls back gracefully if the API call fails.

(() => {
  // ===== Configuration =====
  // Set this to your Minecraft server host (example: "play.onesin.base44.app" or "example.com:25565")
  const MC_HOST = 'onesin.duckdns.org';

  // Existing state for simulated live server stats (UI)
  const state = {
    playersOnline: 127,
    peakToday: 284,
    uptime: 99.9,
    totalMembers: 15420,
    messagesDaily: 8943,
    ping: 24
  };

  // DOM refs
  const repoNameEl = document.getElementById('repo-name');
  const repoLinkArea = document.getElementById('repo-link-area');
  const repoStatsGrid = document.getElementById('repo-stats');
  const lastUpdatedEl = document.getElementById('last-updated');

  // token UI (kept for backwards compatibility with GitHub option)
  const tokenInput = document.getElementById('token-input');
  const setTokenBtn = document.getElementById('set-token');
  const clearTokenBtn = document.getElementById('clear-token');
  let token = null;
  setTokenBtn?.addEventListener('click', () => { token = tokenInput.value.trim() || null; });
  clearTokenBtn?.addEventListener('click', () => { token = null; tokenInput.value = ''; });

  // ===== Helpers =====
  function fmtNumber(n) { return (n === undefined || n === null) ? '—' : n.toLocaleString(); }
  function fmtDate(iso) { if (!iso) return '—'; try { return new Date(iso).toLocaleString(); } catch { return iso; } }
  function createStatCard(iconSvg, label, value, subtext = '') {
    const div = document.createElement('div');
    div.className = 'card flex items-start gap-4';
    div.innerHTML = `
      <div class="w-12 h-12 flex items-center justify-center bg-slate-800/60 rounded-xl">
        ${iconSvg}
      </div>
      <div class="flex-1">
        <div class="text-sm text-slate-400">${label}</div>
        <div class="text-white font-semibold text-lg">${value}</div>
        ${subtext ? `<div class="text-slate-400 text-sm mt-1">${subtext}</div>` : ''}
      </div>
    `;
    return div;
  }

  // Small inline SVG icons
  const icons = {
    server: `<svg class=\"w-6 h-6 text-cyan-400\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><rect x=\"2\" y=\"3\" width=\"20\" height=\"8\" rx=\"2\"/><rect x=\"2\" y=\"13\" width=\"20\" height=\"8\" rx=\"2\"/></svg>`,
    players: `<svg class=\"w-6 h-6 text-cyan-300\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M17 21v-2a4 4 0 0 0-3-3.87\"/><path d=\"M7 21v-2a4 4 0 0 1 3-3.87\"/><circle cx=\"9\" cy=\"7\" r=\"4\"/><circle cx=\"17\" cy=\"7\" r=\"4\"/></svg>`,
    motd: `<svg class=\"w-6 h-6 text-slate-300\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M3 7h18M3 12h18M3 17h18\"/></svg>`,
    version: `<svg class=\"w-6 h-6 text-amber-400\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M12 2l4 8H8z\"/><path d=\"M2 22h20\"/></svg>`,
    ping: `<svg class=\"w-6 h-6 text-rose-400\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M21 12v.01\"/><path d=\"M3 12a9 9 0 0 1 18 0\"/></svg>`,
    offline: `<svg class=\"w-6 h-6 text-red-400\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><circle cx=\"12\" cy=\"12\" r=\"9\"/><path d=\"M4.2 4.2l15.6 15.6\"/></svg>`
  };

  // ===== Minecraft server status (mcsrvstat.us) =====
  // API: https://api.mcsrvstat.us/2/<host>
  async function fetchMcStatus(host) {
    if (!host) throw new Error('MC host not configured');
    const url = `https://api.mcsrvstat.us/2/${encodeURIComponent(host)}`;
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      throw new Error(`MC API error: ${res.status} ${res.statusText} - ${txt}`);
    }
    return res.json();
  }

  function renderMcStatus(data) {
    repoStatsGrid.innerHTML = '';
    repoNameEl.textContent = `(${MC_HOST})`;

    // Provide link to the server info page (mcsrvstat provides info but we link to Minecraft server query page or a direct IP)
    const hostDisplay = MC_HOST;
    repoLinkArea.innerHTML = `<a href=\"https://mcsrvstat.us/server/${encodeURIComponent(MC_HOST)}\" target=\"_blank\" rel=\"noreferrer\" class=\"text-slate-300 hover:underline\">View MC status</a>`;

    const online = !!data.online;
    const playersOnline = data.players?.online ?? null;
    const playersMax = data.players?.max ?? null;
    const motd = Array.isArray(data.motd?.clean) ? data.motd.clean.join(' ') : (data.motd?.clean || '');
    const version = data.version || data.software || '—';
    const ip = data.ip || null;
    const port = data.port || null;
    const protocol = data.protocol || null;

    lastUpdatedEl.textContent = `Last checked: ${fmtDate(new Date().toISOString())}`;

    // Top-level status card
    repoStatsGrid.appendChild(createStatCard(
      online ? icons.server : icons.offline,
      'Server Status',
      online ? 'Online' : 'Offline',
      online ? `${playersOnline ?? '—'} players` : 'Server is not reachable'
    ));

    // Players card
    const playersText = online ? `${fmtNumber(playersOnline)} / ${fmtNumber(playersMax)}` : '—';
    repoStatsGrid.appendChild(createStatCard(icons.players, 'Players', playersText, online && playersOnline ? `List: ${ (data.players.sample || []).slice(0,6).map(p=>p.name).join(', ')}` : ''));

    // MOTD / description
    repoStatsGrid.appendChild(createStatCard(icons.motd, 'MOTD', motd || '—', ip ? `Address: ${ip}${port ? ':'+port : ''}` : ''));

    // Version / ping info
    const pingValue = (typeof data.debug?.ping === 'number') ? `${Math.round(data.debug.ping)}ms` : (data.latency ? `${data.latency}ms` : '—');
    repoStatsGrid.appendChild(createStatCard(icons.version, 'Version', version, `Protocol: ${protocol ?? '—'} • Ping: ${pingValue}`));
  }

  async function fetchAndRenderMc() {
    repoStatsGrid.innerHTML = '';
    repoLinkArea.textContent = 'Checking Minecraft server…';
    try {
      const data = await fetchMcStatus(MC_HOST);
      renderMcStatus(data);
    } catch (err) {
      console.error('MC status error', err);
      repoLinkArea.textContent = `Could not check server: ${err.message || err}`;
      repoStatsGrid.innerHTML = '';
      repoStatsGrid.appendChild(createStatCard(icons.offline, 'Server Status', 'Unknown', 'Could not reach MC status API'));
      repoStatsGrid.appendChild(createStatCard(icons.players, 'Players', '—', 'Unavailable'));
      repoStatsGrid.appendChild(createStatCard(icons.motd, 'MOTD', '—', 'Unavailable'));
      repoStatsGrid.appendChild(createStatCard(icons.version, 'Version', '—', 'Unavailable'));
    }
  }

  // ===== Live stats rendering & simulation (unchanged) =====
  const features = [
    { icon: icons.ban || icons.offline, title: "No Hacking", description: "Our #1 rule. This is a hacking-free zone. We maintain a secure, safe environment for all members.", highlight: true },
    { icon: icons.handshake || icons.server, title: "Friendly Greetings", description: "Every member is welcomed warmly. We're all about positive vibes and making new friends." },
    { icon: icons.star || icons.server, title: "Family-Friendly", description: "A safe space for kids and adults. Active moderation ensures everyone feels comfortable and respected at all times." },
    { icon: icons.message || icons.motd, title: "Active Chat", description: "Engage in conversations, share experiences, and connect with like-minded individuals." },
    { icon: icons.heart || icons.server, title: "Supportive Community", description: "Whether you're new or a veteran, our community is here to help and support you." },
    { icon: icons.zap || icons.server, title: "Fast & Reliable", description: "Optimized performance with minimal latency for the best possible experience." }
  ];

  function renderFeatures() {
    const container = document.getElementById('features');
    if (!container) return;
    container.innerHTML = '';
    features.forEach((f) => {
      const card = document.createElement('div');
      card.className = `card ${f.highlight ? 'border-2 border-cyan-500/20' : ''}`;
      card.innerHTML = `
        <div class="flex items-start gap-4">
          <div class="w-12 h-12 flex items-center justify-center bg-slate-800/60 rounded-xl">${f.icon}</div>
          <div class="flex-1">
            <div class="text-white font-semibold">${f.title}</div>
            <div class="text-slate-400 mt-1">${f.description}</div>
          </div>
        </div>
      `;
      container.appendChild(card);
    });
  }

  function renderLiveStats() {
    const grid = document.getElementById('live-stats');
    if (!grid) return;
    grid.innerHTML = '';

    grid.appendChild(createStatCard(icons.players, 'Players Online', fmtNumber(state.playersOnline), `Peak today: ${fmtNumber(state.peakToday)}`));
    grid.appendChild(createStatCard(icons.globe || icons.server, 'Total Members', fmtNumber(state.totalMembers), 'And growing daily'));
    grid.appendChild(createStatCard(icons.clock || icons.server, 'Uptime', `${state.uptime}%`, 'Last 30 days'));
    grid.appendChild(createStatCard(icons.message || icons.motd, 'Messages Today', fmtNumber(state.messagesDaily), 'Active conversations'));
    grid.appendChild(createStatCard(icons.wifi || icons.ping, 'Server Ping', `${state.ping}ms`, 'Lightning fast'));
    grid.appendChild(createStatCard(`<svg class=\"w-6 h-6 text-slate-300\" viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.5\" stroke-linecap=\"round\" stroke-linejoin=\"round\"><path d=\"M4 6h16M4 12h16M4 18h16\"/></svg>`, 'Server Status', 'Healthy', 'All systems operational'));
  }

  function startSimulation() {
    setInterval(() => {
      state.playersOnline = Math.max(100, state.playersOnline + Math.floor(Math.random() * 11) - 5);
      state.messagesDaily = state.messagesDaily + Math.floor(Math.random() * 10);
      state.ping = Math.max(15, Math.min(120, state.ping + Math.floor(Math.random() * 7) - 3));
      if (state.playersOnline > state.peakToday) state.peakToday = state.playersOnline;
      renderLiveStats();
    }, 3000);
  }

  // ===== Init =====
  renderFeatures();
  renderLiveStats();
  startSimulation();
  fetchAndRenderMc();

  // Refresh MC status periodically (every 60s)
  setInterval(fetchAndRenderMc, 60_000);
})();