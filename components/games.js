"use strict";
const VAULT_CONFIG = {
     keys: {
          disguiseTitle: "rift__disguise-title",
          disguiseFavicon: "rift__disguise-favicon",
          launchMode: "rift__launch-mode",
          favorites: "rift__game-favorites",
          saved: "rift__game-saved",
          recent: "rift__game-recent",
          progress: "rift__game-progress",
          cloudConflict: "rift__game-cloud-conflict-v1",
     },
     defaults: {
          mode: "window",
          title: "Google",
          favicon: "https://www.google.com/favicon.ico",
     },
     catalogs: {
          gnMath: {
               key: "gn-math",
               label: "GN-Math",
               bases: [],
               localCatalogUrl: "/gn-catalog",
          },
          sdxp: {
               key: "sdxp",
               label: "SDXP",
               bases: [],
               localCatalogUrl: "/sdxp-catalog",
          },
          duckmath: {
               key: "duckmath",
               label: "DuckMath",
               bases: [],
               localCatalogUrl: "/duckmath-catalog",
          },
          ccported: {
               key: "ccported",
               label: "CCPorted",
               bases: [],
               localCatalogUrl: "/ccported-catalog",
          },
          ugs: {
               key: "ugs",
               label: "UGS",
               bases: [],
               localCatalogUrl: "/ugs-catalog",
          },
          selenite: {
               key: "selenite",
               label: "selenite",
               bases: [],
               localCatalogUrl: "/slnte-catalog",
          },
          radon: {
               key: "radon",
               label: "radon",
               bases: [],
               localCatalogUrl: "/rdn-catalog",
          },
          fyinx: {
               key: "fyinx",
               label: "fyinx",
               bases: [],
               localCatalogUrl: "/fyinx-catalog",
          },
          elite: {
               key: "elite",
               label: "elite",
               bases: [],
               localCatalogUrl: "/eltgmz-catalog",
          },
          truffled: {
               key: "truffled",
               label: "Truffled",
               bases: [],
               localCatalogUrl: "/truffled-catalog",
          },
          totalscience: {
               key: "totalscience",
               label: "Totally Science",
               bases: [],
               localCatalogUrl: "/totalscience-catalog",
          },
          petezah: {
               key: "petezah",
               label: "PeteZah Lite",
               bases: [],
               localCatalogUrl: "/pzlite-catalog",
          },
          seraph: {
               key: "seraph",
               label: "Seraph",
               bases: [],
               localCatalogUrl: "/seraph-catalog",
          },
     },
     blocked: ["chat", "bot", "ai"],
};

const GN_MATH_BLOCKED_URL_SUFFIXES = [
     "/114-f.html", // upstream wrapper missing
     "/265.html", // upstream inline JS syntax error
     "/303.html", // upstream inline JS syntax error
     "/469.html", // upstream inline JS syntax error
];
const CATALOG_CACHE_KEY = "rift__catalog-cache-v1";
const CATALOG_CACHE_TTL_MS = 1000 * 60 * 20;
const CATALOG_FETCH_TIMEOUT_MS = 7000;

let catalog = [];
let launchMode = VAULT_CONFIG.defaults.mode;
let drag = { active: false, x: 0, y: 0, ox: 0, oy: 0 };
let selectedGame = null;
let cloudCollections = [];
let activeParty = null;

const el = (id) => document.getElementById(id);
const getAuthClient = () => window.RiftAuth || window.NovaAuth || null;

const sanitize = (text) => {
     const node = document.createElement("span");
     node.textContent = text;
     return node.innerHTML;
};

const readJsonSafe = (raw, fallback) => {
     try {
          return raw ? JSON.parse(raw) : fallback;
     } catch {
          return fallback;
     }
};

const requestVaultApi = async (url, options = {}) => {
     const res = await fetch(url, {
          credentials: "include",
          headers: { "Content-Type": "application/json", ...(options.headers || {}) },
          ...options,
     });
     let payload = null;
     try {
          payload = await res.json();
     } catch {
          payload = null;
     }
     if (!res.ok) {
          const error = new Error(payload?.error || `request failed (${res.status})`);
          error.status = res.status;
          throw error;
     }
     return payload;
};

