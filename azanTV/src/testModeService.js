/*global AlarmService, AudioService, TvPowerService */
/* exported TestModeService */
var TestModeService = (function () {
    'use strict';

    var foregroundTimer = null;
    var onPrayerTrigger = null;
    var handlingPrayer = false;

    function init(triggerCallback) {
        onPrayerTrigger = triggerCallback;
    }

    function clearForegroundTimer() {
        if (foregroundTimer) {
            clearTimeout(foregroundTimer);
            foregroundTimer = null;
        }
    }

    function scheduleForegroundFallback(seconds, prayerKey) {
        clearForegroundTimer();
        foregroundTimer = setTimeout(function () {
            foregroundTimer = null;
            if (handlingPrayer || !onPrayerTrigger) {
                return;
            }
            onPrayerTrigger(prayerKey, { source: 'foreground-timer' });
        }, seconds * 1000);
    }

    function setHandlingPrayer(active) {
        handlingPrayer = !!active;
        if (active) {
            clearForegroundTimer();
        }
    }

    function scheduleAzanIn30Seconds(settings, onScheduled) {
        AlarmService.scheduleRelativeSeconds(30, 'dhuhr', { isTest: true });
        scheduleForegroundFallback(30, 'dhuhr');
        if (onScheduled) {
            onScheduled('Test-Alarm in 30 Sekunden geplant (Dhuhr). App offen lassen oder TV in Standby testen.');
        }
    }

    function scheduleFakePrayerIn1Minute(settings, onScheduled) {
        AlarmService.scheduleRelativeSeconds(60, 'maghrib', { isTest: true });
        scheduleForegroundFallback(60, 'maghrib');
        if (onScheduled) {
            onScheduled('Test-Alarm in 1 Minute geplant (Maghrib). Fuer Standby-Test: jetzt TV ausschalten.');
        }
    }

    function scheduleStandbyTest(settings, onScheduled) {
        AlarmService.scheduleRelativeSeconds(90, 'isha', { isTest: true });
        scheduleForegroundFallback(90, 'isha');
        if (onScheduled) {
            onScheduled('Standby-Test in 90 Sekunden. Jetzt Fernbedienung: Power (Instant On muss aktiv sein).');
        }
    }

    function playImmediateTest(settings, callbacks) {
        if (callbacks && callbacks.onStart) {
            callbacks.onStart('dhuhr');
        }
        TvPowerService.disableScreenSaver();
        return AudioService.playAzan('dhuhr', settings).then(function () {
            if (callbacks && callbacks.onComplete) {
                callbacks.onComplete();
            }
        }).catch(function (err) {
            if (callbacks && callbacks.onError) {
                callbacks.onError(err);
            }
        });
    }

    return {
        init: init,
        setHandlingPrayer: setHandlingPrayer,
        clearForegroundTimer: clearForegroundTimer,
        scheduleAzanIn30Seconds: scheduleAzanIn30Seconds,
        scheduleFakePrayerIn1Minute: scheduleFakePrayerIn1Minute,
        scheduleStandbyTest: scheduleStandbyTest,
        playImmediateTest: playImmediateTest
    };
}());
