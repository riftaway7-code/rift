const express = require('express');
const path = require('path');
const fs = require('fs').promises;
const dns = require('dns').promises;
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

app.use((req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
});
app.use(express.json({ limit: '1mb' }));

const VALIDATE_TARGET_IPS = (process.env.VALIDATE_TARGET_IPS || '161.153.8.72')
    .split(',')
    .map((ip) => ip.trim())
    .filter(Boolean);

const validateCache = new Map();
const VALIDATE_TTL_MS = 60 * 1000;
const SDXP_HTML_ROOT = path.join(__dirname, '..', 'public', 'sdxp', 'html');
const GN_MATH_ZONES_JSON = 'https://cdn.jsdelivr.net/gh/gn-math/assets@main/zones.json';
const GN_MATH_BASE = 'https://cdn.jsdelivr.net/gh/gn-math/';
const GN_MATH_HTML_BASE = new URL('html@main/', GN_MATH_BASE).href;
const GN_MATH_COVER_BASE = new URL('covers@main/', GN_MATH_BASE).href;
const SDXP_FALLBACK_BASE = 'https://strongdog.com/';
const DUCKMATH_GAMES_PAGE = 'https://duckmath.org/g4m3s.html';
const DUCKMATH_BASE = 'https://duckmath.org/';
const CCPORTED_TREE_API = 'https://api.github.com/repos/ccported/games/git/trees/main?recursive=1';
const CCPORTED_RAW_BASE = 'https://raw.githubusercontent.com/ccported/games/main/';
const UGS_TREE_API = 'https://api.github.com/repos/bubbls/UGS-Assets/git/trees/main?recursive=1';
const UGS_RAW_BASE = 'https://raw.githubusercontent.com/bubbls/UGS-Assets/main/';
const SELENITE_TREE_API = 'https://api.github.com/repos/selenite-cc/selenite-old/git/trees/main?recursive=1';
const SELENITE_RAW_BASE = 'https://raw.githubusercontent.com/selenite-cc/selenite-old/main/';
const RADON_TREE_API = 'https://api.github.com/repos/Radon-Games/Radon-Games-Assets/git/trees/main?recursive=1';
const RADON_RAW_BASE = 'https://raw.githubusercontent.com/Radon-Games/Radon-Games-Assets/main/';
const FYINX_TREE_API = 'https://api.github.com/repos/aukak/fyinx/git/trees/main?recursive=1';
const FYINX_RAW_BASE = 'https://raw.githubusercontent.com/aukak/fyinx/main/';
const ELITE_TREE_API = 'https://api.github.com/repos/elite-gamez/Elite_gamez_games/git/trees/main?recursive=1';
const ELITE_RAW_BASE = 'https://raw.githubusercontent.com/elite-gamez/Elite_gamez_games/main/';
const CCPORTED_TITLE_SUFFIX_RE = /\s*(?:\||-)?\s*Unblocked on CCPorted\s*$/i;
const TRUFFLED_GAMES_JSON = 'https://truffled.lol/js/json/g.json';
const TRUFFLED_LOCAL_JSON = path.join(__dirname, '..', 'truffled.g.json');
const TRUFFLED_BASE = 'https://truffled.lol/';
const TRUFFLED_ROOT_MANIFEST = path.join(__dirname, '..', 'data', 'truffled-root-manifest.json');
const PETEZAH_GAMES_JSON = 'https://petezahgames.com/storage/data/collection.json';
const PETEZAH_LEGACY_GAMES_JSON = 'https://cdn.jsdelivr.net/gh/PeteZah-G/singlefile-json@main/search.json';
const PETEZAH_BASE = 'https://petezahgames.com/';
const TOTALLY_SCIENCE_BASE = 'https://d11jzht7mj96rr.cloudfront.net/';
const VELARA_GAMES_JSON = 'https://velara.my/data/games.json';
const VELARA_BASE = 'https://velara.my/';
const VELARA_ORIGIN = 'https://velara.my';
const SERAPH_GAMES_API = 'https://api.github.com/repos/a456pur/seraph/contents/games';
const SERAPH_BASE = 'https://raw.githubusercontent.com/a456pur/seraph/main/';
const AUDIUS_API_BASE = 'https://discoveryprovider.audius.co';
const JAMENDO_API_BASE = 'https://api.jamendo.com/v3.0';
const JAMENDO_CLIENT_ID = String(process.env.JAMENDO_CLIENT_ID || '').trim();
const AUTH_DB_PATH = process.env.AUTH_DB_PATH
    ? path.resolve(process.env.AUTH_DB_PATH)
    : (process.env.VERCEL
        ? path.join('/tmp', 'rift-data', 'auth-db.json')
        : path.join(__dirname, '..', 'data', 'auth-db.json'));
const SESSION_COOKIE = 'rift_sid';
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const ACTIVE_USER_WINDOW_MS = 1000 * 60 * 10; // 10 minutes
const PRESENCE_TTL_MS = 1000 * 60; // 60 seconds
const CHAT_ROOM_INACTIVE_TTL_MS = 1000 * 60 * 60 * 24; // 24 hours
const SYSTEM_CHAT_ROOM_IDS = new Set(['lobby', 'links']);
const RESERVED_TOP_LEVEL_PATHS = new Set([
    'api',
    'gn',
    'gn-catalog',
    'proxy',
    'assets',
    'components',
    'scramjet',
    'baremux',
    'libcurl',
    'wisp',
    'validate',
    'sdxp',
    'sdxp-catalog',
    'duckmath-catalog',
    'ccported-catalog',
    'ugs-catalog',
    'slnte-catalog',
    'rdn-catalog',
    'fyinx-catalog',
    'eltgmz-catalog',
    'dkmath',
    'ccptd',
    'ugs',
    'slnte',
    'rdn',
    'fyinx',
    'eltgmz',
    'truffled-catalog',
    'pzlite',
    'pzlite-catalog',
    'truf',
    'tllysc',
    'vlra',
    'sph',
    'totalscience-catalog',
    'velara-catalog',
    'seraph-catalog',
    'astra',
    'astra-accounts',
]);
const TRUFFLED_ALIAS_CACHE_TTL_MS = 5 * 60 * 1000;
const DUCKMATH_CACHE_TTL_MS = 5 * 60 * 1000;
const DUCKMATH_RESOLVED_TTL_MS = 30 * 60 * 1000;
const CCPORTED_CACHE_TTL_MS = 5 * 60 * 1000;
const UGS_CACHE_TTL_MS = 5 * 60 * 1000;
const SELENITE_CACHE_TTL_MS = 5 * 60 * 1000;
const RADON_CACHE_TTL_MS = 5 * 60 * 1000;
const FYINX_CACHE_TTL_MS = 5 * 60 * 1000;
const ELITE_CACHE_TTL_MS = 5 * 60 * 1000;
const PETEZAH_CACHE_TTL_MS = 5 * 60 * 1000;
const TOTALLY_SCIENCE_CACHE_TTL_MS = 5 * 60 * 1000;
const TOTALLY_SCIENCE_RESOLVED_TTL_MS = 30 * 60 * 1000;
const VELARA_CACHE_TTL_MS = 5 * 60 * 1000;
const VELARA_RESOLVED_TTL_MS = 30 * 60 * 1000;
const SERAPH_CACHE_TTL_MS = 5 * 60 * 1000;
let authWriteLock = Promise.resolve();
const presenceMap = new Map();
let truffledAliasCache = { expiresAt: 0, map: new Map() };
let duckMathCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let ccportedCatalogCache = { expiresAt: 0, items: [], map: new Map() };
const ccportedNameCache = new Map();
let ugsCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let seleniteCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let radonCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let fyinxCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let eliteCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let petezahCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let totallyScienceCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let velaraCatalogCache = { expiresAt: 0, items: [], map: new Map() };
let seraphCatalogCache = { expiresAt: 0, items: [], map: new Map() };
const totallyScienceResolvedLaunchCache = new Map();
const velaraResolvedLaunchCache = new Map();
const duckMathResolvedLaunchCache = new Map();

const GN_MATH_BLOCKED_HTML_FILES = new Set([
    '114-f.html',
    '265.html',
    '303.html',
    '469.html',
]);

async function readRawBody(req) {
    return await new Promise((resolve, reject) => {
        const chunks = [];
        req.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
        req.on('end', () => resolve(Buffer.concat(chunks)));
        req.on('error', reject);
    });
}

async function proxyVelara(req, res, basePath, tail = '') {
    try {
        const normalizedTail = tail ? `/${tail}` : '';
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const targetUrl = `${VELARA_ORIGIN}${basePath}${normalizedTail}${query}`;

        const method = req.method || 'GET';
        const isBodyMethod = !['GET', 'HEAD'].includes(method.toUpperCase());
        const body = isBodyMethod ? await readRawBody(req) : undefined;

        const headers = {};
        const blocked = new Set([
            'host',
            'connection',
            'content-length',
            'accept-encoding',
            'x-forwarded-for',
            'x-forwarded-host',
            'x-forwarded-proto',
        ]);
        for (const [name, value] of Object.entries(req.headers || {})) {
            if (!name || blocked.has(String(name).toLowerCase())) continue;
            if (typeof value === 'undefined') continue;
            headers[name] = value;
        }

        const upstream = await fetch(targetUrl, {
            method,
            headers,
            body,
        });

        res.status(upstream.status);
        const contentType = upstream.headers.get('content-type');
        if (contentType) res.setHeader('Content-Type', contentType);
        const setCookie = upstream.headers.get('set-cookie');
        if (setCookie) res.setHeader('Set-Cookie', setCookie);

        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.send(raw);
    } catch (error) {
        return res.status(502).json({ error: `velara astra proxy failed: ${error.message}` });
    }
}

function humanizeFolderName(folder) {
    return folder
        .replace(/[-_]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/\b\w/g, (c) => c.toUpperCase());
}

