import EpoxyTransport from '/epoxy/index.mjs';

function normalizeHeaderEntries(headers) {
    if (!headers) return [];
    if (headers instanceof Headers) return Array.from(headers.entries());
    if (Array.isArray(headers)) return headers;
    if (typeof headers[Symbol.iterator] === 'function') return Array.from(headers);

    return Object.entries(headers).flatMap(([key, value]) => {
        if (Array.isArray(value)) {
            return value.map((entry) => [String(key), String(entry)]);
        }
        return [[String(key), String(value)]];
    });
}

export default class RiftEpoxyTransport extends EpoxyTransport {
    async request(remote, method, body, headers, signal) {
        return await super.request(
            remote,
            method,
            body,
            normalizeHeaderEntries(headers),
            signal
        );
    }

    connect(url, protocols, requestHeaders, onopen, onmessage, onclose, onerror) {
        return super.connect(
            url,
            protocols,
            normalizeHeaderEntries(requestHeaders),
            onopen,
            onmessage,
            onclose,
            onerror
        );
    }
}
