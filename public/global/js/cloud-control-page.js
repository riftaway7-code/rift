(function () {
    const catalog = [
        { id: 'roblox', title: 'roblox', genre: 'sandbox', tags: ['mobile', 'social', 'touch'], quality: 'balanced', fit: 'best on low-power devices', summary: 'Good fit for hosts that can keep a stable 60fps Sunshine stream without forcing a local Roblox install.' },
        { id: 'fortnite', title: 'fortnite', genre: 'battle royale', tags: ['fps', 'competitive', 'heavy'], quality: 'high', fit: 'best on strong hosts', summary: 'Heavy competitive sessions benefit from host PCs with solid uplink and lower queue contention.' },
        { id: 'pubg', title: 'pubg mobile', genre: 'battle royale', tags: ['fps', 'mobile', 'squad'], quality: 'balanced', fit: 'good on phones and school laptops', summary: 'A practical mobile-first pick for Sunshine/Moonlight streaming when local installs are blocked.' },
        { id: 'amongus', title: 'among us', genre: 'party', tags: ['social', 'touch', 'light'], quality: 'low data', fit: 'great on weak devices', summary: 'Light enough to fit lower-end hosts while still giving users a quick party-game queue.' },
        { id: 'genshin', title: 'genshin impact', genre: 'open world', tags: ['heavy', 'rpg', 'touch'], quality: 'high', fit: 'best on stable internet', summary: 'A stronger candidate for premium host machines with higher bitrate and lower jitter.' },
        { id: 'cod', title: 'call of duty mobile', genre: 'shooter', tags: ['fps', 'competitive', 'touch'], quality: 'high', fit: 'works best with good latency', summary: 'Queue this when the host fleet has enough headroom for faster FPS streaming.' },
        { id: 'stumble', title: 'stumble guys', genre: 'party', tags: ['social', 'light', 'mobile'], quality: 'low data', fit: 'very forgiving on weak hardware', summary: 'Useful as a low-pressure test game while you validate the host fleet and client setup.' },
        { id: 'gd', title: 'geometry dash', genre: 'rhythm', tags: ['precision', 'mobile', 'light'], quality: 'balanced', fit: 'good for short sessions', summary: 'Short, lightweight sessions that can help smoke-test queueing and host availability.' },
        { id: 'krunker', title: 'krunker', genre: 'arena fps', tags: ['fps', 'fast', 'browser'], quality: 'balanced', fit: 'works best with low latency', summary: 'Good latency-sensitive benchmark for higher-quality hosts.' },
        { id: 'shell', title: 'shell shockers', genre: 'arena fps', tags: ['fps', 'fast', 'multiplayer'], quality: 'balanced', fit: 'best on low-latency wifi', summary: 'Another fast-action title for testing host placement and client network quality.' },
        { id: 'crk', title: 'cookie run kingdom', genre: 'rpg', tags: ['touch', 'grind', 'mobile'], quality: 'balanced', fit: 'best for mobile-first users', summary: 'Long-running mobile account sessions work cleanly with Moonlight when the host is already paired.' },
        { id: 'poppy', title: 'poppy playtime', genre: 'horror', tags: ['story', 'heavy', 'touch'], quality: 'high', fit: 'better with stronger connection', summary: 'A heavier story title that benefits from better bitrate and stronger host hardware.' },
    ];

    const filters = [
        { id: 'all', label: 'all' },
        { id: 'mobile', label: 'mobile' },
        { id: 'heavy', label: 'heavy' },
        { id: 'fps', label: 'fps' },
        { id: 'social', label: 'social' },
        { id: 'touch', label: 'touch' },
    ];

    const state = {
        filter: 'all',
        query: '',
        selectedId: catalog[0]?.id || '',
        auth: { authenticated: false },
        summary: null,
        sessions: [],
        bootstrap: null,
        loading: false,
        pollTimer: null,
    };

    const grid = document.getElementById('cloudGrid');
    const search = document.getElementById('cloudSearch');
    const filterHost = document.getElementById('cloudFilters');
    const title = document.getElementById('cloudDetailTitle');
    const sub = document.getElementById('cloudDetailSub');
    const copy = document.getElementById('cloudDetailCopy');
    const tags = document.getElementById('cloudDetailTags');
    const stats = document.getElementById('cloudDetailStats');
    const requestSessionBtn = document.getElementById('cloudRequestSession');
    const endSessionBtn = document.getElementById('cloudEndSession');
    const refreshStatusBtn = document.getElementById('cloudRefreshStatus');
    const playerStatus = document.getElementById('cloudPlayerStatus');
    const sessionEmpty = document.getElementById('cloudPlayerEmpty');
    const sessionView = document.getElementById('cloudSessionView');
    const sessionPills = document.getElementById('cloudSessionPills');
    const sessionSummary = document.getElementById('cloudSessionSummary');
    const connectionSummary = document.getElementById('cloudConnectionSummary');
    const sessionLinks = document.getElementById('cloudSessionLinks');
    const instructionList = document.getElementById('cloudInstructionList');
    const hostList = document.getElementById('cloudHostList');
    const statHosts = document.getElementById('cloudStatHosts');
    const statQueue = document.getElementById('cloudStatQueue');
    const statProtocol = document.getElementById('cloudStatProtocol');

    if (!grid || !search || !filterHost || !title || !sub || !copy || !tags || !stats || !requestSessionBtn || !endSessionBtn || !refreshStatusBtn || !playerStatus || !sessionEmpty || !sessionView || !sessionPills || !sessionSummary || !connectionSummary || !sessionLinks || !instructionList || !hostList || !statHosts || !statQueue || !statProtocol) {
        return;
    }

    async function api(path, options = {}) {
        const response = await fetch(path, {
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                ...(options.headers || {}),
            },
            ...options,
        });
        const text = await response.text();
        let payload = null;
        try {
            payload = text ? JSON.parse(text) : null;
        } catch {
            payload = { raw: text };
        }
        if (!response.ok) {
            const error = new Error(String(payload?.error || response.statusText || 'Request failed'));
            error.status = response.status;
            error.payload = payload;
            throw error;
        }
        return payload;
    }

    async function fetchAuthState() {
        try {
            const response = await fetch('/api/auth/me', { credentials: 'same-origin' });
            const payload = await response.json();
            if (!response.ok) return { authenticated: false };
            return payload;
        } catch {
            return { authenticated: false };
        }
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    async function copyText(value, label) {
        const text = String(value || '').trim();
        if (!text) return;
        try {
            await navigator.clipboard.writeText(text);
            playerStatus.textContent = `${label} copied`;
        } catch {
            playerStatus.textContent = `could not copy ${label}`;
        }
    }

    function getSelectedGame() {
        return catalog.find((entry) => entry.id === state.selectedId) || catalog[0] || null;
    }

    function getFilteredGames() {
        const query = state.query.trim().toLowerCase();
        return catalog.filter((entry) => {
            const matchesFilter = state.filter === 'all' || entry.tags.includes(state.filter) || entry.genre.includes(state.filter);
            const haystack = `${entry.title} ${entry.genre} ${entry.tags.join(' ')} ${entry.quality} ${entry.fit}`.toLowerCase();
            return matchesFilter && (!query || haystack.includes(query));
        });
    }

    function getPrimarySession() {
        const exact = state.sessions.find((entry) => entry.gameSlug === state.selectedId);
        if (exact) return exact;
        return state.sessions[0] || null;
    }

    function setBusy(active, label = '') {
        state.loading = !!active;
        requestSessionBtn.disabled = !!active;
        endSessionBtn.disabled = !!active;
        refreshStatusBtn.disabled = !!active;
        if (label) {
            playerStatus.textContent = label;
        }
    }

    function renderFilters() {
        filterHost.innerHTML = filters.map((filter) => `
            <button type="button" class="cloud-filter-btn ${filter.id === state.filter ? 'active' : ''}" data-cloud-filter="${filter.id}">${filter.label}</button>
        `).join('');
    }

    function renderGrid() {
        const items = getFilteredGames();
        if (!items.length) {
            grid.innerHTML = '<div class="cloud-empty">No cloud games matched that filter yet.</div>';
            return;
        }
        if (!items.some((entry) => entry.id === state.selectedId)) {
            state.selectedId = items[0].id;
        }
        const currentSession = getPrimarySession();
        grid.innerHTML = items.map((entry) => {
            const session = state.sessions.find((row) => row.gameSlug === entry.id);
            const statusChip = session ? `<span class="cloud-chip">${session.status}${session.queuePosition ? ` · #${session.queuePosition}` : ''}</span>` : `<span class="cloud-chip">${entry.fit}</span>`;
            return `
                <article class="cloud-card ${entry.id === state.selectedId ? 'active' : ''}" data-cloud-id="${entry.id}">
                    <div class="cloud-card-top">
                        <div>
                            <div class="cloud-card-title">${entry.title}</div>
                            <div class="cloud-card-meta">${entry.genre} · ${entry.quality}</div>
                        </div>
                        ${statusChip}
                    </div>
                    <div class="cloud-tags">${entry.tags.map((tag) => `<span class="cloud-chip">${tag}</span>`).join('')}</div>
                    <div class="cloud-card-copy">${entry.summary}</div>
                    <div class="cloud-card-actions">
                        <button class="cloud-action primary" type="button" data-cloud-request="${entry.id}">${session ? 'view session' : 'request session'}</button>
                        <button class="cloud-action" type="button" data-cloud-select="${entry.id}">${currentSession && currentSession.gameSlug !== entry.id ? 'switch target' : 'details'}</button>
                    </div>
                </article>
            `;
        }).join('');
    }

    function renderDetailCard() {
        const entry = getSelectedGame();
        const active = getPrimarySession();
        if (!entry) return;
        title.textContent = entry.title;
        sub.textContent = `${entry.genre} · ${entry.quality} · ${entry.fit}`;
        copy.textContent = entry.summary;
        tags.innerHTML = entry.tags.map((tag) => `<span class="cloud-chip">${tag}</span>`).join('');

        const hostCount = Number(state.summary?.onlineHostCount || 0);
        const queueDepth = Number(state.summary?.queueDepth || 0);
        const currentSession = state.sessions.find((row) => row.gameSlug === entry.id) || null;
        stats.innerHTML = [
            ['online hosts', hostCount || '0'],
            ['queue depth', queueDepth || '0'],
            ['selected status', currentSession ? currentSession.status : 'idle'],
            ['stream fit', entry.fit],
        ].map((row) => `
            <div class="cloud-side-stat">
                <span>${row[0]}</span>
                <strong>${row[1]}</strong>
            </div>
        `).join('');

        if (!state.auth.authenticated) {
            requestSessionBtn.disabled = false;
            requestSessionBtn.querySelector('span:last-child').textContent = 'sign in first';
            endSessionBtn.disabled = true;
        } else if (currentSession) {
            requestSessionBtn.disabled = false;
            requestSessionBtn.querySelector('span:last-child').textContent = currentSession.status === 'queued' ? 'queued already' : 'view session';
            endSessionBtn.disabled = false;
        } else if (active && active.gameSlug !== entry.id) {
            requestSessionBtn.disabled = false;
            requestSessionBtn.querySelector('span:last-child').textContent = 'request anyway';
            endSessionBtn.disabled = false;
        } else {
            requestSessionBtn.disabled = false;
            requestSessionBtn.querySelector('span:last-child').textContent = 'request session';
            endSessionBtn.disabled = !active;
        }
    }

    function renderSummaryStrip() {
        const summary = state.summary || {};
        statHosts.textContent = `${summary.onlineHostCount || 0} hosts online`;
        statQueue.textContent = `${summary.queueDepth || 0} in queue`;
        statProtocol.textContent = summary.hosts?.[0]?.streamHealth
            ? `${summary.hosts[0].streamHealth.streamSoftware} / ${summary.hosts[0].streamHealth.streamProtocol}`
            : 'sunshine / moonlight';
    }

    function renderSessionPanel() {
        const session = getPrimarySession();
        const bootstrap = state.bootstrap;
        const onlineHosts = Array.isArray(state.summary?.hosts) ? state.summary.hosts : [];

        if (!state.auth.authenticated) {
            sessionEmpty.hidden = false;
            sessionView.hidden = true;
            sessionEmpty.innerHTML = 'Sign in on the <strong>account</strong> page first. Rift cloud uses your Rift account to request queue slots and keep track of active sessions.';
            playerStatus.textContent = 'sign in to request a session';
            return;
        }

        if (!session) {
            sessionEmpty.hidden = false;
            sessionView.hidden = true;
            sessionEmpty.innerHTML = 'No queued or active session yet. Pick a game from the launcher and press <strong>request session</strong>.';
            playerStatus.textContent = `${onlineHosts.length || 0} hosts available right now`;
            return;
        }

        sessionEmpty.hidden = true;
        sessionView.hidden = false;
        playerStatus.textContent = session.status === 'queued'
            ? `queued for ${session.gameTitle}${session.queuePosition ? ` at position #${session.queuePosition}` : ''}`
            : `${session.gameTitle} is ${session.status} on ${bootstrap?.host?.name || session.hostId || 'assigned host'}`;

        sessionPills.innerHTML = [
            ['status', session.status],
            session.queuePosition ? ['queue', `#${session.queuePosition}`] : null,
            bootstrap?.host?.name ? ['host', bootstrap.host.name] : null,
            bootstrap?.stream?.protocol ? ['protocol', bootstrap.stream.protocol] : null,
        ].filter(Boolean).map((row) => `<div class="cloud-chip">${row[0]} · ${row[1]}</div>`).join('');

        sessionSummary.innerHTML = [
            ['game', session.gameTitle],
            ['requested', new Date(session.requestedAt).toLocaleString()],
            ['host region', bootstrap?.host?.region || 'pending'],
            ['status', session.status],
        ].map((row) => `<div class="cloud-session-row"><span>${row[0]}</span><strong>${row[1]}</strong></div>`).join('');

        connectionSummary.innerHTML = bootstrap ? [
            ['software', bootstrap.stream.software],
            ['network', bootstrap.stream.remoteNetwork],
            ['bitrate', `${bootstrap.stream.profile.bitrateMbps} mbps`],
            ['profile', `${bootstrap.stream.profile.resolution} / ${bootstrap.stream.profile.fps}fps / ${bootstrap.stream.profile.codec}`],
        ].map((row) => `<div class="cloud-session-row"><span>${row[0]}</span><strong>${row[1]}</strong></div>`).join('') : '';

        sessionLinks.innerHTML = '';
        const moonlightHost = bootstrap?.connection?.moonlightHost || '';
        const tailscaleIp = bootstrap?.connection?.tailscaleIp || '';
        const launchUrl = bootstrap?.connection?.launchUrl || '';
        const pairUrl = bootstrap?.connection?.pairUrl || '';
        const parsecUrl = bootstrap?.connection?.parsecUrl || '';
        const notes = bootstrap?.connection?.notes || '';
        const hasDeepLink = /^moonlight:\/\//i.test(launchUrl);

        if (moonlightHost) {
            sessionLinks.insertAdjacentHTML('beforeend', `<button class="cloud-action primary" type="button" data-cloud-copy="${escapeHtml(moonlightHost)}" data-cloud-copy-label="moonlight host"><span class="material-icons">content_copy</span><span>copy moonlight host</span></button>`);
        }
        if (tailscaleIp && tailscaleIp !== moonlightHost) {
            sessionLinks.insertAdjacentHTML('beforeend', `<button class="cloud-action" type="button" data-cloud-copy="${escapeHtml(tailscaleIp)}" data-cloud-copy-label="tailscale ip"><span class="material-icons">content_copy</span><span>copy tailscale ip</span></button>`);
        }
        if (pairUrl) {
            sessionLinks.insertAdjacentHTML('beforeend', `<a class="cloud-action" href="${escapeHtml(pairUrl)}" target="_blank" rel="noopener noreferrer"><span class="material-icons">link</span><span>pair host</span></a>`);
        }
        if (parsecUrl) {
            sessionLinks.insertAdjacentHTML('beforeend', `<a class="cloud-action" href="${escapeHtml(parsecUrl)}" target="_blank" rel="noopener noreferrer"><span class="material-icons">terminal</span><span>backup control</span></a>`);
        }
        if (hasDeepLink) {
            sessionLinks.insertAdjacentHTML('beforeend', `<a class="cloud-action" href="${escapeHtml(launchUrl)}"><span class="material-icons">rocket_launch</span><span>try moonlight deep link</span></a>`);
        }
        sessionLinks.insertAdjacentHTML('beforeend', `<a class="cloud-action" href="https://moonlight-stream.org/" target="_blank" rel="noopener noreferrer"><span class="material-icons">open_in_new</span><span>open moonlight site</span></a>`);
        if (moonlightHost || tailscaleIp) {
            const label = moonlightHost || tailscaleIp;
            sessionLinks.insertAdjacentHTML('beforeend', `<div class="cloud-host-pill"><span class="material-icons">devices</span><strong>${escapeHtml(label)}</strong></div>`);
        }

        const instructions = [];
        if (moonlightHost || tailscaleIp) {
            instructions.push(`Open Moonlight manually, add the host using ${escapeHtml(moonlightHost || tailscaleIp)}, and pair it if needed.`);
        }
        if (hasDeepLink) {
            instructions.push('The Moonlight deep link is optional. If it does nothing on your device, use the copied host value in Moonlight manually.');
        }
        if (notes) {
            instructions.push(`Host note: ${escapeHtml(notes)}`);
        }
        const mergedInstructions = instructions.concat(bootstrap?.instructions || []);
        instructionList.innerHTML = (mergedInstructions.length ? mergedInstructions : ['Rift is waiting for an assigned host to expose bootstrap data.'])
            .map((entry) => `<li>${entry}</li>`)
            .join('');
        hostList.innerHTML = onlineHosts.slice(0, 6).map((host) => `
            <div class="cloud-host-pill">
                <span class="material-icons">computer</span>
                <strong>${host.name}</strong>
                <span>${host.usedSlots}/${host.capacity}</span>
            </div>
        `).join('');
    }

    function sync() {
        renderFilters();
        renderGrid();
        renderDetailCard();
        renderSummaryStrip();
        renderSessionPanel();
    }

    async function refreshCloudState() {
        try {
            const [summary, auth] = await Promise.all([
                api('/api/cloud/summary').catch(() => ({ onlineHostCount: 0, queueDepth: 0, hosts: [] })),
                fetchAuthState(),
            ]);
            state.summary = summary;
            state.auth = auth || { authenticated: false };
            state.sessions = [];
            state.bootstrap = null;
            if (state.auth.authenticated) {
                state.sessions = await api('/api/sessions/me').catch(() => []);
                const session = getPrimarySession();
                if (session && (session.status === 'active' || session.status === 'disconnected')) {
                    state.bootstrap = await api(`/api/stream/sessions/${encodeURIComponent(session.id)}/bootstrap`).catch(() => null);
                }
            }
        } finally {
            sync();
        }
    }

    async function requestSelectedSession() {
        const entry = getSelectedGame();
        if (!entry) return;
        if (!state.auth.authenticated) {
            window.location.href = '/account';
            return;
        }
        try {
            setBusy(true, `requesting ${entry.title}...`);
            await api('/api/sessions/request', {
                method: 'POST',
                body: JSON.stringify({ gameId: entry.id, gameTitle: entry.title }),
            });
            await refreshCloudState();
        } catch (error) {
            playerStatus.textContent = error.message || 'session request failed';
        } finally {
            setBusy(false);
        }
    }

    async function endCurrentSession() {
        const session = getPrimarySession();
        if (!session) return;
        try {
            setBusy(true, `ending ${session.gameTitle}...`);
            await api(`/api/sessions/${encodeURIComponent(session.id)}/end`, { method: 'POST' });
            await refreshCloudState();
        } catch (error) {
            playerStatus.textContent = error.message || 'end session failed';
        } finally {
            setBusy(false);
        }
    }

    function startPolling() {
        if (state.pollTimer) clearInterval(state.pollTimer);
        state.pollTimer = setInterval(() => {
            if (document.hidden) return;
            refreshCloudState();
        }, 15000);
    }

    filterHost.addEventListener('click', (event) => {
        const button = event.target instanceof HTMLElement ? event.target.closest('[data-cloud-filter]') : null;
        if (!(button instanceof HTMLElement)) return;
        state.filter = String(button.getAttribute('data-cloud-filter') || 'all');
        sync();
    });

    grid.addEventListener('click', (event) => {
        const requestButton = event.target instanceof HTMLElement ? event.target.closest('[data-cloud-request]') : null;
        const selectButton = event.target instanceof HTMLElement ? event.target.closest('[data-cloud-select]') : null;
        const card = event.target instanceof HTMLElement ? event.target.closest('[data-cloud-id]') : null;
        if (requestButton instanceof HTMLElement) {
            state.selectedId = String(requestButton.getAttribute('data-cloud-request') || state.selectedId);
            sync();
            requestSelectedSession();
            return;
        }
        if (selectButton instanceof HTMLElement) {
            state.selectedId = String(selectButton.getAttribute('data-cloud-select') || state.selectedId);
            sync();
            return;
        }
        if (!(card instanceof HTMLElement)) return;
        state.selectedId = String(card.getAttribute('data-cloud-id') || state.selectedId);
        sync();
    });

    search.addEventListener('input', () => {
        state.query = search.value || '';
        sync();
    });

    sessionLinks.addEventListener('click', (event) => {
        const button = event.target instanceof HTMLElement ? event.target.closest('[data-cloud-copy]') : null;
        if (!(button instanceof HTMLElement)) return;
        event.preventDefault();
        copyText(button.getAttribute('data-cloud-copy'), button.getAttribute('data-cloud-copy-label') || 'value');
    });

    requestSessionBtn.addEventListener('click', requestSelectedSession);
    endSessionBtn.addEventListener('click', endCurrentSession);
    refreshStatusBtn.addEventListener('click', refreshCloudState);

    startPolling();
    refreshCloudState();
})();
