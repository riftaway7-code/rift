importScripts("/tinyjet/tinyjet/scramjet.all.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const tinyjetConfig = {
  prefix: "/tinyjet/scramjet/",
  files: {
    wasm: "/tinyjet/tinyjet/wasm.wasm",
    all: "/tinyjet/tinyjet/scramjet.all.js",
    sync: "/tinyjet/tinyjet/scramjet.sync.js"
  }
};
self.__scramjet$config = {
  ...(self.__scramjet$config || {}),
  ...tinyjetConfig,
  files: {
    ...((self.__scramjet$config && self.__scramjet$config.files) || {}),
    ...tinyjetConfig.files
  }
};
const scramjet = new ScramjetServiceWorker(self.__scramjet$config);

self.addEventListener("install", () => {
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});
async function normalizeHtmlResponse(request, response) {
  if (!response) {
    return response;
  }
  const contentType = String(response.headers.get("content-type") || "").toLowerCase();
  if (contentType.includes("text/html")) {
    return response;
  }
  try {
    const bodyText = await response.clone().text();
    const trimmed = bodyText.trimStart();
    if (!trimmed.startsWith("<!DOCTYPE html") && !trimmed.startsWith("<html")) {
      return response;
    }
    const headers = new Headers(response.headers);
    headers.set("content-type", "text/html; charset=utf-8");
    headers.delete("x-content-type-options");
    headers.set("content-disposition", "inline");
    return new Response(bodyText, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch {
    return response;
  }
}
async function handleRequest(event) {
  if (!scramjet.route(event)) {
    return await fetch(event.request);
  }
  const response = await scramjet.fetch(event);
  return await normalizeHtmlResponse(event.request, response);
}
self.addEventListener('fetch', (event) => {event.respondWith(handleRequest(event))})
