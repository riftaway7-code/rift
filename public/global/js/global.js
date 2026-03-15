const RIFT_APPEARANCE = {
    THEME_KEY: 'rift__theme',
    RAIN_KEY: 'rift__rain-enabled',
    PERFORMANCE_KEY: 'rift__performance-mode',
    NAV_POSITION_KEY: 'rift__nav-position',
    CUSTOM_THEME_KEY: 'rift__theme-custom-v1',
    PERFORMANCE_PROMPT_SESSION_KEY: 'rift__performance-prompt-seen-v1',
    DEFAULT_THEME: 'midnight',
    THEMES: [
        'midnight', 'ocean', 'emerald', 'sunset', 'rose', 'violet',
        'amber', 'crimson', 'arctic', 'graphite', 'neon', 'cobalt'
    ],
};

const RIFT_LAYOUT_EDITOR = {
    STORAGE_PREFIX: 'rift__page-layout-v1::',
    MENU_ID: 'rift-layout-menu',
    BANNER_ID: 'rift-layout-banner',
    ACTIVE_CLASS: 'rift-layout-edit-mode',
    EDITABLE_CLASS: 'rift-layout-editable',
    CUSTOMIZED_CLASS: 'rift-layout-customized',
    DRAGGING_CLASS: 'rift-layout-dragging',
};

const RiftLayoutState = {
    active: false,
    initialized: false,
    menu: null,
    banner: null,
    trigger: null,
    candidates: [],
    drag: null,
};

const RIFT_UI = {
    RECENT_KEY: 'rift__recent-pages-v1',
    PINNED_KEY: 'rift__pinned-pages-v1',
    REDUCED_EFFECTS_KEY: 'rift__reduced-effects-v1',
    ROUTES: [
        { href: '/', label: 'home', icon: 'home', section: 'workspace', keywords: 'launch dashboard landing start recent pinned' },
        { href: '/games', label: 'games', icon: 'sports_esports', section: 'arcade', keywords: 'arcade vault library trending' },
        { href: '/apps', label: 'apps', icon: 'apps', section: 'tools', keywords: 'apps cheats tools utilities' },
        { href: '/music', label: 'music', icon: 'library_music', section: 'media', keywords: 'music player playlists favorites tracks' },
        { href: '/soundboard', label: 'soundboard', icon: 'graphic_eq', section: 'media', keywords: 'sounds buttons memes reactions clips' },
        { href: '/cloud', label: 'cloud', icon: 'cloud', section: 'cloud', keywords: 'cloud gaming streaming nowgg instant play launcher mobile' },
        { href: '/chat', label: 'chat', icon: 'forum', section: 'social', keywords: 'messages dm rooms call friends' },
        { href: '/browser', label: 'browser', icon: 'language', section: 'tools', keywords: 'browser proxy tabs console web' },
        { href: '/account', label: 'account', icon: 'person', section: 'identity', keywords: 'profile account login presets sync' },
        { href: '/settings', label: 'settings', icon: 'settings', section: 'system', keywords: 'preferences theme performance layout rain' },
        { href: '/credits', label: 'credits', icon: 'handshake', section: 'info', keywords: 'credits acknowledgements contributors' },
        { href: '/rift_media', label: 'rift media', icon: 'movie', section: 'media', keywords: 'videos media streaming' },
        { href: '/social-media-&-partners', label: 'credits + partners', icon: 'connect_without_contact', section: 'info', keywords: 'credits partners social links' },
        { href: '/os', label: 'rift os', icon: 'desktop_windows', section: 'system', keywords: 'desktop os launcher shell' },
    ],
    PAGE_META: {
        '/': { subtitle: '', kicker: 'workspace', accent: 'home' },
        '/games': { subtitle: 'jump straight into the arcade stack', kicker: 'arcade', accent: 'games' },
        '/apps': { subtitle: 'tools, utilities, and helper surfaces', kicker: 'tools', accent: 'apps' },
        '/music': { subtitle: 'tracks, playlists, and saved listening', kicker: 'media', accent: 'music' },
        '/soundboard': { subtitle: 'stacked sound libraries and quick preview pads', kicker: 'media', accent: 'soundboard' },
        '/cloud': { subtitle: 'launch now.gg sessions through Rift\'s UV route', kicker: 'cloud', accent: 'cloud' },
        '/chat': { subtitle: 'rooms, dms, and live status', kicker: 'social', accent: 'chat' },
        '/browser': { subtitle: 'tabs, console, and proxied browsing', kicker: 'browser', accent: 'browser' },
        '/account': { subtitle: 'identity, progress, and presets', kicker: 'identity', accent: 'account' },
        '/settings': { subtitle: 'appearance, performance, and behavior', kicker: 'system', accent: 'settings' },
        '/credits': { subtitle: 'contributors, acknowledgements, and project context', kicker: 'info', accent: 'partners' },
        '/rift_media': { subtitle: 'streaming and embedded media surfaces', kicker: 'media', accent: 'media' },
        '/social-media-&-partners': { subtitle: 'outbound links, socials, and credits', kicker: 'info', accent: 'partners' },
        '/os': { subtitle: 'desktop shell and system experiments', kicker: 'system', accent: 'os' },
    },
};

const RiftUiState = {
    shellReady: false,
    paletteOpen: false,
    drawerOpen: false,
    contextMenuOpen: false,
    contextMenuPayload: null,
    auth: { authenticated: false, username: '', clientMode: 'rift' },
};

const RIFT_RELEASE = {
    version: '2.3.38',
    notes: [
        'reworked the UV cloud launcher into a Frogies-style apex-domain iframe shell so now.gg stays inside Rift instead of moving the whole tab onto the encoded UV document',
        'switched Roblox cloud launch back to the generic nowgg.fun launcher and removed the broken in-page resolver hop from the Rift cloud flow',
        'switched Rift\'s UV asset recovery from fragile request-referrer guessing to service-worker client tracking so escaped now.gg chunk, css, image, and oapi requests inherit the active UV page context instead of falling back to local 404 HTML',
        'taught the root Rift service worker to recognize same-origin now.gg asset and API requests escaping a UV page and re-route them back through the UV prefix so Next.js CSS, JS, media, and oapi calls stop falling into local 404 HTML',
        'added a dedicated Ultraviolet runtime under /uv, wired it to Rift\'s Wisp-backed BareMux transport, and moved now.gg cloud launches onto that UV route while leaving TinyJet and Scramjet in place for the rest of Rift',
        'forced the tinyjet service worker to skip waiting, claim pages immediately, and bypass cache on registration so HTML response fixes take effect without stale worker lag',
        'taught the tinyjet service worker to relabel mis-tagged iframe and document HTML responses as text/html so nowgg pages stop rendering as raw source',
        'wrapped tinyjet epoxy transport with a header normalizer so BareMux and Scramjet requests stop crashing on plain-object header maps',
        'switched tinyjet cloud launches off libcurl and back onto epoxy transport so nowgg sessions no longer fail on libcurl wasm bootstrap',
        'forced tinyjet to push its Scramjet prefix and file config into the active service worker before opening a cloud target so stale /scramjet config cannot survive across reloads',
        'moved tinyjet Scramjet traffic under /tinyjet/scramjet and added a one-time service-worker takeover reload so encoded cloud URLs stay inside tinyjet\'s worker scope',
        'switched Roblox cloud launch from the 404ing generic now.gg path to the currently working 159.ip.nowgg.fun session host',
        'reverted Roblox cloud launches from the dead hard-coded 108.ip.nowgg.fun host back to the live generic now.gg launcher URL',
        'fixed tinyjet BareMux startup by switching its worker path to the absolute /tinyjet/bareworker.js URL required by bare-mux v2',
        'replaced tinyjet cloud-launch CDN dependencies with local Scramjet, BareMux, libcurl, and wasm files so the tinyjet shell can boot on Rift deployments',
        'switched Rift cloud launches over to the existing tinyjet shell so nowgg sessions use the proxy stack that already initializes BareMux correctly',
        'moved the Scramjet runtime onto /assets/scramjet so cloud pages bypass stale service-worker proxying even before the new worker activates',
        'stopped the Rift service worker from proxying internal Scramjet, BareMux, libcurl, wisp, and embed assets so the cloud runtime can load without 500 loops',
        'vendored the Scramjet runtime into public/scramjet and fixed its config paths so cloud embed pages no longer depend on the server alias into node_modules',
        'corrected Rift cloud launches to use the real embed.html entrypoint instead of the missing /embed clean route',
        'changed Rift cloud launches to open nowgg titles through the dedicated embed shell so BareMux transport stays alive while the proxied session starts',
        'blocked nowgg cloud launches from falling back to Rift\'s plain compatibility proxy because that path breaks nowgg\'s Next.js asset loader',
        'changed Roblox cloud launch to target the resolved 108.ip.nowgg.fun session host directly instead of the generic nowgg launcher page',
        'reworked Rift cloud so supported nowgg games launch through Rift\'s top-level proxy route instead of the old nested cloud player',
        'changed the cloud bootstrap panel to show copyable Moonlight and Tailscale host values instead of relying on a placeholder deep link',
        'replaced the old nowgg cloud page with a Rift-native host queue and bootstrap panel for Sunshine and Moonlight sessions',
        'added backend cloud-control endpoints for host registration, heartbeats, session requests, and stream bootstrap',
        'restored the roblox direct cloud url to nowgg.fun while keeping the fern-style launcher handoff',
        'switched the roblox direct cloud url to now.gg to match the working fern launch path',
        'changed roblox cloud launch to pass both the nowgg launcher url and session target through the Rift browser runner',
        'changed roblox cloud launch to use the Rift browser proxy runner instead of the blocked nowgg embed path',
        'made the wisp transport probe more tolerant on hosted deployments by using a longer socket check and http fallback',
        'wired a real node-side wisp websocket server onto /wisp/ for Rift deployments that support upgrades',
        'restored a real embed shell so in-rift cloud play uses scramjet instead of the plain proxy',
        'added in-rift cloud play so nowgg sessions can launch inside Rift',
        'changed cloud launches to open direct nowgg sessions instead of truffled wrappers',
        'added a dedicated cloud launcher page for nowgg-backed games',
        'added cloud to the main home and bottom nav surfaces',
        'removed the grub startup and made welcome to rift tap-friendly on mobile',
        'removed the old whats new popup from home',
        'added a global command palette and quick settings drawer',
        'added saved page editing so users can move controls around per page',
        'added a custom right-click menu with Rift actions',
        'added a desktop context shell with live current-page and session info',
        'added a workspace home layout with better shared UI structure',
        'added the dedicated soundboard page and broader nav access',
        'improved browser tools with the side console panel',
        'improved startup performance handling and reduced-effects controls',
    ],
};

