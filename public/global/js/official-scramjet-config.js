(function () {
    function getWispUrl() {
        const protocol = self.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${self.location.host}/wisp/`;
    }

    function createRiftScramjetConfig() {
        return {
            wisp: getWispUrl(),
            prefix: "/sj2/",
            globals: {
                wrapfn: "$scramjet$wrap",
                wrappropertybase: "$scramjet__",
                wrappropertyfn: "$scramjet$prop",
                cleanrestfn: "$scramjet$clean",
                importfn: "$scramjet$import",
                rewritefn: "$scramjet$rewrite",
                metafn: "$scramjet$meta",
                setrealmfn: "$scramjet$setrealm",
                pushsourcemapfn: "$scramjet$pushsourcemap",
                trysetfn: "$scramjet$tryset",
                templocid: "$scramjet$temploc",
                tempunusedid: "$scramjet$tempunused",
            },
            files: {
                wasm: "/scramjet/scramjet.wasm.wasm",
                all: "/scramjet/scramjet.all.js",
                sync: "/scramjet/scramjet.sync.js",
            },
            flags: {
                serviceworkers: false,
                syncxhr: false,
                strictRewrites: true,
                rewriterLogs: false,
                captureErrors: true,
                cleanErrors: false,
                scramitize: false,
                sourcemaps: false,
                destructureRewrites: false,
                interceptDownloads: false,
                allowInvalidJs: true,
                allowFailedIntercepts: true,
            },
            siteFlags: {},
            codec: {
                encode: (url) => {
                    if (!url) return url;
                    return encodeURIComponent(url);
                },
                decode: (url) => {
                    if (!url) return url;
                    return decodeURIComponent(url);
                },
            },
        };
    }

    self.__createRiftScramjetConfig = createRiftScramjetConfig;
    self.__scramjet$config = createRiftScramjetConfig();
})();
