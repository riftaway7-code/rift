const crypto = require('crypto');

const CLOUD_HOST_KEY = String(process.env.RIFT_CLOUD_HOST_KEY || process.env.NEXFORCE_HOST_KEY || 'rift-cloud-host-key');
const CLOUD_HOST_HEARTBEAT_TIMEOUT_MS = Number(process.env.RIFT_CLOUD_HOST_HEARTBEAT_TIMEOUT_MS || 45000);
const CLOUD_SESSION_RECONNECT_GRACE_MS = Number(process.env.RIFT_CLOUD_SESSION_RECONNECT_GRACE_MS || 1000 * 60 * 5);
const CLOUD_SESSION_RETENTION_MS = Number(process.env.RIFT_CLOUD_SESSION_RETENTION_MS || 1000 * 60 * 60 * 24 * 7);
const CLOUD_DEFAULT_HOST_CAPACITY = Number(process.env.RIFT_CLOUD_DEFAULT_HOST_CAPACITY || 4);
const CLOUD_DEFAULT_HOST_MODE = String(process.env.RIFT_CLOUD_DEFAULT_HOST_MODE || 'active');

function createId(prefix) {
    return `${prefix}_${crypto.randomBytes(8).toString('hex')}`;
}

function clampPositiveInt(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
    return Math.floor(parsed);
}

function clampNonNegative(value, fallback) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed < 0) return fallback;
    return parsed;
}

function normalizeSlug(value) {
    return String(value || '')
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 80);
}

function normalizeLabel(value, fallback) {
    const label = String(value || '').trim().slice(0, 120);
    return label || fallback;
}

function normalizeMode(value, fallback = CLOUD_DEFAULT_HOST_MODE) {
    const mode = String(value || fallback).trim().toLowerCase();
    return ['active', 'maintenance', 'offline'].includes(mode) ? mode : fallback;
}

function normalizeSupportedGames(input) {
    const rows = Array.isArray(input)
        ? input
        : String(input || '')
            .split(',')
            .map((entry) => entry.trim());
    const out = [];
    for (const entry of rows) {
        const slug = normalizeSlug(entry);
        if (!slug || out.includes(slug)) continue;
        out.push(slug);
        if (out.length >= 200) break;
    }
    return out;
}

function normalizeConnection(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const pick = (key) => {
        const value = String(source[key] || '').trim().slice(0, 400);
        return value;
    };
    return {
        moonlightHost: pick('moonlightHost'),
        tailscaleIp: pick('tailscaleIp'),
        pairUrl: pick('pairUrl'),
        launchUrl: pick('launchUrl'),
        parsecUrl: pick('parsecUrl'),
        notes: pick('notes'),
    };
}

function normalizeStreamHealth(raw) {
    const source = raw && typeof raw === 'object' ? raw : {};
    const profile = source.streamProfile && typeof source.streamProfile === 'object' ? source.streamProfile : {};
    return {
        streamSoftware: normalizeLabel(source.streamSoftware, 'sunshine').toLowerCase(),
        streamProtocol: normalizeLabel(source.streamProtocol, 'moonlight').toLowerCase(),
        remoteNetwork: normalizeLabel(source.remoteNetwork, 'tailscale').toLowerCase(),
        backupControl: normalizeLabel(source.backupControl, 'parsec').toLowerCase(),
        audioReady: String(source.audioReady ?? 'true').toLowerCase() !== 'false',
        networkOk: String(source.networkOk ?? 'true').toLowerCase() !== 'false',
        networkType: normalizeLabel(source.networkType, 'ethernet').toLowerCase(),
        uplinkMbps: clampNonNegative(source.uplinkMbps, 100),
        downlinkMbps: clampNonNegative(source.downlinkMbps, 100),
        jitterMs: clampNonNegative(source.jitterMs, 8),
        packetLossPct: clampNonNegative(source.packetLossPct, 0),
        streamProfile: {
            resolution: normalizeLabel(profile.resolution, '1080p').toLowerCase(),
            fps: clampPositiveInt(profile.fps, 60),
            bitrateMbps: clampPositiveInt(profile.bitrateMbps, 20),
            codec: normalizeLabel(profile.codec, 'hevc').toLowerCase(),
        },
        updatedAt: new Date().toISOString(),
    };
}

