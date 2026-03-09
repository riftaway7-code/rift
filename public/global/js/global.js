const RIFT_APPEARANCE = {
    THEME_KEY: 'rift__theme',
    RAIN_KEY: 'rift__rain-enabled',
    PERFORMANCE_KEY: 'rift__performance-mode',
    CUSTOM_THEME_KEY: 'rift__theme-custom-v1',
    DEFAULT_THEME: 'midnight',
    THEMES: [
        'midnight', 'ocean', 'emerald', 'sunset', 'rose', 'violet',
        'amber', 'crimson', 'arctic', 'graphite', 'neon', 'cobalt'
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

function applyRiftAppearance() {
    if (!document.body) return;

    const rawTheme = String(localStorage.getItem(RIFT_APPEARANCE.THEME_KEY) || RIFT_APPEARANCE.DEFAULT_THEME).toLowerCase();
    const theme = RIFT_APPEARANCE.THEMES.includes(rawTheme) ? rawTheme : RIFT_APPEARANCE.DEFAULT_THEME;

    for (const cls of Array.from(document.body.classList)) {
        if (cls.startsWith('theme-')) document.body.classList.remove(cls);
    }
    document.body.classList.add(`theme-${theme}`);

    const rainEnabled = localStorage.getItem(RIFT_APPEARANCE.RAIN_KEY) !== 'false';
    const performanceMode = localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true';
    document.body.classList.toggle('performance-mode', performanceMode);
    document.body.classList.toggle('rain-disabled', performanceMode || !rainEnabled);

    const custom = readCustomTheme();
    if (custom) {
        document.body.style.setProperty('--rift-bg-base', custom.bg);
        document.body.style.setProperty('--rift-bg-glow-1', rgbaFromHex(custom.glow, 0.26));
        document.body.style.setProperty('--rift-bg-glow-2', rgbaFromHex(custom.glow, 0.18));
        document.body.style.setProperty('--rift-accent', custom.accent);
        document.body.style.setProperty('--rift-accent-soft', rgbaFromHex(custom.accent, 0.3));
        document.body.style.setProperty('--rift-text', rgbaFromHex(custom.text, 0.94));
        document.body.style.setProperty('--rift-text-dim', rgbaFromHex(custom.text, 0.68));
    } else {
        document.body.style.removeProperty('--rift-bg-base');
        document.body.style.removeProperty('--rift-bg-glow-1');
        document.body.style.removeProperty('--rift-bg-glow-2');
        document.body.style.removeProperty('--rift-accent');
        document.body.style.removeProperty('--rift-accent-soft');
        document.body.style.removeProperty('--rift-text');
        document.body.style.removeProperty('--rift-text-dim');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyRiftAppearance, { once: true });
} else {
    applyRiftAppearance();
}

window.addEventListener('storage', (event) => {
    if (
        event.key === RIFT_APPEARANCE.THEME_KEY ||
        event.key === RIFT_APPEARANCE.RAIN_KEY ||
        event.key === RIFT_APPEARANCE.PERFORMANCE_KEY ||
        event.key === RIFT_APPEARANCE.CUSTOM_THEME_KEY
    ) {
        applyRiftAppearance();
    }
});

window.RiftAppearance = {
    ...RIFT_APPEARANCE,
    apply: applyRiftAppearance,
    setTheme(theme) {
        const next = String(theme || '').toLowerCase();
        localStorage.setItem(this.THEME_KEY, this.THEMES.includes(next) ? next : this.DEFAULT_THEME);
        this.apply();
    },
    setRainEnabled(enabled) {
        localStorage.setItem(this.RAIN_KEY, enabled ? 'true' : 'false');
        this.apply();
    },
    setPerformanceMode(enabled) {
        localStorage.setItem(this.PERFORMANCE_KEY, enabled ? 'true' : 'false');
        this.apply();
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
        return payload;
    },
    clearCustomTheme() {
        localStorage.removeItem(this.CUSTOM_THEME_KEY);
        this.apply();
    },
};

const RIFT_BOOT = {
    SESSION_KEY: 'rift__boot-screen-shown-v1',
    FADE_MS: 520,
};

function runRiftBootTerminal(bootRoot, onLoadingShown) {
    const output = bootRoot.querySelector('.rift-boot-terminal-output');
    if (!output) return () => {};

    const lines = [
        'grub rescue> ls',
        '(hd0) (hd0,gpt1)',
        'grub rescue> set prefix=(hd0,gpt1)/boot/grub',
        'grub rescue> set root=(hd0,gpt1)',
        'grub rescue> insmod normal',
        'grub rescue> normal',
        'booting rift kernel...',
        'rift loading...'
    ];

    let stopped = false;
    let loadingNotified = false;
    const timers = [];
    let lineIndex = 0;
    let charIndex = 0;

    function schedule(fn, delay) {
        const timer = window.setTimeout(() => {
            if (!stopped) fn();
        }, delay);
        timers.push(timer);
    }

    function step() {
        if (lineIndex >= lines.length) return;

        const current = lines[lineIndex];
        if (charIndex < current.length) {
            output.textContent += current.charAt(charIndex);
            charIndex += 1;
            schedule(step, 20 + Math.floor(Math.random() * 16));
            return;
        }

        output.textContent += '\n';
        output.scrollTop = output.scrollHeight;
        if (!loadingNotified && current === 'rift loading...') {
            loadingNotified = true;
            if (typeof onLoadingShown === 'function') onLoadingShown();
        }
        lineIndex += 1;
        charIndex = 0;
        schedule(step, 190);
    }

    schedule(step, 220);

    return () => {
        stopped = true;
        for (const timer of timers) window.clearTimeout(timer);
    };
}

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
            <div class="rift-boot-stage rift-boot-stage-terminal is-active">
                <div class="rift-boot-terminal-title">grub rescue mode</div>
                <div class="rift-boot-terminal" aria-hidden="true">
                    <pre class="rift-boot-terminal-output"></pre>
                    <span class="rift-boot-terminal-caret"></span>
                </div>
            </div>
            <div class="rift-boot-stage rift-boot-stage-welcome">
                <div class="rift-boot-logo">Welcome to Rift</div>
                <div class="rift-boot-subtitle">powered by scramjet</div>
                <div class="rift-boot-subtitle">inspired by infamous</div>
                <div class="rift-boot-cta">press space to jump in</div>
            </div>
        </div>
    `;

    document.body.classList.add('rift-boot-active');
    document.body.appendChild(boot);
    const terminalStage = boot.querySelector('.rift-boot-stage-terminal');
    const welcomeStage = boot.querySelector('.rift-boot-stage-welcome');
    let inWelcomeStage = false;
    const stopTerminal = runRiftBootTerminal(boot, () => {
        if (!terminalStage || !welcomeStage) return;
        terminalStage.classList.remove('is-active');
        welcomeStage.classList.add('is-active');
        inWelcomeStage = true;
    });
    let dismissed = false;

    function onBootKeyDown(event) {
        if (event.key === 'Tab') {
            event.preventDefault();
            dismiss();
            return;
        }
        if ((event.key === ' ' || event.code === 'Space') && inWelcomeStage) {
            event.preventDefault();
            dismiss();
        }
    }

    function dismiss() {
        if (dismissed) return;
        dismissed = true;
        stopTerminal();
        document.removeEventListener('keydown', onBootKeyDown, true);
        boot.classList.add('is-exiting');
        document.body.classList.remove('rift-boot-active');
        window.setTimeout(() => boot.remove(), RIFT_BOOT.FADE_MS);
    }

    requestAnimationFrame(() => {
        boot.classList.add('is-visible');
    });

    document.addEventListener('keydown', onBootKeyDown, true);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mountRiftBootScreen, { once: true });
} else {
    mountRiftBootScreen();
}

document.addEventListener('DOMContentLoaded', function () {
    const typingText = document.getElementById('typingText');
    const performanceMode = localStorage.getItem(RIFT_APPEARANCE.PERFORMANCE_KEY) === 'true';
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

document.addEventListener('DOMContentLoaded', () => {
    const savedPosition = localStorage.getItem('rift__nav-position') || 'bottom';
    document.body.classList.add('nav-pos-' + savedPosition);
});

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

