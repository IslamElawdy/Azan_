var AlarmService = (function () {
    'use strict';

    var APP_ID = 'com.private.azantv';
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

    function parsePayloadFromLaunch() {
        try {
            var app = tizen.application.getCurrentApplication();
            var req = app.getRequestedAppControl();
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
            nextTime: null
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
        if (state.scheduledAlarmId === 'dev-mode') {
            return new Date(state.nextTime).getTime() > Date.now();
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

    function scheduleAt(date, prayerKey) {
        if (!isAvailable()) {
            console.warn('Alarm API not available (browser/dev mode)');
            StorageService.saveAlarmState({
                scheduledAlarmId: 'dev-mode',
                nextPrayer: prayerKey,
                nextTime: date.toISOString()
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
            nextTime: date.toISOString()
        });

        return alarm.id;
    }

    function scheduleNextPrayer(settings) {
        var next = PrayerTimeService.getNextPrayer(settings);
        if (!next) {
            clearStoredAlarmState();
            return null;
        }
        scheduleAt(next.time, next.key);
        return next;
    }

    function scheduleRelativeSeconds(seconds, prayerKey) {
        var date = new Date(Date.now() + seconds * 1000);
        return scheduleAt(date, prayerKey || 'dhuhr');
    }

    function getStatusText() {
        var state = StorageService.getAlarmState();
        if (!state.nextPrayer || !state.nextTime) {
            return 'Kein Alarm geplant';
        }
        var when = new Date(state.nextTime);
        return 'Geplant: ' + PrayerTimeService.PRAYER_LABELS[state.nextPrayer] +
            ' um ' + PrayerTimeService.formatTime(when) +
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
        if (!isStoredAlarmValid(state)) {
            return scheduleNextPrayer(settings);
        }

        removeDuplicateAzanAlarms(state.scheduledAlarmId);

        var scheduled = new Date(state.nextTime);
        var drift = Math.abs(scheduled.getTime() - next.time.getTime());
        if (drift > 60000 || state.nextPrayer !== next.key || scheduled.getTime() <= Date.now()) {
            return scheduleNextPrayer(settings);
        }

        return next;
    }

    return {
        OPERATION: OPERATION,
        isAvailable: isAvailable,
        parsePayloadFromLaunch: parsePayloadFromLaunch,
        scheduleNextPrayer: scheduleNextPrayer,
        scheduleAt: scheduleAt,
        scheduleRelativeSeconds: scheduleRelativeSeconds,
        removeAllAlarms: clearStoredAlarmState,
        getStatusText: getStatusText,
        syncOnStartup: syncOnStartup
    };
}());
