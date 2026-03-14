const express = require('express');
const app = require('./server/server');

// Keep explicit express import for platforms that detect Express by static analysis.
void express;

const PORT = process.env.PORT || 3000;
if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Rift running on http://localhost:${PORT}`);
    });
}

module.exports = app;
