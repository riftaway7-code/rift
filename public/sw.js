importScripts(
    "/scramjet/scramjet.codecs.js",
    "/scramjet/scramjet.config.js",
    "/scramjet/scramjet.bundle.js",
    "/scramjet/scramjet.worker.js"
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
            url.pathname.startsWith("/assets/") ||
            url.pathname.startsWith("/components/") ||
            url.pathname.startsWith("/global/") ||
            url.pathname.startsWith("/api/")
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
