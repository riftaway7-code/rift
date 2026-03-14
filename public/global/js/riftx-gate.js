(function () {
    // Placeholder gate hook so pages that include this file do not 404 on deploy.
    if (window.RiftXGate) return;
    window.RiftXGate = {
        enabled: false,
        reason: 'stub',
    };
})();
