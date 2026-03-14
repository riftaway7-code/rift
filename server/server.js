const app = require('./server (1).js');
const { startRiftServer } = require('./start-server');

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    startRiftServer(app, { port: PORT });
}

module.exports = app;
