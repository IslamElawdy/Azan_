/* exported StorageService */
var StorageService = (function () {
    'use strict';

    var STORAGE_KEY = 'azantv_settings_v1';
    var ALARM_KEY = 'azantv_alarm_state_v1';
    var LAST_CALC_KEY = 'azantv_last_calc_day_v1';

    var AUDIO_VARIANTS = {
        makkah: { file: 'makkah.mp3', label: 'Makkah' },
        madinah: { file: 'madinah.mp3', label: 'Madinah' },
        egypt: { file: 'Adhan-Egypt.mp3', label: 'Adhan Egypt' },
        abdulbasit: { file: 'Abdul-Basit.mp3', label: 'Abdul Basit' },
        fajr: { file: 'fajr.mp3', label: 'Fajr' }
    };

    var DEFAULT_SETTINGS = {
        city: 'berlin',
        latitude: 52.52,
        longitude: 13.405,
        timezone: 'Europe/Berlin',
        calculationMethod: 'Turkey',
        madhab: 'Shafi',
        audioVariant: 'abdulbasit',
        fajrAudio: 'same',
        volume: 80,
        exitDelaySeconds: 10,
        tryStandbyAfterAzan: false,
        companionUrl: '',
        enabledPrayers: {
            fajr: true,
            dhuhr: true,
            asr: true,
            maghrib: true,
            isha: true
        },
        offsets: {
            fajr: -22,
            dhuhr: 2,
            asr: -2,
            maghrib: -8,
            isha: 16
        },
        useOnlineApi: false,
        settingsVersion: 2
    };

    var GERMANY_OFFSETS = {
        fajr: -22,
        dhuhr: 2,
        asr: -2,
        maghrib: -8,
        isha: 16
    };

    var CITY_PRESETS = {
        berlin: {
            latitude: 52.52,
            longitude: 13.405,
            timezone: 'Europe/Berlin',
            calculationMethod: 'Turkey',
            madhab: 'Shafi',
            offsets: GERMANY_OFFSETS
        },
        munich: {
            latitude: 48.1351,
            longitude: 11.582,
            timezone: 'Europe/Berlin',
            calculationMethod: 'Turkey',
            madhab: 'Shafi',
            offsets: GERMANY_OFFSETS
        },
        hamburg: {
            latitude: 53.5511,
            longitude: 9.9937,
            timezone: 'Europe/Berlin',
            calculationMethod: 'Turkey',
            madhab: 'Shafi',
            offsets: GERMANY_OFFSETS
        }
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
        var settings;
        if (!stored) {
            settings = clone(DEFAULT_SETTINGS);
        } else {
            settings = mergeDeep(clone(DEFAULT_SETTINGS), stored);
        }
        if (settings.city !== 'custom') {
            settings = applyCityPreset(settings);
        }
        if (!settings.settingsVersion || settings.settingsVersion < 2) {
            if (settings.city === 'custom' && settings.timezone === 'Europe/Berlin') {
                settings.calculationMethod = 'Turkey';
                settings.offsets = JSON.parse(JSON.stringify(GERMANY_OFFSETS));
            }
            settings.settingsVersion = 2;
            writeJson(STORAGE_KEY, settings);
        }
        return settings;
    }

    function saveSettings(settings) {
        writeJson(STORAGE_KEY, settings);
    }

    function getAlarmState() {
        return readJson(ALARM_KEY, { scheduledAlarmId: null, nextPrayer: null, nextTime: null, isTest: false });
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
            if (preset.calculationMethod) {
                settings.calculationMethod = preset.calculationMethod;
            }
            if (preset.madhab) {
                settings.madhab = preset.madhab;
            }
            if (preset.offsets) {
                settings.offsets = JSON.parse(JSON.stringify(preset.offsets));
            }
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
        AUDIO_VARIANTS: AUDIO_VARIANTS,
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
