importScripts(
    "/uv/uv.bundle.js",
    "/uv/uv.config.js",
    "/uv/uv.sw.js",
    "/assets/scramjet/scramjet.codecs.js",
    "/assets/scramjet/scramjet.config.js",
    "/assets/scramjet/scramjet.bundle.js",
    "/assets/scramjet/scramjet.worker.js"
);

const uv = new UVServiceWorker(self.__uv$config);
const uvContext = new Ultraviolet(self.__uv$config);
uvContext.meta.origin = self.location.origin;
const scramjet = new ScramjetServiceWorker(self.__scramjet$config);

function rewriteScramjetTarget(requestUrl) {
    try {
        const routeUrl = new URL(requestUrl);
        const prefix = `${self.location.origin}${self.__scramjet$config.prefix}`;
        if (!routeUrl.href.startsWith(prefix)) {
            return null;
        }

        const encodedTarget = routeUrl.href.slice(prefix.length);
        const decodedTarget = self.__scramjet$config.codec.decode(encodedTarget);
        const upstream = new URL(decodedTarget);
        const match = upstream.hostname.match(/^(\d+)\.ip\.[^.]+\.onrender\.com$/i);
        if (!match || !/\.onrender\.com$/i.test(self.location.hostname)) {
            return null;
        }

        upstream.hostname = `${match[1]}.ip.nowgg.fun`;
        return `${prefix}${self.__scramjet$config.codec.encode(upstream.toString())}`;
    } catch {
        return null;
    }
}

async function getEscapedUvTarget(event) {
    const { request, clientId } = event;
    let activeClientUrl = '';

    if (clientId) {
        try {
            const client = await self.clients.get(clientId);
            activeClientUrl = String(client?.url || '');
        } catch {
            activeClientUrl = '';
        }
    }

    const referrer = activeClientUrl || String(request.referrer || '');
    if (!referrer.startsWith(self.location.origin + self.__uv$config.prefix)) {
        return null;
    }

    try {
        const requestUrl = new URL(request.url);
        if (requestUrl.origin !== self.location.origin) {
            return null;
        }

        const sourceReferrer = new URL(uvContext.sourceUrl(referrer));
        return new URL(
            `${requestUrl.pathname}${requestUrl.search}${requestUrl.hash}`,
            sourceReferrer
        ).toString();
    } catch {
        return null;
    }
}

async function handleRequest(event) {
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
            url.pathname.startsWith("/components/") ||
            url.pathname.startsWith("/global/") ||
            url.pathname.startsWith("/api/") ||
            url.pathname.startsWith("/baremux/") ||
            url.pathname.startsWith("/libcurl/") ||
            url.pathname.startsWith("/epoxy/") ||
            (url.pathname.startsWith("/uv/") && !url.pathname.startsWith(self.__uv$config.prefix)) ||
            url.pathname.startsWith("/wisp/")
        );
        if (isInternalRoute) {
            return await fetch(request);
        }

        if (uv.route({ request })) {
            return await uv.fetch({ request });
        }

        const escapedUvTarget = await getEscapedUvTarget(event);
        if (escapedUvTarget) {
            const proxiedRequest = new Request(
                `${self.location.origin}${self.__uv$config.prefix}${self.__uv$config.encodeUrl(escapedUvTarget)}`,
                request
            );
            return await uv.fetch({ request: proxiedRequest });
        }

        if (scramjet.route({ request })) {
            const rewrittenTarget = rewriteScramjetTarget(request.url);
            if (rewrittenTarget && rewrittenTarget !== request.url) {
                const proxiedRequest = new Request(rewrittenTarget, request);
                return await scramjet.fetch({ request: proxiedRequest });
            }
            return await scramjet.fetch({ request });
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

self.addEventListener("fetch", (event) => {
    event.respondWith(handleRequest(event));
});
