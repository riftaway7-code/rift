const app = require('./server (1).js');

const PORT = process.env.PORT || 3000;

if (require.main === module) {
    app.listen(PORT, () => {
        console.log(`Rift running on http://localhost:${PORT}`);
    });
}

module.exports = app;