const RiftVault = {
     async boot() {
          launchMode = localStorage.getItem(VAULT_CONFIG.keys.launchMode) || VAULT_CONFIG.defaults.mode;
          this.applyDisguise();
          this.injectDashboardStyles();
          this.ensureQuickSections();
          this.bind();
          const cachedCatalog = this.readCatalogCache();
          if (cachedCatalog.length) {
               catalog = cachedCatalog;
          }
          this.display();
          this.renderDetailExtras();
          this.syncSettingsSnapshot();
          this.loadCollections().then(() => this.renderQuickSections());
          this.loadParty().then(() => this.renderQuickSections());

          try {
               await this.fetchCatalog();
               this.writeCatalogCache(catalog);
               this.display();
               this.renderDetailExtras();
          } catch (err) {
               if (!catalog.length) {
                    this.toast("failed to load games. please refresh.");
                    console.error(err);
               }
          }

          try {
               await this.handleCloudConflict();
               this.renderQuickSections();
          } catch {
          }
     },

     async syncSettingsSnapshot() {
          const auth = getAuthClient();
          if (!auth?.saveLocalSettings) return;
          try {
               await auth.saveLocalSettings();
          } catch {
          }
     },

     async fetchCatalog() {
          const sources = Object.values(VAULT_CONFIG.catalogs);
          const loaded = await Promise.allSettled(
               sources.map((source) => this.fetchSourceCatalog(source))
          );

          const merged = loaded
               .filter((item) => item.status === "fulfilled")
               .flatMap((item) => item.value);

          catalog = merged;

          if (!catalog.length) {
               throw new Error("no game sources loaded");
          }
     },

     readCatalogCache() {
          const payload = readJsonSafe(localStorage.getItem(CATALOG_CACHE_KEY), null);
          const expiresAt = Number(payload?.expiresAt || 0);
          if (!expiresAt || expiresAt < Date.now()) return [];
          const rows = Array.isArray(payload?.rows) ? payload.rows : [];
          return rows
               .map((item) => ({
                    id: String(item?.id || "").trim(),
                    name: String(item?.name || "").trim(),
                    url: String(item?.url || "").trim(),
                    cover: String(item?.cover || "").trim(),
                    source: String(item?.source || "").trim(),
                    sourceLabel: String(item?.sourceLabel || "").trim(),
                    sourceBase: String(item?.sourceBase || "").trim(),
               }))
               .filter((item) => item.id && item.name && item.url);
     },

     writeCatalogCache(rows) {
          const safeRows = Array.isArray(rows)
               ? rows
                    .slice(0, 6000)
                    .map((item) => ({
                         id: String(item?.id || "").trim(),
                         name: String(item?.name || "").trim(),
                         url: String(item?.url || "").trim(),
                         cover: String(item?.cover || "").trim(),
                         source: String(item?.source || "").trim(),
                         sourceLabel: String(item?.sourceLabel || "").trim(),
                         sourceBase: String(item?.sourceBase || "").trim(),
                    }))
                    .filter((item) => item.id && item.name && item.url)
               : [];

          if (!safeRows.length) return;
          localStorage.setItem(
               CATALOG_CACHE_KEY,
               JSON.stringify({
                    expiresAt: Date.now() + CATALOG_CACHE_TTL_MS,
                    rows: safeRows,
               })
          );
     },

     async fetchJsonWithTimeout(url, timeoutMs = CATALOG_FETCH_TIMEOUT_MS) {
          const target = String(url || "").trim();
          if (!target) throw new Error("catalog url missing");
          if (typeof AbortController !== "function") {
               const res = await fetch(target);
               if (!res.ok) throw new Error(`catalog ${res.status}`);
               return await res.json();
          }

          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), timeoutMs);
          try {
               const res = await fetch(target, { signal: controller.signal });
               if (!res.ok) throw new Error(`catalog ${res.status}`);
               return await res.json();
          } catch (err) {
               if (err?.name === "AbortError") {
                    throw new Error("catalog timeout");
               }
               throw err;
          } finally {
               clearTimeout(timer);
          }
     },

     injectDashboardStyles() {
          if (document.getElementById("vault-dashboard-style")) return;
          const style = document.createElement("style");
          style.id = "vault-dashboard-style";
          style.textContent = `
               .vault-quick-sections{width:100%;max-width:1200px;margin:0 auto 14px;padding:0 20px;display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px}
               .vault-quick-card{border:1px solid rgba(255,255,255,.14);border-radius:12px;background:rgba(255,255,255,.04);padding:10px;min-height:132px}
               .vault-quick-head{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}
               .vault-quick-title{font-size:12px;letter-spacing:.08em;text-transform:lowercase;color:rgba(255,255,255,.9)}
               .vault-quick-empty{font-size:11px;color:rgba(255,255,255,.55);text-transform:lowercase;padding-top:6px}
               .vault-quick-list{display:grid;gap:6px}
               .vault-quick-item{border:1px solid rgba(255,255,255,.14);border-radius:9px;background:rgba(255,255,255,.05);color:#fff;padding:7px 8px;font-size:10px;display:flex;align-items:center;justify-content:space-between;gap:8px;cursor:pointer}
               .vault-quick-item:hover{background:rgba(255,255,255,.1);border-color:rgba(255,255,255,.28)}
               .vault-quick-item-name{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:70%}
               .vault-quick-item-meta{font-size:9px;color:rgba(255,255,255,.58);text-transform:lowercase}
               .vault-mini-btn{border:1px solid rgba(255,255,255,.16);background:rgba(255,255,255,.08);color:#fff;border-radius:8px;padding:5px 8px;font-size:10px;cursor:pointer;text-transform:lowercase}
               .vault-mini-btn:hover{background:rgba(255,255,255,.14)}
               .vault-mini-input{width:100%;border:1px solid rgba(255,255,255,.16);background:rgba(0,0,0,.22);color:#fff;border-radius:8px;padding:6px 8px;font-size:10px;font-family:"Run",Arial,sans-serif}
               .vault-mini-row{display:flex;gap:6px;align-items:center}
               .vault-mini-note{font-size:10px;color:rgba(255,255,255,.66);line-height:1.35}
               .vault-party-members{display:grid;gap:5px;margin-top:6px}
               .vault-party-member{font-size:10px;color:rgba(255,255,255,.84);display:flex;justify-content:space-between;gap:8px}
               .vault-party-member span:last-child{color:rgba(255,255,255,.58);text-transform:lowercase}
               .game-detail-extra{margin-top:8px;display:grid;gap:7px}
               .game-detail-extra-row{display:grid;grid-template-columns:1fr auto;gap:6px}
               .game-detail-extra select{width:100%;border:1px solid rgba(255,255,255,.2);background:rgba(0,0,0,.24);color:#fff;border-radius:8px;padding:8px;font-size:11px;font-family:"Run",Arial,sans-serif}
               .game-detail-extra button{border:1px solid rgba(255,255,255,.2);background:rgba(255,255,255,.1);color:#fff;border-radius:8px;padding:8px 10px;font-size:11px;cursor:pointer;text-transform:lowercase}
               @media (max-width:960px){.game-detail-extra-row{grid-template-columns:1fr}}
          `;
          document.head.appendChild(style);
     },

     ensureQuickSections() {
          if (el("vault-quick-sections")) return;
          const grid = el("vault-grid");
          if (!grid || !grid.parentElement) return;
          const root = document.createElement("section");
          root.id = "vault-quick-sections";
          root.className = "vault-quick-sections";
          root.innerHTML = `
               <article class="vault-quick-card">
                    <div class="vault-quick-head"><div class="vault-quick-title">continue</div></div>
                    <div class="vault-quick-list" id="vault-quick-continue"></div>
                    <div class="vault-quick-empty" id="vault-quick-continue-empty">launch a game to build your continue list</div>
               </article>
               <article class="vault-quick-card">
                    <div class="vault-quick-head"><div class="vault-quick-title">favorites</div></div>
                    <div class="vault-quick-list" id="vault-quick-favorites"></div>
                    <div class="vault-quick-empty" id="vault-quick-favorites-empty">favorite games from a game card</div>
               </article>
               <article class="vault-quick-card">
                    <div class="vault-quick-head"><div class="vault-quick-title">recently played</div></div>
                    <div class="vault-quick-list" id="vault-quick-recent"></div>
                    <div class="vault-quick-empty" id="vault-quick-recent-empty">your recent launches show here</div>
               </article>
               <article class="vault-quick-card">
                    <div class="vault-quick-head">
                         <div class="vault-quick-title">collections</div>
                         <button type="button" id="vault-create-collection" class="vault-mini-btn">new</button>
                    </div>
                    <div class="vault-quick-list" id="vault-quick-collections"></div>
                    <div class="vault-quick-empty" id="vault-quick-collections-empty">create a collection to organize games</div>
               </article>
               <article class="vault-quick-card">
                    <div class="vault-quick-head"><div class="vault-quick-title">music party</div></div>
                    <div id="vault-party-content" class="vault-mini-note">log in to create or join a music party.</div>
               </article>
          `;
          grid.parentElement.insertBefore(root, grid);
     },

     getRecentList() {
          const rows = readJsonSafe(localStorage.getItem(VAULT_CONFIG.keys.recent), []);
          return Array.isArray(rows)
               ? rows
                    .map((row) => ({ id: String(row?.id || ""), at: Number(row?.at || 0) }))
                    .filter((row) => row.id && Number.isFinite(row.at) && row.at > 0)
               : [];
     },

     setRecentList(rows) {
          const next = Array.isArray(rows) ? rows.slice(0, 80) : [];
          localStorage.setItem(VAULT_CONFIG.keys.recent, JSON.stringify(next));
     },

     touchRecent(gameId) {
          const id = String(gameId || "");
          if (!id) return;
          const now = Date.now();
          let rows = this.getRecentList();
          rows = rows.filter((row) => row.id !== id);
          rows.unshift({ id, at: now });
          this.setRecentList(rows);
     },

     getProgressMap() {
          return this.getStoredMap(VAULT_CONFIG.keys.progress);
     },

     setProgressMap(map) {
          this.setStoredMap(VAULT_CONFIG.keys.progress, map || {});
     },

     renderQuickSections() {
          this.ensureQuickSections();
          const continueWrap = el("vault-quick-continue");
          const favWrap = el("vault-quick-favorites");
          const recentWrap = el("vault-quick-recent");
          if (!continueWrap || !favWrap || !recentWrap) return;

          const favoritesMap = this.getStoredMap(VAULT_CONFIG.keys.favorites);
          const progressMap = this.getProgressMap();
          const recentRows = this.getRecentList();

          const favoriteIds = Object.keys(favoritesMap).slice(0, 8);
          const continueRows = Object.entries(progressMap)
               .map(([id, value]) => ({ id, at: Number(value?.lastPlayedAt || value?.updatedAt || 0) }))
               .filter((row) => row.id && row.at > 0)
               .sort((a, b) => b.at - a.at)
               .slice(0, 8);
          const recentIds = recentRows.slice(0, 8);

          const toGame = (id) => catalog.find((game) => game.id === id);
          const renderItems = (wrap, emptyId, rows, withMeta = false) => {
               wrap.innerHTML = "";
               const empty = el(emptyId);
               if (!rows.length) {
                    if (empty) empty.style.display = "block";
                    return;
               }
               if (empty) empty.style.display = "none";
               rows.forEach((row) => {
                    const game = toGame(row.id);
                    if (!game) return;
                    const item = document.createElement("button");
                    item.type = "button";
                    item.className = "vault-quick-item";
                    const meta = withMeta ? ` <span class="vault-quick-item-meta">${this.timeAgo(row.at)}</span>` : "";
                    item.innerHTML = `<span class="vault-quick-item-name">${sanitize(String(game.name || "game").toLowerCase())}</span>${meta}`;
                    item.addEventListener("click", () => this.openGameDetail(game.id));
                    wrap.appendChild(item);
               });
               if (!wrap.children.length && empty) empty.style.display = "block";
          };

          renderItems(favWrap, "vault-quick-favorites-empty", favoriteIds.map((id) => ({ id })));
          renderItems(continueWrap, "vault-quick-continue-empty", continueRows, true);
          renderItems(recentWrap, "vault-quick-recent-empty", recentIds, true);
          this.renderCollectionsPanel();
          this.renderPartyPanel();
     },

     timeAgo(value) {
          const delta = Math.max(0, Date.now() - Number(value || 0));
          const minutes = Math.floor(delta / 60000);
          if (minutes < 1) return "just now";
          if (minutes < 60) return `${minutes}m ago`;
          const hours = Math.floor(minutes / 60);
          if (hours < 24) return `${hours}h ago`;
          const days = Math.floor(hours / 24);
          return `${days}d ago`;
     },

     async loadCollections() {
          const auth = getAuthClient();
          if (!auth) {
               cloudCollections = [];
               return;
          }
          try {
               const payload = await requestVaultApi("/api/games/collections");
               cloudCollections = Array.isArray(payload?.collections) ? payload.collections : [];
          } catch {
               cloudCollections = [];
          }
     },

     renderCollectionsPanel() {
          const list = el("vault-quick-collections");
          const empty = el("vault-quick-collections-empty");
          if (!list || !empty) return;
          list.innerHTML = "";
          if (!cloudCollections.length) {
               empty.style.display = "block";
               return;
          }
          empty.style.display = "none";
          cloudCollections.slice(0, 8).forEach((collection) => {
               const row = document.createElement("div");
               row.className = "vault-quick-item";
               const count = Array.isArray(collection?.games) ? collection.games.length : 0;
               row.innerHTML = `
                    <span class="vault-quick-item-name">${sanitize(String(collection?.name || "collection").toLowerCase())}</span>
                    <span class="vault-quick-item-meta">${count} games</span>
               `;
               row.addEventListener("click", () => {
                    const gameId = String(collection?.games?.[0]?.id || "");
                    if (!gameId) return;
                    this.openGameDetail(gameId);
               });
               list.appendChild(row);
          });
     },

     async createCollection() {
          const auth = getAuthClient();
          if (!auth) {
               this.toast("log in on account first");
               return;
          }
          const name = String(prompt("collection name") || "").trim();
          if (!name) return;
          try {
               await requestVaultApi("/api/games/collections", {
                    method: "POST",
                    body: JSON.stringify({ name }),
               });
               await this.loadCollections();
               this.renderQuickSections();
               this.renderDetailExtras();
               this.toast("collection created");
          } catch (error) {
               this.toast(error?.message || "failed to create collection");
          }
     },

     async addSelectedGameToCollection() {
          if (!selectedGame) return;
          if (!cloudCollections.length) {
               await this.createCollection();
               if (!cloudCollections.length) return;
          }
          const picker = el("game-detail-collection-picker");
          const collectionId = String(picker?.value || cloudCollections?.[0]?.id || "");
          if (!collectionId) return;
          try {
               await requestVaultApi(`/api/games/collections/${encodeURIComponent(collectionId)}/games`, {
                    method: "POST",
                    body: JSON.stringify({
                         gameId: selectedGame.id,
                         gameName: selectedGame.name || "",
                    }),
               });
               await this.loadCollections();
               this.renderQuickSections();
               this.renderDetailExtras();
               this.toast("added to collection");
          } catch (error) {
               this.toast(error?.message || "failed to add game");
          }
     },

     renderDetailExtras() {
          const actions = document.querySelector("#game-detail-card .game-detail-actions");
          if (!actions) return;
          let wrap = el("game-detail-extra");
          if (!wrap) {
               wrap = document.createElement("div");
               wrap.id = "game-detail-extra";
               wrap.className = "game-detail-extra";
               wrap.innerHTML = `
                    <div class="game-detail-extra-row">
                         <select id="game-detail-collection-picker"></select>
                         <button type="button" id="game-detail-add-collection">add to collection</button>
                    </div>
               `;
               actions.parentElement?.appendChild(wrap);
               el("game-detail-add-collection")?.addEventListener("click", () => this.addSelectedGameToCollection());
          }
          const picker = el("game-detail-collection-picker");
          const addBtn = el("game-detail-add-collection");
          if (picker) {
               if (!cloudCollections.length) {
                    picker.innerHTML = `<option value="">no collections</option>`;
                    picker.disabled = true;
               } else {
                    picker.innerHTML = cloudCollections
                         .slice(0, 80)
                         .map((collection) => `<option value="${sanitize(String(collection.id || ""))}">${sanitize(String(collection.name || "collection"))}</option>`)
                         .join("");
                    picker.disabled = false;
               }
          }
          if (addBtn) addBtn.disabled = !selectedGame;
     },

     async loadParty() {
          const auth = getAuthClient();
          if (!auth) {
               activeParty = null;
               return;
          }
          try {
               const payload = await requestVaultApi("/api/party");
               activeParty = payload?.party || null;
          } catch {
               activeParty = null;
          }
     },

     renderPartyPanel() {
          const root = el("vault-party-content");
          if (!root) return;
          const auth = getAuthClient();
          if (!auth) {
               root.innerHTML = "log in to create or join a music party.";
               return;
          }
          if (!activeParty) {
               root.innerHTML = `
                    <div class="vault-mini-row">
                         <button type="button" id="vault-party-create" class="vault-mini-btn">create music party</button>
                         <button type="button" id="vault-party-join" class="vault-mini-btn">join by code</button>
                    </div>
                    <div class="vault-mini-note">share party code with friends to sync what you are listening to.</div>
               `;
               el("vault-party-create")?.addEventListener("click", () => this.createParty());
               el("vault-party-join")?.addEventListener("click", () => this.joinParty());
               return;
          }
          const isOwner = !!activeParty?.isOwner;
          const members = Array.isArray(activeParty?.members) ? activeParty.members : [];
          const trackTitle = String(activeParty?.musicTrack?.title || "").trim();
          const trackArtist = String(activeParty?.musicTrack?.artist || "").trim();
          const trackLabel = trackTitle
               ? (trackArtist ? `${trackTitle} - ${trackArtist}` : trackTitle)
               : "not set";
          root.innerHTML = `
               <div class="vault-mini-note">${sanitize(activeParty.name || "party")} | code: ${sanitize(activeParty.code || "")}</div>
               <div class="vault-mini-note">now playing: ${sanitize(trackLabel)}</div>
               <div class="vault-party-members">
                    ${members.slice(0, 10).map((member) => `
                         <div class="vault-party-member">
                              <span>${sanitize(member.username || "user")}</span>
                              <span>${sanitize(String(member.status || "offline"))}</span>
                         </div>
                    `).join("")}
               </div>
               <div class="vault-mini-row">
                    ${isOwner ? `<button type="button" id="vault-party-copy" class="vault-mini-btn">copy code</button>` : ""}
                    ${isOwner ? `<button type="button" id="vault-party-set-track" class="vault-mini-btn">set track</button>` : ""}
                    <button type="button" id="vault-party-leave" class="vault-mini-btn">leave party</button>
               </div>
          `;
          el("vault-party-leave")?.addEventListener("click", () => this.leaveParty());
          if (isOwner) {
               el("vault-party-copy")?.addEventListener("click", async () => {
                    try {
                         await navigator.clipboard.writeText(String(activeParty?.code || ""));
                         this.toast("party code copied");
                    } catch {
                         this.toast("copy failed");
                    }
               });
               el("vault-party-set-track")?.addEventListener("click", () => this.promptSetPartyTrack());
          }
     },

     async createParty() {
          const name = String(prompt("music party name") || "").trim();
          if (!name) return;
          try {
               const payload = await requestVaultApi("/api/party/create", {
                    method: "POST",
                    body: JSON.stringify({ name }),
               });
               activeParty = payload?.party || null;
               this.renderQuickSections();
               this.renderDetailExtras();
               this.toast("music party created");
          } catch (error) {
               this.toast(error?.message || "failed to create music party");
          }
     },

     async joinParty() {
          const code = String(prompt("music party code") || "").trim();
          if (!code) return;
          try {
               const payload = await requestVaultApi("/api/party/join", {
                    method: "POST",
                    body: JSON.stringify({ code }),
               });
               activeParty = payload?.party || null;
               this.renderQuickSections();
               this.renderDetailExtras();
               this.toast("joined music party");
          } catch (error) {
               this.toast(error?.message || "failed to join music party");
          }
     },

     async leaveParty() {
          try {
               await requestVaultApi("/api/party/leave", {
                    method: "POST",
                    body: JSON.stringify({}),
               });
               activeParty = null;
               this.renderQuickSections();
               this.renderDetailExtras();
          } catch (error) {
               this.toast(error?.message || "failed to leave party");
          }
     },

     async promptSetPartyTrack() {
          if (!activeParty) return;
          const title = String(prompt("track title") || "").trim();
          if (!title) {
               this.toast("track title required");
               return;
          }
          const artist = String(prompt("artist (optional)") || "").trim();
          await this.setPartyMusicTrack({ title, artist });
     },

     async setPartyMusicTrack(track) {
          if (!activeParty || !track || !String(track.title || "").trim()) return;
          try {
               const payload = await requestVaultApi("/api/party/music", {
                    method: "PUT",
                    body: JSON.stringify({
                         musicTrack: {
                              title: String(track.title || "").trim(),
                              artist: String(track.artist || "").trim(),
                         },
                    }),
               });
               activeParty = payload?.party || activeParty;
               this.renderQuickSections();
               this.renderDetailExtras();
               this.toast("party track updated");
          } catch {
          }
     },

     collectLocalState() {
          return {
               favorites: this.getStoredMap(VAULT_CONFIG.keys.favorites),
               saved: this.getStoredMap(VAULT_CONFIG.keys.saved),
               recent: this.getRecentList(),
               progress: this.getProgressMap(),
          };
     },

     buildCloudState(gamesMap) {
          const favorites = {};
          const saved = {};
          const recent = [];
          const progress = {};
          const entries = gamesMap && typeof gamesMap === "object" ? Object.entries(gamesMap) : [];
          entries.forEach(([gameId, value]) => {
               if (!gameId || !value || typeof value !== "object") return;
               const at = Number(value.updatedAt || Date.now());
               if (value.favorite === true) favorites[gameId] = { at: Number(value.favoriteAt || at) };
               if (value.saved === true) saved[gameId] = { at: Number(value.savedAt || at) };
               const lastPlayedAt = Number(value.lastPlayedAt || 0);
               if (lastPlayedAt > 0) recent.push({ id: gameId, at: lastPlayedAt });
               progress[gameId] = {
                    lastPlayedAt,
                    updatedAt: at,
                    name: String(value.name || ""),
                    source: String(value.source || ""),
                    url: String(value.url || ""),
                    launches: Number(value.launches || 0),
               };
          });
          recent.sort((a, b) => b.at - a.at);
          const dedupRecent = [];
          const seen = new Set();
          recent.forEach((row) => {
               if (!row.id || seen.has(row.id)) return;
               seen.add(row.id);
               dedupRecent.push(row);
          });
          return { favorites, saved, recent: dedupRecent, progress };
     },

     mergeState(localState, cloudState) {
          const mergeByAt = (a, b) => {
               const out = { ...(a || {}) };
               Object.entries(b || {}).forEach(([id, value]) => {
                    const leftAt = Number(out[id]?.at || 0);
                    const rightAt = Number(value?.at || 0);
                    if (!out[id] || rightAt >= leftAt) out[id] = { at: rightAt || Date.now() };
               });
               return out;
          };
          const progress = { ...(localState.progress || {}) };
          Object.entries(cloudState.progress || {}).forEach(([id, value]) => {
               const leftAt = Number(progress[id]?.updatedAt || 0);
               const rightAt = Number(value?.updatedAt || 0);
               if (!progress[id] || rightAt >= leftAt) progress[id] = { ...value };
          });
          const recentMap = new Map();
          [...(localState.recent || []), ...(cloudState.recent || [])].forEach((row) => {
               const id = String(row?.id || "");
               const at = Number(row?.at || 0);
               if (!id || at <= 0) return;
               const existing = Number(recentMap.get(id) || 0);
               if (at > existing) recentMap.set(id, at);
          });
          const recent = Array.from(recentMap.entries())
               .map(([id, at]) => ({ id, at }))
               .sort((a, b) => b.at - a.at);
          return {
               favorites: mergeByAt(localState.favorites, cloudState.favorites),
               saved: mergeByAt(localState.saved, cloudState.saved),
               recent,
               progress,
          };
     },

     applyState(state) {
          this.setStoredMap(VAULT_CONFIG.keys.favorites, state.favorites || {});
          this.setStoredMap(VAULT_CONFIG.keys.saved, state.saved || {});
          this.setProgressMap(state.progress || {});
          this.setRecentList(state.recent || []);
     },

     stateFingerprint(state) {
          const normalizeMap = (map) => Object.keys(map || {}).sort();
          const normalizeRecent = (rows) => (rows || []).slice(0, 50).map((row) => `${row.id}:${row.at}`).join("|");
          return JSON.stringify({
               favorites: normalizeMap(state.favorites),
               saved: normalizeMap(state.saved),
               recent: normalizeRecent(state.recent),
               progress: Object.keys(state.progress || {}).sort().slice(0, 200),
          });
     },

     async syncStateToCloud(state) {
          const auth = getAuthClient();
          if (!auth?.saveGameProgress) return;
          const ids = new Set();
          Object.keys(state.favorites || {}).forEach((id) => ids.add(id));
          Object.keys(state.saved || {}).forEach((id) => ids.add(id));
          Object.keys(state.progress || {}).forEach((id) => ids.add(id));
          const list = Array.from(ids).slice(0, 120);
          for (const gameId of list) {
               const progress = state.progress?.[gameId] || {};
               const payload = {
                    favorite: !!state.favorites?.[gameId],
                    favoriteAt: Number(state.favorites?.[gameId]?.at || Date.now()),
                    saved: !!state.saved?.[gameId],
                    savedAt: Number(state.saved?.[gameId]?.at || Date.now()),
               };
               if (Number(progress.lastPlayedAt || 0) > 0) payload.lastPlayedAt = Number(progress.lastPlayedAt);
               if (progress.name) payload.name = String(progress.name);
               if (progress.source) payload.source = String(progress.source);
               if (progress.url) payload.url = String(progress.url);
               try {
                    await auth.saveGameProgress(gameId, payload);
               } catch {
               }
          }
     },

     async handleCloudConflict() {
          const auth = getAuthClient();
          if (!auth?.getSave) return;
          let payload;
          try {
               payload = await auth.getSave();
          } catch {
               return;
          }
          const cloudState = this.buildCloudState(payload?.save?.games || {});
          const localState = this.collectLocalState();
          const cloudSig = this.stateFingerprint(cloudState);
          const localSig = this.stateFingerprint(localState);
          if (!cloudSig || cloudSig === localSig) return;

          const localHasData = Object.keys(localState.favorites || {}).length || Object.keys(localState.saved || {}).length || (localState.recent || []).length;
          const cloudHasData = Object.keys(cloudState.favorites || {}).length || Object.keys(cloudState.saved || {}).length || (cloudState.recent || []).length;
          if (!cloudHasData) return;
          if (!localHasData) {
               this.applyState(cloudState);
               return;
          }

          const promptKey = `${localSig}::${cloudSig}`;
          if (localStorage.getItem(VAULT_CONFIG.keys.cloudConflict) === promptKey) return;
          const choiceRaw = prompt(
               "Cloud save conflict found.\nType one: merge, cloud, local",
               "merge"
          );
          const choice = String(choiceRaw || "merge").trim().toLowerCase();
          let resolved = null;
          if (choice === "cloud") resolved = cloudState;
          else if (choice === "local") resolved = localState;
          else resolved = this.mergeState(localState, cloudState);

          this.applyState(resolved);
          localStorage.setItem(VAULT_CONFIG.keys.cloudConflict, promptKey);
          if (choice !== "cloud") {
               await this.syncStateToCloud(resolved);
          }
     },

     async fetchSourceCatalog(source) {
          if (source.catalogUrl) {
               const data = await this.fetchJsonWithTimeout(source.catalogUrl);
               const rows = Array.isArray(data?.games) ? data.games : [];
               return rows.map((item, index) => ({
                    id: `${source.key}:${index}`,
                    name: item?.label || `game ${index + 1}`,
                    url: this.normalizeExternalUrl(item?.url),
                    cover: item?.imageUrl || "",
                    source: source.key,
                    sourceLabel: source.label,
                    sourceBase: window.location.origin,
               }));
          }

          if (source.localCatalogUrl) {
               const data = await this.fetchJsonWithTimeout(source.localCatalogUrl);
               const rows = Array.isArray(data) ? data : [];
               return rows.map((item) => ({
                    ...item,
                    source: source.key,
                    sourceLabel: source.label,
                    sourceBase: window.location.origin,
               }));
          }

          let lastError = null;

          for (const base of source.bases) {
               const url = `${base}/assets@main/zones.json`;
               try {
                    const data = await this.fetchJsonWithTimeout(url);
                    let rows = Array.isArray(data) ? data.slice(1) : [];
                    if (source.key === "gn-math") {
                         rows = rows.filter((item) => {
                              const rawUrl = String(item?.url || "").toLowerCase().trim();
                              if (!rawUrl) return false;
                              return !GN_MATH_BLOCKED_URL_SUFFIXES.some((suffix) => rawUrl.endsWith(suffix));
                         });
                    }
                    return rows.map((item) => ({
                         ...item,
                         source: source.key,
                         sourceLabel: source.label,
                         sourceBase: base,
                    }));
               } catch (err) {
                    lastError = err;
               }
          }

          throw lastError || new Error(`failed source ${source.key}`);
     },

     normalizeExternalUrl(url) {
          const value = String(url || "").trim();
          if (!value) return "";
          if (!/^https?:\/\//i.test(value)) return `https://${value.replace(/^\/+/, "")}`;
          if (/\.[a-z0-9]+(\?|#|$)/i.test(value) || value.endsWith("/")) return value;
          return `${value}/index.html`;
     },

     deriveTruffledAlias(value) {
          const raw = String(value || "").trim();
          if (!raw) return "";

          const cleanSlug = (slug) =>
               String(slug || "")
                    .trim()
                    .replace(/\.html?$/i, "")
                    .replace(/[^a-z0-9_-]+/gi, "-")
                    .replace(/^-+|-+$/g, "")
                    .toLowerCase();

          const fromPath = (pathname) => {
               const normalizedPath = String(pathname || "")
                    .trim()
                    .replace(/[?#].*$/, "")
                    .replace(/^https?:\/\/[^/]+/i, "")
                    .replace(/^\/+/, "");
               if (!normalizedPath) return "";

               const gamesMatch = normalizedPath.match(/^games\/([^/]+)\/index\.html$/i);
               if (gamesMatch && gamesMatch[1]) return cleanSlug(gamesMatch[1]);

               const gamefileMatch = normalizedPath.match(/^gamefile\/(.+)\.html$/i);
               if (gamefileMatch && gamefileMatch[1]) {
                    const parts = String(gamefileMatch[1]).split("/").filter(Boolean);
                    return cleanSlug(parts[parts.length - 1] || "");
               }

               const htmlMatch = normalizedPath.match(/([^/]+)\.html?$/i);
               if (htmlMatch && htmlMatch[1]) return cleanSlug(htmlMatch[1]);

               const fallbackPart = normalizedPath.split("/").filter(Boolean).pop();
               return cleanSlug(fallbackPart || "");
          };

          try {
               if (/^\/proxy\?url=/i.test(raw)) {
                    const parsedProxy = new URL(raw, window.location.origin);
                    const inner = parsedProxy.searchParams.get("url");
                    if (inner) return this.deriveTruffledAlias(inner);
               }
          } catch {
          }

          try {
               const parsed = new URL(raw, window.location.origin);
               if (!/(^|\.)truffled\.lol$/i.test(parsed.hostname) && parsed.origin !== window.location.origin) {
                    return "";
               }
               if (/^\/iframe\.html$/i.test(parsed.pathname)) {
                    const embedded = parsed.searchParams.get("url");
                    if (embedded) return this.deriveTruffledAlias(embedded);
               }
               return fromPath(parsed.pathname);
          } catch {
               return fromPath(raw);
          }
     },

     resolveTruffledLocalLaunchUrl(game, rawUrl) {
          const direct = String(rawUrl || "").trim();
          if (!direct) return "";
          if (direct.startsWith("/") && /\.html?(?:[?#]|$)/i.test(direct)) return direct;

          const candidates = [direct];
          const gameId = String(game?.id || "");
          if (gameId.startsWith("truffled-")) {
               candidates.push(gameId.slice("truffled-".length));
          }

          for (const candidate of candidates) {
               const alias = this.deriveTruffledAlias(candidate);
               if (alias) return `/truf/${encodeURIComponent(alias)}.html`;
          }

          return direct;
     },

     bind() {
          const searchBox = el("vault-search");
          const clearBtn = el("vault-clear");
          const sourceFilter = el("vault-source-filter");
          if (searchBox) {
               searchBox.addEventListener("input", (e) => {
                    this.display(e.target.value, sourceFilter?.value || "all");
                    if (clearBtn) clearBtn.style.display = e.target.value ? "flex" : "none";
               });
          }
          if (clearBtn) {
               clearBtn.addEventListener("click", () => {
                    if (searchBox) { searchBox.value = ""; searchBox.focus(); }
                    clearBtn.style.display = "none";
                    this.display("", sourceFilter?.value || "all");
               });
          }
          if (sourceFilter) {
               sourceFilter.addEventListener("change", () => {
                    const nextSource = sourceFilter.value || "all";
                    this.display(searchBox?.value || "", nextSource);
                    this.updateTruffledNote(nextSource);
               });
          }
          el("vault-create-collection")?.addEventListener("click", () => this.createCollection());
          this.updateTruffledNote(sourceFilter?.value || "all");

          el("game-detail-close")?.addEventListener("click", () => this.closeGameDetail());
          el("game-detail-backdrop")?.addEventListener("click", (event) => {
               if (event.target?.id === "game-detail-backdrop") this.closeGameDetail();
          });
          el("game-detail-play")?.addEventListener("click", () => {
               if (selectedGame?.id) this.launch(selectedGame.id);
          });
          el("game-detail-favorite")?.addEventListener("click", () => this.toggleFavorite());
          el("game-detail-save")?.addEventListener("click", () => this.markSaved());

          const bar = el("viewer-bar");
          if (bar) {
               bar.querySelector(".dot.close")?.addEventListener("click", () => this.closeViewer());
               bar.querySelector(".dot.min")?.addEventListener("click", () => this.shrinkViewer());
               bar.querySelector(".dot.max")?.addEventListener("click", () => this.expandViewer());
               bar.addEventListener("dblclick", (e) => {
                    if (e.target.id === "viewer-bar" || e.target.id === "viewer-label") this.expandViewer();
               });
          }

          el("viewer-restore")?.addEventListener("click", () => this.unshrinkViewer());
          this.enableDrag();
     },

     updateTruffledNote(source) {
          const note = el("truffled-launch-note");
          if (!note) return;
          note.style.display = (source === "truffled" || source === "all") ? "block" : "none";
     },

     enableDrag() {
          const viewer = el("game-viewer");
          const bar = el("viewer-bar");
          if (!viewer || !bar) return;

          const pos = (e) => ({
               x: e.touches?.[0].clientX ?? e.clientX,
               y: e.touches?.[0].clientY ?? e.clientY,
          });

          const start = (e) => {
               if (viewer.classList.contains("expanded") || e.target.closest(".viewer-controls")) return;
               if (!bar.contains(e.target)) return;
               drag.active = true;
               if (e.touches) e.preventDefault();
               const p = pos(e);
               drag.x = p.x - drag.ox;
               drag.y = p.y - drag.oy;
          };

          const move = (e) => {
               if (!drag.active) return;
               if (e.touches) e.preventDefault();
               const p = pos(e);
               drag.ox = p.x - drag.x;
               drag.oy = p.y - drag.y;
               viewer.style.transform = `translate(${drag.ox}px, ${drag.oy}px)`;
          };

          const end = () => (drag.active = false);

          bar.addEventListener("mousedown", start);
          document.addEventListener("mousemove", move);
          document.addEventListener("mouseup", end);
          bar.addEventListener("touchstart", start, { passive: false });
          document.addEventListener("touchmove", move, { passive: false });
          document.addEventListener("touchend", end);
     },

     normalizeGameName(name) {
          return String(name || "")
               .toLowerCase()
               .replace(/[^a-z0-9]+/g, " ")
               .trim();
     },

     sourceRank(source) {
          const rank = {
               truffled: 0,
               totalscience: 1,
               duckmath: 2,
               ccported: 3,
               ugs: 4,
               selenite: 5,
               radon: 6,
               fyinx: 7,
               elite: 8,
               sdxp: 9,
               "gn-math": 10,
               petezah: 11,
               seraph: 12,
          };
          return rank[source] ?? 13;
     },

     dedupeGames(items, source) {
          if (source !== "all") return items;
          const byName = new Map();
          for (const game of items) {
               const key = this.normalizeGameName(game.name);
               if (!key) continue;
               const existing = byName.get(key);
               if (!existing) {
                    byName.set(key, game);
                    continue;
               }

               const currentRank = this.sourceRank(existing.source);
               const nextRank = this.sourceRank(game.source);
               const preferNext =
                    nextRank < currentRank ||
                    (nextRank === currentRank && !existing.cover && !!game.cover);

               if (preferNext) byName.set(key, game);
          }
          return Array.from(byName.values());
     },

     display(query = "", source = "all") {
          const grid = el("vault-grid");
          if (!grid) return;

          const q = query.toLowerCase();
          const filtered = catalog.filter((g) => {
               const n = g.name.toLowerCase();
               const passesQuery = n.includes(q);
               const passesBlocked = !VAULT_CONFIG.blocked.some((b) => n.includes(b));
               const passesSource = source === "all" ? true : g.source === source;
               return passesQuery && passesBlocked && passesSource;
          });
          const results = this.dedupeGames(filtered, source).sort((a, b) => a.name.localeCompare(b.name));

          grid.innerHTML = "";
          results.forEach((g) => {
               const tile = document.createElement("div");
               tile.className = "vault-tile";

               if (g.cover) {
                    const coverUrl = this.resolveCoverUrl(g);
                    if (coverUrl) {
                         const img = document.createElement("img");
                         img.src = coverUrl;
                         img.alt = g.name;
                         img.loading = "lazy";
                         img.onerror = () => img.remove();
                         tile.appendChild(img);
                    }
               }

               const label = document.createElement("span");
               label.textContent = g.name.toUpperCase();
               tile.appendChild(label);

               tile.addEventListener("click", () => this.openGameDetail(g.id));
               grid.appendChild(tile);
          });

          this.renderQuickSections();
     },

     getStoredMap(key) {
          try {
               const raw = localStorage.getItem(key);
               const parsed = raw ? JSON.parse(raw) : {};
               return parsed && typeof parsed === "object" ? parsed : {};
          } catch {
               return {};
          }
     },

     setStoredMap(key, value) {
          localStorage.setItem(key, JSON.stringify(value || {}));
     },

     isFavorited(gameId) {
          return Boolean(this.getStoredMap(VAULT_CONFIG.keys.favorites)[gameId]);
     },

     isSaved(gameId) {
          return Boolean(this.getStoredMap(VAULT_CONFIG.keys.saved)[gameId]);
     },

     openGameDetail(gameId) {
          const game = catalog.find((g) => g.id === gameId);
          if (!game) return;
          selectedGame = game;
          const image = el("game-detail-image");
          const name = el("game-detail-name");
          const source = el("game-detail-source");
          const backdrop = el("game-detail-backdrop");
          if (name) name.textContent = String(game.name || "").toUpperCase();
          if (source) source.textContent = `source: ${game.sourceLabel || game.source || "unknown"}`;
          if (image) {
               const cover = this.resolveCoverUrl(game);
               image.src = cover || "/assets/images/rift logo.png";
               image.onerror = () => { image.src = "/assets/images/rift logo.png"; };
          }
          this.refreshDetailButtons();
          this.renderDetailExtras();
          if (backdrop) backdrop.style.display = "flex";
     },

     closeGameDetail() {
          const backdrop = el("game-detail-backdrop");
          if (backdrop) backdrop.style.display = "none";
     },

     refreshDetailButtons() {
          if (!selectedGame) return;
          const favBtn = el("game-detail-favorite");
          const saveBtn = el("game-detail-save");
          const favorite = this.isFavorited(selectedGame.id);
          const saved = this.isSaved(selectedGame.id);
          if (favBtn) {
               favBtn.innerHTML = `<span class="material-icons">${favorite ? "favorite" : "favorite_border"}</span> ${favorite ? "favorited" : "favorite"}`;
          }
          if (saveBtn) {
               saveBtn.innerHTML = `<span class="material-icons">${saved ? "bookmark" : "bookmark_border"}</span> ${saved ? "saved" : "save"}`;
          }
          this.renderDetailExtras();
     },

     async toggleFavorite() {
          if (!selectedGame) return;
          const map = this.getStoredMap(VAULT_CONFIG.keys.favorites);
          const next = !map[selectedGame.id];
          if (next) map[selectedGame.id] = { at: Date.now() };
          else delete map[selectedGame.id];
          this.setStoredMap(VAULT_CONFIG.keys.favorites, map);
          this.refreshDetailButtons();
          this.renderQuickSections();
          const auth = getAuthClient();
          if (auth?.saveGameProgress) {
               try {
                    await auth.saveGameProgress(selectedGame.id, { favorite: next, favoriteAt: Date.now() });
               } catch {}
          }
     },

     async markSaved() {
          if (!selectedGame) return;
          const map = this.getStoredMap(VAULT_CONFIG.keys.saved);
          map[selectedGame.id] = { at: Date.now() };
          this.setStoredMap(VAULT_CONFIG.keys.saved, map);
          this.refreshDetailButtons();
          this.renderQuickSections();
          const auth = getAuthClient();
          if (auth?.saveGameProgress) {
               try {
                    await auth.saveGameProgress(selectedGame.id, { saved: true, savedAt: Date.now() });
               } catch {}
          }
     },

     resolveCoverUrl(game) {
          const cover = String(game?.cover || "").trim();
          if (!cover) return "";
          if (cover.includes("{COVER_URL}")) {
               return cover.replace("{COVER_URL}", `${game.sourceBase}/covers@main`);
          }
          if (/^https?:\/\//i.test(cover) || cover.startsWith("data:")) {
               return cover;
          }
          try {
               return new URL(cover, `${game.sourceBase || window.location.origin}/`).href;
          } catch {
               return "";
          }
     },

     closeViewer() {
          const viewer = el("game-viewer");
          const backdrop = el("viewer-backdrop");
          const frame = el("viewer-frame");
          const restore = el("viewer-restore");
          const loader = el("viewer-loading");

          if (!viewer || !backdrop || !frame) return;
          viewer.classList.remove("active", "shrunk");
          if (restore) restore.style.display = "none";
          if (loader) loader.style.display = "none";

          setTimeout(() => {
               frame.srcdoc = "";
               frame.src = "";
               frame.onload = null;
               backdrop.style.display = "none";
               viewer.style.transform = "";
               drag.ox = drag.oy = 0;
          }, 400);
     },

     expandViewer() {
          const viewer = el("game-viewer");
          if (!viewer) return;
          viewer.classList.toggle("expanded");
          if (viewer.classList.contains("expanded")) viewer.style.transform = "";
          el("viewer-frame")?.focus();
     },

     shrinkViewer() {
          const viewer = el("game-viewer");
          if (viewer) {
               viewer.classList.add("shrunk");
               viewer.classList.remove("expanded");
          }
          const restore = el("viewer-restore");
          if (restore) restore.style.display = "block";
     },

     unshrinkViewer() {
          const viewer = el("game-viewer");
          if (viewer) viewer.classList.remove("shrunk");
          const restore = el("viewer-restore");
          if (restore) restore.style.display = "none";
          el("viewer-frame")?.focus();
     },

     applyDisguise() {
          const title = localStorage.getItem(VAULT_CONFIG.keys.disguiseTitle);
          const favicon = localStorage.getItem(VAULT_CONFIG.keys.disguiseFavicon);
          if (title || favicon) {
               this.setDisguise(
                    title || VAULT_CONFIG.defaults.title,
                    favicon || VAULT_CONFIG.defaults.favicon
               );
          }
     },

     setDisguise(title, favicon) {
          if (title) document.title = sanitize(title);
          if (favicon) {
               let link = document.querySelector("link[rel*='icon']");
               if (!link) {
                    link = document.createElement("link");
                    link.rel = "icon";
                    document.head.appendChild(link);
               }
               link.href = favicon;
          }
     },

     buildShell(body, title, favicon) {
          return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${sanitize(title)}</title><link rel="icon" href="${favicon}"><style>body,html{margin:0;padding:0;width:100%;height:100%;overflow:hidden;background:#000;display:flex;align-items:center;justify-content:center}iframe{width:100%;height:100%;border:none}</style></head><body>${body}</body></html>`;
     },

     inject(content, raw, win, title, favicon) {
          const fav = favicon || VAULT_CONFIG.defaults.favicon;
          let html = raw
               ? content
                    .replace(/<title>.*?<\/title>/i, `<title>${sanitize(title)}</title>`)
                    .replace(/<head>/i, `<head><link rel="icon" href="${fav}">`)
               : this.buildShell(content, title, fav);

          if (win) {
               win.document.open();
               win.document.write(html);
               win.document.close();
               win.document.title = sanitize(title);
          } else {
               const frame = el("viewer-frame");
               const backdrop = el("viewer-backdrop");
               if (frame) frame.srcdoc = html;
               if (backdrop) {
                    backdrop.style.display = "flex";
                    setTimeout(() => el("game-viewer")?.classList.add("active"), 10);
               }
          }
     },

     async launch(id) {
          const game = catalog.find((g) => g.id === id);
          if (!game) return this.toast("game not found");

          try {
               this.closeGameDetail();
               this.trackLaunch(game);
               const title = localStorage.getItem(VAULT_CONFIG.keys.disguiseTitle) || VAULT_CONFIG.defaults.title;
               const favicon = localStorage.getItem(VAULT_CONFIG.keys.disguiseFavicon) || VAULT_CONFIG.defaults.favicon;
               const gameUrl = typeof game.url === "string" ? game.url : "";
               if (!gameUrl) return this.toast("game url unavailable");
               const external = gameUrl.includes("://") || gameUrl.startsWith("/");
               let url = external
                    ? gameUrl
                    : gameUrl
                         .replace("{COVER_URL}", `${game.sourceBase}/covers@main`)
                         .replace("{HTML_URL}", `${game.sourceBase}/html@main`);


               if (url.includes("{prefix}")) {
                    const encodedPrefix = encodeURIComponent(window.location.origin);
                    url = url.split("{prefix}").join(encodedPrefix);
               }

               if (game.source === "truffled") {
                    url = this.resolveTruffledLocalLaunchUrl(game, url);
               }

               const launchUrl = this.prepareLaunchUrl(url, external);

               const remoteExternal = /^https?:\/\//i.test(url) || String(url).startsWith("/proxy?url=");

               if (game.source === "truffled" || remoteExternal) {
                    launchMode = "tab";
                    localStorage.setItem(VAULT_CONFIG.keys.launchMode, "tab");
               }

               const effectiveMode = (game.source === "truffled" || remoteExternal) ? "tab" : launchMode;
               if (effectiveMode === "tab") {
                    await this.launchTab(launchUrl, remoteExternal, title, favicon, game);
               } else {
                    await this.launchViewer(launchUrl, external, game.name, title, favicon, game);
               }
          } catch (err) {
               console.error(err);
               const rawFallbackUrl = typeof game?.url === "string" ? game.url : "";
               const normalizedFallbackUrl =
                    game?.source === "truffled"
                         ? this.resolveTruffledLocalLaunchUrl(game, rawFallbackUrl)
                         : rawFallbackUrl;
               const isExternalFallback = normalizedFallbackUrl.includes("://") || normalizedFallbackUrl.startsWith("/");
               if (isExternalFallback) {
                    try {
                         if (game?.source === "truffled" && normalizedFallbackUrl.startsWith("/")) {
                              const target = `${window.location.origin}${normalizedFallbackUrl}`;
                              const win = window.open(target, "_blank");
                              if (win) return;
                         }
                         const browserUrl = `${window.location.origin}/browser?url=${encodeURIComponent(normalizedFallbackUrl)}&popout=1`;
                         const win = window.open("about:blank", "_blank");
                         if (win) {
                              win.location.replace(browserUrl);
                              return;
                         }
                    } catch (fallbackErr) {
                         console.error("fallback launch failed", fallbackErr);
                    }
               }
               this.toast("failed to load game");
          }
     },

     prepareLaunchUrl(url, external) {
          if (!external) return url;
          if (String(url).startsWith("/proxy?url=")) return url;
          if (String(url).startsWith("/")) return url;
          return `/proxy?url=${encodeURIComponent(url)}`;
     },

     async trackLaunch(game) {
          if (!game) return;
          const now = Date.now();
          this.touchRecent(game.id);
          const progressMap = this.getProgressMap();
          const existing = progressMap[game.id] && typeof progressMap[game.id] === "object" ? progressMap[game.id] : {};
          progressMap[game.id] = {
               ...existing,
               lastPlayedAt: now,
               updatedAt: now,
               name: game.name || existing.name || "",
               source: game.source || existing.source || "",
               url: game.url || existing.url || "",
               launches: Number(existing.launches || 0) + 1,
          };
          this.setProgressMap(progressMap);
          this.renderQuickSections();

          const auth = getAuthClient();
          if (!auth?.saveGameProgress) return;
          const payload = {
               launches: 1,
               lastPlayedAt: now,
               name: game.name || "",
               source: game.source || "",
               url: game.url || "",
          };
          try {
               await auth.saveGameProgress(game.id, payload);
          } catch {
          }
     },

     async launchTab(url, useBrowserRoute, title, favicon, game) {
          if (useBrowserRoute) {
               let upstream = String(url || "");
               if (upstream.startsWith("/proxy?url=")) {
                    try {
                         const parsed = new URL(upstream, window.location.origin);
                         const inner = parsed.searchParams.get("url");
                         if (inner) upstream = inner;
                    } catch {}
               }
               const browserUrl = `${window.location.origin}/browser?url=${encodeURIComponent(upstream)}&popout=1`;
               const win = window.open("about:blank", "_blank");
               if (!win) return this.toast("popups blocked — allow popups and try again");
               const loadingShell = `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${sanitize(game?.name || "loading")}</title><style>html,body{margin:0;height:100%;background:#000;overflow:hidden;font-family:Arial,sans-serif}#load{position:fixed;inset:0;display:grid;place-items:center;gap:12px;color:#fff;letter-spacing:.08em;text-transform:lowercase;font-size:12px}#ring{width:56px;height:56px;border-radius:999px;border:3px solid rgba(255,255,255,.2);border-top-color:#fff;animation:s .9s linear infinite}@keyframes s{to{transform:rotate(360deg)}}</style></head><body><div id="load"><div id="ring"></div><div>loading game...</div></div><script>setTimeout(function(){location.replace(${JSON.stringify(browserUrl)});},120);</script></body></html>`;
               win.document.open();
               win.document.write(loadingShell);
               win.document.close();
               return;
          }

          if (String(url || "").startsWith("/")) {
               const target = `${window.location.origin}${url}`;
               const win = window.open(target, "_blank");
               if (!win) return this.toast("popups blocked — allow popups and try again");
               return;
          }

          const win = window.open("about:blank", "_blank");
          if (!win) return this.toast("popups blocked — allow popups and try again");
          const html = await fetch(url).then((r) => r.text());
          this.inject(html, true, win, title, favicon);
     },

     async launchViewer(url, external, name, title, favicon, game) {
          const label = el("viewer-label");
          if (label) label.textContent = name.toUpperCase();
          const loader = el("viewer-loading");

          if (external) {
               const frame = el("viewer-frame");
               const backdrop = el("viewer-backdrop");
               if (loader) loader.style.display = "grid";
               if (frame) {
                    frame.onload = () => { if (loader) loader.style.display = "none"; };
                    frame.src = url;
               }
               if (backdrop) backdrop.style.display = "flex";
               setTimeout(() => el("game-viewer")?.classList.add("active"), 10);
          } else {
               if (loader) loader.style.display = "grid";
               const html = await fetch(url).then((r) => r.text());
               this.inject(html, true, null, title, favicon);
               if (loader) loader.style.display = "none";
          }
     },

     toast(message) {
          const t = document.createElement("div");
          t.className = "rift-toast";
          t.textContent = message;
          document.body.appendChild(t);
          setTimeout(() => t.remove(), 5000);
     },
};

document.addEventListener("DOMContentLoaded", () => {
     if (!document.body || !document.body.classList.contains("games-page")) return;
     RiftVault.boot();
});

