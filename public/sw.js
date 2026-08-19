importScripts("/global/js/official-scramjet-config.js", "/scramjet/scramjet.all.js");
const RIFT_SCRAMJET_CONFIG = typeof self.__createRiftScramjetConfig === "function"
    ? self.__createRiftScramjetConfig()
    : null;
if (RIFT_SCRAMJET_CONFIG) {
    self.__scramjet$config = RIFT_SCRAMJET_CONFIG;
}
const RIFT_SCRAMJET_PREFIX = String(RIFT_SCRAMJET_CONFIG?.prefix || "/sj2/");
let scramjetWorkerPromise = null;
let scramjetIdbRecoveryPromise = null;
const REQUIRED_SCRAMJET_STORES = [
    "config",
    "cookies",
    "redirectTrackers",
    "referrerPolicies",
    "publicSuffixList",
];

function listScramjetDatabaseNames() {
    const names = new Set([
        "$scramjet",
        "scramjet",
        `${self.location.origin}@$scramjet`,
        `${self.location.origin}@scramjet`,
    ]);

    return Promise.resolve(typeof indexedDB.databases === "function" ? indexedDB.databases() : [])
        .then((databases) => {
            for (const row of databases || []) {
                const name = String(row?.name || "").trim();
                if (!name) continue;
                if (/scramjet|bare-?mux|mercury/i.test(name)) names.add(name);
            }
            return Array.from(names);
        })
        .catch(() => Array.from(names));
}

function deleteDatabase(name) {
    return new Promise((resolve) => {
        try {
            const deleteRequest = indexedDB.deleteDatabase(name);
            deleteRequest.onsuccess = () => resolve();
            deleteRequest.onerror = () => resolve();
            deleteRequest.onblocked = () => resolve();
        } catch {
            resolve();
        }
    });
}

async function deleteScramjetDatabases() {
    const names = await listScramjetDatabaseNames();
    await Promise.all(names.map((name) => deleteDatabase(name)));
}

