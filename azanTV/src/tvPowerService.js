/*global tizen, webapis, document */
/* exported TvPowerService */
var TvPowerService = (function () {
    'use strict';

    function disableScreenSaver() {
        try {
            if (typeof webapis !== 'undefined' && webapis.appcommon) {
                webapis.appcommon.setScreenSaver(
                    webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF,
                    function () {},
                    function () {}
                );
            }
        } catch (e) {
            console.warn('Screen saver disable failed:', e);
        }
    }

    function restoreScreenSaver() {
        try {
            if (typeof webapis !== 'undefined' && webapis.appcommon) {
                webapis.appcommon.setScreenSaver(
                    webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_ON,
                    function () {},
                    function () {}
                );
            }
        } catch (e) {
            console.warn('Screen saver restore failed:', e);
        }
    }

    function exitApp(delaySeconds) {
        var delay = (delaySeconds || 0) * 1000;
        setTimeout(function () {
            restoreScreenSaver();
            try {
                if (typeof tizen !== 'undefined' && tizen.application) {
                    tizen.application.getCurrentApplication().exit();
                    return;
                }
            } catch (e) {
                console.warn('exit failed:', e);
            }
            console.log('App exit requested (non-Tizen environment)');
        }, delay);
    }

    function hideApp() {
        try {
            if (typeof tizen !== 'undefined' && tizen.application) {
                tizen.application.getCurrentApplication().hide();
            }
        } catch (e) {
            console.warn('hide failed:', e);
        }
    }

    function registerVisibilityHandler(onVisible, onHidden) {
        document.addEventListener('visibilitychange', function () {
            if (document.hidden) {
                if (onHidden) {
                    onHidden();
                }
            } else if (onVisible) {
                onVisible();
            }
        });
    }

    return {
        disableScreenSaver: disableScreenSaver,
        restoreScreenSaver: restoreScreenSaver,
        exitApp: exitApp,
        hideApp: hideApp,
        registerVisibilityHandler: registerVisibilityHandler
    };
}());