function normalizeHexColor(value, fallback = '#8ecbff') {
    const raw = String(value || '').trim().toLowerCase();
    const short = raw.match(/^#([0-9a-f]{3})$/i);
    if (short) {
        const [a, b, c] = short[1].split('');
        return `#${a}${a}${b}${b}${c}${c}`;
    }
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    return fallback;
}

function hexToRgb(value) {
    const hex = normalizeHexColor(value);
    const parsed = hex.replace('#', '');
    const r = Number.parseInt(parsed.slice(0, 2), 16);
    const g = Number.parseInt(parsed.slice(2, 4), 16);
    const b = Number.parseInt(parsed.slice(4, 6), 16);
    return { r, g, b };
}

function rgbaFromHex(value, alpha = 1) {
    const rgb = hexToRgb(value);
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function readCustomTheme() {
    try {
        const raw = localStorage.getItem(RIFT_APPEARANCE.CUSTOM_THEME_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return null;
        return {
            bg: normalizeHexColor(parsed.bg, '#050608'),
            glow: normalizeHexColor(parsed.glow, '#2b3a47'),
            accent: normalizeHexColor(parsed.accent, '#8ecbff'),
            text: normalizeHexColor(parsed.text, '#ffffff'),
        };
    } catch {
        return null;
    }
}

function readStoredRiftPreferences() {
    const rawTheme = String(localStorage.getItem(RIFT_APPEARANCE.THEME_KEY) || RIFT_APPEARANCE.DEFAULT_THEME).toLowerCase();
    return {
        theme: RIFT_APPEARANCE.THEMES.includes(rawTheme) ? rawTheme : RIFT_APPEARANCE.DEFAULT_THEME,
        rainEnabled: localStorage.getItem(RIFT_APPEARANCE.RAIN_KEY) === 'true',
        performanceMode: localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true',
        navPosition: localStorage.getItem(RIFT_APPEARANCE.NAV_POSITION_KEY) || 'bottom',
        customTheme: readCustomTheme(),
    };
}

function applyRiftAppearance() {
    if (!document.body) return null;

    const prefs = readStoredRiftPreferences();

    // Apply performance mode first so the page can disable heavy effects early.
    document.body.classList.toggle('performance-mode', prefs.performanceMode);
    document.body.classList.toggle('rain-disabled', prefs.performanceMode || !prefs.rainEnabled);

    for (const cls of Array.from(document.body.classList)) {
        if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    }
    document.body.classList.add(`theme-${prefs.theme}`);

    if (prefs.customTheme) {
        document.body.style.setProperty('--rift-bg-base', prefs.customTheme.bg);
        document.body.style.setProperty('--rift-bg-glow-1', rgbaFromHex(prefs.customTheme.glow, 0.26));
        document.body.style.setProperty('--rift-bg-glow-2', rgbaFromHex(prefs.customTheme.glow, 0.18));
        document.body.style.setProperty('--rift-accent', prefs.customTheme.accent);
        document.body.style.setProperty('--rift-accent-soft', rgbaFromHex(prefs.customTheme.accent, 0.3));
        document.body.style.setProperty('--rift-text', rgbaFromHex(prefs.customTheme.text, 0.94));
        document.body.style.setProperty('--rift-text-dim', rgbaFromHex(prefs.customTheme.text, 0.68));
    } else {
        document.body.style.removeProperty('--rift-bg-base');
        document.body.style.removeProperty('--rift-bg-glow-1');
        document.body.style.removeProperty('--rift-bg-glow-2');
        document.body.style.removeProperty('--rift-accent');
        document.body.style.removeProperty('--rift-accent-soft');
        document.body.style.removeProperty('--rift-text');
        document.body.style.removeProperty('--rift-text-dim');
    }

    for (const cls of Array.from(document.body.classList)) {
        if (cls.startsWith('nav-pos-')) document.body.classList.remove(cls);
    }
    document.body.classList.add(`nav-pos-${prefs.navPosition}`);

    return prefs;
}

function applyReducedEffectsPreference() {
    if (!document.body) return false;
    const enabled = localStorage.getItem(RIFT_UI.REDUCED_EFFECTS_KEY) === 'true';
    document.body.classList.toggle('reduced-effects', enabled);
    return enabled;
}

if (document.body) {
    applyRiftAppearance();
    applyReducedEffectsPreference();
} else {
    document.addEventListener('DOMContentLoaded', () => {
        applyRiftAppearance();
        applyReducedEffectsPreference();
    }, { once: true });
}

window.addEventListener('storage', (event) => {
    if (
        event.key === RIFT_APPEARANCE.THEME_KEY ||
        event.key === RIFT_APPEARANCE.RAIN_KEY ||
        event.key === RIFT_APPEARANCE.PERFORMANCE_KEY ||
        event.key === RIFT_APPEARANCE.NAV_POSITION_KEY ||
        event.key === RIFT_APPEARANCE.CUSTOM_THEME_KEY ||
        event.key === RIFT_UI.REDUCED_EFFECTS_KEY
    ) {
        const prefs = applyRiftAppearance();
        applyReducedEffectsPreference();
        decorateBottomNav(document.querySelector('.bottom-nav'), prefs?.navPosition || 'bottom');
        syncRiftUiShell();
    }
});

window.RiftAppearance = {
    ...RIFT_APPEARANCE,
    apply: applyRiftAppearance,
    setTheme(theme) {
        const next = String(theme || '').toLowerCase();
        localStorage.setItem(this.THEME_KEY, this.THEMES.includes(next) ? next : this.DEFAULT_THEME);
        localStorage.removeItem(this.CUSTOM_THEME_KEY);
        this.apply();
        syncRiftUiShell();
    },
    setRainEnabled(enabled) {
        localStorage.setItem(this.RAIN_KEY, enabled ? 'true' : 'false');
        this.apply();
        syncRiftUiShell();
    },
    setPerformanceMode(enabled) {
        localStorage.setItem(this.PERFORMANCE_KEY, enabled ? 'true' : 'false');
        this.apply();
        syncRiftUiShell();
    },
    getCustomTheme() {
        return readCustomTheme();
    },
    setCustomTheme(custom) {
        const payload = {
            bg: normalizeHexColor(custom?.bg, '#050608'),
            glow: normalizeHexColor(custom?.glow, '#2b3a47'),
            accent: normalizeHexColor(custom?.accent, '#8ecbff'),
            text: normalizeHexColor(custom?.text, '#ffffff'),
        };
        localStorage.setItem(this.CUSTOM_THEME_KEY, JSON.stringify(payload));
        this.apply();
        syncRiftUiShell();
        return payload;
    },
    clearCustomTheme() {
        localStorage.removeItem(this.CUSTOM_THEME_KEY);
        this.apply();
        syncRiftUiShell();
    },
};

window.RiftUI = {
    openCommandPalette() {
        openRiftCommandPalette();
    },
    openQuickSettings() {
        openRiftQuickSettings();
    },
    togglePinnedRoute(href) {
        togglePinnedRoute(href || getCurrentPath());
    },
    setReducedEffects(enabled) {
        localStorage.setItem(RIFT_UI.REDUCED_EFFECTS_KEY, enabled ? 'true' : 'false');
        applyReducedEffectsPreference();
        syncRiftUiShell();
    },
};

const RIFT_BOOT = {
    SESSION_KEY: 'rift__boot-screen-shown-v1',
    FADE_MS: 520,
};

function mountRiftBootScreen() {
    if (!document.body) return;
    if (localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true') return;
    if (sessionStorage.getItem(RIFT_BOOT.SESSION_KEY) === 'true') return;
    sessionStorage.setItem(RIFT_BOOT.SESSION_KEY, 'true');

    const boot = document.createElement('div');
    boot.className = 'rift-boot-screen';
    boot.setAttribute('aria-hidden', 'true');
    boot.innerHTML = `
        <div class="rift-boot-grid"></div>
        <div class="rift-boot-content">
            <div class="rift-boot-stage rift-boot-stage-welcome is-active">
                <div class="rift-boot-logo">Welcome to Rift</div>
                <div class="rift-boot-subtitle">powered by scramjet</div>
                <div class="rift-boot-subtitle">inspired by infamous</div>
                <div class="rift-boot-cta">tap, click, or press space to jump in</div>
            </div>
        </div>
    `;

    document.body.classList.add('rift-boot-active');
    document.body.appendChild(boot);
    let dismissed = false;

    function onBootKeyDown(event) {
        if ((event.key === ' ' || event.code === 'Space' || event.key === 'Enter') && !event.repeat) {
            event.preventDefault();
            dismiss();
        }
    }

    function onBootPointer(event) {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        if (target.closest('a, button, input, textarea, select')) return;
        dismiss();
    }

    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        document.removeEventListener('keydown', onBootKeyDown, true);
        boot.removeEventListener('pointerup', onBootPointer, true);
        boot.classList.add('is-exiting');
        document.body.classList.remove('rift-boot-active');
        window.setTimeout(() => boot.remove(), RIFT_BOOT.FADE_MS);
    }

    requestAnimationFrame(() => {
        boot.classList.add('is-visible');
    });

    document.addEventListener('keydown', onBootKeyDown, true);
    boot.addEventListener('pointerup', onBootPointer, true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountRiftBootScreen, { once: true });
} else {
    mountRiftBootScreen();
}

function extractNavHref(button) {
    const raw = String(button?.getAttribute('onclick') || '').trim();
    const match = raw.match(/location\.href\s*=\s*['"]([^'"]+)['"]/i);
    return String(match?.[1] || '').trim();
}

function resolveNavPageLabel(nav) {
    const labels = {
        '/': 'home',
        '/games': 'games',
        '/apps': 'apps',
        '/music': 'music',
        '/soundboard': 'soundboard',
        '/cloud': 'cloud',
        '/chat': 'chat',
        '/browser': 'browser',
        '/account': 'account',
        '/settings': 'settings',
        '/social-media-&-partners': 'partners',
        '/rift_media': 'media',
        '/os': 'os',
    };

    const active = nav?.querySelector('.nav-button.active');
    const href = extractNavHref(active) || window.location.pathname || '/';
    const normalized = href.length > 1 ? href.replace(/\/+$/, '') : href;

    if (labels[normalized]) return labels[normalized];

    const fallback = normalized
        .replace(/^\/+/, '')
        .replace(/[_-]+/g, ' ')
        .trim();

    return fallback || 'home';
}

function decorateBottomNav(nav, position) {
    if (!nav) return;

    const metaEnabled = position === 'top' || position === 'bottom';
    nav.classList.toggle('nav-meta-enabled', metaEnabled);

    let brand = nav.querySelector('.nav-meta-brand');
    if (!brand) {
        brand = document.createElement('div');
        brand.className = 'nav-meta nav-meta-brand';
        brand.setAttribute('aria-hidden', 'true');
        brand.innerHTML = '<span class="nav-brand-mark"></span><span class="nav-brand-text">rift</span>';
        nav.prepend(brand);
    }

    let page = nav.querySelector('.nav-meta-page');
    if (!page) {
        page = document.createElement('div');
        page.className = 'nav-meta nav-meta-page';
        page.innerHTML = '<span class="nav-page-caption">page</span><span class="nav-page-label"></span>';
        nav.append(page);
    }

    const label = resolveNavPageLabel(nav);
    const pageLabel = page.querySelector('.nav-page-label');
    if (pageLabel) pageLabel.textContent = label;
    page.setAttribute('role', 'button');
    page.setAttribute('tabindex', metaEnabled ? '0' : '-1');
    page.setAttribute('aria-label', `Customize ${label} page layout`);
    page.setAttribute('aria-expanded', 'false');
    page.title = 'Customize this page layout';
    nav.setAttribute('data-page-label', label);
    bindLayoutTrigger(page);
}

function getLayoutStorageKey() {
    const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    return `${RIFT_LAYOUT_EDITOR.STORAGE_PREFIX}${path}`;
}

function readStoredPageLayout() {
    try {
        const raw = localStorage.getItem(getLayoutStorageKey());
        if (!raw) return {};
        const parsed = JSON.parse(raw);
        return parsed && typeof parsed === 'object' ? parsed : {};
    } catch {
        return {};
    }
}

function writeStoredPageLayout(layout) {
    const entries = Object.entries(layout || {}).filter(([, value]) => {
        const x = Number(value?.x || 0);
        const y = Number(value?.y || 0);
        return Number.isFinite(x) && Number.isFinite(y) && (x !== 0 || y !== 0);
    });
    if (!entries.length) {
        localStorage.removeItem(getLayoutStorageKey());
        return;
    }
    localStorage.setItem(getLayoutStorageKey(), JSON.stringify(Object.fromEntries(entries)));
}

function getLayoutClassTokens(element) {
    if (!(element instanceof HTMLElement)) return [];
    const value = typeof element.className === 'string'
        ? element.className
        : String(element.getAttribute('class') || '');
    return value.split(/\s+/).map((token) => token.trim()).filter(Boolean);
}

function isEditableLayoutElement(element) {
    if (!(element instanceof HTMLElement)) return false;
    if (element.closest('.bottom-nav, .nav-toggle, .overlay-shade, .overlay-box, #rift-layout-menu, #rift-layout-banner, .nav-meta-brand, .nav-meta-page, .browser-console-output, .browser-console-runner')) return false;
    if (element.tagName === 'IFRAME' || element.id === 'browser-frame') return false;
    if (element.matches('html, body, script, style, link, meta')) return false;
    if (element.getClientRects().length === 0) return false;

    const rect = element.getBoundingClientRect();
    if (rect.width < 26 || rect.height < 20) return false;
    if (rect.width > window.innerWidth * 0.78 || rect.height > window.innerHeight * 0.48) return false;

    if (element.matches('button, [role="button"], a[href], input, select, textarea, label')) return true;

    const classTokens = getLayoutClassTokens(element);
    return classTokens.some((token) => /(btn|button|card|tile|chip|panel|control|shortcut|tab|item|badge|pill)/i.test(token));
}

function buildLayoutElementKey(element) {
    if (!(element instanceof HTMLElement)) return '';
    const parts = [];
    let current = element;

    while (current && current !== document.body) {
        let segment = current.tagName.toLowerCase();
        if (current.id) {
            segment += `#${current.id}`;
            parts.unshift(segment);
            break;
        }

        const classTokens = getLayoutClassTokens(current)
            .filter((token) => !token.startsWith('rift-layout-'))
            .slice(0, 2);
        if (classTokens.length) segment += `.${classTokens.join('.')}`;

        const parent = current.parentElement;
        if (parent) {
            const siblings = Array.from(parent.children).filter((child) => child.tagName === current.tagName);
            segment += `:nth-of-type(${siblings.indexOf(current) + 1})`;
        }
        parts.unshift(segment);
        current = current.parentElement;
    }

    return parts.join('>');
}

function collectEditableLayoutElements() {
    const selector = [
        'button',
        'a[href]',
        'input',
        'select',
        'textarea',
        'label',
        '[role="button"]',
        '[class*="btn"]',
        '[class*="button"]',
        '[class*="card"]',
        '[class*="tile"]',
        '[class*="chip"]',
        '[class*="panel"]',
        '[class*="control"]',
        '[class*="shortcut"]',
        '[class*="tab"]',
        '[class*="item"]',
        '[class*="badge"]',
    ].join(', ');
    return Array.from(document.querySelectorAll(selector)).filter(isEditableLayoutElement);
}

function applyLayoutOffset(element, offset) {
    const x = Number(offset?.x || 0);
    const y = Number(offset?.y || 0);
    if (!Number.isFinite(x) || !Number.isFinite(y) || (x === 0 && y === 0)) {
        clearLayoutOffset(element);
        return;
    }
    element.classList.add(RIFT_LAYOUT_EDITOR.CUSTOMIZED_CLASS);
    element.style.setProperty('--rift-layout-offset-x', `${x}px`);
    element.style.setProperty('--rift-layout-offset-y', `${y}px`);
}

function clearLayoutOffset(element) {
    if (!(element instanceof HTMLElement)) return;
    element.classList.remove(RIFT_LAYOUT_EDITOR.CUSTOMIZED_CLASS, RIFT_LAYOUT_EDITOR.DRAGGING_CLASS);
    element.style.removeProperty('--rift-layout-offset-x');
    element.style.removeProperty('--rift-layout-offset-y');
}

function refreshEditableLayoutElements() {
    RiftLayoutState.candidates.forEach((element) => {
        element.classList.remove(RIFT_LAYOUT_EDITOR.EDITABLE_CLASS, RIFT_LAYOUT_EDITOR.DRAGGING_CLASS);
    });
    RiftLayoutState.candidates = collectEditableLayoutElements();
    if (RiftLayoutState.active) {
        RiftLayoutState.candidates.forEach((element) => {
            element.classList.add(RIFT_LAYOUT_EDITOR.EDITABLE_CLASS);
        });
    }
    return RiftLayoutState.candidates;
}

function applyStoredPageLayout() {
    const layout = readStoredPageLayout();
    const candidates = refreshEditableLayoutElements();
    candidates.forEach((element) => {
        const key = buildLayoutElementKey(element);
        const offset = layout[key];
        if (offset) {
            applyLayoutOffset(element, offset);
        } else if (!RiftLayoutState.active) {
            element.classList.remove(RIFT_LAYOUT_EDITOR.EDITABLE_CLASS);
        }
    });
}

function ensureLayoutBanner() {
    let banner = document.getElementById(RIFT_LAYOUT_EDITOR.BANNER_ID);
    if (!banner) {
        banner = document.createElement('div');
        banner.id = RIFT_LAYOUT_EDITOR.BANNER_ID;
        banner.className = 'rift-layout-banner';
        banner.innerHTML = `
            <div class="rift-layout-banner-text">
                <strong>page edit mode</strong>
                <span>drag buttons, cards, and controls anywhere on this page.</span>
            </div>
            <div class="rift-layout-banner-actions">
                <button type="button" class="rift-layout-banner-btn" data-layout-action="finish">done</button>
                <button type="button" class="rift-layout-banner-btn" data-layout-action="reset">reset page</button>
            </div>
        `;
        document.body.appendChild(banner);
        banner.addEventListener('click', (event) => {
            const action = event.target instanceof HTMLElement ? event.target.getAttribute('data-layout-action') : null;
            if (action === 'finish') {
                setLayoutEditMode(false);
            }
            if (action === 'reset') {
                resetStoredPageLayout();
            }
        });
    }
    RiftLayoutState.banner = banner;
    return banner;
}

function updateLayoutBanner() {
    const banner = ensureLayoutBanner();
    banner.hidden = !RiftLayoutState.active;
}

function ensureLayoutMenu() {
    let menu = document.getElementById(RIFT_LAYOUT_EDITOR.MENU_ID);
    if (!menu) {
        menu = document.createElement('div');
        menu.id = RIFT_LAYOUT_EDITOR.MENU_ID;
        menu.className = 'rift-layout-menu';
        menu.hidden = true;
        menu.innerHTML = `
            <button type="button" class="rift-layout-menu-item" data-layout-action="toggle"></button>
            <button type="button" class="rift-layout-menu-item" data-layout-action="reset">reset this page</button>
        `;
        document.body.appendChild(menu);
        menu.addEventListener('click', (event) => {
            const action = event.target instanceof HTMLElement ? event.target.getAttribute('data-layout-action') : null;
            if (!action) return;
            if (action === 'toggle') {
                setLayoutEditMode(!RiftLayoutState.active);
            }
            if (action === 'reset') {
                resetStoredPageLayout();
            }
            closeLayoutMenu();
        });
    }
    RiftLayoutState.menu = menu;
    updateLayoutMenu();
    return menu;
}

function updateLayoutMenu() {
    const menu = RiftLayoutState.menu || document.getElementById(RIFT_LAYOUT_EDITOR.MENU_ID);
    if (!menu) return;
    const toggleButton = menu.querySelector('[data-layout-action="toggle"]');
    const resetButton = menu.querySelector('[data-layout-action="reset"]');
    const hasLayout = Object.keys(readStoredPageLayout()).length > 0;
    if (toggleButton) toggleButton.textContent = RiftLayoutState.active ? 'finish editing' : 'edit this page';
    if (resetButton) resetButton.disabled = !hasLayout;
}

function positionLayoutMenu(trigger) {
    const menu = ensureLayoutMenu();
    const rect = trigger.getBoundingClientRect();
    menu.hidden = false;
    menu.style.visibility = 'hidden';
    requestAnimationFrame(() => {
        const width = menu.offsetWidth || 180;
        const maxLeft = window.scrollX + document.documentElement.clientWidth - width - 12;
        const nextLeft = Math.max(12, Math.min(window.scrollX + rect.right - width, maxLeft));
        menu.style.left = `${nextLeft}px`;
        menu.style.top = `${window.scrollY + rect.bottom + 10}px`;
        menu.style.visibility = 'visible';
    });
}

function closeLayoutMenu() {
    const menu = RiftLayoutState.menu || document.getElementById(RIFT_LAYOUT_EDITOR.MENU_ID);
    if (!menu) return;
    menu.hidden = true;
    menu.style.visibility = 'hidden';
    if (RiftLayoutState.trigger) {
        RiftLayoutState.trigger.setAttribute('aria-expanded', 'false');
    }
    RiftLayoutState.trigger = null;
}

function openLayoutMenu(trigger) {
    RiftLayoutState.trigger = trigger;
    ensureLayoutMenu();
    updateLayoutMenu();
    trigger.setAttribute('aria-expanded', 'true');
    positionLayoutMenu(trigger);
}

function bindLayoutTrigger(trigger) {
    if (!(trigger instanceof HTMLElement) || trigger.dataset.riftLayoutBound === 'true') return;
    trigger.dataset.riftLayoutBound = 'true';
    trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const menu = ensureLayoutMenu();
        const alreadyOpen = !menu.hidden && RiftLayoutState.trigger === trigger;
        if (alreadyOpen) {
            closeLayoutMenu();
            return;
        }
        openLayoutMenu(trigger);
    });
    trigger.addEventListener('keydown', (event) => {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        trigger.click();
    });
}

function resolveEditableLayoutTarget(start) {
    let current = start instanceof HTMLElement ? start : null;
    while (current && current !== document.body) {
        if (isEditableLayoutElement(current)) return current;
        current = current.parentElement;
    }
    return null;
}

function setLayoutEditMode(active) {
    RiftLayoutState.active = !!active;
    document.body.classList.toggle(RIFT_LAYOUT_EDITOR.ACTIVE_CLASS, RiftLayoutState.active);
    refreshEditableLayoutElements();
    updateLayoutBanner();
    updateLayoutMenu();
}

function resetStoredPageLayout() {
    localStorage.removeItem(getLayoutStorageKey());
    refreshEditableLayoutElements().forEach((element) => {
        clearLayoutOffset(element);
    });
    updateLayoutMenu();
}

function initPageLayoutEditor() {
    if (RiftLayoutState.initialized || !document.body) return;
    RiftLayoutState.initialized = true;
    ensureLayoutMenu();
    updateLayoutBanner();
    applyStoredPageLayout();
    window.setTimeout(applyStoredPageLayout, 350);

    document.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;

        if (RiftLayoutState.active && !target.closest(`#${RIFT_LAYOUT_EDITOR.MENU_ID}, #${RIFT_LAYOUT_EDITOR.BANNER_ID}, .nav-meta-page`)) {
            event.preventDefault();
            event.stopPropagation();
        }

        if (RiftLayoutState.menu && !RiftLayoutState.menu.hidden && !target.closest(`#${RIFT_LAYOUT_EDITOR.MENU_ID}, .nav-meta-page`)) {
            closeLayoutMenu();
        }
    }, true);

    document.addEventListener('pointerdown', (event) => {
        if (!RiftLayoutState.active || event.button !== 0) return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target || target.closest(`#${RIFT_LAYOUT_EDITOR.MENU_ID}, #${RIFT_LAYOUT_EDITOR.BANNER_ID}, .nav-meta-page`)) return;

        const element = resolveEditableLayoutTarget(target);
        if (!element) return;

        event.preventDefault();
        event.stopPropagation();

        const startX = Number.parseFloat(element.style.getPropertyValue('--rift-layout-offset-x')) || 0;
        const startY = Number.parseFloat(element.style.getPropertyValue('--rift-layout-offset-y')) || 0;
        RiftLayoutState.drag = {
            element,
            key: buildLayoutElementKey(element),
            pointerX: event.clientX,
            pointerY: event.clientY,
            startX,
            startY,
        };
        element.classList.add(RIFT_LAYOUT_EDITOR.DRAGGING_CLASS);
    }, true);

    document.addEventListener('pointermove', (event) => {
        const drag = RiftLayoutState.drag;
        if (!drag) return;
        event.preventDefault();
        const nextX = Math.round(drag.startX + (event.clientX - drag.pointerX));
        const nextY = Math.round(drag.startY + (event.clientY - drag.pointerY));
        applyLayoutOffset(drag.element, { x: nextX, y: nextY });
    }, { passive: false, capture: true });

    document.addEventListener('pointerup', () => {
        const drag = RiftLayoutState.drag;
        if (!drag) return;
        drag.element.classList.remove(RIFT_LAYOUT_EDITOR.DRAGGING_CLASS);
        const currentX = Number.parseFloat(drag.element.style.getPropertyValue('--rift-layout-offset-x')) || 0;
        const currentY = Number.parseFloat(drag.element.style.getPropertyValue('--rift-layout-offset-y')) || 0;
        const layout = readStoredPageLayout();
        if (currentX === 0 && currentY === 0) {
            delete layout[drag.key];
            clearLayoutOffset(drag.element);
        } else {
            layout[drag.key] = { x: currentX, y: currentY };
        }
        writeStoredPageLayout(layout);
        updateLayoutMenu();
        RiftLayoutState.drag = null;
    }, true);

    document.addEventListener('pointercancel', () => {
        if (!RiftLayoutState.drag) return;
        RiftLayoutState.drag.element.classList.remove(RIFT_LAYOUT_EDITOR.DRAGGING_CLASS);
        RiftLayoutState.drag = null;
    }, true);

    window.addEventListener('resize', () => {
        if (RiftLayoutState.trigger && RiftLayoutState.menu && !RiftLayoutState.menu.hidden) {
            positionLayoutMenu(RiftLayoutState.trigger);
        }
    });
}

