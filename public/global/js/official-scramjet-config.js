(function () {
    function getWispUrl() {
        const protocol = self.location.protocol === "https:" ? "wss:" : "ws:";
        return `${protocol}//${self.location.host}/wisp/`;
    }

    function createRiftScramjetConfig() {
        return {
            wisp: getWispUrl(),
            prefix: "/sj2/",
            codec: self.__scramjet$codecs?.plain || {
                encode: (url) => {
                    if (!url) return url;
                    return encodeURIComponent(url);
                },
                decode: (url) => {
                    if (!url) return url;
                    return decodeURIComponent(url);
                },
            },
            config: "/scramjet/scramjet.config.js",
            bundle: "/scramjet/scramjet.bundle.js",
            worker: "/scramjet/scramjet.worker.js",
            client: "/scramjet/scramjet.client.js",
            codecs: "/scramjet/scramjet.codecs.js",
            flags: {
                serviceworkers: false,
                syncxhr: false,
                strictRewrites: true,
                rewriterLogs: false,
                captureErrors: true,
                cleanErrors: false,
                scramitize: false,
                sourcemaps: true,
                destructureRewrites: false,
                interceptDownloads: false,
                allowInvalidJs: true,
                allowFailedIntercepts: true,
            },
            siteFlags: {},
        };
    }

    self.__createRiftScramjetConfig = createRiftScramjetConfig;
    self.__scramjet$config = createRiftScramjetConfig();
})();
