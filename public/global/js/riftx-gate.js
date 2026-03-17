(function () {
    if (window.RiftXGate) return;

    const STORAGE_KEY = 'rift__x-mode';
    const UI_STYLE_ID = 'riftx-mode-style';
    const SWAP_BUTTON_ID = 'riftx-mode-swap';
    const MODAL_ID = 'riftx-mode-modal';
    const ROUTE_KEYS = new Set(['/', '/chat', '/account', '/nova', '/nova/chat', '/nova/account']);

    function normalizeMode(value) {
        return String(value || '').trim().toLowerCase() === 'nova' ? 'nova' : 'rift';
    }

    function normalizePathname(pathname) {
        const value = String(pathname || '/').trim();
        if (!value || value === '/') return '/';
        return value.replace(/\/+$/, '') || '/';
    }

    function getStoredMode() {
        try {
            return normalizeMode(localStorage.getItem(STORAGE_KEY));
        } catch {
            return 'rift';
        }
    }

    function getQueryMode() {
        try {
            const params = new URLSearchParams(String(window.location.search || ''));
            return params.get('rx') === 'nova' ? 'nova' : 'rift';
        } catch {
            return 'rift';
        }
    }

    function getPathMode() {
        const path = normalizePathname(window.location.pathname);
        return path === '/nova' || path.startsWith('/nova/') ? 'nova' : 'rift';
    }

    function getCurrentMode() {
        const pathMode = getPathMode();
        if (pathMode === 'nova') return 'nova';
        const queryMode = getQueryMode();
        if (queryMode === 'nova') return 'nova';
        return getStoredMode();
    }

    function writeMode(mode) {
        const next = normalizeMode(mode);
        try {
            localStorage.setItem(STORAGE_KEY, next);
        } catch {
        }
        return next;
    }

    function removeRxParam(search) {
        const params = new URLSearchParams(String(search || ''));
        params.delete('rx');
        const next = params.toString();
        return next ? `?${next}` : '';
    }

    function resolveRouteForMode(targetMode, pathname = window.location.pathname, search = window.location.search) {
        const mode = normalizeMode(targetMode);
        const path = normalizePathname(pathname);
        const cleanSearch = removeRxParam(search);

        if (path === '/chat' || path === '/nova/chat') {
            return mode === 'nova' ? `/nova/chat${cleanSearch}` : `/chat${cleanSearch}`;
        }
        if (path === '/account' || path === '/nova/account' || path === '/nova') {
            return mode === 'nova' ? '/nova/account' : '/account';
        }
        if (path === '/') {
            return mode === 'nova' ? '/nova' : '/';
        }
        return `${path}${cleanSearch}`;
    }

    function rewriteModeAwareHref(rawHref, mode) {
        const value = String(rawHref || '').trim();
        if (!value) return value;
        try {
            const url = new URL(value, window.location.origin);
            if (url.origin !== window.location.origin) return value;
            const path = normalizePathname(url.pathname);
            if (!ROUTE_KEYS.has(path)) return value;
            return resolveRouteForMode(mode, path, url.search);
        } catch {
            return value;
        }
    }

    function rewriteModeAwareOnclick(rawOnclick, mode) {
        const source = String(rawOnclick || '');
        if (!source || !/location\.href\s*=/.test(source)) return source;
        return source.replace(/location\.href\s*=\s*(['"])([^'"]+)\1/g, (full, quote, href) => {
            const nextHref = rewriteModeAwareHref(href, mode);
            return `location.href=${quote}${nextHref}${quote}`;
        });
    }

    function applyModePresentation() {
        if (!document.body) return;
        const mode = getCurrentMode();
        document.body.classList.toggle('rx-mode-nova', mode === 'nova');
        document.body.dataset.rxMode = mode;
    }

    function retargetModeAwareLinks(root = document) {
        const mode = getCurrentMode();
        const nodes = root.querySelectorAll('a[href], [onclick]');
        nodes.forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            if (node instanceof HTMLAnchorElement) {
                const currentHref = node.getAttribute('href');
                const nextHref = rewriteModeAwareHref(currentHref, mode);
                if (nextHref && nextHref !== currentHref) node.setAttribute('href', nextHref);
            }
            const onclick = node.getAttribute('onclick');
            if (!onclick) return;
            const nextOnclick = rewriteModeAwareOnclick(onclick, mode);
            if (nextOnclick !== onclick) node.setAttribute('onclick', nextOnclick);
        });
    }

    function ensureStyle() {
        if (document.getElementById(UI_STYLE_ID)) return;
        const style = document.createElement('style');
        style.id = UI_STYLE_ID;
        style.textContent = `
            .riftx-mode-swap {
                position: fixed;
                top: 12px;
                right: 12px;
                z-index: 13010;
                border-radius: 999px;
                border: 1px solid rgba(255,255,255,.22);
                background: rgba(10,14,20,.72);
                color: rgba(255,255,255,.9);
                padding: 7px 12px;
                min-height: 34px;
                font-family: "Run", Arial, sans-serif;
                font-size: 10px;
                text-transform: lowercase;
                letter-spacing: .08em;
                cursor: pointer;
                backdrop-filter: blur(8px);
                transition: background .2s ease, border-color .2s ease, transform .2s ease;
            }
            .riftx-mode-swap:hover {
                background: rgba(24,30,40,.82);
                border-color: rgba(255,255,255,.45);
                transform: translateY(-1px);
            }
            body.rx-mode-nova .riftx-mode-swap {
                background: rgba(31,21,46,.74);
                border-color: rgba(203,165,255,.34);
            }
            .riftx-mode-modal {
                position: fixed;
                inset: 0;
                z-index: 24010;
                display: none;
                place-items: center;
                background: rgba(0,0,0,.62);
                backdrop-filter: blur(8px);
            }
            .riftx-mode-modal.active {
                display: grid;
            }
            .riftx-mode-card {
                width: min(440px, 92vw);
                border-radius: 18px;
                border: 1px solid rgba(255,255,255,.2);
                background:
                    linear-gradient(150deg, rgba(23,26,34,.94), rgba(14,16,24,.96)),
                    radial-gradient(circle at 20% 0%, rgba(142,203,255,.16), rgba(142,203,255,0) 52%);
                box-shadow: 0 24px 60px rgba(0,0,0,.46);
                padding: 20px;
                text-align: center;
            }
            body.rx-mode-nova .riftx-mode-card {
                background:
                    linear-gradient(150deg, rgba(33,22,48,.94), rgba(18,12,30,.96)),
                    radial-gradient(circle at 20% 0%, rgba(197,156,255,.18), rgba(197,156,255,0) 54%);
            }
            .riftx-mode-card h2 {
                margin: 0;
                font-size: 20px;
                text-transform: lowercase;
                color: rgba(255,255,255,.94);
                letter-spacing: .08em;
            }
            .riftx-mode-card p {
                margin: 10px 0 0;
                font-size: 12px;
                color: rgba(255,255,255,.72);
                text-transform: lowercase;
                letter-spacing: .06em;
                line-height: 1.5;
            }
            .riftx-mode-actions {
                margin-top: 16px;
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }
            .riftx-mode-btn {
                border-radius: 12px;
                border: 1px solid rgba(255,255,255,.26);
                background: rgba(255,255,255,.08);
                color: rgba(255,255,255,.94);
                padding: 12px 10px;
                font-family: "Run", Arial, sans-serif;
                font-size: 13px;
                text-transform: lowercase;
                letter-spacing: .08em;
                cursor: pointer;
                transition: transform .2s ease, background .2s ease, border-color .2s ease;
            }
            .riftx-mode-btn:hover {
                transform: translateY(-1px);
                background: rgba(255,255,255,.16);
                border-color: rgba(255,255,255,.46);
            }
            .riftx-mode-btn.is-active {
                border-color: rgba(255,255,255,.52);
                background: rgba(255,255,255,.18);
            }
        `;
        document.head.appendChild(style);
    }

    function closeModeModal() {
        const modal = document.getElementById(MODAL_ID);
        if (modal) modal.classList.remove('active');
    }

    function syncUiLabels() {
        const mode = getCurrentMode();
        const button = document.getElementById(SWAP_BUTTON_ID);
        if (button) {
            button.textContent = mode === 'nova' ? 'nova mode' : 'rift mode';
            button.setAttribute('aria-label', `Current mode: ${mode}. Click to switch.`);
            button.title = `Current mode: ${mode}`;
        }
        const modal = document.getElementById(MODAL_ID);
        if (!modal) return;
        modal.querySelectorAll('[data-riftx-mode-choice]').forEach((node) => {
            if (!(node instanceof HTMLElement)) return;
            const choice = normalizeMode(node.getAttribute('data-riftx-mode-choice'));
            node.classList.toggle('is-active', choice === mode);
        });
    }

    function refreshModeUi(root = document) {
        applyModePresentation();
        retargetModeAwareLinks(root);
        syncUiLabels();
    }

    function ensureUi() {
        if (!document.body) return;
        ensureStyle();

        let swap = document.getElementById(SWAP_BUTTON_ID);
        if (!swap) {
            swap = document.createElement('button');
            swap.type = 'button';
            swap.id = SWAP_BUTTON_ID;
            swap.className = 'riftx-mode-swap';
            document.body.appendChild(swap);
            swap.addEventListener('click', () => {
                const modal = document.getElementById(MODAL_ID);
                if (modal) modal.classList.add('active');
            });
        }

        let modal = document.getElementById(MODAL_ID);
        if (!modal) {
            modal = document.createElement('div');
            modal.id = MODAL_ID;
            modal.className = 'riftx-mode-modal';
            modal.innerHTML = `
                <div class="riftx-mode-card" role="dialog" aria-modal="true" aria-labelledby="riftxModeTitle">
                    <h2 id="riftxModeTitle">switch workspace mode</h2>
                    <p>rift keeps the standard shell. nova redirects account and chat into the restored nova routes and keeps the rest of the site mode-aware.</p>
                    <div class="riftx-mode-actions">
                        <button type="button" class="riftx-mode-btn" data-riftx-mode-choice="rift">rift</button>
                        <button type="button" class="riftx-mode-btn" data-riftx-mode-choice="nova">nova</button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            modal.addEventListener('click', (event) => {
                const target = event.target instanceof HTMLElement ? event.target : null;
                if (!target) return;
                if (target === modal) {
                    closeModeModal();
                    return;
                }
                const choiceNode = target.closest('[data-riftx-mode-choice]');
                if (!(choiceNode instanceof HTMLElement)) return;
                window.RiftXMode.set(choiceNode.getAttribute('data-riftx-mode-choice'));
                closeModeModal();
            });
        }

        syncUiLabels();
    }

    function setMode(nextMode, options = {}) {
        const mode = writeMode(nextMode);
        refreshModeUi();
        const navigate = options && Object.prototype.hasOwnProperty.call(options, 'navigate')
            ? !!options.navigate
            : true;
        if (!navigate) return mode;

        const nextHref = resolveRouteForMode(mode);
        const currentHref = `${normalizePathname(window.location.pathname)}${removeRxParam(window.location.search)}`;
        if (nextHref !== currentHref) {
            window.location.assign(nextHref);
        }
        return mode;
    }

    window.RiftXMode = {
        get() {
            return getCurrentMode();
        },
        set(mode, options = {}) {
            return setMode(mode, options);
        },
        toggle(options = {}) {
            return setMode(getCurrentMode() === 'nova' ? 'rift' : 'nova', options);
        },
        resolveHref(href, mode = getCurrentMode()) {
            return rewriteModeAwareHref(href, mode);
        },
    };

    window.RiftXGate = {
        enabled: true,
        reason: 'mode-controller',
    };

    function boot() {
        if (getQueryMode() === 'nova') {
            writeMode('nova');
        }
        ensureUi();
        refreshModeUi();
        if (document.body && !document.body.dataset.riftxObserverBound) {
            document.body.dataset.riftxObserverBound = '1';
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.addedNodes.forEach((node) => {
                        if (!(node instanceof HTMLElement)) return;
                        if (node.matches('a[href], [onclick]')) {
                            retargetModeAwareLinks(node.parentElement || node);
                            return;
                        }
                        if (node.querySelector?.('a[href], [onclick]')) {
                            retargetModeAwareLinks(node);
                        }
                    });
                });
            });
            observer.observe(document.body, { childList: true, subtree: true });
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    window.addEventListener('storage', (event) => {
        if (event.key !== STORAGE_KEY) return;
        refreshModeUi();
    });
})();
