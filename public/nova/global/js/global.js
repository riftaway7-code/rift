function normalizeNovaHex(value, fallback = '#ff7a4d') {
    const raw = String(value || '').trim().toLowerCase();
    const short = raw.match(/^#([0-9a-f]{3})$/i);
    if (short) {
        const [a, b, c] = short[1].split('');
        return `#${a}${a}${b}${b}${c}${c}`;
    }
    if (/^#[0-9a-f]{6}$/i.test(raw)) return raw;
    return fallback;
}

function novaHexToRgb(value) {
    const hex = normalizeNovaHex(value, '#ff7a4d').replace('#', '');
    return {
        r: Number.parseInt(hex.slice(0, 2), 16),
        g: Number.parseInt(hex.slice(2, 4), 16),
        b: Number.parseInt(hex.slice(4, 6), 16),
    };
}

function novaRgba(value, alpha = 1) {
    const rgb = novaHexToRgb(value);
    const a = Math.max(0, Math.min(1, Number(alpha)));
    return `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${a})`;
}

function applyNovaCustomThemeFromStorage() {
    let parsed = null;
    try {
        const raw = localStorage.getItem('nova__theme-custom-v1');
        parsed = raw ? JSON.parse(raw) : null;
    } catch {
        parsed = null;
    }
    if (!parsed || typeof parsed !== 'object') {
        document.body.style.removeProperty('--dock-bg');
        document.body.style.removeProperty('--dock-bg-2');
        document.body.style.removeProperty('--dock-surface');
        document.body.style.removeProperty('--dock-surface-soft');
        document.body.style.removeProperty('--dock-border');
        document.body.style.removeProperty('--dock-border-strong');
        document.body.style.removeProperty('--dock-accent');
        document.body.style.removeProperty('--dock-accent-soft');
        document.body.style.removeProperty('--dock-text');
        document.body.style.removeProperty('--dock-muted');
        document.body.style.removeProperty('--dock-subtle');
        return null;
    }

    const base = normalizeNovaHex(parsed.base, '#12131a');
    const accent = normalizeNovaHex(parsed.accent, '#ff7a4d');
    const text = normalizeNovaHex(parsed.text, '#fff2ea');

    document.body.style.setProperty('--dock-bg', base);
    document.body.style.setProperty('--dock-bg-2', normalizeNovaHex(parsed.base2, '#1c1f2b'));
    document.body.style.setProperty('--dock-surface', novaRgba(base, 0.9));
    document.body.style.setProperty('--dock-surface-soft', novaRgba(base, 0.72));
    document.body.style.setProperty('--dock-border', novaRgba(accent, 0.34));
    document.body.style.setProperty('--dock-border-strong', novaRgba(accent, 0.66));
    document.body.style.setProperty('--dock-accent', accent);
    document.body.style.setProperty('--dock-accent-soft', normalizeNovaHex(parsed.accentSoft, '#ffc37a'));
    document.body.style.setProperty('--dock-text', text);
    document.body.style.setProperty('--dock-muted', novaRgba(text, 0.72));
    document.body.style.setProperty('--dock-subtle', novaRgba(text, 0.58));
    return { base, accent, text };
}

document.addEventListener('DOMContentLoaded', function () {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.getRegistration('/').then((registration) => {
            if (registration) registration.update().catch(() => {});
        }).catch(() => {});
    }

    const THEME_KEY = 'nova__theme';
    const savedTheme = localStorage.getItem(THEME_KEY) || 'black';
    document.body.setAttribute('data-theme', savedTheme);
    applyNovaCustomThemeFromStorage();

    const typingText = document.getElementById('typingText');

    // Quotes to cycle through
    const quotes = [
        "nova is online",
        "one library. clean launch flow.",
        "minimal now, sharper every update",
        "build fast. ship clean."
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

    // Start typing effect
    if (typingText) typeEffect();

    // Global constellation background
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        const canvas = document.createElement('canvas');
        canvas.className = 'nova-constellation-canvas';
        document.body.prepend(canvas);
        const ctx = canvas.getContext('2d', { alpha: true });

        let width = 0;
        let height = 0;
        let raf = 0;
        let mouseX = 0;
        let mouseY = 0;
        const stars = [];
        const starCount = 90;
        const connectDistance = 120;

        function resizeConstellation() {
            width = window.innerWidth;
            height = window.innerHeight;
            canvas.width = Math.floor(width * window.devicePixelRatio);
            canvas.height = Math.floor(height * window.devicePixelRatio);
            canvas.style.width = width + 'px';
            canvas.style.height = height + 'px';
            ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
        }

        function seedStars() {
            stars.length = 0;
            for (let i = 0; i < starCount; i++) {
                stars.push({
                    x: Math.random() * width,
                    y: Math.random() * height,
                    vx: (Math.random() - 0.5) * 0.22,
                    vy: (Math.random() - 0.5) * 0.22,
                    r: Math.random() * 1.8 + 0.6,
                });
            }
        }

        function animateConstellation() {
            ctx.clearRect(0, 0, width, height);

            for (const star of stars) {
                star.x += star.vx;
                star.y += star.vy;

                if (star.x < -10) star.x = width + 10;
                if (star.x > width + 10) star.x = -10;
                if (star.y < -10) star.y = height + 10;
                if (star.y > height + 10) star.y = -10;

                ctx.beginPath();
                ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(180, 228, 255, 0.9)';
                ctx.fill();
            }

            for (let i = 0; i < stars.length; i++) {
                for (let j = i + 1; j < stars.length; j++) {
                    const a = stars[i];
                    const b = stars[j];
                    const dx = a.x - b.x;
                    const dy = a.y - b.y;
                    const d = Math.hypot(dx, dy);
                    if (d > connectDistance) continue;

                    const mx = (a.x + b.x) * 0.5;
                    const my = (a.y + b.y) * 0.5;
                    const md = Math.hypot(mx - mouseX, my - mouseY);
                    const mouseBoost = md < 180 ? (1 - md / 180) * 0.22 : 0;
                    const alpha = Math.max(0, (1 - d / connectDistance) * 0.22 + mouseBoost);

                    ctx.beginPath();
                    ctx.moveTo(a.x, a.y);
                    ctx.lineTo(b.x, b.y);
                    ctx.strokeStyle = `rgba(120, 189, 255, ${alpha})`;
                    ctx.lineWidth = 0.9;
                    ctx.stroke();
                }
            }

            raf = requestAnimationFrame(animateConstellation);
        }

        resizeConstellation();
        seedStars();
        mouseX = width * 0.5;
        mouseY = height * 0.5;
        animateConstellation();

        window.addEventListener('resize', () => {
            resizeConstellation();
            seedStars();
        });

        document.addEventListener('mousemove', (event) => {
            mouseX = event.clientX;
            mouseY = event.clientY;
        });

        document.addEventListener('visibilitychange', () => {
            if (document.hidden && raf) {
                cancelAnimationFrame(raf);
                raf = 0;
                return;
            }
            if (!document.hidden && !raf) {
                animateConstellation();
            }
        });
    }

    // Cursor beacon effect
    const cursorLight = document.createElement('div');
    cursorLight.className = 'cursor-light';
    const cursorDot = document.createElement('div');
    cursorDot.className = 'cursor-dot';
    document.body.classList.add('nova-custom-cursor');
    document.body.appendChild(cursorLight);
    document.body.appendChild(cursorDot);

    let cursorTargetX = window.innerWidth * 0.5;
    let cursorTargetY = window.innerHeight * 0.5;
    let cursorRenderX = cursorTargetX;
    let cursorRenderY = cursorTargetY;
    const lightHalf = 70;
    const dotHalf = 5;
    let cursorVisible = true;
    let cursorRaf = 0;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    function setCursorVisible(isVisible) {
        cursorVisible = !!isVisible;
        cursorLight.style.opacity = cursorVisible ? '1' : '0';
        cursorDot.style.opacity = cursorVisible ? '1' : '0';
    }

    function renderCursor() {
        if (!cursorVisible) {
            cursorRaf = requestAnimationFrame(renderCursor);
            return;
        }

        if (reduceMotion) {
            cursorRenderX = cursorTargetX;
            cursorRenderY = cursorTargetY;
        } else {
            cursorRenderX += (cursorTargetX - cursorRenderX) * 0.18;
            cursorRenderY += (cursorTargetY - cursorRenderY) * 0.18;
        }

        cursorLight.style.transform = `translate(${cursorRenderX - lightHalf}px, ${cursorRenderY - lightHalf}px)`;
        cursorDot.style.transform = `translate(${cursorTargetX - dotHalf}px, ${cursorTargetY - dotHalf}px)`;
        cursorRaf = requestAnimationFrame(renderCursor);
    }

    function isViewerActive() {
        const viewer = document.getElementById('game-viewer');
        return !!(viewer && viewer.classList.contains('active'));
    }

    renderCursor();

    document.addEventListener('mousemove', function (e) {
        if (isViewerActive()) {
            setCursorVisible(false);
            return;
        }
        cursorTargetX = e.clientX;
        cursorTargetY = e.clientY;
        setCursorVisible(true);
    });

    document.addEventListener('mouseleave', () => {
        setCursorVisible(false);
    });

    document.addEventListener('mouseenter', () => {
        if (!isViewerActive()) setCursorVisible(true);
    });

    document.addEventListener('click', (e) => {
        if (!cursorVisible || isViewerActive()) return;
        const pulse = document.createElement('div');
        pulse.className = 'cursor-pulse';
        pulse.style.left = e.clientX + 'px';
        pulse.style.top = e.clientY + 'px';
        document.body.appendChild(pulse);
        setTimeout(() => pulse.remove(), 520);
    });

    // Nav toggle
    const nav = document.querySelector('.bottom-nav');
    if (nav) {
        const currentPath = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
        if (!nav.querySelector('[data-nova-chat-nav]')) {
            const chatBtn = document.createElement('button');
            chatBtn.className = 'nav-button';
            chatBtn.setAttribute('data-nova-chat-nav', '1');
            if (currentPath === '/chat' || currentPath === '/nova/chat') {
                chatBtn.classList.add('active');
            }
            chatBtn.innerHTML = '<span class="material-icons">chat</span>';
            chatBtn.addEventListener('click', () => {
                window.location.href = '/nova/chat';
            });

            const settingsBtn = Array.from(nav.querySelectorAll('.nav-button')).find((button) => {
                const onclick = String(button.getAttribute('onclick') || '').toLowerCase();
                return onclick.includes('/settings');
            });
            if (settingsBtn) {
                nav.insertBefore(chatBtn, settingsBtn);
            } else {
                nav.appendChild(chatBtn);
            }
        }

        const toggle = document.createElement('button');
        toggle.className = 'nav-toggle';
        toggle.title = 'Toggle navigation';
        document.body.appendChild(toggle);

        toggle.addEventListener('click', () => {
            nav.classList.toggle('hidden');
            toggle.classList.toggle('nav-is-hidden');
        });
    }

    // Keep the dedicated Nova home on a stable bottom nav so the landing
    // layout does not inherit a stale left/right dock preference.
    const currentPath = String(window.location.pathname || '').replace(/\/+$/, '') || '/';
    const isNovaHome = currentPath === '/nova';
    const savedPosition = isNovaHome ? 'bottom' : (localStorage.getItem('nova__nav-position') || 'bottom');
    document.body.classList.remove('nav-pos-top', 'nav-pos-left', 'nav-pos-right', 'nav-pos-bottom');
    document.body.classList.add('nav-pos-' + savedPosition);

});

// Global auth/save helper for Nova pages.
(function () {
    const SETTINGS_KEYS = [
        'nova__nav-position',
        'nova__launch-mode',
        'nova__disguise-title',
        'nova__disguise-favicon',
        'nova__theme',
        'nova__theme-custom-v1',
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

    window.NovaAuth = {
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

window.NovaTheme = {
    key: 'nova__theme',
    customKey: 'nova__theme-custom-v1',
    allowed: ['black', 'purple', 'blue', 'yellow', 'pink'],
    get() {
        const value = localStorage.getItem(this.key) || 'black';
        return this.allowed.includes(value) ? value : 'black';
    },
    apply(theme) {
        const value = this.allowed.includes(theme) ? theme : 'black';
        localStorage.setItem(this.key, value);
        document.body.setAttribute('data-theme', value);
        applyNovaCustomThemeFromStorage();
        return value;
    },
    getCustomTheme() {
        try {
            const raw = localStorage.getItem(this.customKey);
            if (!raw) return null;
            const parsed = JSON.parse(raw);
            if (!parsed || typeof parsed !== 'object') return null;
            return {
                base: normalizeNovaHex(parsed.base, '#12131a'),
                accent: normalizeNovaHex(parsed.accent, '#ff7a4d'),
                text: normalizeNovaHex(parsed.text, '#fff2ea'),
            };
        } catch {
            return null;
        }
    },
    setCustomTheme(theme) {
        const payload = {
            base: normalizeNovaHex(theme?.base, '#12131a'),
            accent: normalizeNovaHex(theme?.accent, '#ff7a4d'),
            text: normalizeNovaHex(theme?.text, '#fff2ea'),
            base2: normalizeNovaHex(theme?.base2, '#1c1f2b'),
            accentSoft: normalizeNovaHex(theme?.accentSoft, '#ffc37a'),
        };
        localStorage.setItem(this.customKey, JSON.stringify(payload));
        applyNovaCustomThemeFromStorage();
        return payload;
    },
    clearCustomTheme() {
        localStorage.removeItem(this.customKey);
        applyNovaCustomThemeFromStorage();
    },
};

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
        window.setInterval(poll, POLL_MS);
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