function ensureCloudState(db, now = Date.now()) {
    db.cloudHosts = Array.isArray(db.cloudHosts) ? db.cloudHosts : [];
    db.cloudSessions = Array.isArray(db.cloudSessions) ? db.cloudSessions : [];

    db.cloudHosts = db.cloudHosts.map((entry) => {
        const host = entry && typeof entry === 'object' ? entry : {};
        return {
            id: normalizeSlug(host.id) || createId('host'),
            name: normalizeLabel(host.name, 'Rift Host'),
            region: normalizeLabel(host.region, 'local').toLowerCase(),
            capacity: clampPositiveInt(host.capacity, CLOUD_DEFAULT_HOST_CAPACITY),
            mode: normalizeMode(host.mode),
            capabilities: {
                supportedGames: normalizeSupportedGames(host.capabilities?.supportedGames),
                gpuTier: normalizeLabel(host.capabilities?.gpuTier, 'basic').toLowerCase(),
                maxFps: clampPositiveInt(host.capabilities?.maxFps, 60),
            },
            slotPolicy: {
                freeReservedMin: clampNonNegative(host.slotPolicy?.freeReservedMin, 0),
                performanceReservedMin: clampNonNegative(host.slotPolicy?.performanceReservedMin, 0),
                ultimateReservedMin: clampNonNegative(host.slotPolicy?.ultimateReservedMin, 0),
            },
            streamHealth: normalizeStreamHealth(host.streamHealth),
            connection: normalizeConnection(host.connection),
            createdAt: Number(host.createdAt || now),
            updatedAt: Number(host.updatedAt || now),
            lastHeartbeatAt: Number(host.lastHeartbeatAt || 0),
        };
    });

    db.cloudSessions = db.cloudSessions
        .map((entry) => {
            const session = entry && typeof entry === 'object' ? entry : {};
            const status = String(session.status || 'queued').trim().toLowerCase();
            return {
                id: String(session.id || createId('cloud')),
                userId: String(session.userId || ''),
                username: normalizeLabel(session.username, 'guest'),
                gameSlug: normalizeSlug(session.gameSlug),
                gameTitle: normalizeLabel(session.gameTitle, 'unknown game'),
                status: ['queued', 'active', 'disconnected', 'ended'].includes(status) ? status : 'queued',
                hostId: String(session.hostId || ''),
                requestedAt: Number(session.requestedAt || now),
                activatedAt: Number(session.activatedAt || 0),
                endedAt: Number(session.endedAt || 0),
                disconnectedAt: Number(session.disconnectedAt || 0),
                reconnectExpiresAt: Number(session.reconnectExpiresAt || 0),
                reconnectToken: String(session.reconnectToken || ''),
            };
        })
        .filter((entry) => entry.userId && entry.gameSlug)
        .filter((entry) => entry.status !== 'ended' || !entry.endedAt || (now - entry.endedAt) <= CLOUD_SESSION_RETENTION_MS);

    for (const session of db.cloudSessions) {
        if (session.status === 'disconnected' && session.reconnectExpiresAt && session.reconnectExpiresAt <= now) {
            session.status = 'ended';
            session.endedAt = now;
        }
    }

    return db;
}

function isHostOnline(host, now = Date.now()) {
    if (!host || host.mode === 'offline') return false;
    if (!host.lastHeartbeatAt) return false;
    return (now - Number(host.lastHeartbeatAt || 0)) <= CLOUD_HOST_HEARTBEAT_TIMEOUT_MS;
}

function getHostLoad(db, hostId) {
    return db.cloudSessions.filter((entry) => entry.hostId === hostId && (entry.status === 'active' || entry.status === 'disconnected')).length;
}

function summarizeHost(host, db, now = Date.now()) {
    return {
        id: host.id,
        name: host.name,
        region: host.region,
        mode: host.mode,
        online: isHostOnline(host, now),
        capacity: host.capacity,
        usedSlots: getHostLoad(db, host.id),
        supportedGames: host.capabilities.supportedGames,
        gpuTier: host.capabilities.gpuTier,
        maxFps: host.capabilities.maxFps,
        lastHeartbeatAt: host.lastHeartbeatAt,
        streamHealth: host.streamHealth,
        connection: host.connection,
    };
}

