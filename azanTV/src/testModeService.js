/*global AlarmService, AudioService, TvPowerService */
/* exported TestModeService */
var TestModeService = (function () {
    'use strict';

    function scheduleAzanIn30Seconds(settings, onScheduled) {
        AlarmService.scheduleRelativeSeconds(30, 'dhuhr');
        if (onScheduled) {
            onScheduled('Test-Alarm in 30 Sekunden geplant (Dhuhr)');
        }
    }

    function scheduleFakePrayerIn1Minute(settings, onScheduled) {
        AlarmService.scheduleRelativeSeconds(60, 'maghrib');
        if (onScheduled) {
            onScheduled('Test-Alarm in 1 Minute geplant (Maghrib)');
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
        scheduleAzanIn30Seconds: scheduleAzanIn30Seconds,
        scheduleFakePrayerIn1Minute: scheduleFakePrayerIn1Minute,
        playImmediateTest: playImmediateTest
    };
}());
