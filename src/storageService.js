var StorageService = (function () {
    'use strict';

    var STORAGE_KEY = 'azantv_settings_v1';
    var ALARM_KEY = 'azantv_alarm_state_v1';
    var LAST_CALC_KEY = 'azantv_last_calc_day_v1';

    var DEFAULT_SETTINGS = {
        city: 'berlin',
        latitude: 52.52,
        longitude: 13.405,
        timezone: 'Europe/Berlin',
        calculationMethod: 'MuslimWorldLeague',
        madhab: 'Shafi',
        audioVariant: 'makkah',
        fajrAudio: 'same',
        volume: 80,
        exitDelaySeconds: 10,
        enabledPrayers: {
            fajr: true,
            dhuhr: true,
            asr: true,
            maghrib: true,
            isha: true
        },
        offsets: {
            fajr: 0,
            dhuhr: 0,
            asr: 0,
            maghrib: 0,
            isha: 0
        },
        useOnlineApi: false
    };

    var CITY_PRESETS = {
        berlin: { latitude: 52.52, longitude: 13.405, timezone: 'Europe/Berlin' },
        munich: { latitude: 48.1351, longitude: 11.582, timezone: 'Europe/Berlin' },
        hamburg: { latitude: 53.5511, longitude: 9.9937, timezone: 'Europe/Berlin' }
    };

    function readJson(key, fallback) {
        try {
            var raw = localStorage.getItem(key);
            if (!raw) {
                return fallback;
            }
            return JSON.parse(raw);
        } catch (e) {
            return fallback;
        }
    }

    function writeJson(key, value) {
        localStorage.setItem(key, JSON.stringify(value));
    }

    function getSettings() {
        var stored = readJson(STORAGE_KEY, null);
        if (!stored) {
            return clone(DEFAULT_SETTINGS);
        }
        return mergeDeep(clone(DEFAULT_SETTINGS), stored);
    }

    function saveSettings(settings) {
        writeJson(STORAGE_KEY, settings);
    }

    function getAlarmState() {
        return readJson(ALARM_KEY, { scheduledAlarmId: null, nextPrayer: null, nextTime: null });
    }

    function saveAlarmState(state) {
        writeJson(ALARM_KEY, state);
    }

    function getLastCalcDay() {
        return localStorage.getItem(LAST_CALC_KEY) || '';
    }

    function setLastCalcDay(dayKey) {
        localStorage.setItem(LAST_CALC_KEY, dayKey);
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function mergeDeep(target, source) {
        Object.keys(source).forEach(function (key) {
            if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
                if (!target[key]) {
                    target[key] = {};
                }
                mergeDeep(target[key], source[key]);
            } else {
                target[key] = source[key];
            }
        });
        return target;
    }

    function applyCityPreset(settings) {
        var preset = CITY_PRESETS[settings.city];
        if (preset) {
            settings.latitude = preset.latitude;
            settings.longitude = preset.longitude;
            settings.timezone = preset.timezone;
        }
        return settings;
    }

    function dayKey(date) {
        var d = date || new Date();
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    return {
        DEFAULT_SETTINGS: DEFAULT_SETTINGS,
        CITY_PRESETS: CITY_PRESETS,
        getSettings: getSettings,
        saveSettings: saveSettings,
        getAlarmState: getAlarmState,
        saveAlarmState: saveAlarmState,
        getLastCalcDay: getLastCalcDay,
        setLastCalcDay: setLastCalcDay,
        applyCityPreset: applyCityPreset,
        dayKey: dayKey
    };
}());