function readJsonStorage(key, fallback) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : fallback;
    } catch {
        return fallback;
    }
}

function writeJsonStorage(key, value) {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch {
    }
}

function getCurrentPath() {
    const path = String(window.location.pathname || '/').replace(/\/+$/, '') || '/';
    return path;
}

function getRouteCatalog() {
    return RIFT_UI.ROUTES.slice();
}

function getRouteMeta(pathname = getCurrentPath()) {
    const normalized = String(pathname || '/').replace(/\/+$/, '') || '/';
    const route = getRouteCatalog().find((entry) => entry.href === normalized) || null;
    const pageMeta = RIFT_UI.PAGE_META[normalized] || {};
    return {
        href: normalized,
        label: route?.label || resolveNavPageLabel(document.querySelector('.bottom-nav')) || 'page',
        icon: route?.icon || 'dashboard',
        section: route?.section || pageMeta.kicker || 'rift',
        keywords: route?.keywords || '',
        subtitle: pageMeta.subtitle || '',
        kicker: pageMeta.kicker || route?.section || 'rift',
        accent: pageMeta.accent || route?.section || 'rift',
    };
}

function readPinnedRoutes() {
    const rows = readJsonStorage(RIFT_UI.PINNED_KEY, []);
    return Array.isArray(rows) ? rows.map((value) => String(value || '').trim()).filter(Boolean) : [];
}

function writePinnedRoutes(rows) {
    const next = Array.from(new Set((Array.isArray(rows) ? rows : []).map((value) => String(value || '').trim()).filter(Boolean))).slice(0, 8);
    writeJsonStorage(RIFT_UI.PINNED_KEY, next);
}

function readRecentRoutes() {
    const rows = readJsonStorage(RIFT_UI.RECENT_KEY, []);
    return Array.isArray(rows)
        ? rows.map((entry) => ({
            href: String(entry?.href || '').trim(),
            at: Number(entry?.at || 0),
        })).filter((entry) => entry.href)
        : [];
}

function writeRecentRoutes(rows) {
    const next = (Array.isArray(rows) ? rows : [])
        .map((entry) => ({
            href: String(entry?.href || '').trim(),
            at: Number(entry?.at || Date.now()),
        }))
        .filter((entry) => entry.href)
        .slice(0, 12);
    writeJsonStorage(RIFT_UI.RECENT_KEY, next);
}

function trackRecentPage() {
    const current = getCurrentPath();
    const catalog = getRouteCatalog();
    if (!catalog.some((entry) => entry.href === current)) return;
    const rows = readRecentRoutes().filter((entry) => entry.href !== current);
    rows.unshift({ href: current, at: Date.now() });
    writeRecentRoutes(rows);
}

function isPinnedRoute(pathname) {
    return readPinnedRoutes().includes(String(pathname || '').trim());
}

function togglePinnedRoute(pathname) {
    const target = String(pathname || getCurrentPath()).trim();
    if (!target) return false;
    const rows = readPinnedRoutes();
    const existing = rows.indexOf(target);
    let pinned = false;
    if (existing >= 0) {
        rows.splice(existing, 1);
        pinned = false;
    } else {
        rows.unshift(target);
        pinned = true;
    }
    writePinnedRoutes(rows);
    syncRiftUiShell();
    return pinned;
}

function hasStoredPageLayout() {
    return Object.keys(readStoredPageLayout()).length > 0;
}

function isEditableTextTarget(target) {
    return target instanceof HTMLElement && !!target.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"], [contenteditable="plaintext-only"], [contenteditable]:not([contenteditable="false"])');
}

function getClosestRouteHref(target) {
    const anchor = target instanceof HTMLElement ? target.closest('a[href]') : null;
    if (!(anchor instanceof HTMLAnchorElement)) return '';
    try {
        const url = new URL(anchor.href, window.location.origin);
        if (url.origin !== window.location.origin) return url.href;
        return `${url.pathname}${url.search}${url.hash}`;
    } catch {
        return anchor.getAttribute('href') || '';
    }
}

async function copyTextToClipboard(value) {
    const text = String(value || '');
    if (!text) return false;
    if (navigator.clipboard?.writeText) {
        try {
            await navigator.clipboard.writeText(text);
            return true;
        } catch {
        }
    }
    const helper = document.createElement('textarea');
    helper.value = text;
    helper.setAttribute('readonly', 'readonly');
    helper.style.position = 'fixed';
    helper.style.opacity = '0';
    helper.style.pointerEvents = 'none';
    document.body.appendChild(helper);
    helper.select();
    let copied = false;
    try {
        copied = document.execCommand('copy');
    } catch {
        copied = false;
    }
    helper.remove();
    return copied;
}

function createRouteLinkHtml(route, className = 'rift-route-link') {
    const href = String(route?.href || '#').trim();
    const icon = String(route?.icon || 'dashboard').trim();
    const label = String(route?.label || href || 'page').trim();
    return `
        <a href="${href}" class="${className}">
            <span class="material-icons">${icon}</span>
            <span>${label}</span>
        </a>
    `;
}

