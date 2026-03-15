importScripts(
    "/assets/scramjet/scramjet.codecs.js",
    "/assets/scramjet/scramjet.config.js",
    "/assets/scramjet/scramjet.bundle.js",
    "/assets/scramjet/scramjet.worker.js"
);

const scramjet = new ScramjetServiceWorker(self.__scramjet$config);

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
            url.pathname.startsWith("/wisp/")
        );
        if (isInternalRoute) {
            return await fetch(request);
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
