const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
const outputDir = path.join(rootDir, '.amplify-hosting');
const staticDir = path.join(outputDir, 'static');
const computeDir = path.join(outputDir, 'compute', 'default');
const computeBundleLimitBytes = 220 * 1024 * 1024;

const bundleEntries = [
    'server.js',
    'package.json',
    'package-lock.json',
    'truffled.g.json',
    'assets',
    'components',
    'data',
    'node_modules',
    'public',
    'server',
];

function ensureParentDir(filePath) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function copyEntry(relativePath) {
    const sourcePath = path.join(rootDir, relativePath);

    if (!fs.existsSync(sourcePath)) {
        return;
    }

    const targetPath = path.join(computeDir, relativePath);
    ensureParentDir(targetPath);
    fs.cpSync(sourcePath, targetPath, {
        dereference: true,
        force: true,
        recursive: true,
    });
}

function getDirectorySizeBytes(dirPath) {
    let total = 0;

    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const entryPath = path.join(dirPath, entry.name);

        if (entry.isDirectory()) {
            total += getDirectorySizeBytes(entryPath);
            continue;
        }

        if (entry.isFile()) {
            total += fs.statSync(entryPath).size;
        }
    }

    return total;
}

function writeManifest() {
    const manifest = {
        version: 1,
        routes: [
            {
                path: '/*',
                target: {
                    kind: 'Compute',
                    src: 'default',
                },
            },
        ],
        computeResources: [
            {
                name: 'default',
                runtime: 'nodejs22.x',
                entrypoint: 'server.js',
            },
        ],
    };

    fs.writeFileSync(
        path.join(outputDir, 'deploy-manifest.json'),
        `${JSON.stringify(manifest, null, 2)}\n`
    );
}

fs.rmSync(outputDir, { force: true, recursive: true });
fs.mkdirSync(staticDir, { recursive: true });
fs.mkdirSync(computeDir, { recursive: true });

for (const entry of bundleEntries) {
    copyEntry(entry);
}

writeManifest();

const computeBundleSize = getDirectorySizeBytes(computeDir);
if (computeBundleSize > computeBundleLimitBytes) {
    throw new Error(
        `Amplify compute bundle is ${computeBundleSize} bytes, which exceeds the 220 MB limit.`
    );
}

console.log(`Amplify bundle created at ${outputDir}`);
console.log(`Compute bundle size: ${computeBundleSize} bytes`);