function ensureRiftUiShell() {
    if (RiftUiState.shellReady || !document.body) return;
    RiftUiState.shellReady = true;

    const shell = document.createElement('div');
    shell.id = 'rift-ui-shell';
    shell.innerHTML = `
        <div id="rift-command-shade" class="rift-ui-shade" hidden>
            <div id="rift-command-palette" class="rift-command-palette" role="dialog" aria-modal="true" aria-labelledby="riftCommandTitle">
                <div class="rift-command-head">
                    <div>
                        <div id="riftCommandTitle" class="rift-command-title">command palette</div>
                        <div class="rift-command-subtitle">jump to pages, actions, and quick toggles</div>
                    </div>
                    <button type="button" class="rift-command-close" data-rift-command-close="1" aria-label="Close command palette">
                        <span class="material-icons">close</span>
                    </button>
                </div>
                <div class="rift-command-search">
                    <span class="material-icons">search</span>
                    <input id="rift-command-input" type="text" autocomplete="off" placeholder="search pages and actions">
                </div>
                <div id="rift-command-results" class="rift-command-results"></div>
            </div>
        </div>
        <div id="rift-drawer-shade" class="rift-ui-shade" hidden></div>
        <aside id="rift-quick-drawer" class="rift-quick-drawer" aria-hidden="true">
            <div class="rift-drawer-head">
                <div>
                    <div class="rift-drawer-title">quick settings</div>
                    <div class="rift-drawer-subtitle">appearance, performance, and layout</div>
                </div>
                <button type="button" class="rift-command-close" data-rift-drawer-close="1" aria-label="Close quick settings">
                    <span class="material-icons">close</span>
                </button>
            </div>
            <div class="rift-drawer-grid">
                <label class="rift-setting-row">
                    <span>theme</span>
                    <select id="rift-quick-theme"></select>
                </label>
                <label class="rift-setting-row">
                    <span>nav</span>
                    <select id="rift-quick-nav">
                        <option value="bottom">bottom</option>
                        <option value="top">top</option>
                        <option value="left">left</option>
                        <option value="right">right</option>
                    </select>
                </label>
                <label class="rift-toggle-row">
                    <span>performance mode</span>
                    <input id="rift-quick-performance" type="checkbox">
                </label>
                <label class="rift-toggle-row">
                    <span>rain background</span>
                    <input id="rift-quick-rain" type="checkbox">
                </label>
                <label class="rift-toggle-row">
                    <span>reduced effects</span>
                    <input id="rift-quick-reduced" type="checkbox">
                </label>
            </div>
            <div class="rift-drawer-actions">
                <button type="button" class="rift-utility-btn" data-rift-action="pin-current">pin current page</button>
                <button type="button" class="rift-utility-btn" data-rift-action="open-palette">open command palette</button>
            </div>
        </aside>
        <aside id="rift-context-rail" class="rift-context-rail">
            <div class="rift-context-card">
                <div class="rift-context-kicker">current page</div>
                <div id="rift-context-page" class="rift-context-title">loading...</div>
                <div id="rift-context-subtitle" class="rift-context-subtitle">building context</div>
                <div class="rift-context-actions">
                    <button type="button" class="rift-utility-btn" data-rift-action="open-palette">palette</button>
                    <button type="button" class="rift-utility-btn" data-rift-action="open-drawer">settings</button>
                </div>
            </div>
            <div class="rift-context-card">
                <div class="rift-context-kicker">session</div>
                <div id="rift-context-auth" class="rift-context-chip is-skeleton">checking...</div>
            </div>
            <div class="rift-context-card">
                <div class="rift-context-kicker">rift update ${RIFT_RELEASE.version}</div>
                <div class="rift-context-title">what shipped</div>
                <div id="rift-context-release" class="rift-release-list"></div>
            </div>
        </aside>
        <div id="rift-context-menu" class="rift-context-menu" hidden>
            <div class="rift-context-menu-head">
                <div id="rift-context-menu-title" class="rift-context-menu-title">page</div>
                <div id="rift-context-menu-subtitle" class="rift-context-menu-subtitle">quick actions</div>
            </div>
            <div id="rift-context-menu-items" class="rift-context-menu-items"></div>
        </div>
        <div id="rift-pinned-dock" class="rift-pinned-dock"></div>
    `;
    document.body.appendChild(shell);

    const themeSelect = document.getElementById('rift-quick-theme');
    if (themeSelect) {
        themeSelect.innerHTML = RIFT_APPEARANCE.THEMES.map((theme) => `<option value="${theme}">${theme}</option>`).join('');
    }

    shell.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        const closeCommand = target.closest('[data-rift-command-close="1"]');
        const closeDrawer = target.closest('[data-rift-drawer-close="1"]');
        const contextAction = target.closest('[data-rift-context-action]');

        const action = target.getAttribute('data-rift-action') || target.closest('[data-rift-action]')?.getAttribute('data-rift-action') || '';
        if (action === 'open-palette') openRiftCommandPalette();
        if (action === 'open-drawer') openRiftQuickSettings();
        if (action === 'pin-current') togglePinnedRoute(getCurrentPath());
        if (contextAction instanceof HTMLElement) {
            handleRiftContextMenuAction(contextAction);
        }

        if (target.id === 'rift-command-shade' || closeCommand) {
            closeRiftCommandPalette();
        }
        if (target.id === 'rift-drawer-shade' || closeDrawer) {
            closeRiftQuickSettings();
        }
        if (RiftUiState.contextMenuOpen && !target.closest('#rift-context-menu')) {
            closeRiftContextMenu();
        }
    });

    const commandInput = document.getElementById('rift-command-input');
    if (commandInput) {
        commandInput.addEventListener('input', () => renderRiftCommandResults(commandInput.value));
        commandInput.addEventListener('keydown', (event) => {
            if (event.key === 'Escape') {
                closeRiftCommandPalette();
                return;
            }
            if (event.key === 'Enter') {
                const first = document.querySelector('.rift-command-item');
                if (first instanceof HTMLElement) first.click();
            }
        });
    }

    document.getElementById('rift-command-results')?.addEventListener('click', (event) => {
        const item = event.target instanceof HTMLElement ? event.target.closest('.rift-command-item') : null;
        if (!(item instanceof HTMLElement)) return;
        const href = String(item.getAttribute('data-href') || '').trim();
        const action = String(item.getAttribute('data-action') || '').trim();
        if (href) {
            window.location.assign(href);
            return;
        }
        if (action === 'open-drawer') openRiftQuickSettings();
        if (action === 'toggle-performance') window.RiftAppearance?.setPerformanceMode(!(localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true'));
        if (action === 'toggle-reduced') window.RiftUI?.setReducedEffects(!(localStorage.getItem(RIFT_UI.REDUCED_EFFECTS_KEY) === 'true'));
        if (action === 'pin-current') togglePinnedRoute(getCurrentPath());
        closeRiftCommandPalette();
    });

    document.getElementById('rift-quick-theme')?.addEventListener('change', (event) => {
        window.RiftAppearance?.setTheme(event.target.value);
        syncRiftUiShell();
    });
    document.getElementById('rift-quick-nav')?.addEventListener('change', (event) => {
        localStorage.setItem(RIFT_APPEARANCE.NAV_POSITION_KEY, String(event.target.value || 'bottom'));
        const prefs = applyRiftAppearance();
        decorateBottomNav(document.querySelector('.bottom-nav'), prefs?.navPosition || 'bottom');
        syncRiftUiShell();
    });
    document.getElementById('rift-quick-performance')?.addEventListener('change', (event) => {
        window.RiftAppearance?.setPerformanceMode(!!event.target.checked);
        syncRiftUiShell();
    });
    document.getElementById('rift-quick-rain')?.addEventListener('change', (event) => {
        window.RiftAppearance?.setRainEnabled(!!event.target.checked);
        syncRiftUiShell();
    });
    document.getElementById('rift-quick-reduced')?.addEventListener('change', (event) => {
        window.RiftUI?.setReducedEffects(!!event.target.checked);
        syncRiftUiShell();
    });

    document.addEventListener('keydown', (event) => {
        if ((event.ctrlKey || event.metaKey) && String(event.key || '').toLowerCase() === 'k') {
            event.preventDefault();
            openRiftCommandPalette();
            return;
        }
        if (String(event.key || '') === 'Escape') {
            if (RiftUiState.contextMenuOpen) closeRiftContextMenu();
            if (RiftUiState.paletteOpen) closeRiftCommandPalette();
            if (RiftUiState.drawerOpen) closeRiftQuickSettings();
        }
        if (String(event.key || '') === '/') {
            const activeElement = document.activeElement;
            const isTyping = activeElement && /input|textarea|select/i.test(String(activeElement.tagName || ''));
            if (!isTyping && getCurrentPath() === '/') {
                event.preventDefault();
                openRiftCommandPalette();
            }
        }
    });

    document.addEventListener('contextmenu', (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        if (event.shiftKey || isEditableTextTarget(target)) {
            closeRiftContextMenu();
            return;
        }
        if (target.closest('#rift-command-palette, #rift-quick-drawer, #rift-context-menu, #rift-layout-menu, #rift-layout-banner')) {
            return;
        }
        event.preventDefault();
        openRiftContextMenu(event);
    });

    document.addEventListener('pointerdown', (event) => {
        if (!RiftUiState.contextMenuOpen) return;
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target || target.closest('#rift-context-menu')) return;
        closeRiftContextMenu();
    }, true);

    window.addEventListener('resize', closeRiftContextMenu);
    window.addEventListener('scroll', closeRiftContextMenu, true);
}

function buildRiftCommandItems(query = '') {
    const normalized = String(query || '').trim().toLowerCase();
    const routes = getRouteCatalog()
        .map((route) => ({
            type: 'route',
            href: route.href,
            label: route.label,
            icon: route.icon,
            meta: route.section,
            search: `${route.label} ${route.section} ${route.keywords}`.toLowerCase(),
        }))
        .filter((entry) => !normalized || entry.search.includes(normalized));

    const actions = [
        {
            type: 'action',
            action: 'open-drawer',
            label: 'open quick settings',
            icon: 'tune',
            meta: 'appearance + behavior',
            search: 'open quick settings theme nav performance rain reduced effects',
        },
        {
            type: 'action',
            action: 'toggle-performance',
            label: localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true' ? 'disable performance mode' : 'enable performance mode',
            icon: 'speed',
            meta: 'performance',
            search: 'toggle performance mode speed low power',
        },
        {
            type: 'action',
            action: 'toggle-reduced',
            label: localStorage.getItem(RIFT_UI.REDUCED_EFFECTS_KEY) === 'true' ? 'disable reduced effects' : 'enable reduced effects',
            icon: 'animation',
            meta: 'motion + effects',
            search: 'toggle reduced effects motion animation',
        },
        {
            type: 'action',
            action: 'pin-current',
            label: isPinnedRoute(getCurrentPath()) ? 'unpin current page' : 'pin current page',
            icon: 'push_pin',
            meta: getCurrentPath(),
            search: 'pin current page dock favorite quick launch',
        },
    ].filter((entry) => !normalized || entry.search.includes(normalized));

    return [...actions, ...routes].slice(0, 16);
}

function renderRiftCommandResults(query = '') {
    const host = document.getElementById('rift-command-results');
    if (!host) return;
    const items = buildRiftCommandItems(query);
    host.innerHTML = items.length
        ? items.map((item) => `
            <button type="button" class="rift-command-item" ${item.href ? `data-href="${item.href}"` : `data-action="${item.action}"`}>
                <span class="material-icons">${item.icon}</span>
                <span class="rift-command-copy">
                    <strong>${item.label}</strong>
                    <span>${item.meta}</span>
                </span>
            </button>
        `).join('')
        : '<div class="rift-command-empty">no commands matched that search.</div>';
}

function openRiftCommandPalette() {
    ensureRiftUiShell();
    const shade = document.getElementById('rift-command-shade');
    const input = document.getElementById('rift-command-input');
    if (!shade || !input) return;
    RiftUiState.paletteOpen = true;
    shade.hidden = false;
    renderRiftCommandResults('');
    input.value = '';
    window.requestAnimationFrame(() => input.focus());
}

function closeRiftCommandPalette() {
    const shade = document.getElementById('rift-command-shade');
    if (shade) shade.hidden = true;
    RiftUiState.paletteOpen = false;
}

function openRiftQuickSettings() {
    ensureRiftUiShell();
    const shade = document.getElementById('rift-drawer-shade');
    const drawer = document.getElementById('rift-quick-drawer');
    if (!shade || !drawer) return;
    RiftUiState.drawerOpen = true;
    syncRiftUiShell();
    shade.hidden = false;
    drawer.classList.add('is-open');
    drawer.setAttribute('aria-hidden', 'false');
}

function closeRiftQuickSettings() {
    const shade = document.getElementById('rift-drawer-shade');
    const drawer = document.getElementById('rift-quick-drawer');
    if (shade) shade.hidden = true;
    if (drawer) {
        drawer.classList.remove('is-open');
        drawer.setAttribute('aria-hidden', 'true');
    }
    RiftUiState.drawerOpen = false;
}

function syncRiftQuickSettingsControls() {
    const prefs = readStoredRiftPreferences();
    const theme = document.getElementById('rift-quick-theme');
    const nav = document.getElementById('rift-quick-nav');
    const performance = document.getElementById('rift-quick-performance');
    const rain = document.getElementById('rift-quick-rain');
    const reduced = document.getElementById('rift-quick-reduced');
    if (theme) theme.value = prefs.theme;
    if (nav) nav.value = prefs.navPosition;
    if (performance) performance.checked = !!prefs.performanceMode;
    if (rain) rain.checked = !!prefs.rainEnabled;
    if (reduced) reduced.checked = localStorage.getItem(RIFT_UI.REDUCED_EFFECTS_KEY) === 'true';
}