function createScramjetDatabase(configValue) {
    return new Promise((resolve, reject) => {
        try {
            const request = indexedDB.open("$scramjet", 1);
            request.onupgradeneeded = () => {
                const db = request.result;
                for (const storeName of REQUIRED_SCRAMJET_STORES) {
                    if (!db.objectStoreNames.contains(storeName)) {
                        db.createObjectStore(storeName);
                    }
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                try {
                    if (configValue) {
                        const tx = db.transaction("config", "readwrite");
                        tx.objectStore("config").put(configValue, "config");
                        tx.oncomplete = () => {
                            db.close();
                            resolve();
                        };
                        tx.onerror = () => {
                            db.close();
                            reject(tx.error || new Error("failed to write scramjet config"));
                        };
                        tx.onabort = () => {
                            db.close();
                            reject(tx.error || new Error("failed to initialize scramjet database"));
                        };
                        return;
                    }
                    db.close();
                    resolve();
                } catch (error) {
                    db.close();
                    reject(error);
                }
            };
            request.onerror = () => reject(request.error || new Error("failed to create scramjet database"));
            request.onblocked = () => reject(new Error("scramjet database reset was blocked"));
        } catch (error) {
            reject(error);
        }
    });
}

async function resetScramjetDatabase() {
    await deleteScramjetDatabases();
    await createScramjetDatabase(RIFT_SCRAMJET_CONFIG);
}

function ensureHealthyScramjetDatabase() {
    return new Promise((resolve) => {
        try {
            const request = indexedDB.open("$scramjet");
            request.onupgradeneeded = () => {
                try {
                    const db = request.result;
                    for (const storeName of REQUIRED_SCRAMJET_STORES) {
                        if (!db.objectStoreNames.contains(storeName)) {
                            db.createObjectStore(storeName);
                        }
                    }
                } catch {
                }
            };
            request.onsuccess = () => {
                const db = request.result;
                const missingStore = REQUIRED_SCRAMJET_STORES.some((name) => !db.objectStoreNames.contains(name));
                if (!missingStore) {
                    try {
                        const tx = db.transaction("config", "readonly");
                        const store = tx.objectStore("config");
                        const configRequest = store.get("config");
                        configRequest.onsuccess = () => {
                            const storedConfig = configRequest.result;
                            const wisp = String(storedConfig?.wisp || "");
                            const hasAbsoluteWisp = /^wss?:\/\//i.test(wisp);
                            db.close();
                            if (hasAbsoluteWisp) {
                                resolve();
                                return;
                            }
                            resetScramjetDatabase().then(resolve);
                        };
                        configRequest.onerror = () => {
                            db.close();
                            resetScramjetDatabase().then(resolve);
                        };
                    } catch {
                        db.close();
                        resetScramjetDatabase().then(resolve);
                    }
                    return;
                }

                db.close();
                resetScramjetDatabase().then(resolve);
            };
            request.onerror = () => resolve();
        } catch {
            resolve();
        }
    });
}

async function recoverScramjetDatabaseOnce() {
    if (!scramjetIdbRecoveryPromise) {
        scramjetIdbRecoveryPromise = (async () => {
            scramjetWorkerPromise = null;
            await resetScramjetDatabase();
        })();
    }

    await scramjetIdbRecoveryPromise;
}

async function getScramjetWorker() {
    if (!scramjetWorkerPromise) {
        scramjetWorkerPromise = (async () => {
            await ensureHealthyScramjetDatabase();
            const workerFactory = typeof self.$scramjetLoadWorker === "function"
                ? self.$scramjetLoadWorker()
                : null;
            const ScramjetServiceWorker = workerFactory?.ScramjetServiceWorker;
            if (typeof ScramjetServiceWorker !== "function") {
                throw new Error("Official scramjet worker runtime did not load.");
            }
            return new ScramjetServiceWorker();
        })();
    }

    return await scramjetWorkerPromise;
}

function rewriteScramjetTarget(requestUrl) {
    try {
        const routeUrl = new URL(requestUrl);
        const prefix = `${self.location.origin}${RIFT_SCRAMJET_PREFIX}`;
        if (!routeUrl.href.startsWith(prefix)) {
            return null;
        }

        const encodedTarget = routeUrl.href.slice(prefix.length);
        const decodedTarget = decodeURIComponent(encodedTarget);
        const upstream = new URL(decodedTarget);
        const match = upstream.hostname.match(/^(\d+)\.ip\.[^.]+\.onrender\.com$/i);
        if (!match || !/\.onrender\.com$/i.test(self.location.hostname)) {
            return null;
        }

        upstream.hostname = `${match[1]}.ip.nowgg.fun`;
        return `${prefix}${encodeURIComponent(upstream.toString())}`;
    } catch {
        return null;
    }
}

function decodeScramjetTarget(requestUrl) {
    try {
        const routeUrl = new URL(requestUrl);
        const prefix = `${self.location.origin}${RIFT_SCRAMJET_PREFIX}`;
        if (!routeUrl.href.startsWith(prefix)) {
            return null;
        }
        const encodedTarget = routeUrl.href.slice(prefix.length);
        return decodeURIComponent(encodedTarget);
    } catch {
        return null;
    }
}

function buildNowggNavigationPatch(targetUrl) {
    let upstreamOrigin = "https://nowgg.fun";
    let upstreamHost = "nowgg.fun";
    try {
        const upstream = new URL(targetUrl);
        upstreamOrigin = upstream.origin;
        upstreamHost = upstream.host;
    } catch {}

    return `<script>(function(){const upstreamOrigin=${JSON.stringify(upstreamOrigin)};const upstreamHost=${JSON.stringify(upstreamHost)};function rewriteUrl(input){try{const resolved=new URL(String(input),upstreamOrigin);const bad=resolved.hostname.match(/^(\\d+)\\.ip\\.[^.]+\\.onrender\\.com$/i);if(bad){resolved.protocol='https:';resolved.hostname=bad[1]+'.ip.nowgg.fun';return resolved.toString()}return resolved.toString()}catch{return input}}function patchMethod(target,key){const original=target&&target[key];if(typeof original!=='function')return;target[key]=function(){if(arguments.length>0&&arguments[0])arguments[0]=rewriteUrl(arguments[0]);return original.apply(this,arguments)}}try{const proto=Location.prototype;const hostDesc=Object.getOwnPropertyDescriptor(proto,'host');const hostnameDesc=Object.getOwnPropertyDescriptor(proto,'hostname');const originDesc=Object.getOwnPropertyDescriptor(proto,'origin');if(hostDesc&&hostDesc.get)Object.defineProperty(proto,'host',{configurable:true,enumerable:hostDesc.enumerable,get(){return upstreamHost},set:hostDesc.set});if(hostnameDesc&&hostnameDesc.get)Object.defineProperty(proto,'hostname',{configurable:true,enumerable:hostnameDesc.enumerable,get(){return upstreamHost.split(':')[0]},set:hostnameDesc.set});if(originDesc&&originDesc.get)Object.defineProperty(proto,'origin',{configurable:true,enumerable:originDesc.enumerable,get(){return upstreamOrigin}})}catch{}patchMethod(window.location,'assign');patchMethod(window.location,'replace');patchMethod(window,'open');document.addEventListener('click',function(event){const anchor=event.target&&event.target.closest?event.target.closest('a[href]'):null;if(!anchor)return;const next=rewriteUrl(anchor.href);if(next!==anchor.href)anchor.href=next},true);document.addEventListener('submit',function(event){const form=event.target;if(!form||!form.action)return;const next=rewriteUrl(form.action);if(next!==form.action)form.action=next},true);const pushState=history.pushState;const replaceState=history.replaceState;history.pushState=function(state,title,url){if(url)url=rewriteUrl(url);return pushState.call(this,state,title,url)};history.replaceState=function(state,title,url){if(url)url=rewriteUrl(url);return replaceState.call(this,state,title,url)};})();</script>`;
}

function isNowggTarget(targetUrl) {
    try {
        const host = new URL(targetUrl).hostname.toLowerCase();
        return host === "nowgg.fun"
            || host === "www.nowgg.fun"
            || host === "nowgg.lol"
            || host === "www.nowgg.lol"
            || host === "now.gg"
            || host === "www.now.gg"
            || /^\d+\.ip\.nowgg\.fun$/i.test(host);
    } catch {
        return false;
    }
}

async function maybePatchNowggDocument(response, requestUrl, destination) {
    if (!["document", "iframe"].includes(destination)) {
        return response;
    }

    const decodedTarget = decodeScramjetTarget(requestUrl);
    if (!decodedTarget) {
        return response;
    }

    let targetHost = "";
    try {
        targetHost = new URL(decodedTarget).hostname.toLowerCase();
    } catch {
        return response;
    }

    if (
        targetHost !== "nowgg.fun" &&
        targetHost !== "www.nowgg.fun" &&
        targetHost !== "nowgg.lol" &&
        targetHost !== "www.nowgg.lol" &&
        !/^\d+\.ip\.nowgg\.fun$/i.test(targetHost)
    ) {
        return response;
    }

    const headers = new Headers(response.headers);
    const contentType = headers.get("content-type") || "";
    if (!/text\/html/i.test(contentType)) {
        return response;
    }

    const html = await response.text();
    const patch = buildNowggNavigationPatch(decodedTarget);
    const patchedHtml = /<\/head>/i.test(html)
        ? html.replace(/<\/head>/i, `${patch}</head>`)
        : `${patch}${html}`;

    headers.set("content-type", "text/html; charset=utf-8");
    headers.delete("content-length");

    return new Response(patchedHtml, {
        status: response.status,
        statusText: response.statusText,
        headers,
    });
}

function buildReroutedRequest(targetUrl, request) {
    if (request.mode === "navigate") {
        return new Request(targetUrl, {
            method: "GET",
            headers: request.headers,
            redirect: request.redirect,
            referrer: request.referrer,
            referrerPolicy: request.referrerPolicy,
            credentials: request.credentials,
            cache: request.cache,
            integrity: request.integrity,
            keepalive: request.keepalive,
        });
    }

    return new Request(targetUrl, request);
}

async function handleRequest(event, hasRetriedScramjetIdb = false) {
    const { request } = event;
    try {
        const url = new URL(request.url);
        if (!/^https?:$/i.test(url.protocol)) {
            return await fetch(request);
        }

        const isInternalRoute = url.origin === self.location.origin && (
            url.pathname === "/proxy" ||
            url.pathname === "/embed.html" ||
            url.pathname.startsWith("/assets/") ||
            url.pathname.startsWith("/scramjet/") ||
            url.pathname.startsWith("/tinyjet/") ||
            url.pathname.startsWith("/components/") ||
            url.pathname.startsWith("/global/") ||
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/baremux/") ||
            url.pathname.startsWith("/libcurl/") ||
            url.pathname.startsWith("/epoxy/") ||
            url.pathname.startsWith("/uv/") ||
            url.pathname.startsWith("/wisp/")
        );
        if (isInternalRoute) {
            return await fetch(request);
        }

        if (url.origin === self.location.origin && url.pathname.startsWith(RIFT_SCRAMJET_PREFIX)) {
            try {
                const scramjet = await getScramjetWorker();
                const rewrittenTarget = rewriteScramjetTarget(request.url);
                if (rewrittenTarget && rewrittenTarget !== request.url) {
                    const proxiedRequest = buildReroutedRequest(rewrittenTarget, request);
                    const response = await scramjet.fetch({ request: proxiedRequest });
                    return await maybePatchNowggDocument(response, proxiedRequest.url, request.destination);
                }
                const response = await scramjet.fetch({ request });
                return await maybePatchNowggDocument(response, request.url, request.destination);
            } catch (error) {
                const message = String(error?.message || error || "");
                const isIdbStoreError = error?.name === "NotFoundError" || /object stores? was not found|Failed to execute 'transaction' on 'IDBDatabase'/i.test(message);
                if (isIdbStoreError && !hasRetriedScramjetIdb) {
                    await recoverScramjetDatabaseOnce();
                    return await handleRequest(event, true);
                }
                throw error;
            }
        }

        return await fetch(request);
    } catch (error) {
        const failedUrl = String(request?.url || '');
        const isAdScript = /highperformanceformat\.com|preferencenail\.com|pixel\/purst|laptopchoose\.com/i.test(failedUrl);
        if (!isAdScript) {
            console.error("[Rift SW] proxy fetch failed", error);
        }
        try {
            return await fetch(request);
        } catch {
            return new Response("Proxy fetch failed", {
                status: 502,
                statusText: "Bad Gateway",
            });
        }
    }
}

self.addEventListener("install", () => {
    self.skipWaiting();
});

self.addEventListener("activate", (event) => {
    event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event));
});
