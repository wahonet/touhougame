(function bootModuleApp() {
    if (window.__VB_TOUHOU_BOOTED__) return;
    window.__VB_TOUHOU_BOOTED__ = true;

    var script = document.createElement('script');
    script.type = 'module';
    script.src = 'js/app.js?v=' + Date.now();
    document.head.appendChild(script);
})();
