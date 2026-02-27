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
            return fetch(request);
        }

        const isInternalRoute = url.origin === self.location.origin && (
            url.pathname === "/proxy" ||
            url.pathname.startsWith("/assets/") ||
            url.pathname.startsWith("/components/") ||
            url.pathname.startsWith("/global/") ||
            url.pathname.startsWith("/api/")
        );
        if (isInternalRoute) {
            return fetch(request);
        }

        if (scramjet.route({ request })) {
            return await scramjet.fetch({ request });
        }

        return fetch(request);
    } catch (error) {
        console.error("[Rift SW] proxy fetch failed", error);
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
