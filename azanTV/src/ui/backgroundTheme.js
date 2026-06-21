/*global tizen, document */
/* exported BackgroundTheme */
var BackgroundTheme = (function () {
    'use strict';

    var BG_RELATIVE = 'assets/backgrounds/masjid-evening.jpg';
    var resolvedUri = null;

    function getTizen() {
        if (typeof tizen === 'undefined') {
            return null;
        }
        return tizen;
    }
    function toFileUri(path) {
        path = String(path).replace(/\\/g, '/');
        if (path.indexOf('file://') === 0) {
            return path;
        }
        if (path.charAt(0) !== '/') {
            path = '/' + path;
        }
        return 'file://' + path;
    }

    function resolveBackgroundUri() {
        if (resolvedUri) {
            return resolvedUri;
        }
        try {
            var api = getTizen();
            if (api && api.application && api.filesystem) {
                var base = api.application.getCurrentApplication().appInfo.path;
                if (base) {
                    var sep = base.charAt(base.length - 1) === '/' ? '' : '/';
                    var abs = api.filesystem.resolve(base + sep + BG_RELATIVE, 'r');                    resolvedUri = toFileUri(abs);
                    return resolvedUri;
                }
            }
        } catch (e) {
            console.warn('Background resolve failed:', e);
        }
        resolvedUri = BG_RELATIVE;
        return resolvedUri;
    }

    function paintBackground(el) {
        if (!el) {
            return;
        }
        var uri = resolveBackgroundUri();
        el.style.backgroundImage = 'url("' + uri + '")';
        el.style.backgroundRepeat = 'no-repeat';
        el.style.backgroundPosition = 'center center';
        el.style.backgroundSize = 'cover';
    }

    function apply(themeName, layerId) {
        var layer = document.getElementById(layerId || 'bg-layer');
        if (!layer) {
            return;
        }
        layer.className = 'bg-layer has-photo ' + (themeName || 'theme-default');
        paintBackground(layer);
    }

    function applyForPrayer() {
        document.body.classList.add('prayer-active');
        apply('theme-prayer');
        paintBackground(document.getElementById('prayer-backdrop'));
    }

    function applyForSettings() {
        document.body.classList.remove('prayer-active');
        apply('theme-default');
    }

    function clearPrayerMode() {
        document.body.classList.remove('prayer-active');
    }

    return {
        apply: apply,
        applyForPrayer: applyForPrayer,
        applyForSettings: applyForSettings,
        clearPrayerMode: clearPrayerMode,
        paintBackground: paintBackground
    };
}());
