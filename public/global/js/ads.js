"use strict";

(function () {
    const shouldAutoClosePopup = (value) => {
        const raw = String(value || "").trim();
        if (!raw || raw === "about:blank") return false;
        try {
            const url = new URL(raw, window.location.href);
            return url.origin !== window.location.origin;
        } catch {
            return true;
        }
    };

    const installPopupAutoClose = () => {
        if (window.__riftAdsPopupHooked) return;
        if (typeof window.open !== "function") return;
        window.__riftAdsPopupHooked = true;

        const nativeOpen = window.open;
        window.open = function (...args) {
            const popup = nativeOpen.apply(this, args);
            if (popup && shouldAutoClosePopup(args[0])) {
                window.setTimeout(() => {
                    try {
                        if (!popup.closed) popup.close();
                    } catch {}
                }, 150);
                window.setTimeout(() => {
                    try {
                        window.focus();
                    } catch {}
                }, 220);
            }
            return popup;
        };
    };

    installPopupAutoClose();

    const cfg = window._CONFIG?.ads;
    if (!cfg || !cfg.enabled) return;
    if (cfg.provider !== "adsterra") return;

    const scriptUrls = Array.isArray(cfg.scripts)
        ? cfg.scripts.map((u) => String(u || "").trim()).filter(Boolean)
        : [];

    if (!scriptUrls.length) {
        console.warn("[rift-ads] No Adsterra scripts configured in /config.js");
        return;
    }

    if (window.__riftAdsBooted) return;
    window.__riftAdsBooted = true;

    const seen = new Set();
    for (const url of scriptUrls) {
        if (seen.has(url)) continue;
        seen.add(url);

        const script = document.createElement("script");
        script.src = url;
        script.async = true;
        script.dataset.riftAds = "adsterra";
        script.referrerPolicy = "strict-origin-when-cross-origin";
        script.addEventListener("load", () => {
            console.log("[rift-ads] Loaded:", url);
        });
        script.addEventListener("error", () => {
            console.error("[rift-ads] Failed:", url);
        });
        document.head.appendChild(script);
    }
})();