function toTruffledLocalSlug(input) {
    return String(input || '')
        .trim()
        .replace(/^\/+/, '')
        .replace(/[?#].*$/, '')
        .replace(/\.html?$/i, '')
        .replace(/[^a-z0-9/_\-\.]+/gi, '-')
        .replace(/\/+/g, '/')
        .replace(/^-+|-+$/g, '')
        .replace(/\//g, '__');
}

function normalizeGnMathHtmlPath(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';

    let htmlPath = '';
    const placeholder = raw.match(/\{HTML_URL\}\/(.+?\.html?)(?:[?#].*)?$/i);
    if (placeholder && placeholder[1]) {
        htmlPath = placeholder[1];
    } else {
        try {
            const parsed = new URL(raw, GN_MATH_BASE);
            if (/^\/?html@main\//i.test(parsed.pathname)) {
                htmlPath = parsed.pathname.replace(/^\/?html@main\//i, '');
            }
        } catch {
            return '';
        }
    }

    const cleaned = htmlPath
        .replace(/^\/+/, '')
        .replace(/[?#].*$/, '')
        .replace(/\\/g, '/');
    if (!cleaned || cleaned.includes('..')) return '';
    if (!/\.html?$/i.test(cleaned)) return '';
    const file = cleaned.split('/').pop() || '';
    if (GN_MATH_BLOCKED_HTML_FILES.has(file.toLowerCase())) return '';
    return cleaned;
}

function buildGnMathCoverUrl(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    if (raw.includes('{COVER_URL}')) {
        return raw.replace(/\{COVER_URL\}/g, GN_MATH_COVER_BASE.replace(/\/+$/, ''));
    }
    try {
        return new URL(raw, GN_MATH_COVER_BASE).href;
    } catch {
        return '';
    }
}

function encodePathForUrl(pathValue) {
    return String(pathValue || '')
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');
}

function guessContentTypeFromPath(pathValue) {
    const ext = path.extname(String(pathValue || '').toLowerCase());
    switch (ext) {
        case '.html':
        case '.htm':
            return 'text/html; charset=utf-8';
        case '.js':
        case '.mjs':
            return 'application/javascript; charset=utf-8';
        case '.css':
            return 'text/css; charset=utf-8';
        case '.json':
            return 'application/json; charset=utf-8';
        case '.wasm':
            return 'application/wasm';
        case '.svg':
            return 'image/svg+xml';
        case '.png':
            return 'image/png';
        case '.jpg':
        case '.jpeg':
            return 'image/jpeg';
        case '.gif':
            return 'image/gif';
        case '.webp':
            return 'image/webp';
        case '.ico':
            return 'image/x-icon';
        case '.mp3':
            return 'audio/mpeg';
        case '.ogg':
            return 'audio/ogg';
        case '.wav':
            return 'audio/wav';
        default:
            return '';
    }
}

function normalizeTruffledCatalogHref(value) {
    const href = String(value || '').trim();
    if (!href) return '';

    let pathValue = href;
    if (/^(?:https?:)?\/\//i.test(pathValue)) {
        try {
            const parsed = new URL(pathValue.startsWith('//') ? `https:${pathValue}` : pathValue);
            if (!/(^|\.)truffled\.lol$/i.test(parsed.hostname)) return '';
            pathValue = String(parsed.pathname || '');
        } catch {
            return '';
        }
    }

    pathValue = pathValue.replace(/[?#].*$/, '').replace(/^\/+/, '');
    if (!pathValue) return '';

    try {
        pathValue = decodeURIComponent(pathValue);
    } catch {
    }

    if (!(pathValue.startsWith('games/') || pathValue.startsWith('gamefile/'))) return '';
    return pathValue;
}

function resolveTruffledMappedFile(rootMap, normalizedHref) {
    const direct = String(rootMap?.[normalizedHref] || '').trim().replace(/^\/+/, '');
    if (direct) return direct;

    const target = String(normalizedHref || '').replace(/[?#].*$/, '');
    if (!target) return '';

    for (const [rawKey, rawValue] of Object.entries(rootMap || {})) {
        const candidate = String(rawKey || '').replace(/[?#].*$/, '');
        if (candidate !== target) continue;
        const mapped = String(rawValue || '').trim().replace(/^\/+/, '');
        if (mapped) return mapped;
    }
    return '';
}

function deriveTruffledCanonicalSlug(inputHref, mappedFile = '') {
    const href = String(inputHref || '').trim().replace(/^\/+/, '').replace(/[?#].*$/, '');
    if (!href) return '';

    const gamesMatch = href.match(/^games\/([^/]+)\/index\.html$/i);
    if (gamesMatch && gamesMatch[1]) return String(gamesMatch[1]).toLowerCase();

    const gamefileMatch = href.match(/^gamefile\/(.+)\.html$/i);
    if (gamefileMatch && gamefileMatch[1]) {
        const segments = String(gamefileMatch[1]).split('/').filter(Boolean);
        const last = segments.length ? segments[segments.length - 1] : '';
        if (last) return last.toLowerCase();
    }

    const fileSlug = String(mappedFile || '').trim().replace(/\.html?$/i, '').toLowerCase();
    if (fileSlug) return fileSlug;

    return toTruffledLocalSlug(href).toLowerCase();
}

function deriveTruffledSlugCandidates(inputHref, mappedFile = '') {
    const out = new Set();
    const canonical = deriveTruffledCanonicalSlug(inputHref, mappedFile);
    if (canonical) out.add(canonical);

    const href = String(inputHref || '').trim().replace(/^\/+/, '').replace(/[?#].*$/, '');
    if (href) out.add(toTruffledLocalSlug(href).toLowerCase());

    const fileSlug = String(mappedFile || '').trim().replace(/\.html?$/i, '').toLowerCase();
    if (fileSlug) out.add(fileSlug);
    return out;
}

async function buildTruffledAliasMap() {
    let payload = null;
    try {
        const localRaw = await fs.readFile(TRUFFLED_LOCAL_JSON, 'utf8');
        payload = JSON.parse(localRaw);
    } catch {}

    if (!payload) {
        try {
            const response = await fetch(TRUFFLED_GAMES_JSON);
            if (response.ok) payload = await response.json();
        } catch {}
    }

    const rootMap = await readTruffledRootMap();
    const rows = Array.isArray(payload?.games) ? payload.games : [];
    const aliases = new Map();

    const sourceHrefs = rows.length
        ? rows.map((row) => normalizeTruffledCatalogHref(row?.url)).filter(Boolean)
        : Object.keys(rootMap).map((href) => normalizeTruffledCatalogHref(href)).filter(Boolean);

    for (const normalized of sourceHrefs) {
        const mappedFile = resolveTruffledMappedFile(rootMap, normalized);
        const targetUrl = new URL(normalized, TRUFFLED_BASE).href;
        const entry = { localFile: mappedFile, targetUrl };

        for (const rawSlug of deriveTruffledSlugCandidates(normalized, mappedFile)) {
            for (const slug of new Set([rawSlug, toLaunchSlug(rawSlug, '')])) {
                if (!slug) continue;
                const existing = aliases.get(slug);
                if (!existing || (!existing.localFile && entry.localFile)) {
                    aliases.set(slug, entry);
                }
            }
        }
    }

    return aliases;
}

async function getTruffledAliasMap() {
    const now = Date.now();
    if (truffledAliasCache.map.size > 0 && now < truffledAliasCache.expiresAt) {
        return truffledAliasCache.map;
    }

    const built = await buildTruffledAliasMap();
    truffledAliasCache = {
        map: built,
        expiresAt: now + TRUFFLED_ALIAS_CACHE_TTL_MS,
    };
    return truffledAliasCache.map;
}

async function readTruffledRootMap() {
    try {
        const raw = await fs.readFile(TRUFFLED_ROOT_MANIFEST, 'utf8');
        const parsed = JSON.parse(raw);
        const map = parsed?.map && typeof parsed.map === 'object' ? parsed.map : {};
        return map;
    } catch {
        return {};
    }
}

function toLaunchSlug(input, fallback = 'game') {
    const slug = String(input || '')
        .trim()
        .toLowerCase()
        .replace(/\.html?$/i, '')
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return slug || fallback;
}

function normalizePetezahSourceUrl(value) {
    let raw = String(value || '').trim();
    if (!raw) return '';

    if (!/^https?:\/\//i.test(raw) && /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) {
        raw = `https://${raw}`;
    }

    try {
        const parsed = new URL(raw, PETEZAH_BASE);
        if (!/^https?:$/i.test(parsed.protocol)) return '';

        const host = String(parsed.hostname || '').toLowerCase();
        const pathname = String(parsed.pathname || '');

        let gamePath = '';
        if (host === 'cdn.jsdelivr.net') {
            const match = pathname.match(/^\/gh\/PeteZah-Games\/PeteZahGames@[^/]+\/public\/(storage\/ag\/.+)$/i);
            if (match && match[1]) {
                gamePath = `/${match[1]}`;
            }
        } else if (host === 'petezahgames.com' || host.endsWith('.petezahgames.com')) {
            if (/^\/storage\/ag\/.+/i.test(pathname)) {
                gamePath = pathname;
            } else if (/^\/iframe\.html$/i.test(pathname)) {
                const inner = String(parsed.searchParams.get('url') || '').trim();
                if (inner) {
                    try {
                        const innerUrl = new URL(inner, PETEZAH_BASE);
                        if (/^https?:$/i.test(innerUrl.protocol)) {
                            return innerUrl.href;
                        }
                    } catch {
                    }
                }
            }
        }

        if (gamePath) {
            return new URL(gamePath, PETEZAH_BASE).href;
        }

        return parsed.href;
    } catch {
        return '';
    }
}

function normalizePetezahCoverUrl(value) {
    let raw = String(value || '').trim();
    if (!raw) return '';

    if (/^\/\//.test(raw)) raw = `https:${raw}`;
    if (!/^https?:\/\//i.test(raw) && /^[a-z0-9.-]+\.[a-z]{2,}(?:\/|$)/i.test(raw)) {
        raw = `https://${raw}`;
    }

    try {
        const parsed = new URL(raw, PETEZAH_BASE);
        if (!/^https?:$/i.test(parsed.protocol)) return '';
        return parsed.href;
    } catch {
        return '';
    }
}

function derivePetezahSlug(targetUrl, label, index) {
    let candidate = '';
    try {
        const parsed = new URL(targetUrl);
        if (/^\/iframe\.html$/i.test(String(parsed.pathname || ''))) {
            const inner = String(parsed.searchParams.get('url') || '').trim();
            if (inner) {
                try {
                    const innerParsed = new URL(inner, PETEZAH_BASE);
                    const innerSegments = String(innerParsed.pathname || '').replace(/\/+$/, '').split('/').filter(Boolean);
                    const innerLast = innerSegments.length ? innerSegments[innerSegments.length - 1] : '';
                    if (innerLast) {
                        candidate = /^index\.html?$/i.test(innerLast) && innerSegments.length > 1
                            ? String(innerSegments[innerSegments.length - 2] || '')
                            : String(innerLast).replace(/\.html?$/i, '');
                    }
                } catch {
                }
            }
        }
        const normalizedPath = String(parsed.pathname || '').replace(/\/+$/, '');
        const segments = normalizedPath.split('/').filter(Boolean);
        const last = segments.length ? segments[segments.length - 1] : '';
        if (!candidate && last) {
            if (/^index\.html?$/i.test(last) && segments.length > 1) {
                candidate = segments[segments.length - 2] || '';
            } else {
                candidate = String(last).replace(/\.html?$/i, '');
            }
        }
    } catch {
    }

    if (!candidate) candidate = String(label || '').trim();
    return toLaunchSlug(candidate, `game-${index + 1}`);
}

async function buildPetezahCatalogData() {
    let payload = null;
    let lastError = null;
    for (const sourceUrl of [PETEZAH_GAMES_JSON, PETEZAH_LEGACY_GAMES_JSON]) {
        try {
            const response = await fetch(sourceUrl);
            if (!response.ok) {
                lastError = new Error(`petezah fetch failed: ${response.status} @ ${sourceUrl}`);
                continue;
            }
            payload = await response.json();
            break;
        } catch (error) {
            lastError = error;
        }
    }
    if (!payload) {
        throw lastError || new Error('petezah fetch failed');
    }
    const rows = Array.isArray(payload?.games) ? payload.games : [];
    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (let index = 0; index < rows.length; index += 1) {
        const row = rows[index];
        const sourceUrl = String(row?.url || '').trim();
        const targetUrl = normalizePetezahSourceUrl(sourceUrl);
        if (!targetUrl) continue;

        const name = String(row?.label || '').trim() || `game ${index + 1}`;
        const cover = normalizePetezahCoverUrl(row?.imageUrl);
        const baseSlug = derivePetezahSlug(sourceUrl || targetUrl, name, index);
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const item = {
            id: `petezah-${slug}`,
            name,
            url: `/pzlite/${encodeURIComponent(slug)}.html`,
            cover,
        };
        items.push(item);
        map.set(slug, {
            targetUrl,
            name,
            cover,
        });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getPetezahCatalogData() {
    const now = Date.now();
    if (petezahCatalogCache.map.size > 0 && now < petezahCatalogCache.expiresAt) {
        return petezahCatalogCache;
    }

    try {
        const built = await buildPetezahCatalogData();
        petezahCatalogCache = {
            expiresAt: now + PETEZAH_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return petezahCatalogCache;
    } catch (error) {
        if (petezahCatalogCache.map.size > 0) return petezahCatalogCache;
        throw error;
    }
}

function normalizeDuckMathCatalogHref(value) {
    const href = String(value || '').trim();
    if (!href || /^javascript:/i.test(href) || /^data:/i.test(href)) return '';

    try {
        const parsed = new URL(href, DUCKMATH_BASE);
        if (!/^https?:$/i.test(parsed.protocol)) return '';
        return parsed.href;
    } catch {
        return '';
    }
}

function deriveDuckMathSlugSeed(targetUrl, name = '') {
    const fallback = toLaunchSlug(name, 'game');

    try {
        const parsed = new URL(String(targetUrl || '').trim());
        const segments = String(parsed.pathname || '')
            .split('/')
            .filter(Boolean)
            .map((segment) => {
                try {
                    return decodeURIComponent(segment);
                } catch {
                    return segment;
                }
            });
        if (!segments.length) return fallback;

        const clean = (value) => String(value || '')
            .trim()
            .toLowerCase()
            .replace(/\.[a-z0-9]+$/i, '')
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '');

        const lastRaw = segments[segments.length - 1] || '';
        const prevRaw = segments.length > 1 ? segments[segments.length - 2] : '';
        const last = clean(lastRaw);
        const prev = clean(prevRaw);
        const hasExt = /\.[a-z0-9]+$/i.test(lastRaw);

        if (hasExt) {
            if (last === 'index' && prev) return `${prev}-index`;
            if (last && ['pre', 'embed', 'play', 'game'].includes(last) && prev) return `${prev}-${last}`;
            if (last) return last;
        } else {
            if (last && ['pre', 'embed', 'play', 'game'].includes(last) && prev) return `${prev}-${last}`;
            if (last && !['class', 'g4m3s'].includes(last)) return last;
            if (prev) return prev;
        }
    } catch {
    }

    return fallback;
}

function extractDuckMathBundlePath(html) {
    const source = String(html || '');
    const match = source.match(/<script[^>]*\bsrc\s*=\s*["']([^"']*\/assets\/index-[^"']+\.js)["'][^>]*>/i);
    if (!match || !match[1]) return '';
    try {
        return new URL(match[1], DUCKMATH_BASE).href;
    } catch {
        return '';
    }
}

function extractDuckMathEmbeddedGameUrl(html, pageUrl) {
    const iframeSrc = extractEmbeddedGameUrl(html, pageUrl);
    if (iframeSrc) return iframeSrc;

    const source = String(html || '');
    const patterns = [
        /<meta[^>]*http-equiv=["']refresh["'][^>]*content=["'][^"']*url=([^"';]+)[^"']*["']/i,
        /\b(?:window\.)?location(?:\.href)?\s*=\s*["']([^"']+)["']/i,
        /\b(?:game|embed|iframe)(?:Url|URL|Src|SRC)\b[^:=]*[:=]\s*["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
        const match = source.match(pattern);
        const candidate = String(match?.[1] || '').trim();
        if (!candidate || /^javascript:/i.test(candidate) || /^data:/i.test(candidate)) continue;
        try {
            const resolved = new URL(candidate, pageUrl).href;
            if (/^https?:\/\//i.test(resolved)) return resolved;
        } catch {
        }
    }

    return '';
}

async function resolveDuckMathLaunchTarget(pageUrl) {
    const targetPage = String(pageUrl || '').trim();
    if (!targetPage) return '';

    const now = Date.now();
    const cached = duckMathResolvedLaunchCache.get(targetPage);
    if (cached && now < Number(cached.expiresAt || 0)) {
        return String(cached.url || targetPage);
    }

    let resolved = targetPage;
    for (let i = 0; i < 2; i += 1) {
        try {
            const response = await fetch(resolved);
            if (!response.ok) break;
            const html = await response.text();
            const embedded = extractDuckMathEmbeddedGameUrl(html, resolved);
            if (!embedded || embedded === resolved) break;
            resolved = embedded;
        } catch {
            break;
        }
    }

    duckMathResolvedLaunchCache.set(targetPage, {
        url: resolved,
        expiresAt: now + DUCKMATH_RESOLVED_TTL_MS,
    });
    return resolved;
}

async function buildDuckMathCatalogData() {
    const response = await fetch(DUCKMATH_GAMES_PAGE);
    if (!response.ok) {
        throw new Error(`duckmath fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const items = [];
    const map = new Map();
    const seenTargets = new Set();
    const usedSlugs = new Set();

    const pushRaw = (linkRaw, nameRaw = '', coverRaw = '') => {
        const targetUrl = normalizeDuckMathCatalogHref(linkRaw);
        if (!targetUrl) return;
        try {
            const parsed = new URL(targetUrl);
            if (/\.(mp4|webm|png|jpe?g|gif|webp|svg|mp3|wav|ogg)(?:$|\?)/i.test(parsed.pathname)) return;
        } catch {
        }
        const targetKey = targetUrl.toLowerCase();
        if (seenTargets.has(targetKey)) return;
        seenTargets.add(targetKey);

        let name = String(nameRaw || '').trim().replace(/\s+/g, ' ');
        if (!name) {
            try {
                const parsed = new URL(targetUrl);
                const last = parsed.pathname.split('/').filter(Boolean).pop() || parsed.hostname;
                name = humanizeFolderName(last.replace(/\.html?$/i, ''));
            } catch {
                name = 'DuckMath Game';
            }
        }

        let cover = '';
        const rawCover = String(coverRaw || '').trim();
        if (rawCover && !/^data:/i.test(rawCover)) {
            try {
                cover = new URL(rawCover, DUCKMATH_BASE).href;
            } catch {
                cover = '';
            }
        }

        const slugSeed = deriveDuckMathSlugSeed(targetUrl, name);
        const baseSlug = toLaunchSlug(slugSeed, toLaunchSlug(name, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        items.push({
            id: `duckmath-${slug}`,
            name,
            url: `/dkmath/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, {
            targetUrl,
            name,
            cover,
        });
    };

    const bundlePath = extractDuckMathBundlePath(html);
    if (bundlePath) {
        try {
            const bundleResponse = await fetch(bundlePath);
            if (bundleResponse.ok) {
                const bundleText = await bundleResponse.text();
                const bundleRe = /(?:^|[,{])link:"([^"]+)"[\s\S]{0,1800}?title:"([^"]+)"[\s\S]{0,1200}?icon:"([^"]*)"/g;
                let match;
                while ((match = bundleRe.exec(bundleText)) !== null) {
                    pushRaw(match[1], match[2], match[3]);
                }
            }
        } catch {
        }
    }

    if (!items.length) {
        const htmlRe = /<a[^>]*href\s*=\s*["']([^"']+)["'][^>]*>[\s\S]*?<figcaption[^>]*>([^<]+)<\/figcaption>/gi;
        let match;
        while ((match = htmlRe.exec(html)) !== null) {
            pushRaw(match[1], match[2], '');
        }
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getDuckMathCatalogData() {
    const now = Date.now();
    if (duckMathCatalogCache.map.size > 0 && now < duckMathCatalogCache.expiresAt) {
        return duckMathCatalogCache;
    }

    try {
        const built = await buildDuckMathCatalogData();
        duckMathCatalogCache = {
            expiresAt: now + DUCKMATH_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return duckMathCatalogCache;
    } catch (error) {
        if (duckMathCatalogCache.map.size > 0) return duckMathCatalogCache;
        throw error;
    }
}

function pickCcportedCover(fileMap, dirPath) {
    const files = fileMap.get(dirPath);
    if (!files) return '';

    const preferredOrder = [
        'splash.png', 'splash.webp', 'splash.jpg', 'splash.jpeg',
        'cover.png', 'cover.webp', 'cover.jpg', 'cover.jpeg',
        'thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg', 'thumbnail.jpeg',
        'icon.png', 'icon.webp', 'icon.jpg', 'icon.jpeg',
        'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg',
    ];

    for (const name of preferredOrder) {
        const matchedPath = files.get(name);
        if (matchedPath) {
            return new URL(matchedPath, CCPORTED_RAW_BASE).href;
        }
    }

    for (const [name, matchedPath] of files.entries()) {
        if (/\.(png|jpe?g|webp|gif|ico)$/i.test(name)) {
            return new URL(matchedPath, CCPORTED_RAW_BASE).href;
        }
    }

    return '';
}

function decodeBasicHtmlEntities(value) {
    return String(value || '')
        .replace(/&amp;/gi, '&')
        .replace(/&quot;/gi, '"')
        .replace(/&#39;/gi, "'")
        .replace(/&lt;/gi, '<')
        .replace(/&gt;/gi, '>')
        .replace(/&#(\d+);/g, (_m, dec) => {
            const codePoint = Number.parseInt(dec, 10);
            if (!Number.isFinite(codePoint)) return '';
            try {
                return String.fromCodePoint(codePoint);
            } catch {
                return '';
            }
        })
        .replace(/&#x([0-9a-f]+);/gi, (_m, hex) => {
            const codePoint = Number.parseInt(hex, 16);
            if (!Number.isFinite(codePoint)) return '';
            try {
                return String.fromCodePoint(codePoint);
            } catch {
                return '';
            }
        });
}

function normalizeCcportedGameName(value) {
    let name = decodeBasicHtmlEntities(value).replace(/\s+/g, ' ').trim();
    if (!name) return '';
    name = name.replace(CCPORTED_TITLE_SUFFIX_RE, '').trim();
    name = name.replace(/^play\s+/i, '').trim();
    name = name.replace(/\s*\|\s*CCPorted\s*$/i, '').trim();
    if (!name) return '';
    if (/^(index|home|ccported)$/i.test(name)) return '';
    if (/^game[-_\s0-9a-f]+$/i.test(name)) return '';
    return name;
}

async function mapWithConcurrency(items, concurrency, mapper) {
    const list = Array.isArray(items) ? items : [];
    if (!list.length) return [];

    const safeConcurrency = Math.max(1, Math.min(Number(concurrency) || 1, list.length));
    const output = new Array(list.length);
    let cursor = 0;

    const workers = Array.from({ length: safeConcurrency }, async () => {
        while (true) {
            const index = cursor;
            cursor += 1;
            if (index >= list.length) return;
            output[index] = await mapper(list[index], index);
        }
    });
    await Promise.all(workers);
    return output;
}

async function fetchCcportedMetadataName(fileMap, dirPath) {
    const files = fileMap.get(dirPath);
    const metadataPath = files?.get('ccported_game_data.json');
    if (!metadataPath) return '';

    try {
        const response = await fetch(new URL(metadataPath, CCPORTED_RAW_BASE), {
            headers: {
                'accept': 'application/json',
                'user-agent': 'rift-ccported-catalog',
            },
        });
        if (!response.ok) return '';
        const payload = await response.json();
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return '';

        const candidate = payload.name || payload.title || payload.displayName || payload.game || '';
        return normalizeCcportedGameName(candidate);
    } catch {
        return '';
    }
}

async function fetchCcportedHtmlTitle(entryPath) {
    try {
        const response = await fetch(new URL(entryPath, CCPORTED_RAW_BASE), {
            headers: {
                'accept': 'text/html,application/xhtml+xml',
                'range': 'bytes=0-262143',
                'user-agent': 'rift-ccported-catalog',
            },
        });
        if (!response.ok) return '';
        const html = await response.text();
        const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
        if (!titleMatch || !titleMatch[1]) return '';
        const rawTitle = String(titleMatch[1]).replace(/<[^>]+>/g, ' ');
        return normalizeCcportedGameName(rawTitle);
    } catch {
        return '';
    }
}

async function fetchCcportedManifestName(fileMap, dirPath) {
    const files = fileMap.get(dirPath);
    if (!files) return '';

    const manifestNames = ['appmanifest.json', 'manifest.json', 'site.webmanifest'];
    for (const manifestName of manifestNames) {
        const manifestPath = files.get(manifestName);
        if (!manifestPath) continue;

        try {
            const response = await fetch(new URL(manifestPath, CCPORTED_RAW_BASE), {
                headers: {
                    'accept': 'application/json',
                    'user-agent': 'rift-ccported-catalog',
                },
            });
            if (!response.ok) continue;
            const payload = await response.json();
            if (!payload || typeof payload !== 'object' || Array.isArray(payload)) continue;

            const candidate = payload.name || payload.short_name || payload.title || payload.displayName || '';
            const normalized = normalizeCcportedGameName(candidate);
            if (normalized) return normalized;
        } catch {
            continue;
        }
    }

    return '';
}

async function resolveCcportedDisplayName(entry, fileMap) {
    const entryPath = String(entry?.entryPath || '').trim();
    const cacheKey = entryPath.toLowerCase();
    if (cacheKey && ccportedNameCache.has(cacheKey)) {
        return ccportedNameCache.get(cacheKey);
    }

    let name = await fetchCcportedMetadataName(fileMap, entry?.dirPath);
    if (!name) {
        name = await fetchCcportedHtmlTitle(entryPath);
    }
    if (!name) {
        name = await fetchCcportedManifestName(fileMap, entry?.dirPath);
    }
    if (!name) {
        const dirName = path.posix.basename(entry?.dirPath || '') || String(entry?.dirPath || '');
        name = humanizeFolderName(String(dirName || '').replace(/^game_[0-9a-f]{4}_/i, ''));
    }

    if (cacheKey) ccportedNameCache.set(cacheKey, name);
    return name;
}

async function buildCcportedCatalogData() {
    const response = await fetch(CCPORTED_TREE_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-ccported-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`ccported fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.tree) ? payload.tree : [];

    const fileMap = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const dirPath = path.posix.dirname(filePath);
        const fileName = path.posix.basename(filePath).toLowerCase();
        if (!fileMap.has(dirPath)) fileMap.set(dirPath, new Map());
        fileMap.get(dirPath).set(fileName, filePath);
    }

    const preferredEntries = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const lower = filePath.toLowerCase();
        const topLevelGameMatch = lower.match(/^([^/]+)\/game\.html$/i);
        if (topLevelGameMatch && topLevelGameMatch[1]) {
            const dirPath = topLevelGameMatch[1];
            preferredEntries.set(dirPath, {
                entryPath: filePath,
                dirPath,
                source: 'game',
            });
            continue;
        }

        const topLevelIndexMatch = lower.match(/^([^/]+)\/index\.html$/i);
        if (topLevelIndexMatch && topLevelIndexMatch[1]) {
            const dirPath = topLevelIndexMatch[1];
            if (!preferredEntries.has(dirPath)) {
                preferredEntries.set(dirPath, {
                    entryPath: filePath,
                    dirPath,
                    source: 'index',
                });
            }
        }
    }

    const gameEntries = Array.from(preferredEntries.values());
    const resolvedNames = await mapWithConcurrency(
        gameEntries,
        10,
        async (entry) => await resolveCcportedDisplayName(entry, fileMap)
    );

    const items = [];
    const map = new Map();
    const usedSlugs = new Set();
    const seenEntryPaths = new Set();

    for (let index = 0; index < gameEntries.length; index += 1) {
        const entry = gameEntries[index];
        const entryKey = String(entry.entryPath || '').toLowerCase();
        if (!entryKey || seenEntryPaths.has(entryKey)) continue;
        seenEntryPaths.add(entryKey);

        const dirName = path.posix.basename(entry.dirPath || '') || entry.dirPath;
        const fallbackName = humanizeFolderName(String(dirName || '').replace(/\.[a-z0-9]+$/i, ''));
        const name = normalizeCcportedGameName(resolvedNames[index]) || fallbackName;
        const preferredBaseSlug = toLaunchSlug(name, toLaunchSlug(dirName, 'game'));
        const legacyBaseSlug = toLaunchSlug(dirName, preferredBaseSlug);
        let slug = preferredBaseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${preferredBaseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const cover = pickCcportedCover(fileMap, entry.dirPath);
        const mappedEntry = {
            entryPath: entry.entryPath,
            dirPath: entry.dirPath,
            source: entry.source,
            name,
            cover,
        };
        items.push({
            id: `ccported-${slug}`,
            name,
            url: `/ccptd/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, mappedEntry);
        if (legacyBaseSlug && legacyBaseSlug !== slug && !map.has(legacyBaseSlug)) {
            map.set(legacyBaseSlug, mappedEntry);
        }
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getCcportedCatalogData() {
    const now = Date.now();
    if (ccportedCatalogCache.map.size > 0 && now < ccportedCatalogCache.expiresAt) {
        return ccportedCatalogCache;
    }

    try {
        const built = await buildCcportedCatalogData();
        ccportedCatalogCache = {
            expiresAt: now + CCPORTED_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return ccportedCatalogCache;
    } catch (error) {
        if (ccportedCatalogCache.map.size > 0) return ccportedCatalogCache;
        throw error;
    }
}

function pickUgsCover(fileMap, dirPath) {
    const files = fileMap.get(dirPath);
    if (!files) return '';

    const preferredOrder = [
        'splash.png', 'splash.webp', 'splash.jpg', 'splash.jpeg',
        'cover.png', 'cover.webp', 'cover.jpg', 'cover.jpeg',
        'thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg', 'thumbnail.jpeg',
        'thumb.png', 'thumb.webp', 'thumb.jpg', 'thumb.jpeg',
        'icon.png', 'icon.webp', 'icon.jpg', 'icon.jpeg',
        'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg',
    ];

    for (const name of preferredOrder) {
        const matchedPath = files.get(name);
        if (matchedPath) {
            return new URL(matchedPath, UGS_RAW_BASE).href;
        }
    }

    for (const [name, matchedPath] of files.entries()) {
        if (/\.(png|jpe?g|webp|gif|ico)$/i.test(name)) {
            return new URL(matchedPath, UGS_RAW_BASE).href;
        }
    }

    return '';
}

async function buildUgsCatalogData() {
    const response = await fetch(UGS_TREE_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-ugs-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`ugs fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.tree) ? payload.tree : [];

    const fileMap = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const dirPath = path.posix.dirname(filePath);
        const fileName = path.posix.basename(filePath).toLowerCase();
        if (!fileMap.has(dirPath)) fileMap.set(dirPath, new Map());
        fileMap.get(dirPath).set(fileName, filePath);
    }

    const preferredEntries = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const lower = filePath.toLowerCase();
        const topLevelGameMatch = lower.match(/^([^/]+)\/game\.html$/i);
        if (topLevelGameMatch && topLevelGameMatch[1]) {
            const dirPath = topLevelGameMatch[1];
            preferredEntries.set(dirPath, {
                entryPath: filePath,
                dirPath,
                source: 'game',
            });
            continue;
        }

        const topLevelIndexMatch = lower.match(/^([^/]+)\/index\.html$/i);
        if (topLevelIndexMatch && topLevelIndexMatch[1]) {
            const dirPath = topLevelIndexMatch[1];
            if (!preferredEntries.has(dirPath)) {
                preferredEntries.set(dirPath, {
                    entryPath: filePath,
                    dirPath,
                    source: 'index',
                });
            }
        }
    }

    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (const entry of preferredEntries.values()) {
        const dirName = path.posix.basename(entry.dirPath || '') || entry.dirPath;
        const name = humanizeFolderName(String(dirName || '').replace(/\.[a-z0-9]+$/i, ''));
        const baseSlug = toLaunchSlug(name, toLaunchSlug(dirName, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const cover = pickUgsCover(fileMap, entry.dirPath);
        const mappedEntry = {
            entryPath: entry.entryPath,
            dirPath: entry.dirPath,
            source: entry.source,
            name,
            cover,
        };
        items.push({
            id: `ugs-${slug}`,
            name,
            url: `/ugs/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, mappedEntry);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getUgsCatalogData() {
    const now = Date.now();
    if (ugsCatalogCache.map.size > 0 && now < ugsCatalogCache.expiresAt) {
        return ugsCatalogCache;
    }

    try {
        const built = await buildUgsCatalogData();
        ugsCatalogCache = {
            expiresAt: now + UGS_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return ugsCatalogCache;
    } catch (error) {
        if (ugsCatalogCache.map.size > 0) return ugsCatalogCache;
        throw error;
    }
}

function pickSeleniteCover(fileMap, dirPath) {
    const files = fileMap.get(dirPath);
    if (!files) return '';

    const preferredOrder = [
        'splash.png', 'splash.webp', 'splash.jpg', 'splash.jpeg',
        'cover.png', 'cover.webp', 'cover.jpg', 'cover.jpeg',
        'thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg', 'thumbnail.jpeg',
        'thumb.png', 'thumb.webp', 'thumb.jpg', 'thumb.jpeg',
        'icon.png', 'icon.webp', 'icon.jpg', 'icon.jpeg',
        'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg',
    ];

    for (const name of preferredOrder) {
        const matchedPath = files.get(name);
        if (matchedPath) {
            return new URL(matchedPath, SELENITE_RAW_BASE).href;
        }
    }

    for (const [name, matchedPath] of files.entries()) {
        if (/\.(png|jpe?g|webp|gif|ico)$/i.test(name)) {
            return new URL(matchedPath, SELENITE_RAW_BASE).href;
        }
    }

    return '';
}

async function buildSeleniteCatalogData() {
    const response = await fetch(SELENITE_TREE_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-selenite-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`selenite fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.tree) ? payload.tree : [];

    const fileMap = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const dirPath = path.posix.dirname(filePath);
        const fileName = path.posix.basename(filePath).toLowerCase();
        if (!fileMap.has(dirPath)) fileMap.set(dirPath, new Map());
        fileMap.get(dirPath).set(fileName, filePath);
    }

    const preferredEntries = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const lower = filePath.toLowerCase();
        const topLevelGameMatch = lower.match(/^([^/]+)\/game\.html$/i);
        if (topLevelGameMatch && topLevelGameMatch[1]) {
            const dirPath = topLevelGameMatch[1];
            preferredEntries.set(dirPath, {
                entryPath: filePath,
                dirPath,
                source: 'game',
            });
            continue;
        }

        const topLevelIndexMatch = lower.match(/^([^/]+)\/index\.html$/i);
        if (topLevelIndexMatch && topLevelIndexMatch[1]) {
            const dirPath = topLevelIndexMatch[1];
            if (!preferredEntries.has(dirPath)) {
                preferredEntries.set(dirPath, {
                    entryPath: filePath,
                    dirPath,
                    source: 'index',
                });
            }
        }
    }

    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (const entry of preferredEntries.values()) {
        const dirName = path.posix.basename(entry.dirPath || '') || entry.dirPath;
        const name = humanizeFolderName(String(dirName || '').replace(/\.[a-z0-9]+$/i, ''));
        const baseSlug = toLaunchSlug(name, toLaunchSlug(dirName, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const cover = pickSeleniteCover(fileMap, entry.dirPath);
        const mappedEntry = {
            entryPath: entry.entryPath,
            dirPath: entry.dirPath,
            source: entry.source,
            name,
            cover,
        };
        items.push({
            id: `selenite-${slug}`,
            name,
            url: `/slnte/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, mappedEntry);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getSeleniteCatalogData() {
    const now = Date.now();
    if (seleniteCatalogCache.map.size > 0 && now < seleniteCatalogCache.expiresAt) {
        return seleniteCatalogCache;
    }

    try {
        const built = await buildSeleniteCatalogData();
        seleniteCatalogCache = {
            expiresAt: now + SELENITE_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return seleniteCatalogCache;
    } catch (error) {
        if (seleniteCatalogCache.map.size > 0) return seleniteCatalogCache;
        throw error;
    }
}

function pickRadonCover(fileMap, dirPath, imageStemMap) {
    const files = fileMap.get(dirPath);
    if (files) {
        const preferredOrder = [
            'splash.png', 'splash.webp', 'splash.jpg', 'splash.jpeg',
            'cover.png', 'cover.webp', 'cover.jpg', 'cover.jpeg',
            'thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg', 'thumbnail.jpeg',
            'thumb.png', 'thumb.webp', 'thumb.jpg', 'thumb.jpeg',
            'icon.png', 'icon.webp', 'icon.jpg', 'icon.jpeg',
            'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg',
        ];

        for (const name of preferredOrder) {
            const matchedPath = files.get(name);
            if (matchedPath) {
                return new URL(matchedPath, RADON_RAW_BASE).href;
            }
        }
    }

    const dirName = path.posix.basename(dirPath || '').toLowerCase();
    const stemCandidates = [
        dirName,
        dirName.replace(/_/g, '-'),
        dirName.replace(/-/g, '_'),
    ];
    for (const stem of stemCandidates) {
        const matchedPath = imageStemMap.get(stem);
        if (matchedPath) {
            return new URL(matchedPath, RADON_RAW_BASE).href;
        }
    }

    return '';
}

async function buildRadonCatalogData() {
    const response = await fetch(RADON_TREE_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-radon-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`radon fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.tree) ? payload.tree : [];

    const fileMap = new Map();
    const imageStemMap = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;

        const dirPath = path.posix.dirname(filePath);
        const fileName = path.posix.basename(filePath).toLowerCase();
        if (!fileMap.has(dirPath)) fileMap.set(dirPath, new Map());
        fileMap.get(dirPath).set(fileName, filePath);

        if (/^images\/[^/]+\.(png|jpe?g|webp|gif|ico)$/i.test(filePath)) {
            const stem = path.posix.basename(filePath).replace(/\.[^.]+$/, '').toLowerCase();
            if (stem && !imageStemMap.has(stem)) {
                imageStemMap.set(stem, filePath);
            }
        }
    }

    const preferredEntries = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const lower = filePath.toLowerCase();

        const topLevelGameMatch = lower.match(/^html\/([^/]+)\/game\.html$/i);
        if (topLevelGameMatch && topLevelGameMatch[1]) {
            const folderName = topLevelGameMatch[1];
            preferredEntries.set(folderName, {
                entryPath: filePath,
                dirPath: `html/${folderName}`,
                source: 'game',
            });
            continue;
        }

        const topLevelIndexMatch = lower.match(/^html\/([^/]+)\/index\.html$/i);
        if (topLevelIndexMatch && topLevelIndexMatch[1]) {
            const folderName = topLevelIndexMatch[1];
            if (!preferredEntries.has(folderName)) {
                preferredEntries.set(folderName, {
                    entryPath: filePath,
                    dirPath: `html/${folderName}`,
                    source: 'index',
                });
            }
        }
    }

    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (const entry of preferredEntries.values()) {
        const dirName = path.posix.basename(entry.dirPath || '') || entry.dirPath;
        const name = humanizeFolderName(String(dirName || '').replace(/\.[a-z0-9]+$/i, ''));
        const baseSlug = toLaunchSlug(name, toLaunchSlug(dirName, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const cover = pickRadonCover(fileMap, entry.dirPath, imageStemMap);
        const mappedEntry = {
            entryPath: entry.entryPath,
            dirPath: entry.dirPath,
            source: entry.source,
            name,
            cover,
        };
        items.push({
            id: `radon-${slug}`,
            name,
            url: `/rdn/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, mappedEntry);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getRadonCatalogData() {
    const now = Date.now();
    if (radonCatalogCache.map.size > 0 && now < radonCatalogCache.expiresAt) {
        return radonCatalogCache;
    }

    try {
        const built = await buildRadonCatalogData();
        radonCatalogCache = {
            expiresAt: now + RADON_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return radonCatalogCache;
    } catch (error) {
        if (radonCatalogCache.map.size > 0) return radonCatalogCache;
        throw error;
    }
}

function pickFyinxCover(fileMap, dirPath) {
    const files = fileMap.get(dirPath);
    if (!files) return '';

    const preferredOrder = [
        'splash.png', 'splash.webp', 'splash.jpg', 'splash.jpeg',
        'cover.png', 'cover.webp', 'cover.jpg', 'cover.jpeg',
        'thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg', 'thumbnail.jpeg',
        'thumb.png', 'thumb.webp', 'thumb.jpg', 'thumb.jpeg',
        'icon.png', 'icon.webp', 'icon.jpg', 'icon.jpeg',
        'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg',
    ];

    for (const name of preferredOrder) {
        const matchedPath = files.get(name);
        if (matchedPath) {
            return new URL(matchedPath, FYINX_RAW_BASE).href;
        }
    }

    for (const [name, matchedPath] of files.entries()) {
        if (/\.(png|jpe?g|webp|gif|ico)$/i.test(name)) {
            return new URL(matchedPath, FYINX_RAW_BASE).href;
        }
    }

    return '';
}

async function buildFyinxCatalogData() {
    const response = await fetch(FYINX_TREE_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-fyinx-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`fyinx fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.tree) ? payload.tree : [];

    const fileMap = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const dirPath = path.posix.dirname(filePath);
        const fileName = path.posix.basename(filePath).toLowerCase();
        if (!fileMap.has(dirPath)) fileMap.set(dirPath, new Map());
        fileMap.get(dirPath).set(fileName, filePath);
    }

    const preferredEntries = new Map();
    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('..')) continue;
        const lower = filePath.toLowerCase();

        const topLevelGameMatch = lower.match(/^g\/([^/]+)\/game\.html$/i);
        if (topLevelGameMatch && topLevelGameMatch[1]) {
            const folderName = topLevelGameMatch[1];
            preferredEntries.set(folderName, {
                entryPath: filePath,
                dirPath: `g/${folderName}`,
                source: 'game',
            });
            continue;
        }

        const topLevelIndexMatch = lower.match(/^g\/([^/]+)\/index\.html$/i);
        if (topLevelIndexMatch && topLevelIndexMatch[1]) {
            const folderName = topLevelIndexMatch[1];
            if (!preferredEntries.has(folderName)) {
                preferredEntries.set(folderName, {
                    entryPath: filePath,
                    dirPath: `g/${folderName}`,
                    source: 'index',
                });
            }
        }
    }

    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (const entry of preferredEntries.values()) {
        const dirName = path.posix.basename(entry.dirPath || '') || entry.dirPath;
        const name = humanizeFolderName(String(dirName || '').replace(/\.[a-z0-9]+$/i, ''));
        const baseSlug = toLaunchSlug(name, toLaunchSlug(dirName, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const cover = pickFyinxCover(fileMap, entry.dirPath);
        const mappedEntry = {
            entryPath: entry.entryPath,
            dirPath: entry.dirPath,
            source: entry.source,
            name,
            cover,
        };
        items.push({
            id: `fyinx-${slug}`,
            name,
            url: `/fyinx/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, mappedEntry);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getFyinxCatalogData() {
    const now = Date.now();
    if (fyinxCatalogCache.map.size > 0 && now < fyinxCatalogCache.expiresAt) {
        return fyinxCatalogCache;
    }

    try {
        const built = await buildFyinxCatalogData();
        fyinxCatalogCache = {
            expiresAt: now + FYINX_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return fyinxCatalogCache;
    } catch (error) {
        if (fyinxCatalogCache.map.size > 0) return fyinxCatalogCache;
        throw error;
    }
}

function asEliteHtml(raw) {
    const source = String(raw || '');
    const cdataMatch = source.match(/<content\b[^>]*>\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*<\/content>/i);
    let html = cdataMatch && cdataMatch[1] ? String(cdataMatch[1]).trim() : source.trim();

    const hasHtmlTag = /<html\b/i.test(html);
    if (!hasHtmlTag) {
        html = `<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body><pre>${html.replace(/[<&>]/g, (m) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[m] || m))}</pre></body></html>`;
    }

    if (/<head\b[^>]*>/i.test(html)) {
        const baseTag = `<base href="${ELITE_RAW_BASE}">`;
        html = html.replace(/<head\b[^>]*>/i, (match) => `${match}${baseTag}`);
    } else if (/<html\b[^>]*>/i.test(html)) {
        html = html.replace(/<html\b[^>]*>/i, (match) => `${match}<head><base href="${ELITE_RAW_BASE}"></head>`);
    }

    return html;
}

async function buildEliteCatalogData() {
    const response = await fetch(ELITE_TREE_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-elite-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`elite fetch failed: ${response.status}`);
    }

    const payload = await response.json();
    const rows = Array.isArray(payload?.tree) ? payload.tree : [];

    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (const row of rows) {
        if (!row || row.type !== 'blob') continue;
        const filePath = String(row.path || '').replace(/^\/+/, '').trim();
        if (!filePath || filePath.includes('/') || filePath.includes('..')) continue;
        const isXml = /\.xml$/i.test(filePath);
        const isNoExt = !/\.[a-z0-9]+$/i.test(filePath);
        if (!isXml && !isNoExt) continue;

        const rawName = String(filePath).replace(/\.xml$/i, '').replace(/\s+/g, ' ').trim();
        const name = rawName || `Game ${items.length + 1}`;
        const baseSlug = toLaunchSlug(rawName, `game-${items.length + 1}`);
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        const mappedEntry = {
            entryPath: filePath,
            name,
            cover: '',
        };
        items.push({
            id: `elite-${slug}`,
            name,
            url: `/eltgmz/${encodeURIComponent(slug)}.html`,
            cover: '',
        });
        map.set(slug, mappedEntry);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getEliteCatalogData() {
    const now = Date.now();
    if (eliteCatalogCache.map.size > 0 && now < eliteCatalogCache.expiresAt) {
        return eliteCatalogCache;
    }

    try {
        const built = await buildEliteCatalogData();
        eliteCatalogCache = {
            expiresAt: now + ELITE_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return eliteCatalogCache;
    } catch (error) {
        if (eliteCatalogCache.map.size > 0) return eliteCatalogCache;
        throw error;
    }
}

function normalizeTotallyScienceSourceSlug(value) {
    return String(value || '')
        .trim()
        .replace(/^\.?\//, '')
        .replace(/^\/+/, '')
        .replace(/\/+$/, '')
        .replace(/\\/g, '/');
}

function extractEmbeddedGameUrl(html, pageUrl) {
    const source = String(html || '');
    const tags = source.match(/<iframe\b[^>]*>/gi) || [];
    let fallbackSrc = '';

    for (const tag of tags) {
        const srcMatch = tag.match(/\bsrc\s*=\s*["']([^"']+)["']/i);
        if (!srcMatch || !srcMatch[1]) continue;
        const srcRaw = String(srcMatch[1]).trim();
        if (!srcRaw || /^javascript:/i.test(srcRaw) || /^data:/i.test(srcRaw)) continue;

        const idMatch = tag.match(/\bid\s*=\s*["']([^"']+)["']/i);
        const idValue = String(idMatch?.[1] || '').trim().toLowerCase();
        if (!fallbackSrc) fallbackSrc = srcRaw;
        if (idValue === 'gameframe') {
            fallbackSrc = srcRaw;
            break;
        }
    }

    if (!fallbackSrc) return '';
    try {
        const resolved = new URL(fallbackSrc, pageUrl).href;
        return /^https?:\/\//i.test(resolved) ? resolved : '';
    } catch {
        return '';
    }
}

function extractTotallyScienceEmbeddedGameUrl(html, pageUrl) {
    return extractEmbeddedGameUrl(html, pageUrl);
}

function extractVelaraEmbeddedGameUrl(html, pageUrl) {
    const iframeSrc = extractEmbeddedGameUrl(html, pageUrl);
    if (iframeSrc) return iframeSrc;

    const source = String(html || '');
    const patterns = [
        /\bdata-game-url\s*=\s*["']([^"']+)["']/i,
        /\bgame(?:Url|URL)\b[^:=]*[:=]\s*["']([^"']+)["']/i,
        /\bsource(?:Url|URL)\b[^:=]*[:=]\s*["']([^"']+)["']/i,
    ];

    for (const pattern of patterns) {
        const match = source.match(pattern);
        const candidate = String(match?.[1] || '').trim();
        if (!candidate || /^javascript:/i.test(candidate) || /^data:/i.test(candidate)) continue;
        try {
            const resolved = new URL(candidate, pageUrl).href;
            if (/^https?:\/\//i.test(resolved)) return resolved;
        } catch {
        }
    }

    return '';
}

async function resolveTotallyScienceLaunchTarget(pageUrl) {
    const targetPage = String(pageUrl || '').trim();
    if (!targetPage) return '';

    const now = Date.now();
    const cached = totallyScienceResolvedLaunchCache.get(targetPage);
    if (cached && now < Number(cached.expiresAt || 0)) {
        return String(cached.url || targetPage);
    }

    let resolved = targetPage;
    try {
        const response = await fetch(targetPage);
        if (response.ok) {
            const html = await response.text();
            const embedded = extractTotallyScienceEmbeddedGameUrl(html, targetPage);
            if (embedded) resolved = embedded;
        }
    } catch {
    }

    totallyScienceResolvedLaunchCache.set(targetPage, {
        url: resolved,
        expiresAt: now + TOTALLY_SCIENCE_RESOLVED_TTL_MS,
    });
    return resolved;
}

async function resolveVelaraLaunchTarget(pageUrl) {
    const targetPage = String(pageUrl || '').trim();
    if (!targetPage) return '';

    const now = Date.now();
    const cached = velaraResolvedLaunchCache.get(targetPage);
    if (cached && now < Number(cached.expiresAt || 0)) {
        return String(cached.url || targetPage);
    }

    let resolved = targetPage;
    try {
        const response = await fetch(targetPage);
        if (response.ok) {
            const html = await response.text();
            const embedded = extractVelaraEmbeddedGameUrl(html, targetPage);
            if (embedded) resolved = embedded;
        }
    } catch {
    }

    velaraResolvedLaunchCache.set(targetPage, {
        url: resolved,
        expiresAt: now + VELARA_RESOLVED_TTL_MS,
    });
    return resolved;
}

async function buildTotallyScienceCatalogData() {
    const response = await fetch(TOTALLY_SCIENCE_BASE);
    if (!response.ok) {
        throw new Error(`totally science fetch failed: ${response.status}`);
    }

    const html = await response.text();
    const seenSources = new Set();
    const usedLaunchSlugs = new Set();
    const items = [];
    const map = new Map();

    const pushRaw = (slugRaw, nameRaw, coverRaw = '') => {
        const sourceSlug = normalizeTotallyScienceSourceSlug(slugRaw);
        const name = String(nameRaw || '').trim().replace(/\s+/g, ' ');
        if (!sourceSlug || !name) return;
        if (/^(t|tag|about|contact|privacy-policy|all-tags|new-games|recently-played-games|page)(\/|$)/i.test(sourceSlug)) return;
        const sourceKey = sourceSlug.toLowerCase();
        if (seenSources.has(sourceKey)) return;
        seenSources.add(sourceKey);

        const baseLaunchSlug = toLaunchSlug(sourceSlug, toLaunchSlug(name, 'game'));
        let launchSlug = baseLaunchSlug;
        let suffix = 2;
        while (usedLaunchSlugs.has(launchSlug)) {
            launchSlug = `${baseLaunchSlug}-${suffix}`;
            suffix += 1;
        }
        usedLaunchSlugs.add(launchSlug);

        const normalizedCover = String(coverRaw || '').trim().replace(/^\.?\//, '').replace(/^\/+/, '');
        const targetUrl = new URL(`${sourceSlug}/`, TOTALLY_SCIENCE_BASE).href;
        const cover = normalizedCover ? new URL(normalizedCover, TOTALLY_SCIENCE_BASE).href : '';

        items.push({
            id: `totalscience-${launchSlug}`,
            name,
            url: `/tllysc/${encodeURIComponent(launchSlug)}.html`,
            cover,
        });
        map.set(launchSlug, {
            targetUrl,
            name,
            cover,
        });
    };

    const cardRe = /<article[^>]*class="[^"]*\bc-card\b[^"]*"[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<div[^>]*class="c-card__title"[^>]*>\s*<a[^>]*href="\.\/([^"\/]+)\/"[^>]*>([^<]+)<\/a>/gi;
    let m;
    while ((m = cardRe.exec(html)) !== null) {
        pushRaw(m[2], m[3], m[1]);
    }

    const rowRe = /<div[^>]*onclick="location\.href='\/([^'\/]+)\/'"[^>]*>[\s\S]*?<img[^>]*src="([^"]+)"[\s\S]*?<h3[^>]*>([^<]+)<\/h3>/gi;
    while ((m = rowRe.exec(html)) !== null) {
        pushRaw(m[1], m[3], m[2]);
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getTotallyScienceCatalogData() {
    const now = Date.now();
    if (totallyScienceCatalogCache.map.size > 0 && now < totallyScienceCatalogCache.expiresAt) {
        return totallyScienceCatalogCache;
    }

    try {
        const built = await buildTotallyScienceCatalogData();
        totallyScienceCatalogCache = {
            expiresAt: now + TOTALLY_SCIENCE_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return totallyScienceCatalogCache;
    } catch (error) {
        if (totallyScienceCatalogCache.map.size > 0) return totallyScienceCatalogCache;
        throw error;
    }
}

async function buildVelaraCatalogData() {
    const response = await fetch(VELARA_GAMES_JSON);
    if (!response.ok) {
        throw new Error(`velara fetch failed: ${response.status}`);
    }

    const rows = await response.json();
    const items = [];
    const map = new Map();
    const seenTargetUrls = new Set();
    const usedSlugs = new Set();

    for (const row of (Array.isArray(rows) ? rows : [])) {
        const name = String(row?.title || row?.name || '').trim();
        const link = String(row?.location || row?.link || '').trim();
        const img = String(row?.image || row?.imgpath || '').trim();
        if (!name || !link) continue;

        const normalizedLink = link.startsWith('/') ? link : `/${link}`;
        const targetUrl = new URL(normalizedLink, VELARA_BASE).href;
        const targetKey = targetUrl.toLowerCase();
        if (seenTargetUrls.has(targetKey)) continue;
        seenTargetUrls.add(targetKey);

        const normalizedImg = img.startsWith('/') ? img : `/${img}`;
        const cover = img ? new URL(normalizedImg, VELARA_BASE).href : '';

        const baseSlug = toLaunchSlug(normalizedLink, toLaunchSlug(name, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        items.push({
            id: `velara-${slug}`,
            name,
            url: `/vlra/${encodeURIComponent(slug)}.html`,
            cover,
        });
        map.set(slug, {
            targetUrl,
            name,
            cover,
        });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getVelaraCatalogData() {
    const now = Date.now();
    if (velaraCatalogCache.map.size > 0 && now < velaraCatalogCache.expiresAt) {
        return velaraCatalogCache;
    }

    try {
        const built = await buildVelaraCatalogData();
        velaraCatalogCache = {
            expiresAt: now + VELARA_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return velaraCatalogCache;
    } catch (error) {
        if (velaraCatalogCache.map.size > 0) return velaraCatalogCache;
        throw error;
    }
}

async function buildSeraphCatalogData() {
    const response = await fetch(SERAPH_GAMES_API, {
        headers: {
            'accept': 'application/vnd.github+json',
            'user-agent': 'rift-seraph-catalog',
        },
    });
    if (!response.ok) {
        throw new Error(`seraph fetch failed: ${response.status}`);
    }

    const rows = await response.json();
    const items = [];
    const map = new Map();
    const usedSlugs = new Set();

    for (const row of (Array.isArray(rows) ? rows : [])) {
        if (!row || row.type !== 'dir') continue;

        const dirName = String(row.name || '').trim();
        if (!dirName || dirName.startsWith('.')) continue;

        const label = humanizeFolderName(dirName);
        const baseSlug = toLaunchSlug(dirName, toLaunchSlug(label, 'game'));
        let slug = baseSlug;
        let suffix = 2;
        while (usedSlugs.has(slug)) {
            slug = `${baseSlug}-${suffix}`;
            suffix += 1;
        }
        usedSlugs.add(slug);

        items.push({
            id: `seraph-${slug}`,
            name: label || `Game ${items.length + 1}`,
            url: `/sph/${encodeURIComponent(slug)}.html`,
            cover: '',
        });
        map.set(slug, {
            name: label,
            dirName,
        });
    }

    items.sort((a, b) => a.name.localeCompare(b.name));
    return { items, map };
}

async function getSeraphCatalogData() {
    const now = Date.now();
    if (seraphCatalogCache.map.size > 0 && now < seraphCatalogCache.expiresAt) {
        return seraphCatalogCache;
    }

    try {
        const built = await buildSeraphCatalogData();
        seraphCatalogCache = {
            expiresAt: now + SERAPH_CACHE_TTL_MS,
            items: built.items,
            map: built.map,
        };
        return seraphCatalogCache;
    } catch (error) {
        if (seraphCatalogCache.map.size > 0) return seraphCatalogCache;
        throw error;
    }
}

async function pickSdxpCover(indexFile) {
    const dir = path.dirname(indexFile);
    const sdxpRoot = path.join(__dirname, '..', 'public', 'sdxp');
    const preferredOrder = [
        'splash.png', 'splash.webp', 'splash.jpg', 'splash.jpeg',
        'cover.png', 'cover.webp', 'cover.jpg', 'cover.jpeg',
        'thumbnail.png', 'thumbnail.webp', 'thumbnail.jpg', 'thumbnail.jpeg',
        'icon.png', 'icon.webp', 'icon.jpg', 'icon.jpeg',
        'logo.png', 'logo.webp', 'logo.jpg', 'logo.jpeg',
    ];

    try {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = entries
            .filter((entry) => entry.isFile())
            .map((entry) => entry.name);
        const lowered = new Map(files.map((name) => [name.toLowerCase(), name]));

        let chosen = '';
        for (const wanted of preferredOrder) {
            const match = lowered.get(wanted);
            if (match) {
                chosen = match;
                break;
            }
        }

        if (!chosen) {
            const fallback = files.find((name) => /\.(png|jpe?g|webp|gif|ico)$/i.test(name));
            if (!fallback) return '';
            chosen = fallback;
        }

        const abs = path.join(dir, chosen);
        const rel = path.relative(sdxpRoot, abs).replace(/\\/g, '/');
        return `/sdxp/${rel}`;
    } catch {
        return '';
    }
}

async function collectIndexFiles(dir) {
    const out = [];
    const entries = await fs.readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) {
            out.push(...await collectIndexFiles(full));
        } else if (entry.isFile() && entry.name.toLowerCase() === 'index.html') {
            out.push(full);
        }
    }

    return out;
}

async function findSdxpBackupIndexFile() {
    const root = path.join(__dirname, '..');
    try {
        const entries = await fs.readdir(root, { withFileTypes: true });
        const candidates = entries
            .filter((entry) => entry.isDirectory() && /^\.deploy_untracked_backup_/i.test(entry.name))
            .map((entry) => path.join(root, entry.name, 'public_sdxp', 'index.html'))
            .sort()
            .reverse();

        for (const candidate of candidates) {
            try {
                await fs.access(candidate);
                return candidate;
            } catch {
            }
        }
    } catch {
    }
    return '';
}

function normalizeSdxpTail(value) {
    return String(value || '')
        .trim()
        .replace(/^[./\\]+/, '')
        .replace(/^\/+/, '')
        .replace(/\\/g, '/');
}

function buildSdxpTailCandidates(rawTail) {
    const normalized = normalizeSdxpTail(rawTail);
    if (!normalized || normalized.includes('..')) return [];

    const out = [];
    const seen = new Set();
    const add = (tail) => {
        const next = normalizeSdxpTail(tail);
        if (!next || next.includes('..')) return;
        const key = next.toLowerCase();
        if (seen.has(key)) return;
        seen.add(key);
        out.push(next);
    };

    const flatHtmlMatch = normalized.match(/^html\/([^/]+)\.html$/i);
    if (flatHtmlMatch?.[1]) {
        const slug = String(flatHtmlMatch[1]).trim();
        add(`html/${slug}/game/index.html`);
        add(`html/${slug}/index.html`);
        add(normalized);
        return out;
    }

    const folderRootMatch = normalized.match(/^html\/([^/]+)\/?$/i);
    if (folderRootMatch?.[1]) {
        const slug = String(folderRootMatch[1]).trim();
        add(`html/${slug}/game/index.html`);
        add(`html/${slug}/index.html`);
        add(normalized);
        return out;
    }

    const folderIndexMatch = normalized.match(/^html\/([^/]+)\/index\.html$/i);
    if (folderIndexMatch?.[1]) {
        const slug = String(folderIndexMatch[1]).trim();
        add(`html/${slug}/game/index.html`);
        add(normalized);
        return out;
    }

    const directGameMatch = normalized.match(/^html\/([^/]+)\/game\/index\.html$/i);
    if (directGameMatch?.[1]) {
        const slug = String(directGameMatch[1]).trim();
        add(normalized);
        add(`html/${slug}/index.html`);
        return out;
    }

    add(normalized);
    return out;
}

function sdxpCatalogUrlForTail(rawTail) {
    const tails = buildSdxpTailCandidates(rawTail);
    const launchTail = tails[0] || normalizeSdxpTail(rawTail);
    if (!launchTail) return '';
    return `/sdxp/${encodePathForUrl(launchTail)}`;
}

function stripSdxpTopRedirect(html) {
    return String(html || '').replace(
        /<script[^>]*>\s*if\s*\(\s*window\.top\s*={2,3}\s*window\.self\s*\)\s*\{\s*window\.location(?:\.href)?\s*=\s*['"][^'"]+['"]\s*;?\s*\}\s*<\/script>/gi,
        ''
    );
}

function parseSdxpCatalogCards(html) {
    const source = String(html || '');
    const items = [];
    const seen = new Set();
    const entryRe = /<a\b([^>]*)>([\s\S]*?)<\/a>/gi;
    let block;
    while ((block = entryRe.exec(source)) !== null) {
        const attrs = String(block[1] || '');
        const body = String(block[2] || '');
        const classMatch = attrs.match(/\bclass\s*=\s*["']([^"']+)["']/i);
        const classValue = String(classMatch?.[1] || '');
        if (!/\bcard\b/i.test(classValue)) continue;

        const hrefMatch = attrs.match(/\bhref\s*=\s*["']([^"']+)["']/i);
        const imgMatch = body.match(/<img[^>]*src\s*=\s*["']([^"']+)["']/i);
        const nameMatch = body.match(/<figcaption[^>]*>([\s\S]*?)<\/figcaption>/i);
        if (!hrefMatch || !nameMatch) continue;

        const hrefRaw = String(hrefMatch[1] || '').trim();
        const name = String(nameMatch[1] || '')
            .replace(/<[^>]+>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
        if (!hrefRaw || !name) continue;
        if (/^(?:https?:|\/\/|javascript:|data:|#)/i.test(hrefRaw)) continue;

        const rel = hrefRaw
            .replace(/^\.?\//, '')
            .replace(/^\/+/, '')
            .replace(/\\/g, '/');
        if (!rel || rel.includes('..')) continue;
        const launchUrl = sdxpCatalogUrlForTail(rel);
        if (!launchUrl) continue;
        const key = launchUrl.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);

        const relCoverRaw = String(imgMatch?.[1] || '').trim();
        const relCover = relCoverRaw
            .replace(/^\.?\//, '')
            .replace(/^\/+/, '')
            .replace(/\\/g, '/');
        const cover = relCover && !relCover.includes('..')
            ? `/sdxp/${encodePathForUrl(relCover)}`
            : '';

        items.push({
            id: `sdxp-fallback-${key.replace(/[^a-z0-9/_-]+/gi, '-')}`,
            name,
            url: launchUrl,
            cover,
        });
    }
    items.sort((a, b) => a.name.localeCompare(b.name));
    return items;
}

async function loadSdxpFallbackCatalog() {
    const backupIndex = await findSdxpBackupIndexFile();
    if (backupIndex) {
        try {
            const html = await fs.readFile(backupIndex, 'utf8');
            const parsed = parseSdxpCatalogCards(html);
            if (parsed.length) return parsed;
        } catch {
        }
    }

    try {
        const response = await fetch(SDXP_FALLBACK_BASE);
        if (response.ok) {
            const html = await response.text();
            const parsed = parseSdxpCatalogCards(html);
            if (parsed.length) return parsed;
        }
    } catch {
    }

    return [];
}

function isSafeHostname(hostname) {
    if (!hostname || typeof hostname !== 'string') return false;
    if (hostname.length > 253) return false;
    if (hostname.includes('/') || hostname.includes(':') || hostname.includes('\\')) return false;

    const labels = hostname.split('.');
    if (labels.length < 2) return false;

    return labels.every((label) =>
        /^[a-z0-9-]{1,63}$/i.test(label) &&
        !label.startsWith('-') &&
        !label.endsWith('-')
    );
}

function hasJamendoClientId() {
    return JAMENDO_CLIENT_ID.length >= 6;
}

function pickAudiusArtwork(track) {
    const artwork = track?.artwork;
    if (!artwork || typeof artwork !== 'object') return track?.user?.profile_picture || '';
    return artwork['480x480'] || artwork['150x150'] || artwork['1000x1000'] || '';
}

function jsonError(res, status, error) {
    return res.status(status).json({ error });
}

function normalizePresenceId(value) {
    const id = String(value || '').trim();
    if (!/^[a-z0-9_-]{8,80}$/i.test(id)) return '';
    return id;
}

function prunePresence(now = Date.now()) {
    for (const [id, entry] of presenceMap.entries()) {
        const lastSeenAt = Number(entry?.lastSeenAt || 0);
        if (!lastSeenAt || (now - lastSeenAt) > PRESENCE_TTL_MS) {
            presenceMap.delete(id);
        }
    }
}

function countActivePresence(now = Date.now()) {
    prunePresence(now);
    return presenceMap.size;
}

function parseCookies(req) {
    const raw = String(req.headers.cookie || '');
    const out = {};
    if (!raw) return out;
    for (const entry of raw.split(';')) {
        const idx = entry.indexOf('=');
        if (idx === -1) continue;
        const key = entry.slice(0, idx).trim();
        const value = entry.slice(idx + 1).trim();
        if (!key) continue;
        out[key] = decodeURIComponent(value);
    }
    return out;
}

function setSessionCookie(res, token, expiresAt) {
    const expires = new Date(expiresAt).toUTCString();
    res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Expires=${expires}`
    );
}

function clearSessionCookie(res) {
    res.setHeader(
        'Set-Cookie',
        `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Expires=Thu, 01 Jan 1970 00:00:00 GMT`
    );
}

function createSalt() {
    return crypto.randomBytes(16).toString('hex');
}

function hashPassword(password, salt) {
    return crypto.scryptSync(password, salt, 64).toString('hex');
}

function createToken() {
    return crypto.randomBytes(32).toString('hex');
}

function sanitizeUsername(value) {
    return String(value || '').trim().toLowerCase();
}

function isValidUsername(username) {
    return /^[a-z0-9_]{3,24}$/.test(username);
}

function isValidPassword(password) {
    return typeof password === 'string' && password.length >= 8 && password.length <= 128;
}

async function ensureAuthDb() {
    try {
        await fs.access(AUTH_DB_PATH);
    } catch {
        await fs.mkdir(path.dirname(AUTH_DB_PATH), { recursive: true });
        await fs.writeFile(
            AUTH_DB_PATH,
            JSON.stringify({ users: [], sessions: [], saves: {} }, null, 2),
            'utf8'
        );
    }
}

function extractFirstJsonObject(raw) {
    const text = String(raw || '');
    const start = text.indexOf('{');
    if (start < 0) return null;

    let depth = 0;
    let inString = false;
    let escaped = false;

    for (let i = start; i < text.length; i += 1) {
        const ch = text[i];

        if (inString) {
            if (escaped) {
                escaped = false;
                continue;
            }
            if (ch === '\\') {
                escaped = true;
                continue;
            }
            if (ch === '"') {
                inString = false;
            }
            continue;
        }

        if (ch === '"') {
            inString = true;
            continue;
        }
        if (ch === '{') {
            depth += 1;
            continue;
        }
        if (ch === '}') {
            depth -= 1;
            if (depth === 0) {
                return text.slice(start, i + 1);
            }
        }
    }
    return null;
}

async function parseAuthDbWithRecovery(raw) {
    const text = String(raw || '').trim();
    if (!text) return { users: [], sessions: [], saves: {} };

    try {
        return JSON.parse(text);
    } catch (error) {
        const firstObject = extractFirstJsonObject(text);
        if (firstObject) {
            try {
                return JSON.parse(firstObject);
            } catch {
            }
        }
        throw error;
    }
}

async function readAuthDb() {
    await ensureAuthDb();
    let raw = await fs.readFile(AUTH_DB_PATH, 'utf8');
    let db;
    try {
        db = await parseAuthDbWithRecovery(raw);
    } catch (error) {
        // A short retry helps when another process is rewriting the file.
        try {
            await new Promise((resolve) => setTimeout(resolve, 50));
            raw = await fs.readFile(AUTH_DB_PATH, 'utf8');
            db = await parseAuthDbWithRecovery(raw);
        } catch {
            const backupPath = `${AUTH_DB_PATH}.corrupt-${Date.now()}.json`;
            try {
                await fs.writeFile(backupPath, raw, 'utf8');
            } catch {
            }
            db = { users: [], sessions: [], saves: {} };
            await writeAuthDb(db);
            console.error(`[auth-db] parse failed; backed up corrupt file to ${backupPath}: ${error.message}`);
        }
    }
    db.users = Array.isArray(db.users) ? db.users : [];
    db.sessions = Array.isArray(db.sessions) ? db.sessions : [];
    db.saves = db.saves && typeof db.saves === 'object' ? db.saves : {};
    if (pruneInactiveChatRooms(db)) {
        await writeAuthDb(db);
    }
    return db;
}

async function writeAuthDb(db) {
    await fs.mkdir(path.dirname(AUTH_DB_PATH), { recursive: true });
    await fs.writeFile(AUTH_DB_PATH, JSON.stringify(db, null, 2), 'utf8');
}

async function updateAuthDb(mutator) {
    authWriteLock = authWriteLock
        .catch(() => {
        })
        .then(async () => {
            const db = await readAuthDb();
            const updated = await mutator(db);
            await writeAuthDb(updated || db);
        });
    return authWriteLock;
}

async function getSessionFromRequest(req) {
    const cookies = parseCookies(req);
    const token = cookies[SESSION_COOKIE];
    if (!token) return null;
    const now = Date.now();
    const db = await readAuthDb();
    const session = db.sessions.find((entry) => entry && entry.token === token);
    if (!session || session.expiresAt <= now) return null;
    const user = db.users.find((entry) => entry && entry.id === session.userId);
    if (!user) return null;
    return { token, session, user, db };
}

function userSafeView(user) {
    return {
        id: user.id,
        username: user.username,
        createdAt: user.createdAt,
    };
}

function getUserSave(db, userId) {
    if (!db.saves[userId]) {
        db.saves[userId] = { settings: {}, games: {} };
    }
    const save = db.saves[userId];
    save.settings = save.settings && typeof save.settings === 'object' ? save.settings : {};
    save.games = save.games && typeof save.games === 'object' ? save.games : {};
    return save;
}

function normalizeMusicTrack(input) {
    if (!input || typeof input !== 'object') return null;
    const provider = String(input.provider || '').trim().toLowerCase();
    const id = String(input.id || '').trim();
    const title = String(input.title || '').trim().slice(0, 180);
    const artist = String(input.artist || '').trim().slice(0, 120);
    const artwork = String(input.artwork || '').trim().slice(0, 1000);
    const durationMs = Number(input.durationMs || 0);
    if (!/^[a-z0-9_-]{2,20}$/i.test(provider)) return null;
    if (!/^[a-z0-9:_-]{1,140}$/i.test(id)) return null;
    if (!title) return null;
    return {
        id,
        provider,
        key: `${provider}:${id}`,
        title,
        artist: artist || 'Unknown artist',
        artwork,
        durationMs: Number.isFinite(durationMs) && durationMs > 0 ? Math.round(durationMs) : 0,
    };
}

function sanitizePlaylistName(value) {
    const name = String(value || '').trim().replace(/\s+/g, ' ');
    if (!name) return '';
    return name.slice(0, 60);
}

function getUserMusicLibrary(save, user) {
    if (!save.music || typeof save.music !== 'object') {
        save.music = {};
    }
    if (!Array.isArray(save.music.favorites)) save.music.favorites = [];
    if (!Array.isArray(save.music.playlists)) save.music.playlists = [];

    save.music.favorites = save.music.favorites
        .map((entry) => {
            const track = normalizeMusicTrack(entry);
            if (!track) return null;
            const favoritedAt = Number(entry?.favoritedAt || Date.now());
            return { ...track, favoritedAt };
        })
        .filter(Boolean);

    save.music.playlists = save.music.playlists
        .filter((playlist) => playlist && typeof playlist === 'object')
        .map((playlist) => {
            const name = sanitizePlaylistName(playlist.name);
            const id = String(playlist.id || '').trim() || crypto.randomUUID();
            const createdAt = Number(playlist.createdAt || Date.now());
            const updatedAt = Number(playlist.updatedAt || createdAt);
            const tracks = Array.isArray(playlist.tracks)
                ? playlist.tracks.map((entry) => normalizeMusicTrack(entry)).filter(Boolean)
                : [];
            return {
                id,
                name: name || 'untitled playlist',
                isPrivate: Boolean(playlist.isPrivate),
                ownerUserId: user.id,
                ownerUsername: user.username,
                createdAt,
                updatedAt,
                tracks,
            };
        });

    return save.music;
}

function toPlaylistPublicView(playlist) {
    return {
        id: playlist.id,
        name: playlist.name,
        isPrivate: !!playlist.isPrivate,
        ownerUsername: playlist.ownerUsername,
        createdAt: playlist.createdAt,
        updatedAt: playlist.updatedAt,
        trackCount: Array.isArray(playlist.tracks) ? playlist.tracks.length : 0,
        tracks: Array.isArray(playlist.tracks) ? playlist.tracks : [],
    };
}

function getChatLog(db) {
    if (!Array.isArray(db.chat)) db.chat = [];
    return db.chat;
}

function normalizeRoomName(input) {
    return String(input || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9 _-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .slice(0, 40);
}

function createSystemRoom(id, now) {
    return {
        id,
        name: id,
        ownerUserId: 'system',
        ownerUsername: 'system',
        isPrivate: false,
        createdAt: now,
        lastMessageAt: now,
    };
}

function getChatRooms(db) {
    const now = Date.now();
    if (!db.chatRooms || typeof db.chatRooms !== 'object') db.chatRooms = {};
    if (!db.chatRooms.lobby) db.chatRooms.lobby = createSystemRoom('lobby', now);
    if (!db.chatRooms.links) db.chatRooms.links = createSystemRoom('links', now);
    return db.chatRooms;
}

function getChatMessagesMap(db) {
    if (!db.chatMessages || typeof db.chatMessages !== 'object') db.chatMessages = {};
    return db.chatMessages;
}

function getRoomMessages(db, roomId) {
    const map = getChatMessagesMap(db);
    if (!Array.isArray(map[roomId])) map[roomId] = [];
    return map[roomId];
}

function toRoomPublicView(room) {
    return {
        id: room.id,
        name: room.name,
        ownerUsername: room.ownerUsername,
        isPrivate: !!room.isPrivate,
        createdAt: room.createdAt,
        lastMessageAt: room.lastMessageAt || room.createdAt,
    };
}

function verifyRoomPassword(room, password) {
    if (!room.isPrivate) return true;
    if (!password || typeof password !== 'string') return false;
    const hash = hashPassword(password, room.passwordSalt);
    return hash === room.passwordHash;
}

function isRiftAdminUser(user) {
    if (!user) return false;
    return sanitizeUsername(user.username) === 'rift';
}

function canAccessRoom(authUser, room, password) {
    if (!room?.isPrivate) return true;
    if (isRiftAdminUser(authUser)) return true;
    return verifyRoomPassword(room, password);
}

function pruneInactiveChatRooms(db) {
    const rooms = getChatRooms(db);
    const messagesMap = getChatMessagesMap(db);
    const now = Date.now();
    let changed = false;

    for (const [roomId, room] of Object.entries(rooms)) {
        if (SYSTEM_CHAT_ROOM_IDS.has(roomId)) continue;
        const lastActivity = Number(room.lastMessageAt || room.createdAt || 0);
        if (lastActivity <= 0 || (now - lastActivity) < CHAT_ROOM_INACTIVE_TTL_MS) continue;
        delete rooms[roomId];
        delete messagesMap[roomId];
        changed = true;
    }

    return changed;
}

function sortChatRoomsForList(a, b) {
    if (a.id === 'lobby') return -1;
    if (b.id === 'lobby') return 1;
    if (a.id === 'links') return -1;
    if (b.id === 'links') return 1;
    return (b.lastMessageAt || 0) - (a.lastMessageAt || 0);
}

function canDeleteRoom(authUser, room) {
    if (!authUser || !room) return false;
    if (SYSTEM_CHAT_ROOM_IDS.has(room.id)) return false;
    const username = sanitizeUsername(authUser.username);
    if (username === 'rift') return true;
    return room.ownerUserId === authUser.id;
}

function sanitizeChatText(input) {
    const text = String(input || '')
        .replace(/\s+/g, ' ')
        .trim();
    if (!text) return '';
    return text.slice(0, 400);
}

function safeJsonForInlineScript(value) {
    return JSON.stringify(value)
        .replace(/</g, '\\u003c')
        .replace(/>/g, '\\u003e')
        .replace(/&/g, '\\u0026')
        .replace(/\u2028/g, '\\u2028')
        .replace(/\u2029/g, '\\u2029')
        .replace(/<\/script/gi, '<\\/script');
}

function parseProxyUpstreamFromReferer(req) {
    const referer = String(req.get('referer') || '').trim();
    if (!referer) return null;
    try {
        const refUrl = new URL(referer);
        if (refUrl.pathname !== '/proxy') return null;
        const upstream = refUrl.searchParams.get('url');
        if (!upstream) return null;
        return new URL(upstream);
    } catch {
        return null;
    }
}

function isLikelyAssetPath(pathname) {
    if (!pathname || pathname === '/') return false;
    if (pathname.startsWith('/assets/') || pathname.startsWith('/components/') || pathname.startsWith('/scramjet/') || pathname.startsWith('/baremux/') || pathname.startsWith('/libcurl/')) {
        return false;
    }
    return /\.(?:js|mjs|css|json|map|png|jpe?g|webp|gif|svg|ico|woff2?|ttf|otf|eot|mp3|ogg|wav|m4a|aac|flac|wasm|unityweb|data|bin|txt|xml)(?:$|\?)/i.test(pathname);
}

async function hostnamePointsToAllowedIp(hostname) {
    const now = Date.now();
    const cached = validateCache.get(hostname);

    if (cached && cached.expiresAt > now) {
        return cached.ok;
    }

    try {
        const records = await dns.lookup(hostname, { all: true });
        const addresses = new Set(records.map((r) => r.address));
        const ok = VALIDATE_TARGET_IPS.some((ip) => addresses.has(ip));

        validateCache.set(hostname, {
            ok,
            expiresAt: now + VALIDATE_TTL_MS,
        });

        return ok;
    } catch {
        validateCache.set(hostname, {
            ok: false,
            expiresAt: now + VALIDATE_TTL_MS,
        });

        return false;
    }
}

app.use(express.static(path.join(__dirname, '..', 'public'), { redirect: false }));
app.use('/assets', express.static(path.join(__dirname, '..', 'assets')));
app.use('/components', express.static(path.join(__dirname, '..', 'components')));
app.use('/scramjet', express.static(path.join(__dirname, '..', 'node_modules', '@mercuryworkshop', 'scramjet', 'dist')));
app.use('/baremux', express.static(path.join(__dirname, '..', 'node_modules', '@mercuryworkshop', 'bare-mux', 'dist')));
app.use('/libcurl', express.static(path.join(__dirname, '..', 'node_modules', '@mercuryworkshop', 'libcurl-transport', 'dist')));

app.all(/^\/astra(?:\/(.*))?$/, async (req, res) => {
    const tail = req.params?.[0] || '';
    return proxyVelara(req, res, '/astra', tail);
});

app.all(/^\/astra-accounts(?:\/(.*))?$/, async (req, res) => {
    const tail = req.params?.[0] || '';
    return proxyVelara(req, res, '/astra-accounts', tail);
});

app.post('/api/auth/signup', async (req, res) => {
    try {
        const username = sanitizeUsername(req.body?.username);
        const password = String(req.body?.password || '');
        if (!isValidUsername(username)) {
            return jsonError(res, 400, 'Username must be 3-24 chars: lowercase letters, numbers, underscore.');
        }
        if (!isValidPassword(password)) {
            return jsonError(res, 400, 'Password must be 8-128 characters.');
        }

        const userId = crypto.randomUUID();
        const now = Date.now();
        const salt = createSalt();
        const passwordHash = hashPassword(password, salt);
        const token = createToken();
        const expiresAt = now + SESSION_TTL_MS;

        await updateAuthDb((db) => {
            if (db.users.some((u) => u.username === username)) {
                throw new Error('USERNAME_TAKEN');
            }
            db.users.push({
                id: userId,
                username,
                passwordHash,
                passwordSalt: salt,
                createdAt: now,
            });
            db.sessions = db.sessions.filter((s) => s.expiresAt > now);
            db.sessions.push({
                token,
                userId,
                createdAt: now,
                lastSeenAt: now,
                expiresAt,
            });
            getUserSave(db, userId);
            return db;
        });

        setSessionCookie(res, token, expiresAt);
        return res.json({ ok: true, user: { id: userId, username, createdAt: now } });
    } catch (error) {
        if (error.message === 'USERNAME_TAKEN') {
            return jsonError(res, 409, 'Username already exists.');
        }
        return jsonError(res, 500, `Signup failed: ${error.message}`);
    }
});

app.post('/api/auth/login', async (req, res) => {
    try {
        const username = sanitizeUsername(req.body?.username);
        const password = String(req.body?.password || '');
        if (!username || !password) return jsonError(res, 400, 'Username and password are required.');

        const db = await readAuthDb();
        const user = db.users.find((u) => u.username === username);
        if (!user) return jsonError(res, 401, 'Invalid username or password.');

        const expected = hashPassword(password, user.passwordSalt);
        if (expected !== user.passwordHash) {
            return jsonError(res, 401, 'Invalid username or password.');
        }

        const now = Date.now();
        const token = createToken();
        const expiresAt = now + SESSION_TTL_MS;
        await updateAuthDb((nextDb) => {
            nextDb.sessions = nextDb.sessions.filter((s) => s.expiresAt > now && s.userId !== user.id);
            nextDb.sessions.push({
                token,
                userId: user.id,
                createdAt: now,
                lastSeenAt: now,
                expiresAt,
            });
            getUserSave(nextDb, user.id);
            return nextDb;
        });

        setSessionCookie(res, token, expiresAt);
        return res.json({ ok: true, user: userSafeView(user) });
    } catch (error) {
        return jsonError(res, 500, `Login failed: ${error.message}`);
    }
});

app.post('/api/auth/logout', async (req, res) => {
    try {
        const cookies = parseCookies(req);
        const token = cookies[SESSION_COOKIE];
        if (token) {
            await updateAuthDb((db) => {
                db.sessions = db.sessions.filter((s) => s.token !== token);
                return db;
            });
        }
        clearSessionCookie(res);
        return res.json({ ok: true });
    } catch (error) {
        return jsonError(res, 500, `Logout failed: ${error.message}`);
    }
});

app.get('/api/auth/me', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return res.status(401).json({ authenticated: false });

        const now = Date.now();
        await updateAuthDb((db) => {
            const session = db.sessions.find((s) => s.token === auth.token);
            if (session) {
                session.lastSeenAt = now;
            }
            return db;
        });

        return res.json({ authenticated: true, user: userSafeView(auth.user) });
    } catch (error) {
        return jsonError(res, 500, `Session check failed: ${error.message}`);
    }
});

app.get('/api/auth/ping', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return res.json({ ok: true, authenticated: false });
        const now = Date.now();
        await updateAuthDb((db) => {
            const session = db.sessions.find((s) => s.token === auth.token);
            if (session) session.lastSeenAt = now;
            return db;
        });
        return res.json({ ok: true, authenticated: true, now });
    } catch (error) {
        return jsonError(res, 500, `Ping failed: ${error.message}`);
    }
});

app.get('/api/stats/users', async (req, res) => {
    const now = Date.now();
    const activeTabs = countActivePresence(now);

    let totalUsers = 0;
    let activeSignedInUsers = 0;
    let dbAvailable = true;

    try {
        const db = await readAuthDb();
        totalUsers = Array.isArray(db.users) ? db.users.length : 0;

        const activeUserIds = new Set();
        const sessions = Array.isArray(db.sessions) ? db.sessions : [];
        for (const session of sessions) {
            if (!session || session.expiresAt <= now) continue;
            const lastSeenAt = Number(session.lastSeenAt || session.createdAt || 0);
            if (lastSeenAt > 0 && (now - lastSeenAt) <= ACTIVE_USER_WINDOW_MS) {
                activeUserIds.add(session.userId);
            }
        }
        activeSignedInUsers = activeUserIds.size;
    } catch (error) {
        dbAvailable = false;
        console.warn('User stats fallback (db unavailable):', error.message);
    }

    return res.json({
        ok: true,
        totalUsers,
        activeUsers: activeTabs,
        activeWindowMs: ACTIVE_USER_WINDOW_MS,
        activeTabs,
        activeSignedInUsers,
        dbAvailable,
    });
});

app.post('/api/presence/ping', async (req, res) => {
    try {
        const id = normalizePresenceId(req.body?.id);
        if (!id) return jsonError(res, 400, 'Invalid presence id');
        const now = Date.now();
        prunePresence(now);
        presenceMap.set(id, { lastSeenAt: now });
        return res.json({ ok: true, activeTabs: presenceMap.size, ttlMs: PRESENCE_TTL_MS });
    } catch (error) {
        return jsonError(res, 500, `Presence ping failed: ${error.message}`);
    }
});

app.post('/api/presence/leave', async (req, res) => {
    try {
        const id = normalizePresenceId(req.body?.id);
        if (!id) return jsonError(res, 400, 'Invalid presence id');
        presenceMap.delete(id);
        prunePresence(Date.now());
        return res.json({ ok: true, activeTabs: presenceMap.size });
    } catch (error) {
        return jsonError(res, 500, `Presence leave failed: ${error.message}`);
    }
});

app.get('/api/save', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const save = getUserSave(auth.db, auth.user.id);
        return res.json({ ok: true, save });
    } catch (error) {
        return jsonError(res, 500, `Save read failed: ${error.message}`);
    }
});

app.put('/api/save/settings', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const updates = req.body?.settings;
        if (!updates || typeof updates !== 'object') {
            return jsonError(res, 400, 'settings object is required');
        }
        await updateAuthDb((db) => {
            const save = getUserSave(db, auth.user.id);
            save.settings = { ...save.settings, ...updates };
            return db;
        });
        return res.json({ ok: true });
    } catch (error) {
        return jsonError(res, 500, `Settings save failed: ${error.message}`);
    }
});

app.put('/api/save/games/:gameId', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const gameId = String(req.params?.gameId || '').trim();
        if (!gameId || gameId.length > 120) return jsonError(res, 400, 'Invalid gameId');
        const progress = req.body?.progress;
        if (!progress || typeof progress !== 'object') {
            return jsonError(res, 400, 'progress object is required');
        }
        await updateAuthDb((db) => {
            const save = getUserSave(db, auth.user.id);
            const existing = save.games[gameId] && typeof save.games[gameId] === 'object'
                ? save.games[gameId]
                : {};
            const launchDelta = Number(progress.launches || 0);
            save.games[gameId] = {
                ...existing,
                ...progress,
                launches: Number(existing.launches || 0) + (Number.isFinite(launchDelta) ? launchDelta : 0),
                updatedAt: Date.now(),
            };
            return db;
        });
        return res.json({ ok: true });
    } catch (error) {
        return jsonError(res, 500, `Game save failed: ${error.message}`);
    }
});

app.get('/api/music/search', async (req, res) => {
    try {
        const query = String(req.query?.q || '').trim().slice(0, 120);
        if (!query) return jsonError(res, 400, 'q is required');
        const source = String(req.query?.source || 'all').trim().toLowerCase();
        const limit = 24;
        const providers = source === 'audius' || source === 'jamendo'
            ? [source]
            : ['audius', 'jamendo'];
        const tracks = [];
        const warnings = [];

        if (providers.includes('audius')) {
            try {
                const endpoint = new URL(`${AUDIUS_API_BASE}/v1/tracks/search`);
                endpoint.searchParams.set('query', query);
                endpoint.searchParams.set('app_name', 'rift');
                endpoint.searchParams.set('limit', String(limit));
                const upstream = await fetch(endpoint.toString(), {
                    headers: { 'User-Agent': 'Rift-Music/1.0' },
                });
                if (upstream.ok) {
                    const data = await upstream.json();
                    const list = Array.isArray(data?.data) ? data.data : [];
                    for (const item of list) {
                        if (!item?.id) continue;
                        tracks.push({
                            id: String(item.id),
                            provider: 'audius',
                            title: String(item.title || ''),
                            artist: String(item?.user?.name || ''),
                            artwork: pickAudiusArtwork(item),
                            durationMs: Number(item.duration || 0) * 1000,
                        });
                    }
                } else {
                    warnings.push(`audius search failed (${upstream.status})`);
                }
            } catch (error) {
                warnings.push(`audius error: ${error.message}`);
            }
        }

        if (providers.includes('jamendo')) {
            if (!hasJamendoClientId()) {
                warnings.push('jamendo not configured (missing JAMENDO_CLIENT_ID)');
            } else {
                try {
                    const endpoint = new URL(`${JAMENDO_API_BASE}/tracks/`);
                    endpoint.searchParams.set('client_id', JAMENDO_CLIENT_ID);
                    endpoint.searchParams.set('format', 'json');
                    endpoint.searchParams.set('limit', String(limit));
                    endpoint.searchParams.set('search', query);
                    endpoint.searchParams.set('audioformat', 'mp32');
                    const upstream = await fetch(endpoint.toString(), {
                        headers: { 'User-Agent': 'Rift-Music/1.0' },
                    });
                    if (upstream.ok) {
                        const data = await upstream.json();
                        const list = Array.isArray(data?.results) ? data.results : [];
                        for (const item of list) {
                            if (!item?.id || !item?.audio) continue;
                            tracks.push({
                                id: String(item.id),
                                provider: 'jamendo',
                                title: String(item.name || ''),
                                artist: String(item.artist_name || ''),
                                artwork: String(item.image || ''),
                                durationMs: Number(item.duration || 0) * 1000,
                                streamUrl: String(item.audio || ''),
                            });
                        }
                    } else {
                        warnings.push(`jamendo search failed (${upstream.status})`);
                    }
                } catch (error) {
                    warnings.push(`jamendo error: ${error.message}`);
                }
            }
        }

        return res.json({
            ok: true,
            query,
            source,
            tracks: tracks.slice(0, 80),
            warnings,
        });
    } catch (error) {
        return jsonError(res, 500, `Music search failed: ${error.message}`);
    }
});

app.get('/api/music/stream/:trackId', async (req, res) => {
    try {
        const trackId = String(req.params?.trackId || '').trim();
        const provider = String(req.query?.provider || 'audius').trim().toLowerCase();

        if (provider === 'audius') {
            if (!/^[a-z0-9_-]+$/i.test(trackId)) return jsonError(res, 400, 'Invalid Audius track id');
            const streamEndpoint = new URL(`${AUDIUS_API_BASE}/v1/tracks/${trackId}/stream`);
            streamEndpoint.searchParams.set('app_name', 'rift');
            return res.redirect(302, streamEndpoint.toString());
        }

        if (provider === 'jamendo') {
            if (!/^\d+$/.test(trackId)) return jsonError(res, 400, 'Invalid Jamendo track id');
            if (!hasJamendoClientId()) {
                return jsonError(res, 503, 'Jamendo API not configured. Set JAMENDO_CLIENT_ID on server.');
            }
            const trackEndpoint = new URL(`${JAMENDO_API_BASE}/tracks/`);
            trackEndpoint.searchParams.set('client_id', JAMENDO_CLIENT_ID);
            trackEndpoint.searchParams.set('format', 'json');
            trackEndpoint.searchParams.set('id', trackId);
            trackEndpoint.searchParams.set('audioformat', 'mp32');
            const trackRes = await fetch(trackEndpoint.toString(), {
                headers: { 'User-Agent': 'Rift-Music/1.0' },
            });
            if (!trackRes.ok) {
                return jsonError(res, trackRes.status, `Jamendo track lookup failed (${trackRes.status})`);
            }
            const data = await trackRes.json();
            const item = Array.isArray(data?.results) ? data.results[0] : null;
            const streamUrl = String(item?.audio || '').trim();
            if (!streamUrl) return jsonError(res, 404, 'No playable stream found for this track.');
            return res.redirect(302, streamUrl);
        }

        return jsonError(res, 400, 'Unsupported provider');
    } catch (error) {
        return jsonError(res, 500, `Music stream failed: ${error.message}`);
    }
});

app.get('/api/music/library', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const save = getUserSave(auth.db, auth.user.id);
        const music = getUserMusicLibrary(save, auth.user);
        return res.json({
            ok: true,
            favorites: music.favorites,
            playlists: music.playlists.map((playlist) => toPlaylistPublicView(playlist)),
        });
    } catch (error) {
        return jsonError(res, 500, `Music library read failed: ${error.message}`);
    }
});

app.put('/api/music/favorites', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const track = normalizeMusicTrack(req.body?.track);
        if (!track) return jsonError(res, 400, 'Invalid track payload');
        let isFavorite = req.body?.isFavorite;
        if (typeof isFavorite !== 'boolean') isFavorite = null;

        let finalFavoriteState = false;
        let favorites = [];
        await updateAuthDb((db) => {
            const user = db.users.find((u) => u.id === auth.user.id) || auth.user;
            const save = getUserSave(db, auth.user.id);
            const music = getUserMusicLibrary(save, user);
            const existingIndex = music.favorites.findIndex((entry) => entry.key === track.key);
            const targetState = isFavorite === null ? existingIndex === -1 : isFavorite;

            if (targetState) {
                const next = { ...track, favoritedAt: Date.now() };
                if (existingIndex >= 0) {
                    music.favorites[existingIndex] = next;
                } else {
                    music.favorites.unshift(next);
                }
                finalFavoriteState = true;
            } else if (existingIndex >= 0) {
                music.favorites.splice(existingIndex, 1);
                finalFavoriteState = false;
            } else {
                finalFavoriteState = false;
            }
            favorites = music.favorites.slice(0, 500);
            music.favorites = favorites;
            return db;
        });

        return res.json({
            ok: true,
            isFavorite: finalFavoriteState,
            favoritesCount: favorites.length,
            favorites,
        });
    } catch (error) {
        return jsonError(res, 500, `Favorite update failed: ${error.message}`);
    }
});

app.post('/api/music/playlists', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const name = sanitizePlaylistName(req.body?.name);
        const isPrivate = Boolean(req.body?.isPrivate);
        if (!name) return jsonError(res, 400, 'Playlist name is required.');

        let created = null;
        await updateAuthDb((db) => {
            const user = db.users.find((u) => u.id === auth.user.id) || auth.user;
            const save = getUserSave(db, auth.user.id);
            const music = getUserMusicLibrary(save, user);
            if (music.playlists.length >= 100) {
                throw new Error('PLAYLIST_LIMIT_REACHED');
            }
            const now = Date.now();
            const playlist = {
                id: crypto.randomUUID(),
                name,
                isPrivate,
                ownerUserId: user.id,
                ownerUsername: user.username,
                createdAt: now,
                updatedAt: now,
                tracks: [],
            };
            music.playlists.unshift(playlist);
            created = toPlaylistPublicView(playlist);
            return db;
        });

        return res.json({ ok: true, playlist: created });
    } catch (error) {
        if (error.message === 'PLAYLIST_LIMIT_REACHED') {
            return jsonError(res, 409, 'Playlist limit reached (100).');
        }
        return jsonError(res, 500, `Playlist create failed: ${error.message}`);
    }
});

app.delete('/api/music/playlists/:playlistId', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const playlistId = String(req.params?.playlistId || '').trim();
        if (!playlistId) return jsonError(res, 400, 'Invalid playlist id');

        await updateAuthDb((db) => {
            const user = db.users.find((u) => u.id === auth.user.id) || auth.user;
            const save = getUserSave(db, auth.user.id);
            const music = getUserMusicLibrary(save, user);
            const before = music.playlists.length;
            music.playlists = music.playlists.filter((playlist) => playlist.id !== playlistId);
            if (music.playlists.length === before) throw new Error('PLAYLIST_NOT_FOUND');
            return db;
        });

        return res.json({ ok: true, deletedPlaylistId: playlistId });
    } catch (error) {
        if (error.message === 'PLAYLIST_NOT_FOUND') return jsonError(res, 404, 'Playlist not found');
        return jsonError(res, 500, `Playlist delete failed: ${error.message}`);
    }
});

app.post('/api/music/playlists/:playlistId/tracks', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const playlistId = String(req.params?.playlistId || '').trim();
        if (!playlistId) return jsonError(res, 400, 'Invalid playlist id');
        const track = normalizeMusicTrack(req.body?.track);
        if (!track) return jsonError(res, 400, 'Invalid track payload');

        let playlistView = null;
        await updateAuthDb((db) => {
            const user = db.users.find((u) => u.id === auth.user.id) || auth.user;
            const save = getUserSave(db, auth.user.id);
            const music = getUserMusicLibrary(save, user);
            const playlist = music.playlists.find((entry) => entry.id === playlistId);
            if (!playlist) throw new Error('PLAYLIST_NOT_FOUND');
            const existingIndex = playlist.tracks.findIndex((entry) => entry.key === track.key);
            if (existingIndex >= 0) {
                playlist.tracks[existingIndex] = track;
            } else {
                playlist.tracks.push(track);
            }
            playlist.updatedAt = Date.now();
            if (playlist.tracks.length > 500) {
                playlist.tracks = playlist.tracks.slice(-500);
            }
            playlistView = toPlaylistPublicView(playlist);
            return db;
        });

        return res.json({ ok: true, playlist: playlistView });
    } catch (error) {
        if (error.message === 'PLAYLIST_NOT_FOUND') return jsonError(res, 404, 'Playlist not found');
        return jsonError(res, 500, `Playlist track add failed: ${error.message}`);
    }
});

app.delete('/api/music/playlists/:playlistId/tracks/:trackKey', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const playlistId = String(req.params?.playlistId || '').trim();
        const trackKey = String(req.params?.trackKey || '').trim();
        if (!playlistId) return jsonError(res, 400, 'Invalid playlist id');
        if (!/^[a-z0-9_-]{2,20}:[a-z0-9:_-]{1,140}$/i.test(trackKey)) {
            return jsonError(res, 400, 'Invalid track key');
        }

        let playlistView = null;
        await updateAuthDb((db) => {
            const user = db.users.find((u) => u.id === auth.user.id) || auth.user;
            const save = getUserSave(db, auth.user.id);
            const music = getUserMusicLibrary(save, user);
            const playlist = music.playlists.find((entry) => entry.id === playlistId);
            if (!playlist) throw new Error('PLAYLIST_NOT_FOUND');
            const before = playlist.tracks.length;
            playlist.tracks = playlist.tracks.filter((entry) => entry.key !== trackKey);
            if (playlist.tracks.length === before) throw new Error('TRACK_NOT_FOUND');
            playlist.updatedAt = Date.now();
            playlistView = toPlaylistPublicView(playlist);
            return db;
        });

        return res.json({ ok: true, playlist: playlistView, removedTrackKey: trackKey });
    } catch (error) {
        if (error.message === 'PLAYLIST_NOT_FOUND') return jsonError(res, 404, 'Playlist not found');
        if (error.message === 'TRACK_NOT_FOUND') return jsonError(res, 404, 'Track not found in playlist');
        return jsonError(res, 500, `Playlist track remove failed: ${error.message}`);
    }
});

app.get('/api/music/playlists/public', async (req, res) => {
    try {
        const db = await readAuthDb();
        const usersById = new Map((Array.isArray(db.users) ? db.users : []).map((u) => [u.id, u]));
        const out = [];
        for (const [userId, save] of Object.entries(db.saves || {})) {
            const user = usersById.get(userId);
            if (!user) continue;
            const music = getUserMusicLibrary(save, user);
            for (const playlist of music.playlists) {
                if (playlist.isPrivate) continue;
                out.push({
                    userId,
                    ownerUsername: playlist.ownerUsername || user.username,
                    ...toPlaylistPublicView(playlist),
                });
            }
        }
        out.sort((a, b) => Number(b.updatedAt || 0) - Number(a.updatedAt || 0));
        return res.json({ ok: true, playlists: out.slice(0, 200) });
    } catch (error) {
        return jsonError(res, 500, `Public playlist list failed: ${error.message}`);
    }
});

app.get('/api/chat/messages', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const roomId = normalizeRoomName(req.query?.room || 'lobby') || 'lobby';
        const roomPassword = String(req.query?.password || '');
        const since = Number.parseInt(String(req.query?.since || '0'), 10) || 0;
        const db = await readAuthDb();
        const rooms = getChatRooms(db);
        const room = rooms[roomId];
        if (!room) return jsonError(res, 404, 'Room not found');
        if (!canAccessRoom(auth.user, room, roomPassword)) return jsonError(res, 403, 'Invalid room password');
        const rows = getRoomMessages(db, roomId);
        const filtered = since > 0 ? rows.filter((m) => Number(m.createdAt) > since) : rows;
        const messages = filtered.slice(-120);
        return res.json({ ok: true, room: toRoomPublicView(room), messages, now: Date.now() });
    } catch (error) {
        return jsonError(res, 500, `Chat read failed: ${error.message}`);
    }
});

app.post('/api/chat/messages', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const roomId = normalizeRoomName(req.body?.room || 'lobby') || 'lobby';
        const roomPassword = String(req.body?.password || '');
        const text = sanitizeChatText(req.body?.text);
        if (!text) return jsonError(res, 400, 'Message text required');
        const dbBefore = await readAuthDb();
        const roomsBefore = getChatRooms(dbBefore);
        const roomBefore = roomsBefore[roomId];
        if (!roomBefore) return jsonError(res, 404, 'Room not found');
        if (!canAccessRoom(auth.user, roomBefore, roomPassword)) return jsonError(res, 403, 'Invalid room password');

        const message = {
            id: crypto.randomUUID(),
            roomId,
            userId: auth.user.id,
            username: auth.user.username,
            text,
            createdAt: Date.now(),
        };

        await updateAuthDb((db) => {
            const rooms = getChatRooms(db);
            const room = rooms[roomId];
            if (!room || !canAccessRoom(auth.user, room, roomPassword)) {
                throw new Error('ROOM_ACCESS_DENIED');
            }
            const rows = getRoomMessages(db, roomId);
            rows.push(message);
            if (rows.length > 500) {
                getChatMessagesMap(db)[roomId] = rows.slice(-500);
            }
            room.lastMessageAt = message.createdAt;
            return db;
        });

        return res.json({ ok: true, message });
    } catch (error) {
        if (error.message === 'ROOM_ACCESS_DENIED') return jsonError(res, 403, 'Invalid room password');
        return jsonError(res, 500, `Chat send failed: ${error.message}`);
    }
});

app.get('/api/chat/rooms', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const db = await readAuthDb();
        const rooms = Object.values(getChatRooms(db))
            .map((room) => toRoomPublicView(room))
            .sort(sortChatRoomsForList);
        return res.json({ ok: true, rooms });
    } catch (error) {
        return jsonError(res, 500, `Room list failed: ${error.message}`);
    }
});

app.post('/api/chat/rooms', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const roomId = normalizeRoomName(req.body?.name);
        const isPrivate = Boolean(req.body?.isPrivate);
        const password = String(req.body?.password || '');
        if (!roomId || roomId.length < 3) {
            return jsonError(res, 400, 'Room name must be at least 3 characters.');
        }
        if (SYSTEM_CHAT_ROOM_IDS.has(roomId)) return jsonError(res, 409, 'Room name already exists.');
        if (isPrivate && password.length < 4) {
            return jsonError(res, 400, 'Private room password must be at least 4 characters.');
        }

        const now = Date.now();
        const room = {
            id: roomId,
            name: roomId,
            ownerUserId: auth.user.id,
            ownerUsername: auth.user.username,
            isPrivate,
            createdAt: now,
            lastMessageAt: now,
        };
        if (isPrivate) {
            room.passwordSalt = createSalt();
            room.passwordHash = hashPassword(password, room.passwordSalt);
        }

        await updateAuthDb((db) => {
            const rooms = getChatRooms(db);
            if (rooms[roomId]) throw new Error('ROOM_EXISTS');
            rooms[roomId] = room;
            getRoomMessages(db, roomId);
            return db;
        });

        return res.json({ ok: true, room: toRoomPublicView(room) });
    } catch (error) {
        if (error.message === 'ROOM_EXISTS') return jsonError(res, 409, 'Room name already exists.');
        return jsonError(res, 500, `Room create failed: ${error.message}`);
    }
});

app.delete('/api/chat/rooms/:roomId', async (req, res) => {
    try {
        const auth = await getSessionFromRequest(req);
        if (!auth) return jsonError(res, 401, 'Unauthorized');
        const roomId = normalizeRoomName(req.params?.roomId || '');
        if (!roomId) return jsonError(res, 400, 'Invalid room id');
        if (SYSTEM_CHAT_ROOM_IDS.has(roomId)) {
            return jsonError(res, 403, 'System rooms cannot be deleted.');
        }

        const db = await readAuthDb();
        const rooms = getChatRooms(db);
        const room = rooms[roomId];
        if (!room) return jsonError(res, 404, 'Room not found');
        if (!canDeleteRoom(auth.user, room)) return jsonError(res, 403, 'Not allowed to delete this room');

        await updateAuthDb((nextDb) => {
            const nextRooms = getChatRooms(nextDb);
            const nextRoom = nextRooms[roomId];
            if (!nextRoom) throw new Error('ROOM_NOT_FOUND');
            if (!canDeleteRoom(auth.user, nextRoom)) throw new Error('ROOM_DELETE_DENIED');
            delete nextRooms[roomId];
            const messagesMap = getChatMessagesMap(nextDb);
            delete messagesMap[roomId];
            return nextDb;
        });

        return res.json({ ok: true, deletedRoomId: roomId });
    } catch (error) {
        if (error.message === 'ROOM_NOT_FOUND') return jsonError(res, 404, 'Room not found');
        if (error.message === 'ROOM_DELETE_DENIED') return jsonError(res, 403, 'Not allowed to delete this room');
        return jsonError(res, 500, `Room delete failed: ${error.message}`);
    }
});

app.all('*', async (req, res, next) => {
    const hostPrefixedProxy = String(req.path || '').match(/^\/([a-z0-9.-]+\.[a-z]{2,})\/proxy$/i);
    if (hostPrefixedProxy) {
        const nested = String(req.query?.url || '').trim();
        if (nested) {
            return res.redirect(302, `/proxy?url=${encodeURIComponent(nested)}`);
        }
        const host = hostPrefixedProxy[1];
        return res.redirect(302, `/proxy?url=${encodeURIComponent(`https://${host}/`)}`);
    }

    const upstreamRef = parseProxyUpstreamFromReferer(req);
    if (!upstreamRef) return next();

    const method = (req.method || 'GET').toUpperCase();
    const isBodyMethod = !['GET', 'HEAD'].includes(method);

    if (isBodyMethod) {
        try {
            const target = new URL(req.url, upstreamRef.origin).href;
            const body = await readRawBody(req);
            const headers = {};
            const blocked = new Set([
                'host',
                'connection',
                'content-length',
                'accept-encoding',
                'x-forwarded-for',
                'x-forwarded-host',
                'x-forwarded-proto',
            ]);
            for (const [name, value] of Object.entries(req.headers || {})) {
                if (!name || blocked.has(String(name).toLowerCase())) continue;
                if (typeof value === 'undefined') continue;
                headers[name] = value;
            }

            const targetUrl = new URL(target);
            if (headers.origin) headers.origin = targetUrl.origin;
            if (headers.referer) headers.referer = targetUrl.href;

            const upstream = await fetch(target, {
                method,
                headers,
                body,
                redirect: 'manual',
            });

            const contentType = upstream.headers.get('content-type');
            if (contentType) res.setHeader('Content-Type', contentType);
            const location = upstream.headers.get('location');
            if (location) {
                const resolved = new URL(location, target).href;
                res.setHeader('Location', `/proxy?url=${encodeURIComponent(resolved)}`);
            }
            const setCookie = upstream.headers.get('set-cookie');
            if (setCookie) res.setHeader('Set-Cookie', setCookie);

            const raw = Buffer.from(await upstream.arrayBuffer());
            return res.status(upstream.status).send(raw);
        } catch {
            return next();
        }
    }

    if (!isLikelyAssetPath(req.path)) {
        if (req.path === '/proxy') {
            return next();
        }
        const dest = String(req.get('sec-fetch-dest') || '').toLowerCase();
        const accept = String(req.get('accept') || '').toLowerCase();
        const likelyDocument = dest === 'document' || dest === 'iframe' || accept.includes('text/html');
        if (likelyDocument) {
            try {
                const target = new URL(req.url, upstreamRef.origin).href;
                return res.redirect(302, `/proxy?url=${encodeURIComponent(target)}`);
            } catch {
                return next();
            }
        }
        return next();
    }

    try {
        const cleanPath = req.path.replace(/^\/+/, '');
        const fromRefDir = new URL(cleanPath, new URL('./', upstreamRef));
        const fromOriginRoot = new URL(req.path, upstreamRef.origin);
        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const candidates = [
            `${fromRefDir.href}${query}`,
            `${fromOriginRoot.href}${query}`,
        ];

        for (const candidate of candidates) {
            try {
                const upstream = await fetch(candidate);
                if (!upstream.ok) continue;
                const contentType = upstream.headers.get('content-type');
                if (contentType) res.setHeader('Content-Type', contentType);
                const raw = Buffer.from(await upstream.arrayBuffer());
                return res.status(upstream.status).send(raw);
            } catch {
            }
        }

        return next();
    } catch {
        return next();
    }
});

app.get(/^\/gn\/(.+)$/, async (req, res, next) => {
    const rawTail = String(req.params?.[0] || '').trim();
    if (!rawTail) return next();

    let tail = rawTail;
    try {
        tail = decodeURIComponent(rawTail);
    } catch {
    }
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');
    if (!tail || tail.includes('..')) {
        return res.status(400).send('invalid gn path');
    }

    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const candidates = [
        new URL(`${tail}${query}`, GN_MATH_HTML_BASE).href,
        new URL(`${tail}${query}`, GN_MATH_BASE).href,
    ];

    const attempts = [];
    for (const target of candidates) {
        try {
            const upstream = await fetch(target);
            attempts.push(`${upstream.status} ${target}`);
            if (!upstream.ok) continue;
            res.setHeader('X-Rift-GN', '1');
            const upstreamType = String(upstream.headers.get('content-type') || '').trim();
            const guessedType = guessContentTypeFromPath(tail);
            if (/\.html?$/i.test(tail)) {
                res.setHeader('Content-Type', 'text/html; charset=utf-8');
            } else if (guessedType && (!upstreamType || /^text\/plain\b/i.test(upstreamType))) {
                res.setHeader('Content-Type', guessedType);
            } else if (upstreamType) {
                res.setHeader('Content-Type', upstreamType);
            }
            const cacheControl = upstream.headers.get('cache-control');
            if (cacheControl) res.setHeader('Cache-Control', cacheControl);
            const raw = Buffer.from(await upstream.arrayBuffer());
            return res.status(upstream.status).send(raw);
        } catch (error) {
            attempts.push(`ERR ${target} :: ${error.message}`);
        }
    }

    return res.status(502).json({
        error: 'gn upstream unavailable',
        path: tail,
        attempts,
    });
});

app.get(/^\/sdxp\/(.+)$/, async (req, res, next) => {
    const rawTail = String(req.params?.[0] || '').trim();
    if (!rawTail) return next();

    let decodedTail = rawTail;
    try {
        decodedTail = decodeURIComponent(rawTail);
    } catch {
    }
    const tailCandidates = buildSdxpTailCandidates(decodedTail);
    if (!tailCandidates.length) {
        return res.status(400).send('invalid sdxp path');
    }

    const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
    const attempts = [];
    let firstFailure = null;

    for (const tail of tailCandidates) {
        const target = new URL(`${tail}${query}`, SDXP_FALLBACK_BASE).href;
        try {
            const upstream = await fetch(target);
            attempts.push(`${upstream.status} ${target}`);
            if (!upstream.ok) {
                if (!firstFailure) {
                    firstFailure = {
                        status: upstream.status,
                        target,
                    };
                }
                continue;
            }
            res.setHeader('X-Rift-SDXP', '1');
            const upstreamType = String(upstream.headers.get('content-type') || '').trim();
            const guessedType = guessContentTypeFromPath(tail);
            if (upstreamType) {
                res.setHeader('Content-Type', upstreamType);
            } else if (guessedType) {
                res.setHeader('Content-Type', guessedType);
            }
            const cacheControl = upstream.headers.get('cache-control');
            if (cacheControl) res.setHeader('Cache-Control', cacheControl);
            const shouldTreatAsHtml =
                /text\/html/i.test(upstreamType) ||
                /\.html?$/i.test(tail);
            if (shouldTreatAsHtml) {
                const html = await upstream.text();
                return res.status(upstream.status).send(stripSdxpTopRedirect(html));
            }
            const raw = Buffer.from(await upstream.arrayBuffer());
            return res.status(upstream.status).send(raw);
        } catch (error) {
            attempts.push(`ERR ${target} :: ${error.message}`);
        }
    }

    if (firstFailure) {
        return res.status(firstFailure.status).send(`sdxp upstream status ${firstFailure.status}`);
    }
    return res.status(502).json({
        error: 'sdxp upstream unavailable',
        path: normalizeSdxpTail(decodedTail),
        attempts,
    });
});

app.get(/^\/truf\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid truf slug');

    try {
        const aliasMap = await getTruffledAliasMap();
        const entry = aliasMap.get(slug);
        if (!entry) return next();

        if (entry.localFile) {
            const file = path.join(__dirname, '..', 'public', entry.localFile);
            return res.sendFile(file, (err) => {
                if (err) next();
            });
        }

        if (!entry.targetUrl) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const target = String(entry.targetUrl).includes('?')
            ? `${entry.targetUrl}${query ? `&${query.slice(1)}` : ''}`
            : `${entry.targetUrl}${query}`;
        const upstream = await fetch(target);
        if (!upstream.ok) {
            return res.status(upstream.status).send(`truf upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(target);
        res.setHeader('X-Rift-Truf', '1');
        if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        } else if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `truf launch failed: ${error.message}` });
    }
});

app.get(/^\/dkmath\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid dkmath slug');

    try {
        const data = await getDuckMathCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const launchTarget = await resolveDuckMathLaunchTarget(entry.targetUrl);
        const frameTarget = launchTarget || entry.targetUrl;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'DuckMath')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="dkmath-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('dkmath-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-DkMath', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `dkmath launch failed: ${error.message}` });
    }
});

app.get(/^\/ccptd\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid ccptd slug');

    try {
        const data = await getCcportedCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/ccptd/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'CCPorted')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="ccptd-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('ccptd-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Ccptd', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `ccptd launch failed: ${error.message}` });
    }
});

app.get(/^\/ccptd\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid ccptd slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid ccptd path');

    try {
        const data = await getCcportedCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const buildTarget = (value) => {
            const safePath = String(value || '')
                .split('/')
                .filter(Boolean)
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            const dirPrefix = entry.dirPath ? `${entry.dirPath.replace(/^\/+/, '')}/` : '';
            return new URL(`${dirPrefix}${safePath}${query}`, CCPORTED_RAW_BASE).href;
        };

        let target = buildTarget(tail);
        let upstream = await fetch(target);
        if ((!upstream.ok || upstream.status === 404) && /^game\.html$/i.test(tail) && entry.entryPath) {
            const fallbackTarget = new URL(`${String(entry.entryPath).replace(/^\/+/, '')}${query}`, CCPORTED_RAW_BASE).href;
            const fallback = await fetch(fallbackTarget);
            if (fallback.ok) {
                upstream = fallback;
                target = fallbackTarget;
            }
        }

        if (!upstream.ok) {
            return res.status(upstream.status).send(`ccptd upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Ccptd-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `ccptd asset failed: ${error.message}` });
    }
});

app.get(/^\/ugs\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid ugs slug');

    try {
        const data = await getUgsCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/ugs/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'UGS')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="ugs-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('ugs-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Ugs', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `ugs launch failed: ${error.message}` });
    }
});

app.get(/^\/ugs\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid ugs slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid ugs path');

    try {
        const data = await getUgsCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const buildTarget = (value) => {
            const safePath = String(value || '')
                .split('/')
                .filter(Boolean)
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            const dirPrefix = entry.dirPath ? `${entry.dirPath.replace(/^\/+/, '')}/` : '';
            return new URL(`${dirPrefix}${safePath}${query}`, UGS_RAW_BASE).href;
        };

        let target = buildTarget(tail);
        let upstream = await fetch(target);
        if ((!upstream.ok || upstream.status === 404) && /^game\.html$/i.test(tail) && entry.entryPath) {
            const fallbackTarget = new URL(`${String(entry.entryPath).replace(/^\/+/, '')}${query}`, UGS_RAW_BASE).href;
            const fallback = await fetch(fallbackTarget);
            if (fallback.ok) {
                upstream = fallback;
                target = fallbackTarget;
            }
        }

        if (!upstream.ok) {
            return res.status(upstream.status).send(`ugs upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Ugs-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `ugs asset failed: ${error.message}` });
    }
});

app.get(/^\/slnte\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid slnte slug');

    try {
        const data = await getSeleniteCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/slnte/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Selenite')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="slnte-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('slnte-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Slnte', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `slnte launch failed: ${error.message}` });
    }
});

app.get(/^\/slnte\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid slnte slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid slnte path');

    try {
        const data = await getSeleniteCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const buildTarget = (value) => {
            const safePath = String(value || '')
                .split('/')
                .filter(Boolean)
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            const dirPrefix = entry.dirPath ? `${entry.dirPath.replace(/^\/+/, '')}/` : '';
            return new URL(`${dirPrefix}${safePath}${query}`, SELENITE_RAW_BASE).href;
        };

        let target = buildTarget(tail);
        let upstream = await fetch(target);
        if ((!upstream.ok || upstream.status === 404) && /^game\.html$/i.test(tail) && entry.entryPath) {
            const fallbackTarget = new URL(`${String(entry.entryPath).replace(/^\/+/, '')}${query}`, SELENITE_RAW_BASE).href;
            const fallback = await fetch(fallbackTarget);
            if (fallback.ok) {
                upstream = fallback;
                target = fallbackTarget;
            }
        }

        if (!upstream.ok) {
            return res.status(upstream.status).send(`slnte upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Slnte-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `slnte asset failed: ${error.message}` });
    }
});

app.get(/^\/rdn\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid rdn slug');

    try {
        const data = await getRadonCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/rdn/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Radon')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="rdn-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('rdn-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Rdn', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `rdn launch failed: ${error.message}` });
    }
});

app.get(/^\/rdn\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid rdn slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid rdn path');

    try {
        const data = await getRadonCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const buildTarget = (value) => {
            const safePath = String(value || '')
                .split('/')
                .filter(Boolean)
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            const dirPrefix = entry.dirPath ? `${entry.dirPath.replace(/^\/+/, '')}/` : '';
            return new URL(`${dirPrefix}${safePath}${query}`, RADON_RAW_BASE).href;
        };

        let target = buildTarget(tail);
        let upstream = await fetch(target);
        if ((!upstream.ok || upstream.status === 404) && /^game\.html$/i.test(tail) && entry.entryPath) {
            const fallbackTarget = new URL(`${String(entry.entryPath).replace(/^\/+/, '')}${query}`, RADON_RAW_BASE).href;
            const fallback = await fetch(fallbackTarget);
            if (fallback.ok) {
                upstream = fallback;
                target = fallbackTarget;
            }
        }

        if (!upstream.ok) {
            return res.status(upstream.status).send(`rdn upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Rdn-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `rdn asset failed: ${error.message}` });
    }
});

app.get(/^\/fyinx\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid fyinx slug');

    try {
        const data = await getFyinxCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/fyinx/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Fyinx')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="fyinx-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('fyinx-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Fyinx', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `fyinx launch failed: ${error.message}` });
    }
});

app.get(/^\/fyinx\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid fyinx slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid fyinx path');

    try {
        const data = await getFyinxCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const buildTarget = (value) => {
            const safePath = String(value || '')
                .split('/')
                .filter(Boolean)
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            const dirPrefix = entry.dirPath ? `${entry.dirPath.replace(/^\/+/, '')}/` : '';
            return new URL(`${dirPrefix}${safePath}${query}`, FYINX_RAW_BASE).href;
        };

        let target = buildTarget(tail);
        let upstream = await fetch(target);
        if ((!upstream.ok || upstream.status === 404) && /^game\.html$/i.test(tail) && entry.entryPath) {
            const fallbackTarget = new URL(`${String(entry.entryPath).replace(/^\/+/, '')}${query}`, FYINX_RAW_BASE).href;
            const fallback = await fetch(fallbackTarget);
            if (fallback.ok) {
                upstream = fallback;
                target = fallbackTarget;
            }
        }

        if (!upstream.ok) {
            return res.status(upstream.status).send(`fyinx upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Fyinx-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `fyinx asset failed: ${error.message}` });
    }
});

app.get(/^\/eltgmz\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid eltgmz slug');

    try {
        const data = await getEliteCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/eltgmz/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Elite')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="eltgmz-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('eltgmz-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Eltgmz', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `eltgmz launch failed: ${error.message}` });
    }
});

app.get(/^\/eltgmz\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid eltgmz slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid eltgmz path');

    try {
        const data = await getEliteCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        if (/^game\.html$/i.test(tail) && entry.entryPath) {
            const target = new URL(`${String(entry.entryPath).replace(/^\/+/, '')}${query}`, ELITE_RAW_BASE).href;
            const upstream = await fetch(target);
            if (!upstream.ok) {
                return res.status(upstream.status).send(`eltgmz upstream status ${upstream.status}`);
            }
            const sourceText = await upstream.text();
            const html = asEliteHtml(sourceText);
            res.setHeader('Content-Type', 'text/html; charset=utf-8');
            res.setHeader('X-Rift-Eltgmz-Asset', '1');
            return res.status(200).send(html);
        }

        const safePath = String(tail || '')
            .split('/')
            .filter(Boolean)
            .map((segment) => encodeURIComponent(segment))
            .join('/');
        const target = new URL(`${safePath}${query}`, ELITE_RAW_BASE).href;
        const upstream = await fetch(target);
        if (!upstream.ok) {
            return res.status(upstream.status).send(`eltgmz upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Eltgmz-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `eltgmz asset failed: ${error.message}` });
    }
});

app.get(/^\/pzlite\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid pzlite slug');

    try {
        const data = await getPetezahCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'PeteZah Lite')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="pzlite-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('pzlite-frame').src=${safeJsonForInlineScript(entry.targetUrl)};</script></body></html>`;
        res.setHeader('X-Rift-PZLite', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `pzlite launch failed: ${error.message}` });
    }
});

app.get(/^\/tllysc\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid tllysc slug');

    try {
        const data = await getTotallyScienceCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const launchTarget = await resolveTotallyScienceLaunchTarget(entry.targetUrl);
        const frameTarget = launchTarget || entry.targetUrl;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Totally Science')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="tllysc-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('tllysc-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Tllysc', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `tllysc launch failed: ${error.message}` });
    }
});

app.get(/^\/vlra\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid vlra slug');

    try {
        const data = await getVelaraCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const launchTarget = await resolveVelaraLaunchTarget(entry.targetUrl);
        const frameTarget = launchTarget || entry.targetUrl;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Velara')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="vlra-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('vlra-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Vlra', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `vlra launch failed: ${error.message}` });
    }
});

app.get(/^\/sph\/([^/]+)\.html$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    slug = slug.toLowerCase();
    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid sph slug');

    try {
        const data = await getSeraphCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();
        const frameTarget = `/sph/${encodeURIComponent(slug)}/game.html`;

        const shell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${String(entry.name || 'Seraph')}</title><style>html,body{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000}iframe{width:100%;height:100%;border:none;display:block}</style></head><body><iframe id="sph-frame" allow="fullscreen; autoplay; clipboard-write; gamepad; microphone; camera; geolocation" referrerpolicy="strict-origin-when-cross-origin"></iframe><script>document.getElementById('sph-frame').src=${safeJsonForInlineScript(frameTarget)};</script></body></html>`;
        res.setHeader('X-Rift-Sph', '1');
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.status(200).send(shell);
    } catch (error) {
        return res.status(502).json({ error: `sph launch failed: ${error.message}` });
    }
});

app.get(/^\/sph\/([^/]+)\/(.+)$/i, async (req, res, next) => {
    let slug = String(req.params?.[0] || '').trim();
    let tail = String(req.params?.[1] || '').trim();
    try {
        slug = decodeURIComponent(slug);
    } catch {
    }
    try {
        tail = decodeURIComponent(tail);
    } catch {
    }
    slug = slug.toLowerCase();
    tail = tail.replace(/^\/+/, '').replace(/\\/g, '/');

    if (!/^[a-z0-9_-]+$/.test(slug)) return res.status(400).send('invalid sph slug');
    if (!tail || tail.includes('..')) return res.status(400).send('invalid sph path');

    try {
        const data = await getSeraphCatalogData();
        const entry = data.map.get(slug);
        if (!entry) return next();

        const query = req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '';
        const buildTarget = (value) => {
            const safePath = String(value || '')
                .split('/')
                .filter(Boolean)
                .map((segment) => encodeURIComponent(segment))
                .join('/');
            return new URL(`games/${encodeURIComponent(entry.dirName)}/${safePath}${query}`, SERAPH_BASE).href;
        };

        let target = buildTarget(tail);
        let upstream = await fetch(target);
        if ((!upstream.ok || upstream.status === 404) && /^game\.html$/i.test(tail)) {
            const fallbackTarget = buildTarget('index.html');
            const fallback = await fetch(fallbackTarget);
            if (fallback.ok) {
                upstream = fallback;
                target = fallbackTarget;
            }
        }

        if (!upstream.ok) {
            return res.status(upstream.status).send(`sph upstream status ${upstream.status}`);
        }

        const upstreamType = String(upstream.headers.get('content-type') || '').trim();
        const guessedType = guessContentTypeFromPath(tail);
        if (guessedType) {
            res.setHeader('Content-Type', guessedType);
        } else if (upstreamType) {
            res.setHeader('Content-Type', upstreamType);
        }
        const cacheControl = upstream.headers.get('cache-control');
        if (cacheControl) res.setHeader('Cache-Control', cacheControl);
        res.setHeader('X-Rift-Sph-Asset', '1');
        const raw = Buffer.from(await upstream.arrayBuffer());
        return res.status(upstream.status).send(raw);
    } catch (error) {
        return res.status(502).json({ error: `sph asset failed: ${error.message}` });
    }
});

app.get('/:gameSlug', async (req, res, next) => {
    const slugRaw = String(req.params?.gameSlug || '').trim();
    if (!slugRaw || slugRaw.includes('.')) return next();

    const slug = slugRaw.toLowerCase();
    if (slug === 'favicon' || RESERVED_TOP_LEVEL_PATHS.has(slug)) return next();

    try {
        const aliasMap = await getTruffledAliasMap();
        const entry = aliasMap.get(slug);
        if (!entry) return next();

        if (entry.localFile) {
            const file = path.join(__dirname, '..', 'public', entry.localFile);
            return res.sendFile(file, (err) => {
                if (err) next();
            });
        }
        return next();
    } catch {
        return next();
    }
});

app.use((req, res, next) => {
    if (!req.path.includes('.')) {
        const normalizedPath = req.path.length > 1
            ? req.path.replace(/\/+$/, '')
            : req.path;

        if (normalizedPath === '/') {
            return next();
        }

        const htmlPath = `${normalizedPath.replace(/^\/+/, '')}.html`;
        const file = path.join(__dirname, '..', 'public', htmlPath);
        res.sendFile(file, (err) => {
            if (err) next();
        });
    } else {
        next();
    }
});

app.get('/gn-catalog', async (_req, res) => {
    try {
        const response = await fetch(GN_MATH_ZONES_JSON);
        if (!response.ok) {
            return res.status(502).json({ error: `gn-math fetch failed: ${response.status}` });
        }

        const rows = await response.json();
        const items = [];
        const seen = new Set();
        for (const row of (Array.isArray(rows) ? rows.slice(1) : [])) {
            const htmlPath = normalizeGnMathHtmlPath(row?.url);
            if (!htmlPath) continue;
            const key = htmlPath.toLowerCase();
            if (seen.has(key)) continue;
            seen.add(key);

            const name = String(row?.name || '').trim();
            if (!name) continue;
            const launchPath = `/gn/${encodePathForUrl(htmlPath)}`;
            const cover = buildGnMathCoverUrl(row?.cover);
            items.push({
                id: `gn-math-${key}`,
                name,
                url: launchPath,
                cover,
            });
        }

        items.sort((a, b) => a.name.localeCompare(b.name));
        return res.json(items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build gn-math catalog: ${error.message}` });
    }
});

app.all('/proxy', async (req, res) => {
    let targetUrl = req.query.url;

    const unwrapNestedProxyTarget = (rawValue) => {
        let current = String(rawValue || '').trim();
        for (let i = 0; i < 4; i++) {
            if (!current) break;
            try {
                const parsed = new URL(current);
                if (parsed.pathname === '/proxy' && parsed.searchParams.get('url')) {
                    current = parsed.searchParams.get('url');
                    continue;
                }
                break;
            } catch {
                if (current.startsWith('/proxy?url=')) {
                    try {
                        const rel = new URL(current, `http://${req.headers.host || 'localhost'}`);
                        const inner = rel.searchParams.get('url');
                        if (inner) {
                            current = inner;
                            continue;
                        }
                    } catch {}
                }

                const hostPrefixed = current.match(/^([a-z0-9.-]+\.[a-z]{2,})\/proxy\?url=(.+)$/i);
                if (hostPrefixed) {
                    try {
                        current = decodeURIComponent(hostPrefixed[2]);
                    } catch {
                        current = hostPrefixed[2];
                    }
                    continue;
                }
                break;
            }
        }
        return current;
    };

    targetUrl = unwrapNestedProxyTarget(targetUrl);

    if (!targetUrl) {
        const rawQuery = req.url.includes('?') ? req.url.slice(req.url.indexOf('?') + 1) : '';
        if (rawQuery) {
            let decoded = rawQuery;
            try { decoded = decodeURIComponent(rawQuery); } catch {}
            if (/^https?:\/\//i.test(decoded)) {
                targetUrl = decoded;
            } else {
                const loose = new URLSearchParams(rawQuery);
                const alt =
                    loose.get('u') ||
                    loose.get('target') ||
                    loose.get('dest') ||
                    loose.get('href') ||
                    '';
                if (alt && /^https?:\/\//i.test(alt)) {
                    targetUrl = alt;
                } else {
                    for (const key of loose.keys()) {
                        if (/^https?:\/\//i.test(key)) {
                            targetUrl = key;
                            break;
                        }
                    }
                    if (!targetUrl && /^[a-z0-9.-]+\.[a-z]{2,}\/proxy\?url=/i.test(decoded)) {
                        targetUrl = decoded;
                    }
                }
            }
            targetUrl = unwrapNestedProxyTarget(targetUrl);
        }
    }

    if (!targetUrl) {
        const referer = String(req.get('referer') || '').trim();
        try {
            const refUrl = new URL(referer);
            if (refUrl.pathname === '/proxy') {
                const refTargetRaw = refUrl.searchParams.get('url');
                if (refTargetRaw) {
                    let recovered;
                    try {
                        recovered = new URL(refTargetRaw);
                    } catch {
                        recovered = new URL(encodeURI(refTargetRaw));
                    }
                    const incomingQuery = new URLSearchParams(req.query || {});
                    incomingQuery.delete('url');
                    if (
                        incomingQuery.has('name') &&
                        /(^|\.)myinstants\.com$/i.test(String(recovered.hostname || '')) &&
                        /^\/en\/categories\//i.test(String(recovered.pathname || ''))
                    ) {
                        recovered.pathname = '/en/search/';
                    }
                    const nextQuery = incomingQuery.toString();
                    recovered.search = nextQuery ? `?${nextQuery}` : '';
                    return res.redirect(302, `/proxy?url=${encodeURIComponent(recovered.href)}`);
                }
            }
        } catch {
        }
        if ((req.method || 'GET').toUpperCase() === 'GET') {
            return res.status(204).end();
        }
        return res.status(400).send('URL parameter is required');
    }

    try {
        try {
            const parsedTarget = new URL(String(targetUrl));
            if (/(^|\.)truffled\.lol$/i.test(parsedTarget.hostname) && /^\/iframe\.html$/i.test(parsedTarget.pathname)) {
                const embeddedRaw = String(parsedTarget.searchParams.get('url') || '').trim();
                if (embeddedRaw) {
                    const resolved = new URL(embeddedRaw, TRUFFLED_BASE);
                    if (!/(^|\.)truffled\.lol$/i.test(resolved.hostname) || !/^\/iframe\.html$/i.test(resolved.pathname)) {
                        return res.redirect(302, `/proxy?url=${encodeURIComponent(resolved.href)}`);
                    }
                }
            }
        } catch {}

        const method = req.method || 'GET';
        const upperMethod = method.toUpperCase();
        const isBodyMethod = !['GET', 'HEAD'].includes(upperMethod);
        const body = isBodyMethod ? await readRawBody(req) : undefined;

        const headers = {};
        const blocked = new Set([
            'host',
            'connection',
            'content-length',
            'accept-encoding',
            'x-forwarded-for',
            'x-forwarded-host',
            'x-forwarded-proto',
        ]);
        for (const [name, value] of Object.entries(req.headers || {})) {
            if (!name || blocked.has(String(name).toLowerCase())) continue;
            if (typeof value === 'undefined') continue;
            headers[name] = value;
        }

        try {
            const target = new URL(String(targetUrl));
            if (headers.origin) headers.origin = target.origin;
            if (headers.referer) headers.referer = target.href;
        } catch {}

        const response = await fetch(targetUrl, {
            method,
            headers,
            body,
        });
        const contentType = (response.headers.get('content-type') || '').toLowerCase();
        const parsedTargetUrl = new URL(targetUrl);
        const isHtml =
            contentType.includes('text/html') ||
            parsedTargetUrl.pathname.toLowerCase().endsWith('.html') ||
            parsedTargetUrl.pathname.toLowerCase().endsWith('.htm');
        const isManifest =
            contentType.includes('application/manifest+json') ||
            (contentType.includes('application/json') && parsedTargetUrl.pathname.endsWith('/manifest.json'));

        if (isManifest) {
            const manifestText = await response.text();
            const rewrittenManifest = manifestText.replace(
                /"src"\s*:\s*"\/([^"]+)"/g,
                (match, iconPath) => {
                    const fullUrl = new URL(`/${iconPath}`, parsedTargetUrl).href;
                    return `"src":"/proxy?url=${encodeURIComponent(fullUrl)}"`;
                }
            );
            res.setHeader('Content-Type', contentType || 'application/manifest+json; charset=utf-8');
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) res.setHeader('Set-Cookie', setCookie);
            return res.status(response.status).send(rewrittenManifest);
        }

        if (!isHtml) {
            const raw = Buffer.from(await response.arrayBuffer());
            if (contentType) {
                res.setHeader('Content-Type', contentType);
            }
            const setCookie = response.headers.get('set-cookie');
            if (setCookie) res.setHeader('Set-Cookie', setCookie);
            return res.status(response.status).send(raw);
        }

        const content = await response.text();

        const baseUrl = new URL(targetUrl);
        let rewriteBaseUrl = baseUrl;
        try {
            const baseHrefMatch = content.match(/<base[^>]*href\s*=\s*["']([^"']+)["']/i);
            const baseHref = String(baseHrefMatch?.[1] || '').trim();
            if (baseHref) {
                rewriteBaseUrl = new URL(baseHref, baseUrl);
            }
        } catch {
            rewriteBaseUrl = baseUrl;
        }
        const rewriteProxyUrl = (rawUrl) => {
            const value = String(rawUrl || '').trim();
            if (!value) return null;
            if (value.startsWith('/proxy?url=')) return null;
            if (/^(?:https?:|\/\/|data:|blob:|javascript:|mailto:|tel:|#)/i.test(value)) return null;
            try {
                return `/proxy?url=${encodeURIComponent(new URL(value, rewriteBaseUrl).href)}`;
            } catch {
                return null;
            }
        };

        // Protect inline scripts from HTML-attribute rewriting.
        // Some GN-Math pages contain JS strings like iframe[src="..."], and
        // rewriting inside script text can corrupt syntax.
        const scriptBlocks = [];
        const protectedContent = content.replace(
            /<script\b[\s\S]*?<\/script>/gi,
            (block) => {
                const token = `__RIFT_SCRIPT_BLOCK_${scriptBlocks.length}__`;
                scriptBlocks.push(block);
                return token;
            }
        );

        let modifiedContent = protectedContent.replace(
            /\b(href|src|action)\s*=\s*(["'])(.*?)\2/gi,
            (match, attr, quote, value) => {
                const rewritten = rewriteProxyUrl(value);
                if (!rewritten) return match;
                return `${attr}=${quote}${rewritten}${quote}`;
            }
        );

        modifiedContent = modifiedContent.replace(
            /\bsrcset\s*=\s*(["'])(.*?)\1/gi,
            (match, quote, value) => {
                const rewrittenSet = value
                    .split(',')
                    .map((entry) => {
                        const token = entry.trim();
                        if (!token) return token;
                        const parts = token.split(/\s+/);
                        const candidate = parts[0];
                        const rewritten = rewriteProxyUrl(candidate);
                        if (!rewritten) return token;
                        parts[0] = rewritten;
                        return parts.join(' ');
                    })
                    .join(', ');
                return `srcset=${quote}${rewrittenSet}${quote}`;
            }
        );

        modifiedContent = modifiedContent.replace(
            /__RIFT_SCRIPT_BLOCK_(\d+)__/g,
            (match, indexText) => scriptBlocks[Number(indexText)] || ''
        );

        const yaGamesShim = '<script id="rift-yagames-shim">(function(){if(window.YaGames)return;window.YaGames={init:function(){return Promise.resolve({adv:{showFullscreenAdv:function(){return Promise.resolve();},showRewardedVideo:function(){return Promise.resolve();}},features:{LoadingAPI:{ready:function(){}}}});}};})();</script>';
        if (/<head[^>]*>/i.test(modifiedContent)) {
            modifiedContent = modifiedContent.replace(/<head[^>]*>/i, `$&${yaGamesShim}`);
        } else {
            modifiedContent = yaGamesShim + modifiedContent;
        }

        try {
            const auth = await getSessionFromRequest(req);
            if (auth) {
                const scope = new URL('.', parsedTargetUrl).href;
                const storageGameId = `proxy-storage:${scope}`;
                const save = getUserSave(auth.db, auth.user.id);
                const stored = save.games?.[storageGameId]?.localStorage;
                const initialStorage = stored && typeof stored === 'object' ? stored : {};

                const storageScript = `<script id="rift-proxy-storage">(function(){try{if(window.__riftProxyStorageInit)return;window.__riftProxyStorageInit=true;var scope=${safeJsonForInlineScript(scope)};var gameId=${safeJsonForInlineScript(storageGameId)};var seed=${safeJsonForInlineScript(initialStorage)};for(var k in seed){if(Object.prototype.hasOwnProperty.call(seed,k)&&localStorage.getItem(k)===null){try{localStorage.setItem(k,String(seed[k]));}catch(_e){}}}var pending=null;var saveNow=function(){try{var out={};for(var i=0;i<localStorage.length;i++){var key=localStorage.key(i);if(key!=null){out[key]=localStorage.getItem(key);}}fetch('/api/save/games/'+encodeURIComponent(gameId),{method:'PUT',credentials:'include',headers:{'Content-Type':'application/json'},body:JSON.stringify({progress:{localStorage:out,lastSyncedAt:Date.now(),scope:scope}}}).catch(function(){});}catch(_e){}};var schedule=function(){if(pending)clearTimeout(pending);pending=setTimeout(saveNow,600);};var sp=Storage.prototype;var _set=sp.setItem,_remove=sp.removeItem,_clear=sp.clear;sp.setItem=function(a,b){var r=_set.call(this,a,b);if(this===localStorage)schedule();return r;};sp.removeItem=function(a){var r=_remove.call(this,a);if(this===localStorage)schedule();return r;};sp.clear=function(){var r=_clear.call(this);if(this===localStorage)schedule();return r;};window.addEventListener('pagehide',saveNow);window.addEventListener('beforeunload',saveNow);}catch(_e){}})();</script>`;

                if (/<head[^>]*>/i.test(modifiedContent)) {
                    modifiedContent = modifiedContent.replace(/<head[^>]*>/i, `$&${storageScript}`);
                } else {
                    modifiedContent = storageScript + modifiedContent;
                }
            }
        } catch {
        }

        if (/^\s*</.test(modifiedContent)) {
            const cursorStyle = '<style id="rift-proxy-cursor">*,*::before,*::after{cursor:url("/assets/images/cursor.png") 16 16, auto !important;}.rift-proxy-cursor-light{position:fixed;width:150px;height:150px;border-radius:50%;background:radial-gradient(circle,rgba(255,255,255,.15) 0%,rgba(255,255,255,0) 70%);pointer-events:none;z-index:2147483647;transform:translate(-50%,-50%);mix-blend-mode:screen;}</style>';
            const cursorScript = '<script id="rift-proxy-cursor-script">(function(){if(window.__riftProxyCursorInit)return;window.__riftProxyCursorInit=true;var light=document.createElement("div");light.className="rift-proxy-cursor-light";document.documentElement.appendChild(light);document.addEventListener("mousemove",function(e){light.style.left=e.clientX+"px";light.style.top=e.clientY+"px";});document.addEventListener("mouseleave",function(){light.style.opacity="0";});document.addEventListener("mouseenter",function(){light.style.opacity="1";});})();</script>';
            if (/<head[^>]*>/i.test(modifiedContent)) {
                modifiedContent = modifiedContent.replace(/<head[^>]*>/i, `$&${cursorStyle}${cursorScript}`);
            } else {
                modifiedContent = cursorStyle + cursorScript + modifiedContent;
            }
        }

        try {
            if (/(^|\.)truffled\.lol$/i.test(parsedTargetUrl.hostname) && /^\/iframe\.html$/i.test(parsedTargetUrl.pathname)) {
                const truffledIframeFixScript = `<script id="rift-truffled-iframe-fix">(function(){try{var truffledOrigin="https://truffled.lol";function toProxy(u){return "/proxy?url="+encodeURIComponent(u);}function unwrapTarget(raw){var value=String(raw||"").trim();if(!value)return "";try{if(/^\\/proxy\\?url=/i.test(value)){var rel=new URL(value,window.location.origin);var inner=rel.searchParams.get("url");if(inner)value=inner;}}catch(_e){}try{var absolute=/^[a-z][a-z0-9+.-]*:/i.test(value)?new URL(value):new URL(value,truffledOrigin);if(/(^|\\.)truffled\\.lol$/i.test(absolute.hostname)&&/^\\/iframe\\.html$/i.test(absolute.pathname)){var nested=absolute.searchParams.get("url");if(nested){return new URL(nested,truffledOrigin).href;}}if(/(^|\\.)truffled\\.lol$/i.test(absolute.hostname)){return absolute.href;}if(!/^[a-z][a-z0-9+.-]*:/i.test(value)||value.startsWith("/")){return new URL(value,truffledOrigin).href;}}catch(_e){}return "";}function applyFrameTarget(){var frame=document.getElementById("gameframe");if(!frame)return;var outerTarget="";try{var pageUrl=new URL(window.location.href);outerTarget=pageUrl.searchParams.get("url")||"";}catch(_e){}var target=unwrapTarget(outerTarget)||unwrapTarget(frame.getAttribute("src")||frame.src||"");if(!target)return;var next=toProxy(target);var current=String(frame.getAttribute("src")||"").trim();if(current!==next){frame.setAttribute("src",next);}}document.addEventListener("DOMContentLoaded",applyFrameTarget);window.addEventListener("load",applyFrameTarget);setTimeout(applyFrameTarget,0);setTimeout(applyFrameTarget,120);setInterval(applyFrameTarget,800);var observer=new MutationObserver(function(){applyFrameTarget();});document.addEventListener("DOMContentLoaded",function(){var frame=document.getElementById("gameframe");if(frame){observer.observe(frame,{attributes:true,attributeFilter:["src"]});}});}catch(_e){}})();</script>`;
                const truffledPopoutScript = '<script id="rift-truffled-popout-link">(function(){function sync(){var btn=document.getElementById("aboutblank");var frame=document.getElementById("gameframe");if(!btn||!frame)return;var src=String(frame.src||"").trim();if(!src||/\\/404\\.html(?:$|\\?)/i.test(src))return;btn.setAttribute("href",src);btn.setAttribute("target","_blank");btn.setAttribute("rel","noopener noreferrer");}document.addEventListener("DOMContentLoaded",sync);setInterval(sync,800);})();</script>';
                if (/<\/body>/i.test(modifiedContent)) {
                    modifiedContent = modifiedContent.replace(/<\/body>/i, `${truffledIframeFixScript}${truffledPopoutScript}</body>`);
                } else {
                    modifiedContent += `${truffledIframeFixScript}${truffledPopoutScript}`;
                }
            }
        } catch {}

        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        const setCookie = response.headers.get('set-cookie');
        if (setCookie) res.setHeader('Set-Cookie', setCookie);
        res.status(response.status).send(modifiedContent);
    } catch (error) {
        res.status(500).send('Error fetching the requested URL: ' + error.message);
    }
});

app.get('/sdxp-catalog', async (_req, res) => {
    try {
        let items = [];
        try {
            await fs.access(SDXP_HTML_ROOT);
            const indexFiles = await collectIndexFiles(SDXP_HTML_ROOT);
            items = await Promise.all(indexFiles.map(async (file) => {
                const rel = path.relative(path.join(__dirname, '..', 'public', 'sdxp'), file).replace(/\\/g, '/');
                const gameFolder = path.basename(path.dirname(file));
                const cover = await pickSdxpCover(file);
                return {
                    id: `sdxp-${rel}`,
                    name: humanizeFolderName(gameFolder),
                    url: sdxpCatalogUrlForTail(rel),
                    cover,
                };
            }));
        } catch {
        }

        if (!items.length) {
            items = await loadSdxpFallbackCatalog();
        }

        items.sort((a, b) => a.name.localeCompare(b.name));
        res.json(items);
    } catch (error) {
        res.status(500).json({ error: `failed to build sdxp catalog: ${error.message}` });
    }
});

app.get('/duckmath-catalog', async (_req, res) => {
    try {
        const data = await getDuckMathCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build duckmath catalog: ${error.message}` });
    }
});

app.get('/ccported-catalog', async (_req, res) => {
    try {
        const data = await getCcportedCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build ccported catalog: ${error.message}` });
    }
});

app.get('/ugs-catalog', async (_req, res) => {
    try {
        const data = await getUgsCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build ugs catalog: ${error.message}` });
    }
});

app.get('/slnte-catalog', async (_req, res) => {
    try {
        const data = await getSeleniteCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build selenite catalog: ${error.message}` });
    }
});

app.get('/rdn-catalog', async (_req, res) => {
    try {
        const data = await getRadonCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build radon catalog: ${error.message}` });
    }
});

app.get('/fyinx-catalog', async (_req, res) => {
    try {
        const data = await getFyinxCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build fyinx catalog: ${error.message}` });
    }
});

app.get('/eltgmz-catalog', async (_req, res) => {
    try {
        const data = await getEliteCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build elite catalog: ${error.message}` });
    }
});

app.get('/pzlite-catalog', async (_req, res) => {
    try {
        const data = await getPetezahCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build pzlite catalog: ${error.message}` });
    }
});

app.get('/truffled-catalog', async (_req, res) => {
    try {
        let payload = null;
        try {
            const localRaw = await fs.readFile(TRUFFLED_LOCAL_JSON, 'utf8');
            payload = JSON.parse(localRaw);
        } catch {
        }
        if (!payload) {
            try {
                const response = await fetch(TRUFFLED_GAMES_JSON);
                if (response.ok) {
                    payload = await response.json();
                }
            } catch {
            }
        }

        const rootMap = await readTruffledRootMap();
        const rows = Array.isArray(payload?.games) ? payload.games : [];
        const items = [];
        const seen = new Set();
        const seenSlugs = new Set();

        const catalogRows = rows.length
            ? rows
            : Object.entries(rootMap).map(([href, mappedFile]) => ({
                url: `/${String(href).replace(/^\/+/, '')}`,
                name: humanizeFolderName(String(mappedFile || '').replace(/\.html?$/i, '')),
                thumbnail: '',
            }));

        for (const row of catalogRows) {
            const normalized = normalizeTruffledCatalogHref(row?.url);
            if (!normalized) continue;
            if (seen.has(normalized)) continue;
            seen.add(normalized);

            const name = String(row?.name || '').trim() || humanizeFolderName(normalized.split('/').slice(-2, -1)[0] || normalized);
            const thumbnail = String(row?.thumbnail || '').trim();
            const normalizedThumb = thumbnail.replace(/^\/+/, '');
            const mappedFile = resolveTruffledMappedFile(rootMap, normalized);
            if (!mappedFile) continue;
            try {
                await fs.access(path.join(__dirname, '..', 'public', mappedFile));
            } catch {
                continue;
            }
            const slugCandidates = [
                toLaunchSlug(deriveTruffledCanonicalSlug(normalized, mappedFile), ''),
                toLaunchSlug(toTruffledLocalSlug(normalized), ''),
            ].filter(Boolean);
            const slug = slugCandidates.find((candidate) => !seenSlugs.has(candidate)) || '';
            if (!slug) continue;
            seenSlugs.add(slug);
            const launchUrl = `/truf/${encodeURIComponent(slug)}.html`;
            items.push({
                id: `truffled-${slug}`,
                name,
                url: launchUrl,
                cover: normalizedThumb ? new URL(normalizedThumb, TRUFFLED_BASE).href : '',
            });
        }

        items.sort((a, b) => a.name.localeCompare(b.name));
        return res.json(items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build truffled catalog: ${error.message}` });
    }
});

app.get('/totalscience-catalog', async (_req, res) => {
    try {
        const data = await getTotallyScienceCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build totally science catalog: ${error.message}` });
    }
});

app.get('/velara-catalog', async (_req, res) => {
    try {
        const data = await getVelaraCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build velara catalog: ${error.message}` });
    }
});

app.get('/seraph-catalog', async (_req, res) => {
    try {
        const data = await getSeraphCatalogData();
        return res.json(data.items);
    } catch (error) {
        return res.status(500).json({ error: `failed to build seraph catalog: ${error.message}` });
    }
});

app.get('/validate', async (req, res) => {
    const domain = String(req.query.domain || '').toLowerCase().trim();

    if (!isSafeHostname(domain)) {
        return res.sendStatus(403);
    }

    const allowed = await hostnamePointsToAllowedIp(domain);
    return res.sendStatus(allowed ? 200 : 403);
});

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Rift running on http://localhost:${PORT}`);
    });
}

module.exports = app;

