// script.js — vanilla JS implementation of the ServerStats page
// - Simulates live server stats (players, messages, ping)
// - Fetches GitHub repo stats for farrowzion-cmd/one_sin and displays them
// - Renders feature cards and stat cards

(() => {
  // initial server stats
  const state = {
    playersOnline: 127,
    peakToday: 284,
    uptime: 99.9,
    totalMembers: 15420,
    messagesDaily: 8943,
    ping: 24
  };

  // repo info
  const owner = 'farrowzion-cmd';
  const repoName = 'one_sin';
  const apiUrl = `https://api.github.com/repos/${owner}/${repoName}`;

  // DOM refs
  const repoNameEl = document.getElementById('repo-name');
  const repoLinkArea = document.getElementById('repo-link-area');
  const repoStatsGrid = document.getElementById('repo-stats');
  const lastUpdatedEl = document.getElementById('last-updated');
  const tokenInput = document.getElementById('token-input');
  const setTokenBtn = document.getElementById('set-token');
  const clearTokenBtn = document.getElementById('clear-token');

  // token (optional, client-side only)
  let token = null;

  setTokenBtn.addEventListener('click', () => {
    token = tokenInput.value.trim() || null;
    fetchAndRenderRepo();
  });
  clearTokenBtn.addEventListener('click', () => {
    token = null;
    tokenInput.value = '';
    fetchAndRenderRepo();
  });

  // helper utilities
  function fmtNumber(n) {
    return (n === undefined || n === null) ? '—' : n.toLocaleString();
  }
  function fmtDate(iso) {
    if (!iso) return '—';
    try { return new Date(iso).toLocaleString(); } catch { return iso; }
  }
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

  // small inline SVGs for icons (kept lightweight)
  const icons = {
    star: `<svg class="w-6 h-6 text-yellow-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 .587l3.668 7.431L24 9.748l-6 5.845L19.335 24 12 19.897 4.665 24 6 15.593 0 9.748l8.332-1.73z"/></svg>`,
    fork: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 3v12"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M17 8c-1 4-5 6-9 8"/></svg>`,
    watch: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"/><circle cx="12" cy="12" r="3"/></svg>`,
    code: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 18l6-6-6-6"/><path d="M8 6L2 12l6 6"/></svg>`,
    users: `<svg class="w-6 h-6 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M17 21v-2a4 4 0 0 0-3-3.87"/><path d="M7 21v-2a4 4 0 0 1 3-3.87"/><circle cx="9" cy="7" r="4"/><circle cx="17" cy="7" r="4"/></svg>`,
    globe: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2c3 4 3 16 0 20M12 2C9 6 9 18 12 22"/></svg>`,
    clock: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>`,
    wifi: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M2 8.82a15 15 0 0 1 20 0"/><path d="M5.64 12.46a10 10 0 0 1 12.72 0"/><path d="M8.53 15.35a5 5 0 0 1 6.95 0"/><path d="M12 20h.01"/></svg>`,
    message: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    heart: `<svg class="w-6 h-6 text-rose-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M12 21s-7-4.438-9-7.086C-0.5 9.441 3 4 7 6c2 1.25 2.5 3 5 3s3-1.75 5-3c4-2 7.5 3.441 4 7.914C19 16.562 12 21 12 21z"/></svg>`,
    zap: `<svg class="w-6 h-6 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
    ban: `<svg class="w-6 h-6 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="M4.2 4.2l15.6 15.6"/></svg>`,
    handshake: `<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12l7-7 13 13"/><path d="M12 7v13"/></svg>`
  };

  // features data (same as React version)
  const features = [
    { icon: icons.ban, title: "No Hacking", description: "Our #1 rule. This is a hacking-free zone. We maintain a secure, safe environment for all members.", highlight: true },
    { icon: icons.handshake, title: "Friendly Greetings", description: "Every member is welcomed warmly. We're all about positive vibes and making new friends." },
    { icon: icons.star, title: "Family-Friendly", description: "A safe space for kids and adults. Active moderation ensures everyone feels comfortable and respected at all times." },
    { icon: icons.message, title: "Active Chat", description: "Engage in conversations, share experiences, and connect with like-minded individuals." },
    { icon: icons.heart, title: "Supportive Community", description: "Whether you're new or a veteran, our community is here to help and support you." },
    { icon: icons.zap, title: "Fast & Reliable", description: "Optimized performance with minimal latency for the best possible experience." }
  ];

  // render features
  function renderFeatures() {
    const container = document.getElementById('features');
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

  // render live stats
  function renderLiveStats() {
    const grid = document.getElementById('live-stats');
    grid.innerHTML = '';

    grid.appendChild(createStatCard(icons.users, 'Players Online', fmtNumber(state.playersOnline), `Peak today: ${fmtNumber(state.peakToday)}`));
    grid.appendChild(createStatCard(icons.globe, 'Total Members', fmtNumber(state.totalMembers), 'And growing daily'));
    grid.appendChild(createStatCard(icons.clock, 'Uptime', `${state.uptime}%`, 'Last 30 days'));
    grid.appendChild(createStatCard(icons.message, 'Messages Today', fmtNumber(state.messagesDaily), 'Active conversations'));
    grid.appendChild(createStatCard(icons.wifi, 'Server Ping', `${state.ping}ms`, 'Lightning fast'));
    grid.appendChild(createStatCard(`<svg class="w-6 h-6 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6h16M4 12h16M4 18h16"/></svg>`, 'Server Status', 'Healthy', 'All systems operational'));
  }

  // simulate live values
  function startSimulation() {
    setInterval(() => {
      state.playersOnline = Math.max(100, state.playersOnline + Math.floor(Math.random() * 11) - 5);
      state.messagesDaily = state.messagesDaily + Math.floor(Math.random() * 10);
      state.ping = Math.max(15, Math.min(120, state.ping + Math.floor(Math.random() * 7) - 3));
      // occasionally bump peak
      if (state.playersOnline > state.peakToday) state.peakToday = state.playersOnline;
      renderLiveStats();
    }, 3000);
  }

  // fetch GitHub repo info and render repo cards
  async function fetchRepo() {
    const headers = { Accept: 'application/vnd.github.v3+json' };
    if (token) headers.Authorization = `token ${token}`;

    const res = await fetch(apiUrl, { headers });
    if (!res.ok) {
      const txt = await res.text().catch(() => res.statusText);
      const err = new Error(`GitHub API error: ${res.status} ${res.statusText} - ${txt}`);
      err.status = res.status;
      throw err;
    }
    return res.json();
  }

  function renderRepoCards(data) {
    repoStatsGrid.innerHTML = '';
    repoNameEl.textContent = `(${owner}/${repoName})`;
    repoLinkArea.innerHTML = `<a href="${data.html_url}" target="_blank" rel="noreferrer" class="text-slate-300 hover:underline">View on GitHub</a>`;
    lastUpdatedEl.textContent = `Last updated: ${fmtDate(data.pushed_at || data.updated_at || data.created_at)}`;

    repoStatsGrid.appendChild(createStatCard(icons.star, 'Stars', fmtNumber(data.stargazers_count), 'GitHub stars'));
    repoStatsGrid.appendChild(createStatCard(icons.fork, 'Forks', fmtNumber(data.forks_count), 'Forks'));
    repoStatsGrid.appendChild(createStatCard(icons.watch, 'Watchers', fmtNumber(data.watchers_count || data.subscribers_count), 'Watching this repo'));
    repoStatsGrid.appendChild(createStatCard(icons.code, 'Language', data.language || '—', `Last push: ${fmtDate(data.pushed_at)}`));
  }

  async function fetchAndRenderRepo() {
    repoStatsGrid.innerHTML = '';
    repoLinkArea.textContent = 'Loading repo stats…';
    try {
      const data = await fetchRepo();
      renderRepoCards(data);
    } catch (err) {
      console.error(err);
      repoLinkArea.textContent = `Could not load repo: ${err.message || err}`;
      // show fallback placeholders
      repoStatsGrid.appendChild(createStatCard(icons.star, 'Stars', '—', 'Unavailable'));
      repoStatsGrid.appendChild(createStatCard(icons.fork, 'Forks', '—', 'Unavailable'));
      repoStatsGrid.appendChild(createStatCard(icons.watch, 'Watchers', '—', 'Unavailable'));
      repoStatsGrid.appendChild(createStatCard(icons.code, 'Language', '—', 'Unavailable'));
    }
  }

  // initial render
  renderFeatures();
  renderLiveStats();
  startSimulation();
  fetchAndRenderRepo();

  // refresh repo stats every 60 seconds
  setInterval(fetchAndRenderRepo, 60_000);
})();