function renderRiftLinkStack(host, paths, emptyText) {
    if (!host) return;
    const catalog = getRouteCatalog();
    const items = paths
        .map((path) => catalog.find((entry) => entry.href === path))
        .filter(Boolean);
    host.classList.remove('rift-is-loading');
    host.innerHTML = items.length
        ? items.map((item) => createRouteLinkHtml(item, 'rift-mini-link')).join('')
        : `<div class="rift-context-empty">${emptyText}</div>`;
}

function renderRiftReleaseNotes() {
    const host = document.getElementById('rift-context-release');
    if (!host) return;
    const notes = Array.isArray(RIFT_RELEASE.notes) ? RIFT_RELEASE.notes : [];
    host.innerHTML = notes.length
        ? notes.map((note) => `<div class="rift-release-item">${note}</div>`).join('')
        : '<div class="rift-context-empty">no release notes were added for this update.</div>';
}

function syncRiftContextRail() {
    const meta = getRouteMeta();
    const page = document.getElementById('rift-context-page');
    const subtitle = document.getElementById('rift-context-subtitle');
    const auth = document.getElementById('rift-context-auth');
    if (page) page.textContent = meta.label;
    if (subtitle) subtitle.textContent = meta.subtitle || `${meta.kicker} surface`;
    if (auth) {
        auth.classList.remove('is-skeleton');
        auth.textContent = RiftUiState.auth.authenticated
            ? `${RiftUiState.auth.username || 'signed in'} · ${RiftUiState.auth.clientMode || 'rift'}`
            : 'guest session';
    }
    renderRiftReleaseNotes();
}

function syncRiftPinnedDock() {
    const dock = document.getElementById('rift-pinned-dock');
    if (!dock) return;
    const pinned = readPinnedRoutes();
    const catalog = getRouteCatalog();
    const items = pinned.map((href) => catalog.find((entry) => entry.href === href)).filter(Boolean);
    const current = getCurrentPath();
    const pinLabel = isPinnedRoute(current) ? 'unpin page' : 'pin page';
    dock.innerHTML = `
        <button type="button" class="rift-dock-action" data-rift-action="pin-current">
            <span class="material-icons">push_pin</span>
            <span>${pinLabel}</span>
        </button>
        ${items.length ? items.map((item) => createRouteLinkHtml(item, 'rift-dock-link')).join('') : '<div class="rift-dock-empty">pin pages for a personal dock.</div>'}
    `;
}

function enhancePageHeader() {
    const header = document.querySelector('.container > header');
    if (!(header instanceof HTMLElement) || header.dataset.riftHeaderReady === 'true') return;
    header.dataset.riftHeaderReady = 'true';
    const meta = getRouteMeta();
    header.classList.add('rift-page-header');

    const kicker = document.createElement('div');
    kicker.className = 'rift-page-kicker';
    kicker.textContent = meta.kicker || 'rift';
    header.prepend(kicker);

    let subtitle = header.querySelector('.page-subtitle');
    if (!(subtitle instanceof HTMLElement) && meta.subtitle) {
        subtitle = document.createElement('p');
        subtitle.className = 'page-subtitle';
        subtitle.textContent = meta.subtitle;
        header.appendChild(subtitle);
    }

    const actions = document.createElement('div');
    actions.className = 'rift-page-actions';
    actions.innerHTML = `
        <button type="button" class="rift-utility-btn" data-rift-action="open-palette">command</button>
        <button type="button" class="rift-utility-btn" data-rift-action="open-drawer">settings</button>
        <button type="button" class="rift-utility-btn" data-rift-header-pin="1">${isPinnedRoute(meta.href) ? 'unpin page' : 'pin page'}</button>
    `;
    header.appendChild(actions);

    actions.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        const action = target.getAttribute('data-rift-action');
        if (action === 'open-palette') openRiftCommandPalette();
        if (action === 'open-drawer') openRiftQuickSettings();
        if (target.getAttribute('data-rift-header-pin') === '1') {
            togglePinnedRoute(meta.href);
        }
    });
}

function syncPageHeaderActions() {
    const headerPin = document.querySelector('[data-rift-header-pin="1"]');
    if (headerPin instanceof HTMLElement) {
        headerPin.textContent = isPinnedRoute(getCurrentPath()) ? 'unpin page' : 'pin page';
    }
}

function initHomeWorkspace() {
    if (getCurrentPath() !== '/') return;
    const header = document.querySelector('.container > header');
    const cards = document.querySelector('.home-cards');
    if (!(header instanceof HTMLElement) || !(cards instanceof HTMLElement) || document.getElementById('rift-home-workspace')) return;

    const workspace = document.createElement('section');
    workspace.id = 'rift-home-workspace';
    workspace.className = 'rift-home-workspace rift-reveal';
    workspace.innerHTML = `
        <article class="rift-home-panel rift-home-pulse">
            <div class="rift-panel-kicker">workspace</div>
            <div class="rift-panel-title">jump back in fast</div>
            <div class="rift-panel-copy">recent pages, pinned tools, and quick controls live here now.</div>
            <div class="rift-panel-actions">
                <button type="button" class="rift-utility-btn" data-rift-action="open-palette">open palette</button>
                <button type="button" class="rift-utility-btn" data-rift-action="open-drawer">quick settings</button>
            </div>
        </article>
        <article class="rift-home-panel">
            <div class="rift-panel-row-head">
                <div class="rift-panel-kicker">pinned</div>
                <button type="button" class="rift-inline-action" data-rift-action="pin-current">toggle current</button>
            </div>
            <div id="rift-home-pinned" class="rift-pill-grid rift-is-loading"></div>
        </article>
        <article class="rift-home-panel">
            <div class="rift-panel-kicker">recent</div>
            <div id="rift-home-recent" class="rift-pill-grid rift-is-loading"></div>
        </article>
    `;
    cards.classList.add('rift-home-launchpad');
    cards.after(workspace);

    workspace.addEventListener('click', (event) => {
        const target = event.target instanceof HTMLElement ? event.target : null;
        if (!target) return;
        const action = target.getAttribute('data-rift-action');
        if (action === 'open-palette') openRiftCommandPalette();
        if (action === 'open-drawer') openRiftQuickSettings();
        if (action === 'pin-current') togglePinnedRoute(getCurrentPath());
    });
}

function syncHomeWorkspace() {
    if (getCurrentPath() !== '/') return;
    const pinnedHost = document.getElementById('rift-home-pinned');
    const recentHost = document.getElementById('rift-home-recent');
    if (pinnedHost) {
        renderRiftLinkStack(pinnedHost, readPinnedRoutes(), 'pin pages to keep them one tap away.');
        pinnedHost.classList.add('rift-pill-grid');
    }
    if (recentHost) {
        renderRiftLinkStack(recentHost, readRecentRoutes().map((entry) => entry.href).filter((href) => href !== '/'), 'your next launches will show up here.');
        recentHost.classList.add('rift-pill-grid');
    }
}

function applySectionIdentity() {
    if (!document.body) return;
    for (const cls of Array.from(document.body.classList)) {
        if (cls.startsWith('route-') || cls.startsWith('accent-')) document.body.classList.remove(cls);
    }
    const meta = getRouteMeta();
    document.body.classList.add(`route-${meta.href === '/' ? 'home' : meta.href.replace(/^\/+/, '').replace(/[^a-z0-9]+/gi, '-')}`);
    document.body.classList.add(`accent-${meta.accent}`);
}

function applySharedRevealMotion() {
    if (!document.body) return;
    const selectors = [
        '.container > header',
        '.home-card',
        '.game-card',
        '.vault-tile',
        '.app-card',
        '.credit-card',
        '.music-panel',
        '.soundboard-panel',
        '.settings-group',
        '.account-shell',
        '.browser-shell',
        '.vault-controls',
        '#rift-home-workspace',
    ];
    const nodes = Array.from(document.querySelectorAll(selectors.join(', ')));
    nodes.forEach((node, index) => {
        if (!(node instanceof HTMLElement) || node.dataset.riftRevealReady === 'true') return;
        node.dataset.riftRevealReady = 'true';
        node.classList.add('rift-reveal');
        node.style.setProperty('--rift-reveal-delay', `${Math.min(index * 40, 280)}ms`);
    });
    requestAnimationFrame(() => {
        document.body.classList.add('rift-ui-ready');
    });
}

function fetchRiftUiAuthState() {
    return Promise.resolve()
        .then(() => fetch('/api/auth/me', { credentials: 'include' }))
        .then(async (res) => {
            const payload = await res.json().catch(() => ({}));
            if (!res.ok) return { authenticated: false, username: '', clientMode: 'rift' };
            return {
                authenticated: !!payload?.authenticated,
                username: String(payload?.user?.username || ''),
                clientMode: String(payload?.clientMode || 'rift'),
            };
        })
        .catch(() => ({ authenticated: false, username: '', clientMode: 'rift' }));
}

function syncRiftUiShell() {
    ensureRiftUiShell();
    syncRiftQuickSettingsControls();
    syncRiftContextRail();
    syncRiftPinnedDock();
    syncPageHeaderActions();
    syncHomeWorkspace();
}

function buildRiftContextMenuPayload(target) {
    const selection = String(window.getSelection?.()?.toString() || '').trim();
    const href = getClosestRouteHref(target);
    const route = href ? getRouteCatalog().find((entry) => entry.href === href) : null;
    const current = getRouteMeta();
    return {
        href,
        label: route?.label || (href ? 'link' : current.label),
        subtitle: href ? (route?.section || href) : (current.subtitle || `${current.kicker} actions`),
        selection,
        pinned: isPinnedRoute(getCurrentPath()),
        layoutActive: !!RiftLayoutState.active,
        hasLayout: hasStoredPageLayout(),
    };
}

function renderRiftContextMenu(payload) {
    const menu = document.getElementById('rift-context-menu');
    const title = document.getElementById('rift-context-menu-title');
    const subtitle = document.getElementById('rift-context-menu-subtitle');
    const items = document.getElementById('rift-context-menu-items');
    if (!menu || !title || !subtitle || !items) return;

    title.textContent = payload.label || 'page';
    subtitle.textContent = payload.subtitle || 'quick actions';

    const actions = [];
    if (payload.href) {
        actions.push(
            { action: 'open-link', icon: 'open_in_new', label: 'open link' },
            { action: 'copy-link', icon: 'link', label: 'copy link' }
        );
    }
    if (payload.selection) {
        actions.push({ action: 'copy-selection', icon: 'content_copy', label: 'copy selection' });
    } else {
        actions.push({ action: 'copy-page-link', icon: 'link', label: 'copy page link' });
    }
    actions.push(
        { action: 'back', icon: 'arrow_back', label: 'go back' },
        { action: 'forward', icon: 'arrow_forward', label: 'go forward' },
        { action: 'reload', icon: 'refresh', label: 'reload page' },
        { action: 'toggle-layout', icon: 'draw', label: payload.layoutActive ? 'finish editing page' : 'edit this page' },
        { action: 'reset-layout', icon: 'restart_alt', label: 'reset page layout', disabled: !payload.hasLayout },
        { action: 'toggle-pin', icon: 'push_pin', label: payload.pinned ? 'unpin current page' : 'pin current page' },
        { action: 'open-palette', icon: 'search', label: 'open command palette' },
        { action: 'open-drawer', icon: 'tune', label: 'open quick settings' },
    );

    items.innerHTML = actions.map((item) => `
        <button type="button" class="rift-context-menu-item" data-rift-context-action="${item.action}" ${payload.href ? `data-rift-context-href="${payload.href}"` : ''} ${item.disabled ? 'disabled' : ''}>
            <span class="material-icons">${item.icon}</span>
            <span>${item.label}</span>
        </button>
    `).join('');
}

function openRiftContextMenu(event) {
    ensureRiftUiShell();
    const menu = document.getElementById('rift-context-menu');
    if (!menu) return;
    const payload = buildRiftContextMenuPayload(event.target instanceof HTMLElement ? event.target : null);
    RiftUiState.contextMenuOpen = true;
    RiftUiState.contextMenuPayload = payload;
    renderRiftContextMenu(payload);
    menu.hidden = false;
    menu.style.visibility = 'hidden';

    requestAnimationFrame(() => {
        const padding = 12;
        const width = menu.offsetWidth || 240;
        const height = menu.offsetHeight || 320;
        const maxLeft = window.innerWidth - width - padding;
        const maxTop = window.innerHeight - height - padding;
        const left = Math.max(padding, Math.min(event.clientX, maxLeft));
        const top = Math.max(padding, Math.min(event.clientY, maxTop));
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.visibility = 'visible';
    });
}

function closeRiftContextMenu() {
    const menu = document.getElementById('rift-context-menu');
    if (menu) {
        menu.hidden = true;
        menu.style.visibility = 'hidden';
    }
    RiftUiState.contextMenuOpen = false;
    RiftUiState.contextMenuPayload = null;
}

function handleRiftContextMenuAction(trigger) {
    const action = String(trigger.getAttribute('data-rift-context-action') || '').trim();
    const href = String(trigger.getAttribute('data-rift-context-href') || RiftUiState.contextMenuPayload?.href || '').trim();
    if (!action) return;

    const finish = () => {
        syncRiftUiShell();
        closeRiftContextMenu();
    };

    if (action === 'open-link' && href) {
        window.location.assign(href);
        return;
    }
    if (action === 'copy-link' && href) {
        copyTextToClipboard(new URL(href, window.location.origin).href).finally(finish);
        return;
    }
    if (action === 'copy-page-link') {
        copyTextToClipboard(window.location.href).finally(finish);
        return;
    }
    if (action === 'copy-selection') {
        copyTextToClipboard(RiftUiState.contextMenuPayload?.selection || '').finally(finish);
        return;
    }
    if (action === 'back') {
        window.history.back();
        closeRiftContextMenu();
        return;
    }
    if (action === 'forward') {
        window.history.forward();
        closeRiftContextMenu();
        return;
    }
    if (action === 'reload') {
        window.location.reload();
        return;
    }
    if (action === 'toggle-layout') {
        setLayoutEditMode(!RiftLayoutState.active);
        finish();
        return;
    }
    if (action === 'reset-layout') {
        resetStoredPageLayout();
        finish();
        return;
    }
    if (action === 'toggle-pin') {
        togglePinnedRoute(getCurrentPath());
        finish();
        return;
    }
    if (action === 'open-palette') {
        closeRiftContextMenu();
        openRiftCommandPalette();
        return;
    }
    if (action === 'open-drawer') {
        closeRiftContextMenu();
        openRiftQuickSettings();
        return;
    }
    closeRiftContextMenu();
}

