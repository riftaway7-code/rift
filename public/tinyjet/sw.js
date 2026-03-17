const SCRAMJET_SW_RESET_KEY = "rift__tinyjet-sw-scramjet-idb-reset-v2";
let scramjetPromise = null;

async function resetScramjetIdbOnce() {
  if (typeof indexedDB === "undefined") {
    return;
  }

  const alreadyReset = self.registration && self.registration[SCRAMJET_SW_RESET_KEY];
  if (alreadyReset) {
    return;
  }

  const names = new Set(["scramjet", "bare-mux", "baremux"]);
  try {
    if (typeof indexedDB.databases === "function") {
      const databases = await indexedDB.databases();
      for (const row of databases || []) {
        const name = String(row?.name || "").trim();
        if (!name) continue;
        if (/scramjet|bare-?mux|mercury/i.test(name)) names.add(name);
      }
    }
  } catch (error) {
    console.warn("[tinyjet-sw] failed to inspect indexeddb databases", error);
  }

  await Promise.all(Array.from(names).map((name) => new Promise((resolve) => {
    try {
      const request = indexedDB.deleteDatabase(name);
      request.onsuccess = () => resolve();
      request.onerror = () => resolve();
      request.onblocked = () => resolve();
    } catch {
      resolve();
    }
  })));

  if (self.registration) {
    self.registration[SCRAMJET_SW_RESET_KEY] = true;
  }
}

async function ensureScramjetWorker() {
  if (!scramjetPromise) {
    scramjetPromise = (async () => {
      await resetScramjetIdbOnce();
      importScripts("./tinyjet/scramjet.all.js");
      const { ScramjetServiceWorker } = $scramjetLoadWorker();
      const scramjet = new ScramjetServiceWorker();
      await scramjet.loadConfig();
      return scramjet;
    })().catch((error) => {
      scramjetPromise = null;
      throw error;
    });
  }

  return await scramjetPromise;
}

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
  const scramjet = await ensureScramjetWorker();
  if (scramjet.route(event)) {
    const response = await scramjet.fetch(event);
    return await normalizeHtmlResponse(event.request, response);
  }
  return await fetch(event.request)
}
self.addEventListener('fetch', (event) => {event.respondWith(handleRequest(event))})
