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

function decodeScramjetTarget(requestUrl) {
    try {
        const routeUrl = new URL(requestUrl);
        const prefix = `${self.location.origin}${self.__scramjet$config.prefix}`;
        if (!routeUrl.href.startsWith(prefix)) {
            return null;
        }
        const encodedTarget = routeUrl.href.slice(prefix.length);
        return self.__scramjet$config.codec.decode(encodedTarget);
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
            try {
                const rewrittenTarget = rewriteScramjetTarget(request.url);
                if (rewrittenTarget && rewrittenTarget !== request.url) {
                    const proxiedRequest = new Request(rewrittenTarget, request);
                    const response = await scramjet.fetch({ request: proxiedRequest });
                    return await maybePatchNowggDocument(response, proxiedRequest.url, request.destination);
                }
                const response = await scramjet.fetch({ request });
                return await maybePatchNowggDocument(response, request.url, request.destination);
            } catch (error) {
                const decodedTarget = decodeScramjetTarget(request.url);
                if (
                    decodedTarget &&
                    !isNowggTarget(decodedTarget) &&
                    ["document", "iframe"].includes(request.destination) &&
                    /there are no bare clients/i.test(String(error?.message || error || ""))
                ) {
                    return Response.redirect(
                        `/proxy?url=${encodeURIComponent(decodedTarget)}`,
                        302
                    );
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