function detectSlowEnvironment() {
    const reasons = [];
    const connection = navigator.connection || navigator.mozConnection || navigator.webkitConnection || null;
    const effectiveType = String(connection?.effectiveType || '').toLowerCase();

    if (connection?.saveData) {
        reasons.push('data saver is enabled');
    }
    if (effectiveType === 'slow-2g' || effectiveType === '2g' || effectiveType === '3g') {
        reasons.push(`network looks slow (${effectiveType})`);
    }
    if (typeof navigator.deviceMemory === 'number' && navigator.deviceMemory > 0 && navigator.deviceMemory <= 4) {
        reasons.push(`device memory is limited (${navigator.deviceMemory}gb)`);
    }
    if (typeof navigator.hardwareConcurrency === 'number' && navigator.hardwareConcurrency > 0 && navigator.hardwareConcurrency <= 4) {
        reasons.push(`cpu threads are limited (${navigator.hardwareConcurrency})`);
    }

    return {
        slow: reasons.length > 0,
        reasons,
    };
}

function waitForBootScreenToClear(callback, attempts = 0) {
    const boot = document.querySelector('.rift-boot-screen');
    if (!boot || boot.classList.contains('is-exiting')) {
        callback();
        return;
    }
    if (attempts > 40) {
        callback();
        return;
    }
    window.setTimeout(() => waitForBootScreenToClear(callback, attempts + 1), 350);
}

function promptForPerformanceModeIfNeeded() {
    if (!document.body) return;
    if (localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true') return;
    if (sessionStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_PROMPT_SESSION_KEY) === 'true') return;

    const environment = detectSlowEnvironment();
    if (!environment.slow) return;

    sessionStorage.setItem(RIFT_APPEARANCE.PERFORMANCE_PROMPT_SESSION_KEY, 'true');

    const openPrompt = () => {
        if (!document.body) return;

        const shade = document.createElement('div');
        shade.className = 'overlay-shade';
        shade.innerHTML = `
            <div class="overlay-box performance-suggest-box" role="dialog" aria-modal="true" aria-labelledby="riftPerfPromptTitle">
                <div class="overlay-body">
                    <p id="riftPerfPromptTitle">rift noticed this tab may be running on a slower device or network.</p>
                    <p>enable performance mode for this tab now?</p>
                    <p class="performance-suggest-reason">${environment.reasons.join(' · ')}</p>
                </div>
                <div class="overlay-actions">
                    <button type="button" class="overlay-btn" data-rift-performance-choice="no">not now</button>
                    <button type="button" class="overlay-btn overlay-accept" data-rift-performance-choice="yes">enable</button>
                </div>
            </div>
        `;
        document.body.appendChild(shade);

        const close = () => shade.remove();
        shade.querySelectorAll('[data-rift-performance-choice]').forEach((button) => {
            button.addEventListener('click', () => {
                const choice = button.getAttribute('data-rift-performance-choice');
                if (choice === 'yes') {
                    window.RiftAppearance?.setPerformanceMode(true);
                }
                close();
            });
        });
    };

    waitForBootScreenToClear(openPrompt);
}

document.addEventListener('DOMContentLoaded', function () {
    const typingText = document.getElementById('typingText');
    const prefs = applyRiftAppearance() || readStoredRiftPreferences();
    const performanceMode = prefs.performanceMode;
    const cursorFxEnabled = localStorage.getItem('rift__cursor-fx') === 'true';
    const navToggleEnabled = localStorage.getItem('rift__nav-toggle') === 'true';

    const quotes = [
        "the quiet keeps rifting wider",
        "time keeps moving through what's already rifted",
        "the space between moments keeps rifting",
        "the quiet keeps rifting wider"
    ];

    let currentQuoteIndex = 0;
    let currentCharIndex = 0;
    let isTyping = true;

    function typeEffect() {
        if (!typingText) return;
        if (isTyping) {
            if (currentCharIndex < quotes[currentQuoteIndex].length) {
                typingText.textContent += quotes[currentQuoteIndex].charAt(currentCharIndex);
                currentCharIndex++;
                setTimeout(typeEffect, 80);
            } else {
                isTyping = false;
                setTimeout(typeEffect, 2000); // Wait before erasing
            }
        } else {
            if (currentCharIndex > 0) {
                typingText.textContent = quotes[currentQuoteIndex].substring(0, currentCharIndex - 1);
                currentCharIndex--;
                setTimeout(typeEffect, 40);
            } else {
                isTyping = true;
                currentQuoteIndex = (currentQuoteIndex + 1) % quotes.length;
                setTimeout(typeEffect, 500); // Wait before typing next quote
            }
        }
    }

    if (typingText) {
        if (performanceMode) {
            typingText.textContent = 'performance mode enabled';
        } else {
            typeEffect();
        }
    }

    if (!performanceMode && cursorFxEnabled) {
        const cursorLight = document.createElement('div');
        cursorLight.className = 'cursor-light';
        document.body.appendChild(cursorLight);

        let prevX = null;
        let prevY = null;

        document.addEventListener('mousemove', function (e) {
            const viewer = document.getElementById('game-viewer');
            if (viewer && viewer.classList.contains('active')) {
                cursorLight.style.display = 'none';
                return;
            }
            cursorLight.style.display = '';

            cursorLight.style.left = e.clientX + 'px';
            cursorLight.style.top = e.clientY + 'px';

            if (prevX !== null && prevY !== null) {
                const trail = document.createElement('div');
                trail.className = 'cursor-trail';

                const dx = e.clientX - prevX;
                const dy = e.clientY - prevY;
                const distance = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx) * 180 / Math.PI;

                trail.style.left = prevX + 'px';
                trail.style.top = prevY + 'px';
                trail.style.width = distance + 'px';
                trail.style.transform = `rotate(${angle}deg)`;
                trail.style.transformOrigin = '0 50%';

                document.body.appendChild(trail);

                setTimeout(() => {
                    trail.remove();
                }, 500);
            }

            prevX = e.clientX;
            prevY = e.clientY;
        });
    }

    const nav = document.querySelector('.bottom-nav');
    decorateBottomNav(nav, prefs.navPosition);
    initPageLayoutEditor();
    trackRecentPage();
    applySectionIdentity();
    ensureRiftUiShell();
    enhancePageHeader();
    initHomeWorkspace();
    syncRiftUiShell();
    applySharedRevealMotion();
    fetchRiftUiAuthState().then((state) => {
        RiftUiState.auth = state;
        syncRiftUiShell();
    });
    window.addEventListener('focus', () => {
        fetchRiftUiAuthState().then((state) => {
            RiftUiState.auth = state;
            syncRiftUiShell();
        });
    });
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState !== 'visible') return;
        fetchRiftUiAuthState().then((state) => {
            RiftUiState.auth = state;
            syncRiftUiShell();
        });
    });
    if (nav && navToggleEnabled) {
        const toggle = document.createElement('button');
        toggle.className = 'nav-toggle';
        toggle.title = 'Toggle navigation';
        document.body.appendChild(toggle);

        toggle.addEventListener('click', () => {
            nav.classList.toggle('hidden');
            toggle.classList.toggle('nav-is-hidden');
        });
    }

    promptForPerformanceModeIfNeeded();

});

(function () {
    const SETTINGS_KEYS = [
        'rift__nav-position',
        'rift__launch-mode',
        'rift__disguise-title',
        'rift__disguise-favicon',
        'rift__theme',
        'rift__theme-custom-v1',
        'rift__rain-enabled',
        'rift__performance-mode',
    ];

    async function request(url, options = {}) {
        const res = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        let payload = null;
        try {
            payload = await res.json();
        } catch {
            payload = null;
        }
        if (!res.ok) {
            const error = new Error(payload?.error || `request failed (${res.status})`);
            error.status = res.status;
            throw error;
        }
        return payload;
    }

    function collectLocalSettings() {
        const settings = {};
        for (const key of SETTINGS_KEYS) {
            const value = localStorage.getItem(key);
            if (value !== null) settings[key] = value;
        }
        return settings;
    }

    window.RiftAuth = {
        async me() {
            return await request('/api/auth/me');
        },
        async signup(username, password) {
            return await request('/api/auth/signup', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
        },
        async login(username, password) {
            return await request('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ username, password }),
            });
        },
        async logout() {
            return await request('/api/auth/logout', { method: 'POST' });
        },
        async getSave() {
            return await request('/api/save');
        },
        async saveSettings(settings) {
            return await request('/api/save/settings', {
                method: 'PUT',
                body: JSON.stringify({ settings }),
            });
        },
        async saveLocalSettings() {
            const settings = collectLocalSettings();
            if (!Object.keys(settings).length) return { ok: true };
            return await this.saveSettings(settings);
        },
        async saveGameProgress(gameId, progress) {
            if (!gameId) return { ok: false };
            return await request(`/api/save/games/${encodeURIComponent(gameId)}`, {
                method: 'PUT',
                body: JSON.stringify({ progress }),
            });
        },
    };
})();

function riftGetCachedAuthMe(requestFn, ttlMs = 15000) {
    const now = Date.now();
    const cached = window.__riftAuthMeCacheV1;
    if (cached && cached.promise && Number(cached.expiresAt || 0) > now) {
        return cached.promise;
    }
    const promise = Promise.resolve()
        .then(() => requestFn('/api/auth/me'))
        .catch(() => null);
    window.__riftAuthMeCacheV1 = {
        expiresAt: now + ttlMs,
        promise,
    };
    return promise;
}

(function () {
    if (window.__riftReplyNotifierBooted) return;
    window.__riftReplyNotifierBooted = true;
    const currentPath = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
    if (currentPath === '/chat' || currentPath === '/nova/chat') return;

    const POLL_MS = 4000;
    let since = Date.now();
    const seenIds = new Set();
    const queue = [];
    let active = null;
    let pollTimer = null;

    function getMode() {
        try {
            if (window.RiftXMode && typeof window.RiftXMode.get === 'function') {
                return String(window.RiftXMode.get() || '').toLowerCase() === 'nova' ? 'nova' : 'rift';
            }
            const params = new URLSearchParams(window.location.search || '');
            return String(params.get('rx') || '').toLowerCase() === 'nova' ? 'nova' : 'rift';
        } catch {
            return 'rift';
        }
    }

    function getChatLink(roomId) {
        const mode = getMode();
        const url = new URL('/chat', window.location.origin);
        if (roomId) url.searchParams.set('room', roomId);
        if (mode === 'nova') url.searchParams.set('rx', 'nova');
        return `${url.pathname}${url.search}`;
    }

    function injectStyle() {
        if (document.getElementById('rift-reply-notify-style')) return;
        const style = document.createElement('style');
        style.id = 'rift-reply-notify-style';
        style.textContent = `
            .reply-toast{position:fixed;top:12px;left:12px;z-index:16000;width:min(360px,90vw);border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(9,11,16,.9);backdrop-filter:blur(10px);padding:10px;display:none;box-shadow:0 16px 38px rgba(0,0,0,.4)}
            .reply-toast.active{display:block}
            .reply-toast-head{font-size:12px;color:#fff;letter-spacing:.04em;text-transform:lowercase}
            .reply-toast-body{margin-top:6px;font-size:11px;color:rgba(255,255,255,.78);line-height:1.4;max-height:56px;overflow:auto;white-space:pre-wrap}
            .reply-toast-actions{margin-top:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap}
            .reply-toast-btn{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:5px 8px;font-size:10px;cursor:pointer;text-transform:lowercase}
            .reply-toast-input{display:none;margin-top:8px;grid-template-columns:1fr auto;gap:6px}
            .reply-toast-input.active{display:grid}
            .reply-toast-input input{border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.3);color:#fff;border-radius:8px;padding:7px 8px;font-size:11px;outline:none}
            .reply-toast-status{margin-top:5px;min-height:14px;font-size:10px;color:rgba(255,255,255,.6);text-transform:lowercase}
        `;
        document.head.appendChild(style);
    }

    function ensureToast() {
        injectStyle();
        let toast = document.getElementById('reply-toast');
        if (toast) return toast;
        toast = document.createElement('div');
        toast.id = 'reply-toast';
        toast.className = 'reply-toast';
        toast.innerHTML = `
            <div class="reply-toast-head" id="replyToastHead"></div>
            <div class="reply-toast-body" id="replyToastBody"></div>
            <div class="reply-toast-actions">
                <button type="button" class="reply-toast-btn" id="replyToastQuick">quick reply</button>
                <a class="reply-toast-btn" id="replyToastOpen" href="/chat">open chat</a>
                <button type="button" class="reply-toast-btn" id="replyToastDismiss">dismiss</button>
            </div>
            <div class="reply-toast-input" id="replyToastInputWrap">
                <input id="replyToastInput" maxlength="400" placeholder="type reply...">
                <button type="button" class="reply-toast-btn" id="replyToastSend">send</button>
            </div>
            <div class="reply-toast-status" id="replyToastStatus"></div>
        `;
        document.body.appendChild(toast);
        return toast;
    }

    function closeActive() {
        active = null;
        const toast = ensureToast();
        toast.classList.remove('active');
        const wrap = document.getElementById('replyToastInputWrap');
        if (wrap) wrap.classList.remove('active');
        const status = document.getElementById('replyToastStatus');
        if (status) status.textContent = '';
        showNext();
    }

    function showNext() {
        if (active || !queue.length) return;
        active = queue.shift();
        const toast = ensureToast();
        const head = document.getElementById('replyToastHead');
        const body = document.getElementById('replyToastBody');
        const open = document.getElementById('replyToastOpen');
        const input = document.getElementById('replyToastInput');
        const wrap = document.getElementById('replyToastInputWrap');
        const status = document.getElementById('replyToastStatus');
        if (!head || !body || !open || !input || !wrap || !status) return;
        head.textContent = `${active.username || 'user'} | ${active.clientMode || 'rift'} replied to you`;
        body.textContent = String(active.text || '');
        open.href = getChatLink(active.roomId || '');
        input.value = '';
        wrap.classList.remove('active');
        status.textContent = '';
        toast.classList.add('active');
    }

    async function api(url, options = {}) {
        const res = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        let payload = null;
        try { payload = await res.json(); } catch { payload = null; }
        if (!res.ok) throw new Error(payload?.error || `request failed (${res.status})`);
        return payload;
    }

    async function sendQuickReply() {
        if (!active) return;
        const input = document.getElementById('replyToastInput');
        const status = document.getElementById('replyToastStatus');
        if (!input || !status) return;
        const text = String(input.value || '').trim();
        if (!text) return;
        status.textContent = 'sending...';
        try {
            await api('/api/chat/messages', {
                method: 'POST',
                body: JSON.stringify({
                    room: active.roomId,
                    text,
                    replyToId: active.id,
                    clientMode: getMode(),
                }),
            });
            status.textContent = 'sent';
            window.setTimeout(closeActive, 500);
        } catch (error) {
            status.textContent = error.message || 'send failed';
        }
    }

    function bindUi() {
        const toast = ensureToast();
        const quick = document.getElementById('replyToastQuick');
        const dismiss = document.getElementById('replyToastDismiss');
        const send = document.getElementById('replyToastSend');
        const input = document.getElementById('replyToastInput');
        const wrap = document.getElementById('replyToastInputWrap');
        if (!toast || !quick || !dismiss || !send || !input || !wrap) return;

        function openQuickInput() {
            wrap.classList.add('active');
            input.focus();
        }

        quick.addEventListener('click', openQuickInput);
        toast.addEventListener('click', (event) => {
            const target = event.target;
            if (target && typeof target.closest === 'function') {
                if (target.closest('button') || target.closest('a') || target.closest('input')) return;
            }
            openQuickInput();
        });
        dismiss.addEventListener('click', closeActive);
        send.addEventListener('click', sendQuickReply);
        input.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                sendQuickReply();
            }
        });
    }

    async function poll() {
        try {
            const payload = await api(`/api/chat/replies?since=${encodeURIComponent(String(since))}`);
            const replies = Array.isArray(payload?.replies) ? payload.replies : [];
            for (const reply of replies) {
                const id = String(reply?.id || '');
                if (!id || seenIds.has(id)) continue;
                seenIds.add(id);
                if (seenIds.size > 500) {
                    const first = seenIds.values().next().value;
                    if (first) seenIds.delete(first);
                }
                queue.push(reply);
                const createdAt = Number(reply?.createdAt) || 0;
                if (createdAt > since) since = createdAt;
            }
            if (queue.length) showNext();
        } catch {
        }
    }

    (async function init() {
        bindUi();
        try {
            const me = await riftGetCachedAuthMe(api);
            if (!me?.authenticated) return;
        } catch {
            return;
        }
        poll();
        pollTimer = window.setInterval(poll, POLL_MS);
    })();
})();

