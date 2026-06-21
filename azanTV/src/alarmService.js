/*global StorageService, PrayerTimeService, tizen */
/* exported AlarmService */
var AlarmService = (function () {
    'use strict';

    var APP_ID = 'GfnCKw2I8W.AzanTV';
    var OPERATION = 'http://tizen.org/appcontrol/operation/azan/pray';

    function isAvailable() {
        return typeof tizen !== 'undefined' && tizen.alarm && tizen.application;
    }

    function getAppId() {
        try {
            return tizen.application.getCurrentApplication().appInfo.id;
        } catch (e) {
            return APP_ID;
        }
    }

    function buildAppControl(prayerKey, timestamp) {
        var payload = JSON.stringify({ prayer: prayerKey, timestamp: timestamp });
        return new tizen.ApplicationControl(
            OPERATION,
            null,
            null,
            [{ key: 'payload', value: [payload] }]
        );
    }

    function parsePayloadFromAppControl(req) {
        try {
            if (!req || !req.appControl) {
                return null;
            }
            var control = req.appControl;
            if (control.operation !== OPERATION) {
                return null;
            }
            var data = control.data;
            if (!data || !data.length) {
                return null;
            }
            for (var i = 0; i < data.length; i++) {
                if (data[i].key === 'payload' && data[i].value && data[i].value.length) {
                    return JSON.parse(data[i].value[0]);
                }
            }
        } catch (e) {
            console.warn('Alarm payload parse failed:', e);
        }
        return null;
    }

    function parsePayloadFromLaunch() {
        try {
            var app = tizen.application.getCurrentApplication();
            return parsePayloadFromAppControl(app.getRequestedAppControl());
        } catch (e) {
            console.warn('Launch payload parse failed:', e);
        }
        return null;
    }

    function removeAlarmById(alarmId) {
        if (!isAvailable() || !alarmId || alarmId === 'dev-mode') {
            return;
        }
        try {
            tizen.alarm.remove(alarmId);
        } catch (e) {
            console.warn('remove alarm failed:', e);
        }
    }

    function clearStoredAlarmState() {
        var state = StorageService.getAlarmState();
        removeAlarmById(state.scheduledAlarmId);
        StorageService.saveAlarmState({
            scheduledAlarmId: null,
            nextPrayer: null,
            nextTime: null,
            isTest: false
        });
    }

    function isOurAlarm(alarm) {
        try {
            if (!alarm || !alarm.appControl) {
                return false;
            }
            return alarm.appControl.operation === OPERATION;
        } catch (e) {
            return false;
        }
    }

    function removeDuplicateAzanAlarms(keepId) {
        if (!isAvailable()) {
            return;
        }
        try {
            tizen.alarm.getAll().forEach(function (alarm) {
                if (!isOurAlarm(alarm)) {
                    return;
                }
                if (keepId && alarm.id === keepId) {
                    return;
                }
                removeAlarmById(alarm.id);
            });
        } catch (e) {
            console.warn('getAll failed:', e);
        }
    }

    function isStoredAlarmValid(state) {
        if (!state || !state.scheduledAlarmId || !state.nextTime || !state.nextPrayer) {
            return false;
        }
        if (new Date(state.nextTime).getTime() <= Date.now()) {
            return false;
        }
        if (state.scheduledAlarmId === 'dev-mode') {
            return true;
        }
        if (!isAvailable()) {
            return false;
        }
        try {
            return tizen.alarm.getAll().some(function (alarm) {
                return alarm.id === state.scheduledAlarmId;
            });
        } catch (e) {
            return false;
        }
    }

    function storedAlarmAsNext(state) {
        return {
            key: state.nextPrayer,
            label: PrayerTimeService.PRAYER_LABELS[state.nextPrayer] || state.nextPrayer,
            time: new Date(state.nextTime),
            isTest: !!state.isTest
        };
    }

    function scheduleAt(date, prayerKey, options) {
        options = options || {};

        if (!isAvailable()) {
            console.warn('Alarm API not available (browser/dev mode)');
            StorageService.saveAlarmState({
                scheduledAlarmId: 'dev-mode',
                nextPrayer: prayerKey,
                nextTime: date.toISOString(),
                isTest: !!options.isTest
            });
            return 'dev-mode';
        }

        var previous = StorageService.getAlarmState();
        removeAlarmById(previous.scheduledAlarmId);
        removeDuplicateAzanAlarms(null);

        var alarm = new tizen.AlarmAbsolute(date);
        var appControl = buildAppControl(prayerKey, date.getTime());
        var appId = getAppId();

        tizen.alarm.add(alarm, appId, appControl);

        StorageService.saveAlarmState({
            scheduledAlarmId: alarm.id,
            nextPrayer: prayerKey,
            nextTime: date.toISOString(),
            isTest: !!options.isTest
        });

        return alarm.id;
    }

    function scheduleNextPrayer(settings) {
        var next = PrayerTimeService.getNextPrayer(settings);
        if (!next) {
            clearStoredAlarmState();
            return null;
        }
        scheduleAt(next.time, next.key, { isTest: false });
        return next;
    }

    function scheduleRelativeSeconds(seconds, prayerKey, options) {
        var opts = options || {};
        if (opts.isTest === undefined) {
            opts.isTest = true;
        }
        var date = new Date(Date.now() + seconds * 1000);
        scheduleAt(date, prayerKey || 'dhuhr', opts);
        return date;
    }

    function getStatusText() {
        var state = StorageService.getAlarmState();
        if (!state.nextPrayer || !state.nextTime) {
            return 'Kein Alarm geplant';
        }
        var when = new Date(state.nextTime);
        var tz = StorageService.getSettings().timezone || 'Europe/Berlin';
        var prefix = state.isTest ? 'Test' : 'Geplant';
        return prefix + ': ' + PrayerTimeService.PRAYER_LABELS[state.nextPrayer] +
            ' um ' + PrayerTimeService.formatTime(when, tz) +
            ' (ID: ' + (state.scheduledAlarmId || '—') + ')';
    }

    function syncOnStartup(settings) {
        var next = PrayerTimeService.getNextPrayer(settings);
        if (!next) {
            clearStoredAlarmState();
            return null;
        }

        if (!isAvailable()) {
            return scheduleNextPrayer(settings);
        }

        var state = StorageService.getAlarmState();
        if (isStoredAlarmValid(state)) {
            if (state.isTest) {
                return storedAlarmAsNext(state);
            }

            removeDuplicateAzanAlarms(state.scheduledAlarmId);

            var scheduled = new Date(state.nextTime);
            var drift = Math.abs(scheduled.getTime() - next.time.getTime());
            if (drift <= 60000 && state.nextPrayer === next.key) {
                return next;
            }
        }

        return scheduleNextPrayer(settings);
    }

    function markAlarmHandled() {
        var state = StorageService.getAlarmState();
        if (state.isTest) {
            clearStoredAlarmState();
            return;
        }
        StorageService.saveAlarmState({
            scheduledAlarmId: null,
            nextPrayer: state.nextPrayer,
            nextTime: state.nextTime,
            isTest: false
        });
    }

    return {
        OPERATION: OPERATION,
        isAvailable: isAvailable,
        parsePayloadFromLaunch: parsePayloadFromLaunch,
        parsePayloadFromAppControl: parsePayloadFromAppControl,
        scheduleNextPrayer: scheduleNextPrayer,
        scheduleAt: scheduleAt,
        scheduleRelativeSeconds: scheduleRelativeSeconds,
        removeAllAlarms: clearStoredAlarmState,
        getStatusText: getStatusText,
        syncOnStartup: syncOnStartup,
        markAlarmHandled: markAlarmHandled
    };
}());
