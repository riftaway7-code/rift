(function () {
    const catalog = [
        {
            id: 'roblox',
            title: 'roblox',
            genre: 'sandbox',
            tags: ['social', 'mobile', 'touch'],
            quality: 'balanced',
            fit: 'best first test for the new flow',
            summary: 'Routes the Roblox nowgg session onto Rift so the game opens on the Rift domain instead of a separate nowgg tab.',
            url: 'https://159.ip.nowgg.fun/apps/a/19900/b.html',
        },
        {
            id: 'fortnite',
            title: 'fortnite',
            genre: 'battle royale',
            tags: ['heavy', 'fps', 'competitive'],
            quality: 'high',
            fit: 'needs stronger connection quality',
            summary: 'A heavier cloud target that benefits from the cleaner top-level proxy route instead of nested iframes.',
            url: 'https://nowgg.fun/apps/a/10004/b.html',
        },
        {
            id: 'pubg',
            title: 'pubg mobile',
            genre: 'battle royale',
            tags: ['fps', 'mobile', 'squad'],
            quality: 'balanced',
            fit: 'good for phones and lighter laptops',
            summary: 'Mobile-first shooter sessions that are a practical fit for Rift cloud on weaker client devices.',
            url: 'https://nowgg.fun/apps/proxima-beta/2609/pubg-mobile-resistance.html',
        },
        {
            id: 'amongus',
            title: 'among us',
            genre: 'party',
            tags: ['social', 'light', 'touch'],
            quality: 'low data',
            fit: 'forgiving on weak devices',
            summary: 'A lighter session that is useful for validating the nowgg launch flow without a heavy game load.',
            url: 'https://nowgg.fun/apps/innersloth-llc/4047/among-us.html',
        },
        {
            id: 'genshin',
            title: 'genshin impact',
            genre: 'open world',
            tags: ['heavy', 'rpg', 'touch'],
            quality: 'high',
            fit: 'works best on stable internet',
            summary: 'A stronger open-world cloud target that benefits from the top-level Rift proxy path.',
            url: 'https://nowgg.fun/apps/cognosphere-pte-ltd-/1773/genshin-impact.html',
        },
        {
            id: 'cod',
            title: 'call of duty mobile',
            genre: 'shooter',
            tags: ['fps', 'competitive', 'touch'],
            quality: 'high',
            fit: 'best on lower-latency wifi',
            summary: 'Fast-action mobile FPS sessions where the old iframe route was especially fragile.',
            url: 'https://nowgg.fun/apps/a/10008/b.html',
        },
        {
            id: 'stumble',
            title: 'stumble guys',
            genre: 'party',
            tags: ['social', 'light', 'mobile'],
            quality: 'low data',
            fit: 'good low-pressure smoke test',
            summary: 'A light multiplayer title for quickly checking whether the proxied launch route is healthy.',
            url: 'https://nowgg.fun/apps/a/10011/b.html',
        },
        {
            id: 'gd',
            title: 'geometry dash',
            genre: 'rhythm',
            tags: ['precision', 'light', 'mobile'],
            quality: 'balanced',
            fit: 'short sessions and fast retries',
            summary: 'Useful for short cloud sessions and repeated launch testing without a long warm-up.',
            url: 'https://nowgg.fun/apps/robtop-games/1400/geometry-dash.html',
        },
        {
            id: 'krunker',
            title: 'krunker',
            genre: 'arena fps',
            tags: ['fps', 'fast', 'browser'],
            quality: 'balanced',
            fit: 'best on low-latency wifi',
            summary: 'A good latency-sensitive title for testing the cleaner top-level launch model.',
            url: 'https://nowgg.fun/apps/yendis-entertainment/51644/krunker.html',
        },
        {
            id: 'shell',
            title: 'shell shockers',
            genre: 'arena fps',
            tags: ['fps', 'fast', 'multiplayer'],
            quality: 'balanced',
            fit: 'best on steady wifi',
            summary: 'Another fast-action title for checking how well Rift keeps nowgg inside the site flow.',
            url: 'https://nowgg.fun/apps/blue-wizard-digital/51615/shell-shockers.html',
        },
        {
            id: 'crk',
            title: 'cookie run kingdom',
            genre: 'rpg',
            tags: ['touch', 'grind', 'mobile'],
            quality: 'balanced',
            fit: 'best for mobile-first users',
            summary: 'Longer mobile sessions that are still more forgiving than the heavier shooters.',
            url: 'https://nowgg.fun/apps/a/10019/b.html',
        },
        {
            id: 'poppy',
            title: 'poppy playtime',
            genre: 'horror',
            tags: ['story', 'heavy', 'touch'],
            quality: 'high',
            fit: 'better on stronger internet',
            summary: 'A heavier story title that is useful once the basic nowgg-in-Rift route is stable.',
            url: 'https://nowgg.fun/apps/a/10019/b.html',
        },
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
        loading: false,
        proxyMode: 'uv',
        lastLaunch: null,
        lastError: '',
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

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
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

    function setBusy(active, label = '') {
        state.loading = !!active;
        requestSessionBtn.disabled = !!active;
        endSessionBtn.disabled = !!active;
        refreshStatusBtn.disabled = !!active;
        if (label) playerStatus.textContent = label;
    }

    async function prepareProxyMode() {
        state.proxyMode = 'uv';
    }

    function buildEmbedUrl(targetUrl) {
        return `/uv/index.html?url=${encodeURIComponent(targetUrl)}`;
    }

    function requiresScramjet(targetUrl) {
        return false;
    }

    function updateActionLabels() {
        requestSessionBtn.querySelector('span:last-child').textContent = 'play in rift';
        endSessionBtn.querySelector('span:last-child').textContent = 'open direct';
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
        grid.innerHTML = items.map((entry) => `
            <article class="cloud-card ${entry.id === state.selectedId ? 'active' : ''}" data-cloud-id="${entry.id}">
                <div class="cloud-card-top">
                    <div>
                        <div class="cloud-card-title">${entry.title}</div>
                        <div class="cloud-card-meta">${entry.genre} · ${entry.quality}</div>
                    </div>
                    <span class="cloud-chip">${entry.fit}</span>
                </div>
                <div class="cloud-tags">${entry.tags.map((tag) => `<span class="cloud-chip">${tag}</span>`).join('')}</div>
                <div class="cloud-card-copy">${entry.summary}</div>
                <div class="cloud-card-actions">
                    <button class="cloud-action primary" type="button" data-cloud-launch="${entry.id}">play in rift</button>
                    <button class="cloud-action" type="button" data-cloud-select="${entry.id}">details</button>
                </div>
            </article>
        `).join('');
    }

    function renderDetailCard() {
        const entry = getSelectedGame();
        if (!entry) return;

        title.textContent = entry.title;
        sub.textContent = `${entry.genre} · ${entry.quality} · ${entry.fit}`;
        copy.textContent = entry.summary;
        tags.innerHTML = entry.tags.map((tag) => `<span class="cloud-chip">${tag}</span>`).join('');

        stats.innerHTML = [
            ['launch mode', 'top-level'],
            ['proxy route', 'ultraviolet / wisp'],
            ['source', 'now.gg session host'],
            ['best fit', entry.fit],
        ].map((row) => `
            <div class="cloud-side-stat">
                <span>${row[0]}</span>
                <strong>${row[1]}</strong>
            </div>
        `).join('');
    }

    function renderSummaryStrip() {
        statHosts.textContent = `${catalog.length} games ready`;
        statQueue.textContent = 'uv launcher';
        statProtocol.textContent = 'ultraviolet / wisp';
    }

    function renderLaunchPanel() {
        const entry = getSelectedGame();
        sessionEmpty.hidden = true;
        sessionView.hidden = false;

        if (!entry) {
            playerStatus.textContent = 'pick a game to launch through rift';
            sessionPills.innerHTML = '';
            sessionSummary.innerHTML = '';
            connectionSummary.innerHTML = '';
            sessionLinks.innerHTML = '';
            instructionList.innerHTML = '';
            hostList.innerHTML = '';
            return;
        }

        const lastLaunchTime = state.lastLaunch?.at
            ? new Date(state.lastLaunch.at).toLocaleString()
            : 'not launched yet';

        playerStatus.textContent = state.loading
            ? `preparing ${entry.title} inside rift...`
            : state.lastError
                ? state.lastError
                : `${entry.title} is ready to launch on the rift domain`;

        sessionPills.innerHTML = [
            ['status', state.loading ? 'preparing' : 'ready'],
            ['mode', 'in-rift'],
            ['route', 'uv'],
        ].map((row) => `<div class="cloud-chip">${row[0]} · ${row[1]}</div>`).join('');

        sessionSummary.innerHTML = [
            ['game', entry.title],
            ['source', 'now.gg session host'],
            ['last launch', lastLaunchTime],
            ['active route', 'uv service worker + wisp'],
        ].map((row) => `<div class="cloud-session-row"><span>${row[0]}</span><strong>${row[1]}</strong></div>`).join('');

        connectionSummary.innerHTML = [
            ['target', entry.url.replace(/^https?:\/\//i, '')],
            ['embed model', 'uv launcher page'],
            ['session load', 'proxied inside rift'],
            ['fallback', 'open direct'],
        ].map((row) => `<div class="cloud-session-row"><span>${row[0]}</span><strong>${escapeHtml(row[1])}</strong></div>`).join('');

        sessionLinks.innerHTML = `
            <button class="cloud-action primary" type="button" data-cloud-launch="${entry.id}">
                <span class="material-icons">play_arrow</span>
                <span>play in rift</span>
            </button>
            <button class="cloud-action" type="button" data-cloud-direct="${entry.id}">
                <span class="material-icons">open_in_new</span>
                <span>open direct</span>
            </button>
            <button class="cloud-action" type="button" data-cloud-copy="${escapeHtml(entry.url)}">
                <span class="material-icons">content_copy</span>
                <span>copy source url</span>
            </button>
        `;

        instructionList.innerHTML = [
            'Rift now hands now.gg launches to a dedicated UV route instead of forcing them through TinyJet.',
            'That UV route still uses Rift\'s Wisp-backed BareMux transport, so the new path keeps the existing transport stack instead of replacing it.',
            'TinyJet and Scramjet stay in Rift for the browser and embed flows. This cloud page only changes the now.gg launch route.',
            'If a game still rejects the proxied launch, use the direct button as a temporary fallback and report which title failed.',
        ].map((line) => `<li>${line}</li>`).join('');

        hostList.innerHTML = `
            <div class="cloud-host-pill"><span class="material-icons">language</span><strong>${escapeHtml(window.location.host)}</strong></div>
            <div class="cloud-host-pill"><span class="material-icons">sports_esports</span><strong>${entry.title}</strong></div>
            <div class="cloud-host-pill"><span class="material-icons">shield</span><strong>wisp route</strong></div>
        `;
    }

    async function copyText(value) {
        try {
            await navigator.clipboard.writeText(String(value || ''));
            playerStatus.textContent = 'source url copied';
        } catch {
            playerStatus.textContent = 'could not copy source url';
        }
    }

    async function launchSelected({ direct = false } = {}) {
        const entry = getSelectedGame();
        if (!entry) return;

        state.lastError = '';
        setBusy(true, direct ? `opening ${entry.title} directly...` : `preparing ${entry.title} inside rift...`);
        renderSummaryStrip();
        renderLaunchPanel();

        try {
            if (!direct) {
                await prepareProxyMode();
            }

            const nextUrl = direct ? entry.url : buildEmbedUrl(entry.url);
            state.lastLaunch = {
                id: entry.id,
                at: Date.now(),
                mode: direct ? 'direct' : state.proxyMode,
                url: nextUrl,
            };
            try {
                localStorage.setItem('rift__cloud-last-game', entry.id);
            } catch {}
            window.location.assign(nextUrl);
        } catch (error) {
            state.lastError = error?.message || 'rift could not start this cloud session';
            setBusy(false, state.lastError);
            renderSummaryStrip();
            renderLaunchPanel();
        }
    }

    function bindEvents() {
        search.addEventListener('input', () => {
            state.query = search.value || '';
            renderGrid();
        });

        filterHost.addEventListener('click', (event) => {
            const button = event.target.closest('[data-cloud-filter]');
            if (!button) return;
            state.filter = button.dataset.cloudFilter || 'all';
            renderFilters();
            renderGrid();
        });

        grid.addEventListener('click', (event) => {
            const card = event.target.closest('[data-cloud-id]');
            if (card?.dataset.cloudId) {
                state.selectedId = card.dataset.cloudId;
            }

            const launchButton = event.target.closest('[data-cloud-launch]');
            if (launchButton) {
                state.selectedId = launchButton.dataset.cloudLaunch || state.selectedId;
                renderGrid();
                renderDetailCard();
                renderLaunchPanel();
                launchSelected({ direct: false });
                return;
            }

            const selectButton = event.target.closest('[data-cloud-select]');
            if (selectButton) {
                state.selectedId = selectButton.dataset.cloudSelect || state.selectedId;
            }

            renderGrid();
            renderDetailCard();
            renderLaunchPanel();
        });

        sessionLinks.addEventListener('click', (event) => {
            const launchButton = event.target.closest('[data-cloud-launch]');
            if (launchButton) {
                event.preventDefault();
                launchSelected({ direct: false });
                return;
            }

            const directButton = event.target.closest('[data-cloud-direct]');
            if (directButton) {
                event.preventDefault();
                launchSelected({ direct: true });
                return;
            }

            const copyButton = event.target.closest('[data-cloud-copy]');
            if (copyButton) {
                event.preventDefault();
                copyText(copyButton.dataset.cloudCopy || '');
            }
        });

        requestSessionBtn.addEventListener('click', () => {
            launchSelected({ direct: false });
        });

        endSessionBtn.addEventListener('click', () => {
            launchSelected({ direct: true });
        });

        refreshStatusBtn.addEventListener('click', async () => {
            state.lastError = '';
            setBusy(false, 'refreshing launch route...');
            try {
                await prepareProxyMode();
            } catch {
                state.proxyMode = 'uv';
            }
            renderSummaryStrip();
            renderDetailCard();
            renderLaunchPanel();
            setBusy(false, 'route ready: ultraviolet / wisp');
        });
    }

    function restoreLastGame() {
        try {
            const saved = localStorage.getItem('rift__cloud-last-game');
            if (saved && catalog.some((entry) => entry.id === saved)) {
                state.selectedId = saved;
            }
        } catch {}
    }

    function init() {
        restoreLastGame();
        updateActionLabels();
        bindEvents();
        renderFilters();
        renderGrid();
        renderDetailCard();
        renderSummaryStrip();
        renderLaunchPanel();
    }

    init();
})();