(function () {
    if (window.__riftCallDockBooted) return;
    window.__riftCallDockBooted = true;
    const currentPath = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
    if (currentPath === '/chat' || currentPath === '/nova/chat') return;

    const INCOMING_POLL_MS = 1600;
    const CALL_STATE_POLL_MS = 2200;
    const CALL_SIGNAL_POLL_MS = 900;
    const CALL_PING_MS = 12000;
    let incomingSince = Date.now();
    const seenOfferIds = new Set();
    let activeIncoming = null;
    let meUser = null;

    const call = {
        active: false,
        roomId: '',
        peerId: '',
        peerName: '',
        mode: 'voice',
        localStream: null,
        remoteStream: null,
        pc: null,
        signalSince: 0,
        incomingTimer: null,
        stateTimer: null,
        signalTimer: null,
        pingTimer: null,
        audioCtx: null,
        levelRaf: 0,
        levels: { local: 0, remote: 0 },
    };

    function getMode() {
        try {
            if (window.RiftXMode && typeof window.RiftXMode.get === 'function') {
                return String(window.RiftXMode.get() || '').toLowerCase() === 'nova' ? 'nova' : 'rift';
            }
            const params = new URLSearchParams(window.location.search || '');
            return String(params.get('rx') || '').toLowerCase() === 'nova' ? 'nova' : 'rift';
        } catch {
            return 'rift';
        }
    }

    function getChatLink(roomId) {
        const url = new URL('/chat', window.location.origin);
        if (roomId) url.searchParams.set('room', roomId);
        if (getMode() === 'nova') url.searchParams.set('rx', 'nova');
        return `${url.pathname}${url.search}`;
    }

    async function api(url, options = {}) {
        const res = await fetch(url, {
            credentials: 'include',
            headers: { 'Content-Type': 'application/json', ...(options.headers || {}) },
            ...options,
        });
        let payload = null;
        try { payload = await res.json(); } catch { payload = null; }
        if (!res.ok) throw new Error(payload?.error || `request failed (${res.status})`);
        return payload;
    }

    function injectStyle() {
        if (document.getElementById('rift-call-dock-style')) return;
        const style = document.createElement('style');
        style.id = 'rift-call-dock-style';
        style.textContent = `
            .call-ring{position:fixed;top:12px;left:12px;z-index:17000;display:none;width:min(360px,90vw);border:1px solid rgba(90,220,160,.35);border-radius:12px;background:rgba(7,11,14,.92);backdrop-filter:blur(10px);padding:10px;box-shadow:0 16px 40px rgba(0,0,0,.5)}
            .call-ring.active{display:block}
            .call-ring-head{font-size:12px;color:#fff;letter-spacing:.04em;text-transform:lowercase}
            .call-ring-body{margin-top:6px;font-size:11px;color:rgba(255,255,255,.75);line-height:1.4}
            .call-ring-actions{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
            .call-ring-btn{border:1px solid rgba(255,255,255,.24);background:rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:6px 8px;font-size:10px;cursor:pointer;text-transform:lowercase}
            .call-dock{position:fixed;left:12px;bottom:12px;z-index:16900;width:min(360px,92vw);display:none;border:1px solid rgba(255,255,255,.2);border-radius:12px;background:rgba(8,11,16,.93);backdrop-filter:blur(10px);padding:8px;box-shadow:0 18px 40px rgba(0,0,0,.5)}
            .call-dock.active{display:block}
            .call-dock-head{display:flex;align-items:center;justify-content:space-between;gap:8px}
            .call-dock-title{font-size:11px;color:#fff;text-transform:lowercase}
            .call-dock-users{margin-top:8px;display:flex;gap:6px;flex-wrap:wrap}
            .call-user{font-size:10px;color:rgba(255,255,255,.72);border:1px solid rgba(255,255,255,.18);border-radius:999px;padding:3px 7px;text-transform:lowercase}
            .call-user.speaking{color:#89f7a7;border-color:#44d37f;background:rgba(68,211,127,.12)}
            .call-dock-video{margin-top:8px;display:grid;gap:6px}
            .call-dock-video video{width:100%;border-radius:8px;background:#000;aspect-ratio:16/10;object-fit:cover}
            .call-dock-video .local{width:42%;justify-self:end;aspect-ratio:16/10}
        `;
        document.head.appendChild(style);
    }

    function ensureUi() {
        injectStyle();
        let ring = document.getElementById('call-ring');
        if (!ring) {
            ring = document.createElement('div');
            ring.id = 'call-ring';
            ring.className = 'call-ring';
            ring.innerHTML = `
                <div class="call-ring-head" id="callRingHead"></div>
                <div class="call-ring-body" id="callRingBody"></div>
                <div class="call-ring-actions">
                    <button type="button" class="call-ring-btn" id="callRingAccept">accept</button>
                    <button type="button" class="call-ring-btn" id="callRingDecline">decline</button>
                    <a class="call-ring-btn" id="callRingOpen" href="/chat">open chat</a>
                </div>
            `;
            document.body.appendChild(ring);
        }

        let dock = document.getElementById('call-dock');
        if (!dock) {
            dock = document.createElement('div');
            dock.id = 'call-dock';
            dock.className = 'call-dock';
            dock.innerHTML = `
                <div class="call-dock-head">
                    <div class="call-dock-title" id="callDockTitle"></div>
                    <button type="button" class="call-ring-btn" id="callDockLeave">leave</button>
                </div>
                <div class="call-dock-users" id="callDockUsers"></div>
                <div class="call-dock-video" id="callDockVideo" style="display:none;">
                    <video id="callDockRemote" autoplay playsinline></video>
                    <video id="callDockLocal" class="local" autoplay playsinline muted></video>
                </div>
            `;
            document.body.appendChild(dock);
        }
        return { ring, dock };
    }

    function updateCallUsers() {
        const usersEl = document.getElementById('callDockUsers');
        if (!usersEl) return;
        const localName = meUser?.username || 'you';
        const remoteName = call.peerName || 'peer';
        const localClass = call.levels.local > 0.025 ? 'call-user speaking' : 'call-user';
        const remoteClass = call.levels.remote > 0.025 ? 'call-user speaking' : 'call-user';
        usersEl.innerHTML = `
            <span class="${localClass}">${localName}</span>
            <span class="${remoteClass}">${remoteName}</span>
        `;
    }

    function startLevelMeter(stream, key) {
        if (!stream) return;
        if (!call.audioCtx) {
            const AudioContextCls = window.AudioContext || window.webkitAudioContext;
            if (!AudioContextCls) return;
            call.audioCtx = new AudioContextCls();
        }
        const ctx = call.audioCtx;
        const source = ctx.createMediaStreamSource(stream);
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        const data = new Uint8Array(analyser.frequencyBinCount);

        function tick() {
            analyser.getByteFrequencyData(data);
            let sum = 0;
            for (let i = 0; i < data.length; i += 1) sum += data[i];
            call.levels[key] = (sum / data.length) / 255;
            updateCallUsers();
            call.levelRaf = requestAnimationFrame(tick);
        }
        tick();
    }

    function stopLevelMeter() {
        if (call.levelRaf) cancelAnimationFrame(call.levelRaf);
        call.levelRaf = 0;
        call.levels.local = 0;
        call.levels.remote = 0;
        if (call.audioCtx) {
            try { call.audioCtx.close(); } catch {}
            call.audioCtx = null;
        }
    }

    function hideIncoming() {
        const ring = document.getElementById('call-ring');
        if (ring) ring.classList.remove('active');
        activeIncoming = null;
    }

    function showIncoming(signal) {
        activeIncoming = signal;
        const { ring } = ensureUi();
        const head = document.getElementById('callRingHead');
        const body = document.getElementById('callRingBody');
        const open = document.getElementById('callRingOpen');
        if (!head || !body || !open) return;
        const mode = signal?.payload?.video ? 'video call' : 'voice call';
        head.textContent = `${signal.fromUsername || 'user'} is calling you`;
        body.textContent = `${mode} | room: ${signal?.room?.name || signal.roomId || 'chat'}`;
        open.href = getChatLink(signal.roomId || '');
        ring.classList.add('active');

        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('Incoming call', { body: `${signal.fromUsername || 'user'} (${mode})` });
            } catch {}
        } else if ('Notification' in window && Notification.permission === 'default') {
            Notification.requestPermission().catch(() => {});
        }
    }

    async function sendSignal(type, payload = null) {
        if (!call.active || !call.roomId || !call.peerId) return;
        await api('/api/chat/call/signal', {
            method: 'POST',
            body: JSON.stringify({
                room: call.roomId,
                toUserId: call.peerId,
                type,
                payload,
            }),
        });
    }

    function teardownCallUi() {
        const dock = document.getElementById('call-dock');
        if (dock) dock.classList.remove('active');
        const videoWrap = document.getElementById('callDockVideo');
        const localVideo = document.getElementById('callDockLocal');
        const remoteVideo = document.getElementById('callDockRemote');
        if (videoWrap) videoWrap.style.display = 'none';
        if (localVideo) localVideo.srcObject = null;
        if (remoteVideo) remoteVideo.srcObject = null;
    }

    function clearCallTimers() {
        if (call.stateTimer) clearInterval(call.stateTimer);
        if (call.signalTimer) clearInterval(call.signalTimer);
        if (call.pingTimer) clearInterval(call.pingTimer);
        call.stateTimer = null;
        call.signalTimer = null;
        call.pingTimer = null;
    }

    async function leaveCall() {
        if (!call.active) return;
        try { await sendSignal('hangup', {}); } catch {}
        try {
            await api('/api/chat/call/leave', {
                method: 'POST',
                body: JSON.stringify({ room: call.roomId }),
            });
        } catch {}
        clearCallTimers();
        stopLevelMeter();
        if (call.pc) {
            try { call.pc.close(); } catch {}
        }
        if (call.localStream) call.localStream.getTracks().forEach((t) => t.stop());
        call.active = false;
        call.roomId = '';
        call.peerId = '';
        call.peerName = '';
        call.mode = 'voice';
        call.signalSince = 0;
        call.pc = null;
        call.localStream = null;
        call.remoteStream = null;
        teardownCallUi();
    }

    function setupPeer(peerId, peerName) {
        const pc = new RTCPeerConnection({
            iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }],
        });
        call.pc = pc;
        call.peerId = String(peerId || '');
        call.peerName = String(peerName || 'peer');

        if (call.localStream) {
            call.localStream.getTracks().forEach((track) => pc.addTrack(track, call.localStream));
            startLevelMeter(call.localStream, 'local');
        }

        pc.onicecandidate = (event) => {
            if (!event.candidate) return;
            sendSignal('ice', { candidate: event.candidate }).catch(() => {});
        };
        pc.ontrack = (event) => {
            const stream = event.streams && event.streams[0] ? event.streams[0] : null;
            if (!stream) return;
            call.remoteStream = stream;
            const remoteVideo = document.getElementById('callDockRemote');
            if (remoteVideo) remoteVideo.srcObject = stream;
            startLevelMeter(stream, 'remote');
        };
        pc.onconnectionstatechange = () => {
            if (['closed', 'failed', 'disconnected'].includes(String(pc.connectionState || ''))) {
                leaveCall().catch(() => {});
            }
        };
        return pc;
    }

    function renderDock() {
        const { dock } = ensureUi();
        const title = document.getElementById('callDockTitle');
        const videoWrap = document.getElementById('callDockVideo');
        const localVideo = document.getElementById('callDockLocal');
        if (title) {
            title.textContent = `${call.mode} call | ${call.peerName || 'peer'}`;
        }
        if (videoWrap) videoWrap.style.display = call.mode === 'video' ? '' : 'none';
        if (localVideo) localVideo.srcObject = call.mode === 'video' ? call.localStream : null;
        updateCallUsers();
        dock.classList.add('active');
    }

    async function handleCallSignal(signal) {
        if (!signal || !call.active || String(signal.roomId || '') !== call.roomId) return;
        const type = String(signal.type || '');
        if (!call.pc) setupPeer(signal.fromUserId, signal.fromUsername);
        if (type === 'ice' && signal.payload?.candidate && call.pc) {
            try { await call.pc.addIceCandidate(signal.payload.candidate); } catch {}
            return;
        }
        if (type === 'hangup') {
            await leaveCall();
        }
    }

    async function pollCallSignals() {
        if (!call.active || !call.roomId) return;
        try {
            const payload = await api(`/api/chat/call/signals?room=${encodeURIComponent(call.roomId)}&since=${encodeURIComponent(String(call.signalSince))}`);
            const signals = Array.isArray(payload?.signals) ? payload.signals : [];
            for (const signal of signals) {
                const createdAt = Number(signal?.createdAt || 0);
                if (createdAt > call.signalSince) call.signalSince = createdAt;
                await handleCallSignal(signal);
            }
        } catch {}
    }

    async function pollCallState() {
        if (!call.active || !call.roomId) return;
        try {
            const payload = await api(`/api/chat/call/state?room=${encodeURIComponent(call.roomId)}`);
            if (!payload?.call?.active) {
                await leaveCall();
                return;
            }
            const members = Array.isArray(payload.call.members) ? payload.call.members : [];
            const remote = members.find((entry) => String(entry.userId || '') !== String(meUser?.id || ''));
            if (remote) {
                call.peerId = String(remote.userId || call.peerId);
                call.peerName = String(remote.username || call.peerName || 'peer');
            }
            call.mode = payload.call.mode === 'video' ? 'video' : 'voice';
            renderDock();
        } catch {}
    }

    async function pingCall() {
        if (!call.active || !call.roomId) return;
        try {
            await api('/api/chat/call/ping', {
                method: 'POST',
                body: JSON.stringify({ room: call.roomId }),
            });
        } catch {}
    }

    function startCallLoops() {
        clearCallTimers();
        call.stateTimer = setInterval(() => { pollCallState(); }, CALL_STATE_POLL_MS);
        call.signalTimer = setInterval(() => { pollCallSignals(); }, CALL_SIGNAL_POLL_MS);
        call.pingTimer = setInterval(() => { pingCall(); }, CALL_PING_MS);
    }

    async function acceptIncoming(signal) {
        if (!signal || !signal.payload?.sdp) return;
        if (call.active) await leaveCall();
        hideIncoming();
        const wantsVideo = !!signal.payload.video;
        try {
            call.localStream = await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: wantsVideo,
            });
            const joined = await api('/api/chat/call/join', {
                method: 'POST',
                body: JSON.stringify({
                    room: signal.roomId,
                    video: wantsVideo,
                    clientMode: getMode(),
                }),
            });
            call.active = true;
            call.roomId = String(signal.roomId || '');
            call.mode = joined?.call?.mode === 'video' ? 'video' : (wantsVideo ? 'video' : 'voice');
            call.signalSince = Number(signal.createdAt || Date.now());
            const pc = setupPeer(signal.fromUserId, signal.fromUsername || 'peer');
            await pc.setRemoteDescription(new RTCSessionDescription(signal.payload.sdp));
            const answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            await sendSignal('answer', { sdp: pc.localDescription });
            renderDock();
            startCallLoops();
        } catch {
            await leaveCall();
        }
    }

    async function pollIncoming() {
        try {
            const payload = await api(`/api/chat/call/incoming?since=${encodeURIComponent(String(incomingSince))}`);
            const signals = Array.isArray(payload?.signals) ? payload.signals : [];
            for (const signal of signals) {
                const createdAt = Number(signal?.createdAt || 0);
                if (createdAt > incomingSince) incomingSince = createdAt;
                if (signal.type !== 'offer') continue;
                const id = String(signal.id || '');
                if (!id || seenOfferIds.has(id)) continue;
                seenOfferIds.add(id);
                if (seenOfferIds.size > 500) {
                    const first = seenOfferIds.values().next().value;
                    if (first) seenOfferIds.delete(first);
                }
                if (!call.active) showIncoming(signal);
            }
        } catch {}
    }

    function bindUi() {
        ensureUi();
        const accept = document.getElementById('callRingAccept');
        const decline = document.getElementById('callRingDecline');
        const leave = document.getElementById('callDockLeave');
        if (accept) {
            accept.addEventListener('click', () => { if (activeIncoming) acceptIncoming(activeIncoming); });
        }
        if (decline) {
            decline.addEventListener('click', () => { hideIncoming(); });
        }
        if (leave) {
            leave.addEventListener('click', () => { leaveCall(); });
        }
        window.addEventListener('beforeunload', () => {
            if (!call.active || !call.roomId || !navigator.sendBeacon) return;
            navigator.sendBeacon('/api/chat/call/leave', new Blob([JSON.stringify({ room: call.roomId })], { type: 'application/json' }));
        });
    }

    (async function init() {
        bindUi();
        if (!window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) return;
        try {
            const me = await riftGetCachedAuthMe(api);
            if (!me?.authenticated) return;
            meUser = me.user || null;
        } catch {
            return;
        }
        pollIncoming();
        call.incomingTimer = setInterval(() => { pollIncoming(); }, INCOMING_POLL_MS);
    })();
})();