function assignQueuedSessions(db, now = Date.now()) {
    ensureCloudState(db, now);
    const hosts = db.cloudHosts
        .filter((host) => isHostOnline(host, now) && host.mode === 'active')
        .sort((left, right) => {
            const loadDiff = getHostLoad(db, left.id) - getHostLoad(db, right.id);
            if (loadDiff !== 0) return loadDiff;
            return Number(left.lastHeartbeatAt || 0) - Number(right.lastHeartbeatAt || 0);
        });

    const queued = db.cloudSessions
        .filter((entry) => entry.status === 'queued')
        .sort((left, right) => left.requestedAt - right.requestedAt);

    for (const session of queued) {
        const host = hosts.find((entry) => {
            const load = getHostLoad(db, entry.id);
            const supports = !entry.capabilities.supportedGames.length || entry.capabilities.supportedGames.includes(session.gameSlug);
            return supports && load < entry.capacity;
        });
        if (!host) continue;
        session.status = 'active';
        session.hostId = host.id;
        session.activatedAt = now;
        session.disconnectedAt = 0;
        session.reconnectExpiresAt = 0;
        session.reconnectToken = '';
    }
    return db;
}

function getQueuePosition(db, sessionId) {
    const queued = db.cloudSessions
        .filter((entry) => entry.status === 'queued')
        .sort((left, right) => left.requestedAt - right.requestedAt);
    const index = queued.findIndex((entry) => entry.id === sessionId);
    return index >= 0 ? index + 1 : null;
}

function serializeSession(session, db) {
    return {
        id: session.id,
        userId: session.userId,
        username: session.username,
        gameSlug: session.gameSlug,
        gameTitle: session.gameTitle,
        status: session.status,
        hostId: session.hostId || null,
        requestedAt: session.requestedAt,
        activatedAt: session.activatedAt || null,
        endedAt: session.endedAt || null,
        disconnectedAt: session.disconnectedAt || null,
        reconnectExpiresAt: session.reconnectExpiresAt || null,
        queuePosition: session.status === 'queued' ? getQueuePosition(db, session.id) : null,
    };
}

function buildBootstrap(session, host) {
    const streamHealth = normalizeStreamHealth(host.streamHealth);
    const connection = normalizeConnection(host.connection);
    const instructions = [];
    if (connection.moonlightHost || connection.tailscaleIp) {
        instructions.push('Open Moonlight on your client device.');
        instructions.push(`Connect to ${connection.moonlightHost || connection.tailscaleIp}.`);
    }
    if (connection.pairUrl) {
        instructions.push('Pair the host once before launch if Moonlight asks for it.');
    }
    if (connection.launchUrl) {
        instructions.push('Use the launch link below if your host provides one.');
    }
    instructions.push(`The host will stream ${session.gameTitle} via ${streamHealth.streamSoftware}/${streamHealth.streamProtocol}.`);
    return {
        sessionId: session.id,
        gameSlug: session.gameSlug,
        gameTitle: session.gameTitle,
        status: session.status,
        host: {
            id: host.id,
            name: host.name,
            region: host.region,
        },
        stream: {
            software: streamHealth.streamSoftware,
            protocol: streamHealth.streamProtocol,
            remoteNetwork: streamHealth.remoteNetwork,
            backupControl: streamHealth.backupControl,
            profile: streamHealth.streamProfile,
            audioReady: streamHealth.audioReady,
            networkOk: streamHealth.networkOk,
            networkType: streamHealth.networkType,
            uplinkMbps: streamHealth.uplinkMbps,
            downlinkMbps: streamHealth.downlinkMbps,
            jitterMs: streamHealth.jitterMs,
            packetLossPct: streamHealth.packetLossPct,
        },
        connection,
        instructions,
        playUrl: connection.launchUrl || '',
    };
}

