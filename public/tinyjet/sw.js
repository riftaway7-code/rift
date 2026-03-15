importScripts("./tinyjet/scramjet.all.js");
const { ScramjetServiceWorker } = $scramjetLoadWorker();
const scramjet = new ScramjetServiceWorker()
async function normalizeHtmlResponse(request, response) {
  if (!response || !["document", "iframe"].includes(request.destination)) {
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
  await scramjet.loadConfig()
  if (scramjet.route(event)) {
    const response = await scramjet.fetch(event);
    return await normalizeHtmlResponse(event.request, response);
  }
  return await fetch(event.request)
}
self.addEventListener('fetch', (event) => {event.respondWith(handleRequest(event))})
