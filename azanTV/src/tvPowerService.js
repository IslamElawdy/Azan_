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

    function isStandbyApiAvailable() {
        try {
            return typeof webapis !== 'undefined' &&
                webapis.remotepower &&
                typeof webapis.remotepower.powerOff === 'function';
        } catch (e) {
            return false;
        }
    }

    function attemptConsumerStandby() {
        try {
            if (isStandbyApiAvailable()) {
                webapis.remotepower.powerOff();
                return true;
            }
        } catch (e) {
            console.warn('Consumer standby API not available:', e);
        }
        return false;
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

    function finishAfterAzan(settings) {
        var delay = (settings && settings.exitDelaySeconds) || 10;
        setTimeout(function () {
            restoreScreenSaver();
            if (settings && settings.tryStandbyAfterAzan && attemptConsumerStandby()) {
                return;
            }
            hideApp();
            setTimeout(function () {
                try {
                    if (typeof tizen !== 'undefined' && tizen.application) {
                        tizen.application.getCurrentApplication().exit();
                    }
                } catch (e) {
                    console.warn('exit after hide failed:', e);
                }
            }, 500);
        }, delay * 1000);
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

    function getPowerCapabilityText() {
        if (isStandbyApiAvailable()) {
            return 'Standby-API erkannt (selten auf Consumer-TVs).';
        }
        return 'Automatisches TV-Ausschalten ist auf Consumer-Samsung-TVs nicht verfuegbar. ' +
            'isAzan beendet die App; der Fernseher bleibt an oder kehrt zum vorherigen Bild zurueck. ' +
            'Aufwecken aus Standby: Tizen-Alarm + Instant On aktivieren.';
    }

    return {
        disableScreenSaver: disableScreenSaver,
        restoreScreenSaver: restoreScreenSaver,
        exitApp: exitApp,
        hideApp: hideApp,
        finishAfterAzan: finishAfterAzan,
        getPowerCapabilityText: getPowerCapabilityText,
        registerVisibilityHandler: registerVisibilityHandler
    };
}());