function attachCloudControlRoutes({ app, readAuthDb, updateAuthDb, getSessionFromRequest, jsonError }) {
    async function requireAuth(req, res) {
        const auth = await getSessionFromRequest(req);
        if (!auth) {
            jsonError(res, 401, 'Unauthorized');
            return null;
        }
        return auth;
    }

    function requireHostKey(req, res) {
        const key = String(req.headers['x-host-key'] || '').trim();
        if (!key || key !== CLOUD_HOST_KEY) {
            jsonError(res, 401, 'Invalid host key');
            return false;
        }
        return true;
    }

    app.get('/api/health', async (_req, res) => {
        try {
            const db = ensureCloudState(await readAuthDb());
            const now = Date.now();
            const onlineHosts = db.cloudHosts.filter((host) => isHostOnline(host, now)).length;
            const queued = db.cloudSessions.filter((entry) => entry.status === 'queued').length;
            return res.json({ ok: true, service: 'rift', cloud: { onlineHosts, queued } });
        } catch (error) {
            return jsonError(res, 500, `Health check failed: ${error.message}`);
        }
    });

    app.get('/api/cloud/summary', async (_req, res) => {
        try {
            const db = assignQueuedSessions(ensureCloudState(await readAuthDb()));
            const now = Date.now();
            const hosts = db.cloudHosts.map((host) => summarizeHost(host, db, now));
            const onlineHosts = hosts.filter((host) => host.online);
            const queueDepth = db.cloudSessions.filter((entry) => entry.status === 'queued').length;
            const activeSessions = db.cloudSessions.filter((entry) => entry.status === 'active' || entry.status === 'disconnected').length;
            return res.json({
                ok: true,
                onlineHostCount: onlineHosts.length,
                totalCapacity: onlineHosts.reduce((sum, host) => sum + host.capacity, 0),
                queueDepth,
                activeSessions,
                hosts: onlineHosts,
            });
        } catch (error) {
            return jsonError(res, 500, `Cloud summary failed: ${error.message}`);
        }
    });

    app.get('/api/hosts', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const db = assignQueuedSessions(ensureCloudState(await readAuthDb()));
            const now = Date.now();
            const hosts = db.cloudHosts.map((host) => summarizeHost(host, db, now));
            return res.json(hosts);
        } catch (error) {
            return jsonError(res, 500, `Host list failed: ${error.message}`);
        }
    });

    app.post('/api/hosts/register', async (req, res) => {
        try {
            if (!requireHostKey(req, res)) return;
            const now = Date.now();
            let responseHost = null;
            await updateAuthDb((db) => {
                ensureCloudState(db, now);
                const hostId = normalizeSlug(req.body?.hostId) || createId('host');
                const existing = db.cloudHosts.find((entry) => entry.id === hostId);
                const next = {
                    id: hostId,
                    name: normalizeLabel(req.body?.name, `Rift Host ${hostId}`),
                    region: normalizeLabel(req.body?.region, 'local').toLowerCase(),
                    capacity: clampPositiveInt(req.body?.capacity, CLOUD_DEFAULT_HOST_CAPACITY),
                    mode: normalizeMode(req.body?.mode),
                    capabilities: {
                        supportedGames: normalizeSupportedGames(req.body?.capabilities?.supportedGames),
                        gpuTier: normalizeLabel(req.body?.capabilities?.gpuTier, 'basic').toLowerCase(),
                        maxFps: clampPositiveInt(req.body?.capabilities?.maxFps, 60),
                    },
                    slotPolicy: {
                        freeReservedMin: clampNonNegative(req.body?.slotPolicy?.freeReservedMin, 0),
                        performanceReservedMin: clampNonNegative(req.body?.slotPolicy?.performanceReservedMin, 0),
                        ultimateReservedMin: clampNonNegative(req.body?.slotPolicy?.ultimateReservedMin, 0),
                    },
                    streamHealth: normalizeStreamHealth(req.body?.streamHealth),
                    connection: normalizeConnection(req.body?.connection),
                    createdAt: existing?.createdAt || now,
                    updatedAt: now,
                    lastHeartbeatAt: now,
                };
                if (existing) {
                    Object.assign(existing, next);
                    responseHost = existing;
                } else {
                    db.cloudHosts.push(next);
                    responseHost = next;
                }
                assignQueuedSessions(db, now);
                return db;
            });
            return res.json({ ok: true, host: responseHost });
        } catch (error) {
            return jsonError(res, 500, `Host register failed: ${error.message}`);
        }
    });

    app.post('/api/hosts/:hostId/heartbeat', async (req, res) => {
        try {
            if (!requireHostKey(req, res)) return;
            const hostId = normalizeSlug(req.params.hostId);
            if (!hostId) return jsonError(res, 400, 'Invalid host id');
            const now = Date.now();
            let found = false;
            await updateAuthDb((db) => {
                ensureCloudState(db, now);
                const host = db.cloudHosts.find((entry) => entry.id === hostId);
                if (!host) return db;
                found = true;
                host.lastHeartbeatAt = now;
                host.updatedAt = now;
                if (req.body?.streamHealth) host.streamHealth = normalizeStreamHealth(req.body.streamHealth);
                if (req.body?.connection) host.connection = normalizeConnection(req.body.connection);
                if (req.body?.mode) host.mode = normalizeMode(req.body.mode, host.mode);
                assignQueuedSessions(db, now);
                return db;
            });
            if (!found) return jsonError(res, 404, 'Host not found');
            return res.json({ ok: true });
        } catch (error) {
            return jsonError(res, 500, `Heartbeat failed: ${error.message}`);
        }
    });

    app.post('/api/hosts/:hostId/offline', async (req, res) => {
        try {
            if (!requireHostKey(req, res)) return;
            const hostId = normalizeSlug(req.params.hostId);
            if (!hostId) return jsonError(res, 400, 'Invalid host id');
            let found = false;
            await updateAuthDb((db) => {
                ensureCloudState(db);
                const host = db.cloudHosts.find((entry) => entry.id === hostId);
                if (!host) return db;
                found = true;
                host.mode = 'offline';
                host.updatedAt = Date.now();
                return db;
            });
            if (!found) return jsonError(res, 404, 'Host not found');
            return res.json({ ok: true });
        } catch (error) {
            return jsonError(res, 500, `Offline update failed: ${error.message}`);
        }
    });

    app.put('/api/hosts/:hostId/stream-health', async (req, res) => {
        try {
            if (!requireHostKey(req, res)) return;
            const hostId = normalizeSlug(req.params.hostId);
            if (!hostId) return jsonError(res, 400, 'Invalid host id');
            let found = false;
            await updateAuthDb((db) => {
                ensureCloudState(db);
                const host = db.cloudHosts.find((entry) => entry.id === hostId);
                if (!host) return db;
                found = true;
                host.streamHealth = normalizeStreamHealth(req.body);
                host.updatedAt = Date.now();
                return db;
            });
            if (!found) return jsonError(res, 404, 'Host not found');
            return res.json({ ok: true });
        } catch (error) {
            return jsonError(res, 500, `Stream health update failed: ${error.message}`);
        }
    });

    app.post('/api/sessions/request', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const gameSlug = normalizeSlug(req.body?.gameId || req.body?.gameSlug);
            const gameTitle = normalizeLabel(req.body?.gameTitle, gameSlug.replace(/-/g, ' ') || 'unknown game');
            if (!gameSlug) return jsonError(res, 400, 'Game id is required');
            const now = Date.now();
            let responseSession = null;
            await updateAuthDb((db) => {
                ensureCloudState(db, now);
                const existing = db.cloudSessions.find((entry) => entry.userId === auth.user.id && ['queued', 'active', 'disconnected'].includes(entry.status));
                if (existing) {
                    responseSession = existing;
                    assignQueuedSessions(db, now);
                    return db;
                }
                const session = {
                    id: createId('cloud'),
                    userId: auth.user.id,
                    username: auth.user.username,
                    gameSlug,
                    gameTitle,
                    status: 'queued',
                    hostId: '',
                    requestedAt: now,
                    activatedAt: 0,
                    endedAt: 0,
                    disconnectedAt: 0,
                    reconnectExpiresAt: 0,
                    reconnectToken: '',
                };
                db.cloudSessions.push(session);
                assignQueuedSessions(db, now);
                responseSession = db.cloudSessions.find((entry) => entry.id === session.id) || session;
                return db;
            });
            const db = assignQueuedSessions(ensureCloudState(await readAuthDb()));
            const session = db.cloudSessions.find((entry) => entry.id === responseSession.id) || responseSession;
            return res.json({ ok: true, session: serializeSession(session, db) });
        } catch (error) {
            return jsonError(res, 500, `Session request failed: ${error.message}`);
        }
    });

    app.get('/api/sessions/me', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const db = assignQueuedSessions(ensureCloudState(await readAuthDb()));
            const sessions = db.cloudSessions
                .filter((entry) => entry.userId === auth.user.id && ['queued', 'active', 'disconnected'].includes(entry.status))
                .sort((left, right) => right.requestedAt - left.requestedAt)
                .map((entry) => serializeSession(entry, db));
            return res.json(sessions);
        } catch (error) {
            return jsonError(res, 500, `Session list failed: ${error.message}`);
        }
    });

    app.get('/api/stream/sessions/:sessionId/bootstrap', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const db = assignQueuedSessions(ensureCloudState(await readAuthDb()));
            const session = db.cloudSessions.find((entry) => entry.id === req.params.sessionId && entry.userId === auth.user.id);
            if (!session) return jsonError(res, 404, 'Session not found');
            if (session.status !== 'active' && session.status !== 'disconnected') {
                return jsonError(res, 409, 'Session is not stream-ready');
            }
            const host = db.cloudHosts.find((entry) => entry.id === session.hostId);
            if (!host) return jsonError(res, 409, 'Assigned host unavailable');
            return res.json(buildBootstrap(session, host));
        } catch (error) {
            return jsonError(res, 500, `Bootstrap failed: ${error.message}`);
        }
    });

    app.post('/api/sessions/:sessionId/disconnect', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const now = Date.now();
            let found = false;
            await updateAuthDb((db) => {
                ensureCloudState(db, now);
                const session = db.cloudSessions.find((entry) => entry.id === req.params.sessionId && entry.userId === auth.user.id);
                if (!session) return db;
                found = true;
                if (session.status === 'active') {
                    session.status = 'disconnected';
                    session.disconnectedAt = now;
                    session.reconnectExpiresAt = now + CLOUD_SESSION_RECONNECT_GRACE_MS;
                    session.reconnectToken = createId('reconnect');
                }
                return db;
            });
            if (!found) return jsonError(res, 404, 'Session not found');
            return res.json({ ok: true });
        } catch (error) {
            return jsonError(res, 500, `Disconnect failed: ${error.message}`);
        }
    });

    app.post('/api/sessions/:sessionId/reconnect', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const now = Date.now();
            let responseSession = null;
            await updateAuthDb((db) => {
                ensureCloudState(db, now);
                const session = db.cloudSessions.find((entry) => entry.id === req.params.sessionId && entry.userId === auth.user.id);
                if (!session) return db;
                if (session.status === 'disconnected' && session.reconnectExpiresAt > now) {
                    session.status = 'active';
                    session.disconnectedAt = 0;
                    session.reconnectExpiresAt = 0;
                    responseSession = session;
                }
                return db;
            });
            if (!responseSession) return jsonError(res, 404, 'Session not found or reconnect expired');
            return res.json({ ok: true });
        } catch (error) {
            return jsonError(res, 500, `Reconnect failed: ${error.message}`);
        }
    });

    app.post('/api/sessions/:sessionId/end', async (req, res) => {
        try {
            const auth = await requireAuth(req, res);
            if (!auth) return;
            const now = Date.now();
            let found = false;
            await updateAuthDb((db) => {
                ensureCloudState(db, now);
                const session = db.cloudSessions.find((entry) => entry.id === req.params.sessionId && entry.userId === auth.user.id);
                if (!session) return db;
                found = true;
                session.status = 'ended';
                session.endedAt = now;
                assignQueuedSessions(db, now);
                return db;
            });
            if (!found) return jsonError(res, 404, 'Session not found');
            return res.json({ ok: true });
        } catch (error) {
            return jsonError(res, 500, `End session failed: ${error.message}`);
        }
    });
}

module.exports = {
    attachCloudControlRoutes,
};
