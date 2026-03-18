"use strict";

(function () {
    const AD_HINT_RE = /(adsterra|advert|banner|sponsor|promo|popunder|popup|highperformanceformat|laptopchoose|invoke\.js)/i;
    const BLOCKED_SANDBOX_FLAGS = new Set(["allow-popups", "allow-popups-to-escape-sandbox"]);
    const nativeOpen = typeof window.open === "function" ? window.open.bind(window) : null;

    const shouldAutoClosePopup = (value) => {
        const raw = String(value || "").trim();
        if (!raw || raw === "about:blank") return false;
        if (/^(javascript:|mailto:|tel:|sms:|data:|blob:|#)/i.test(raw)) return false;
        try {
            const url = new URL(raw, window.location.href);
            return url.origin !== window.location.origin;
        } catch {
            return true;
        }
    };

    const schedulePopupClose = (popup) => {
        if (!popup) return;
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
    };

    const readNodeText = (node) => {
        if (!node || !(node instanceof Element)) return "";
        const values = [
            node.id,
            node.className,
            node.getAttribute("name"),
            node.getAttribute("src"),
            node.getAttribute("href"),
            node.getAttribute("data-ad-client"),
            node.getAttribute("data-ad-slot"),
            node.getAttribute("data-zone"),
            node.getAttribute("aria-label"),
            node.getAttribute("title"),
        ];
        return values
            .filter((value) => typeof value === "string" && value.trim())
            .join(" ");
    };

    const isLikelyAdNode = (node) => {
        if (!node || !(node instanceof Element)) return false;
        if (node.dataset.riftAdNode === "1") return true;
        if (AD_HINT_RE.test(readNodeText(node))) return true;
        return false;
    };

    const markAdTree = (root) => {
        if (!root || !(root instanceof Element)) return;
        root.dataset.riftAdNode = "1";
        for (const child of root.querySelectorAll("*")) {
            child.dataset.riftAdNode = "1";
        }
    };

    const hasMarkedAdAncestor = (node) => {
        return !!(node instanceof Element && node.closest("[data-rift-ad-node=\"1\"]"));
    };

    const isLikelyAdInteraction = (node) => {
        if (!(node instanceof Element)) return false;
        let current = node;
        while (current) {
            if (isLikelyAdNode(current)) return true;
            current = current.parentElement;
        }
        return false;
    };

    const hardenAdFrame = (frame) => {
        if (!(frame instanceof HTMLIFrameElement)) return;
        if (frame.dataset.riftAdFrameHardened === "1") return;
        if (!isLikelyAdInteraction(frame) && !hasMarkedAdAncestor(frame)) return;

        const tokens = new Set(
            String(frame.getAttribute("sandbox") || "")
                .split(/\s+/)
                .map((token) => token.trim())
                .filter(Boolean)
        );
        for (const token of BLOCKED_SANDBOX_FLAGS) tokens.delete(token);
        if (!tokens.size) {
            tokens.add("allow-scripts");
            tokens.add("allow-same-origin");
            tokens.add("allow-forms");
        }
        frame.setAttribute("sandbox", Array.from(tokens).join(" "));
        frame.dataset.riftAdFrameHardened = "1";
        frame.dataset.riftAdNode = "1";
    };

    const installAnchorAutoClose = () => {
        if (window.__riftAdsAnchorHooked) return;
        if (!nativeOpen) return;
        window.__riftAdsAnchorHooked = true;

        document.addEventListener(
            "click",
            (event) => {
                if (event.defaultPrevented) return;
                if (event.button !== 0) return;
                if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

                const target = event.target instanceof Element ? event.target.closest("a[href], area[href]") : null;
                if (!target) return;
                if (target.hasAttribute("download")) return;
                if (!isLikelyAdInteraction(target) && !hasMarkedAdAncestor(target)) return;

                const href = target.href || target.getAttribute("href") || "";
                if (!shouldAutoClosePopup(href)) return;

                const openTarget = String(target.getAttribute("target") || "_blank").trim().toLowerCase();
                if (openTarget && openTarget !== "_blank") return;

                event.preventDefault();
                schedulePopupClose(nativeOpen(href, "_blank", "noopener,noreferrer"));
            },
            true
        );
    };

    const installAdMutationObserver = () => {
        if (window.__riftAdsObserverHooked) return;
        if (typeof MutationObserver !== "function") return;
        window.__riftAdsObserverHooked = true;

        const visitNode = (node) => {
            if (!(node instanceof Element)) return;

            if (isLikelyAdNode(node) || hasMarkedAdAncestor(node)) {
                markAdTree(node);
            }

            if (node.matches("iframe")) {
                hardenAdFrame(node);
            }

            for (const element of node.querySelectorAll("*")) {
                if (isLikelyAdNode(element) || hasMarkedAdAncestor(element)) {
                    element.dataset.riftAdNode = "1";
                }
                if (element instanceof HTMLIFrameElement) {
                    hardenAdFrame(element);
                }
            }
        };

        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                for (const node of mutation.addedNodes) {
                    visitNode(node);
                }
            }
        });

        observer.observe(document.documentElement || document.body, {
            childList: true,
            subtree: true,
        });

        for (const element of document.querySelectorAll("*")) {
            visitNode(element);
        }
    };

    const installPopupAutoClose = () => {
        if (window.__riftAdsPopupHooked) return;
        if (!nativeOpen) return;
        window.__riftAdsPopupHooked = true;

        window.open = function (...args) {
            const popup = nativeOpen(...args);
            if (popup && shouldAutoClosePopup(args[0])) {
                schedulePopupClose(popup);
            }
            return popup;
        };
    };

    installPopupAutoClose();
    installAnchorAutoClose();
    installAdMutationObserver();

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
        script.dataset.riftAdNode = "1";
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

