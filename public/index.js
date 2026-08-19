"use strict";

const form = document.getElementById("sj-form");
const address = document.getElementById("sj-address");
const searchEngine = document.getElementById("sj-search-engine");
const error = document.getElementById("sj-error");
const errorCode = document.getElementById("sj-error-code");
const frame = document.getElementById("sj-frame");

let proxyMode = "scramjet";

const connection = new BareMux.BareMuxConnection("/baremux/worker.js");
const recoveryKey = "rift__index-baremux-recover-v2";
const transportKey = "rift__baremux-transport-v1";

if (typeof ensureBareMuxPortBridge === "function") {
    ensureBareMuxPortBridge("/baremux/worker.js");
}

function clearStoredBareMuxState() {
    try {
        const keys = [];
        for (let index = 0; index < localStorage.length; index += 1) {
            const key = String(localStorage.key(index) || "");
            if (/bare-?mux|mercury/i.test(key)) keys.push(key);
        }
        for (const key of keys) {
            if (key === "bare-mux-path") continue;
            localStorage.removeItem(key);
        }
        localStorage["bare-mux-path"] = "/baremux/worker.js";
    } catch {
    }
}

async function ensureTransport() {
    const wispUrl =
        (location.protocol === "https:" ? "wss" : "ws") +
        "://" +
        location.host +
        "/wisp/";
    const transportOptions = {
        libcurl: {
            path: "/libcurl/index.mjs",
            payload: () => [{ websocket: wispUrl }],
        },
        epoxy: {
            path: "/uv/rift-epoxy.mjs",
            payload: () => [{ wisp: wispUrl }],
        },
    };
    const setPreferredTransport = (name) => {
        try {
            localStorage.setItem(transportKey, name);
        } catch {
        }
    };
    const getTransportOrder = () => {
        let preferred = "libcurl";
        try {
            preferred = String(localStorage.getItem(transportKey) || "libcurl");
        } catch {
        }
        if (!(preferred in transportOptions)) preferred = "libcurl";
        return preferred === "epoxy" ? ["epoxy", "libcurl"] : ["libcurl", "epoxy"];
    };

    let lastError = null;
    for (const mode of getTransportOrder()) {
        try {
            clearStoredBareMuxState();
            localStorage["bare-mux-path"] = "/baremux/worker.js";
            await connection.setTransport(transportOptions[mode].path, transportOptions[mode].payload());
            localStorage["bare-mux-path"] = "/baremux/worker.js";
            setPreferredTransport(mode);
            return;
        } catch (error) {
            lastError = error;
        }
    }
    throw lastError || new Error("failed to initialize bare transport");
}

window.addEventListener("unhandledrejection", (event) => {
    const reason = String(event?.reason?.message || event?.reason || "");
    if (!/invalid MessagePort|there are no bare clients|SSL connect error|Failed to get a ping response/i.test(reason)) return;
    if (sessionStorage.getItem(recoveryKey)) return;
    sessionStorage.setItem(recoveryKey, "1");
    try {
        localStorage.setItem(transportKey, "epoxy");
    } catch {
    }
    clearStoredBareMuxState();
    location.reload();
});

async function testWispSocket(timeoutMs = 8000) {
    const wispUrl =
        (location.protocol === "https:" ? "wss" : "ws") +
        "://" +
        location.host +
        "/wisp/";

    return await new Promise((resolve) => {
        let settled = false;
        const socket = new WebSocket(wispUrl, "wisp-v2");

        const finish = (ok) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            try {
                socket.close();
            } catch {
            }
            resolve(ok);
        };

        const timer = setTimeout(() => finish(false), timeoutMs);

        socket.addEventListener("open", () => finish(true), { once: true });
        socket.addEventListener("error", () => finish(false), { once: true });
        socket.addEventListener("close", () => {
            if (!settled) finish(false);
        }, { once: true });
    });
}

async function testWispHttp() {
    try {
        const response = await fetch("/wisp/", {
            method: "GET",
            cache: "no-store",
            headers: { "cache-control": "no-cache" },
        });
        return response.status === 426;
    } catch {
        return false;
    }
}

function normalizeTarget(raw) {
    const target = search(raw, searchEngine.value);
    try {
        return new URL(target, window.location.origin).toString();
    } catch {
        return null;
    }
}

function encodeTarget(input) {
    const encoder = self.__scramjet$bundle?.rewriters?.url?.encodeUrl;
    if (!encoder) return input;

    const base = window.location.origin;

    try {
        return encoder(input, base);
    } catch (err) {
        const fallback = new URL(input, window.location.origin).toString();
        return encoder(fallback, base);
    }
}

function shouldForcePlainProxy(target) {
    try {
        const u = new URL(target, window.location.origin);
        const host = String(u.hostname || "").toLowerCase();
        const path = String(u.pathname || "").toLowerCase();
        if (host === "websitesball.com" || host.endsWith(".websitesball.com")) return true;
        if (host === "cdn.jsdelivr.net" && path.startsWith("/gh/gn-math/")) return true;
        return false;
    } catch {
        return false;
    }
}

function loadIntoFrame(raw) {
    const target = normalizeTarget(raw);
    if (!target) {
        throw new TypeError("Invalid URL");
    }

    if (proxyMode === "proxy" || shouldForcePlainProxy(target)) {
        frame.src = `/proxy?url=${encodeURIComponent(target)}`;
    } else {
        const encoded = encodeTarget(target);
        frame.src = encoded;
    }

    frame.dataset.url = target;
    frame.classList.add("is-visible");
}

function showError(message, details = "") {
    if (error) error.textContent = message;
    if (errorCode) errorCode.textContent = details;
}

form.addEventListener("submit", async (event) => {
    event.preventDefault();
    showError("", "");

    const raw = address.value.trim();
    if (!raw) return;

    try {
        if (proxyMode === "scramjet" && !shouldForcePlainProxy(normalizeTarget(raw) || "")) {
            await registerSW();
            await ensureTransport();

            let wispAvailable = await testWispSocket();
            if (!wispAvailable) {
                wispAvailable = await testWispHttp();
            }
            if (!wispAvailable) {
                proxyMode = "proxy";
                showError(
                    "Scramjet transport is unavailable here. Using compatibility proxy mode.",
                    "Wisp websocket was not reachable on this deployment."
                );
            }
        }

        loadIntoFrame(raw);
    } catch (err) {
        proxyMode = "proxy";
        console.error("Rift proxy failed to start", err);
        showError(
            "Scramjet failed to start. Using compatibility proxy mode.",
            err?.toString()
        );
        loadIntoFrame(raw);
    }
});

document.getElementById("back-btn")?.addEventListener("click", () => {
    try {
        frame.contentWindow?.history?.back();
    } catch {
        window.history.back();
    }
});

document.getElementById("forward-btn")?.addEventListener("click", () => {
    try {
        frame.contentWindow?.history?.forward();
    } catch {
        window.history.forward();
    }
});

document.getElementById("refresh-btn")?.addEventListener("click", () => {
    try {
        frame.contentWindow?.location?.reload();
    } catch {
        const current = frame.dataset.url;
        if (current) loadIntoFrame(current);
    }
});

document.getElementById("home-btn")?.addEventListener("click", () => {
    frame.removeAttribute("src");
    frame.classList.remove("is-visible");
    address.value = "";
});

const urlParams = new URLSearchParams(window.location.search);
const initialUrl = urlParams.get("url");
if (initialUrl) {
    address.value = initialUrl;
    form.dispatchEvent(new Event("submit"));
}

