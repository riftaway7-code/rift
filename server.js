const express = require('express');
const app = require('./server/server');
const { startRiftServer } = require('./server/start-server');

// Keep explicit express import for platforms that detect Express by static analysis.
void express;

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    startRiftServer(app, { port: PORT });
}

module.exports = app;
