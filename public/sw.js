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

function getEscapedUvTarget(request) {
    const referrer = String(request.referrer || '');
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
            url.pathname.startsWith("/scramjet/") ||
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

        const escapedUvTarget = getEscapedUvTarget(request);
        if (escapedUvTarget) {
            const proxiedRequest = new Request(
                `${self.location.origin}${self.__uv$config.prefix}${self.__uv$config.encodeUrl(escapedUvTarget)}`,
                request
            );
            return await uv.fetch({ request: proxiedRequest });
        }

        if (scramjet.route({ request })) {
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