(function () {
    const STORAGE_KEY = 'rift__mini_player_v1';
    const UPDATE_EVENT = 'rift-mini-player-update';
    const audio = new Audio();
    audio.preload = 'metadata';

    const state = {
        queue: [],
        currentIndex: -1,
        isPlaying: false,
    };

    let elRoot = null;
    let elArt = null;
    let elTitle = null;
    let elTime = null;
    let elPlay = null;

    function safeParse(raw, fallback) {
        try { return JSON.parse(raw); } catch { return fallback; }
    }

    function fmt(seconds) {
        if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
        const s = Math.floor(seconds % 60);
        const m = Math.floor(seconds / 60);
        return `${m}:${String(s).padStart(2, '0')}`;
    }

    function saveState() {
        const payload = {
            queue: state.queue.slice(0, 100),
            currentIndex: state.currentIndex,
            currentTime: Number(audio.currentTime || 0),
            isPlaying: !!state.isPlaying,
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    }

    function loadState() {
        const raw = localStorage.getItem(STORAGE_KEY);
        const parsed = safeParse(raw, null);
        if (!parsed || typeof parsed !== 'object') return;
        state.queue = Array.isArray(parsed.queue) ? parsed.queue : [];
        state.currentIndex = Number.isFinite(parsed.currentIndex) ? parsed.currentIndex : -1;
        if (state.currentIndex >= 0 && state.currentIndex < state.queue.length) {
            const t = state.queue[state.currentIndex];
            audio.src = `/api/music/stream/${encodeURIComponent(t.id)}?provider=${encodeURIComponent(t.provider || 'audius')}`;
            if (Number.isFinite(parsed.currentTime) && parsed.currentTime > 0) {
                audio.currentTime = parsed.currentTime;
            }
            state.isPlaying = !!parsed.isPlaying;
        }
    }

    function currentTrack() {
        if (state.currentIndex < 0 || state.currentIndex >= state.queue.length) return null;
        return state.queue[state.currentIndex];
    }

    function notify() {
        window.dispatchEvent(new CustomEvent(UPDATE_EVENT, {
            detail: {
                queue: state.queue,
                currentIndex: state.currentIndex,
                isPlaying: !audio.paused,
                currentTime: Number(audio.currentTime || 0),
                duration: Number(audio.duration || 0),
                track: currentTrack(),
            },
        }));
    }

    function syncUi() {
        if (!elRoot) return;
        const track = currentTrack();
        if (!track) {
            elRoot.style.display = 'none';
            return;
        }
        elRoot.style.display = '';
        elArt.src = track.artwork || '/favicon.ico';
        elTitle.textContent = track.title || 'Untitled';
        elTime.textContent = `${fmt(audio.currentTime)} / ${fmt(audio.duration)}`;
        elPlay.textContent = audio.paused ? 'play_arrow' : 'pause';
    }

    async function playTrackAt(index, autoplay = true) {
        if (!Number.isFinite(index) || index < 0 || index >= state.queue.length) return;
        state.currentIndex = index;
        const track = state.queue[index];
        audio.src = `/api/music/stream/${encodeURIComponent(track.id)}?provider=${encodeURIComponent(track.provider || 'audius')}`;
        if (autoplay) {
            try { await audio.play(); } catch {}
        }
        syncUi();
        saveState();
        notify();
    }

    async function toggle() {
        if (!currentTrack()) return;
        if (audio.paused) {
            try { await audio.play(); } catch {}
        } else {
            audio.pause();
        }
        syncUi();
        saveState();
        notify();
    }

    function next() {
        if (!state.queue.length) return;
        const nextIndex = state.currentIndex < state.queue.length - 1 ? state.currentIndex + 1 : 0;
        playTrackAt(nextIndex, true);
    }

    function prev() {
        if (!state.queue.length) return;
        const prevIndex = state.currentIndex > 0 ? state.currentIndex - 1 : state.queue.length - 1;
        playTrackAt(prevIndex, true);
    }

    function seekRatio(ratio) {
        const clamped = Math.max(0, Math.min(1, Number(ratio || 0)));
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;
        audio.currentTime = audio.duration * clamped;
        syncUi();
        saveState();
        notify();
    }

    function setQueue(queue, startIndex = 0, autoplay = true) {
        state.queue = Array.isArray(queue) ? queue.slice(0, 100) : [];
        state.currentIndex = -1;
        if (!state.queue.length) {
            audio.pause();
            audio.src = '';
            syncUi();
            saveState();
            notify();
            return;
        }
        playTrackAt(startIndex, autoplay);
    }

    function injectStyle() {
        if (document.getElementById('rift-mini-player-style')) return;
        const style = document.createElement('style');
        style.id = 'rift-mini-player-style';
        style.textContent = `
            .rift-mini-player{position:fixed;left:12px;top:12px;z-index:11000;display:none;width:240px;padding:8px;border-radius:12px;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.72);backdrop-filter:blur(10px)}
            .rift-mini-top{display:grid;grid-template-columns:44px 1fr;gap:8px;align-items:center}
            .rift-mini-art{width:44px;height:44px;border-radius:8px;object-fit:cover;background:#111}
            .rift-mini-title{color:#fff;font-size:11px;line-height:1.2;max-height:2.4em;overflow:hidden}
            .rift-mini-time{color:rgba(255,255,255,.65);font-size:10px;margin-top:2px}
            .rift-mini-controls{margin-top:7px;display:grid;grid-template-columns:repeat(3,1fr);gap:6px}
            .rift-mini-btn{height:28px;border-radius:8px;border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.12);color:#fff;display:grid;place-items:center;cursor:pointer}
            .rift-mini-btn .material-icons{font-size:18px}
        `;
        document.head.appendChild(style);
    }

    function createUi() {
        injectStyle();
        const root = document.createElement('div');
        root.className = 'rift-mini-player';
        root.innerHTML = `
            <div class="rift-mini-top">
                <img class="rift-mini-art" alt="">
                <div>
                    <div class="rift-mini-title"></div>
                    <div class="rift-mini-time"></div>
                </div>
            </div>
            <div class="rift-mini-controls">
                <button class="rift-mini-btn" type="button" data-action="prev"><span class="material-icons">skip_previous</span></button>
                <button class="rift-mini-btn" type="button" data-action="play"><span class="material-icons">play_arrow</span></button>
                <button class="rift-mini-btn" type="button" data-action="next"><span class="material-icons">skip_next</span></button>
            </div>
        `;
        document.body.appendChild(root);
        elRoot = root;
        elArt = root.querySelector('.rift-mini-art');
        elTitle = root.querySelector('.rift-mini-title');
        elTime = root.querySelector('.rift-mini-time');
        elPlay = root.querySelector('[data-action="play"] .material-icons');
        root.querySelector('[data-action="prev"]').addEventListener('click', prev);
        root.querySelector('[data-action="play"]').addEventListener('click', () => { toggle(); });
        root.querySelector('[data-action="next"]').addEventListener('click', next);
    }

    audio.addEventListener('timeupdate', () => { syncUi(); notify(); saveState(); });
    audio.addEventListener('play', () => { state.isPlaying = true; syncUi(); notify(); saveState(); });
    audio.addEventListener('pause', () => { state.isPlaying = false; syncUi(); notify(); saveState(); });
    audio.addEventListener('ended', next);

    window.RiftMiniPlayer = {
        setQueue,
        playTrackAt,
        toggle,
        prev,
        next,
        seekRatio,
        getState() {
            return {
                queue: state.queue,
                currentIndex: state.currentIndex,
                isPlaying: !audio.paused,
                currentTime: Number(audio.currentTime || 0),
                duration: Number(audio.duration || 0),
                track: currentTrack(),
            };
        },
        updateEvent: UPDATE_EVENT,
    };

    window.addEventListener('beforeunload', saveState);
    document.addEventListener('DOMContentLoaded', () => {
        createUi();
        loadState();
        syncUi();
        notify();
    });
})();

