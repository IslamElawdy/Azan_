/*global adhan, StorageService */
/* exported PrayerTimeService */
var PrayerTimeService = (function () {
    'use strict';

    var PRAYER_KEYS = ['fajr', 'dhuhr', 'asr', 'maghrib', 'isha'];
    var PRAYER_LABELS = {
        fajr: 'Fajr',
        dhuhr: 'Dhuhr',
        asr: 'Asr',
        maghrib: 'Maghrib',
        isha: 'Isha'
    };

    var ADHAN_PRAYER_MAP = {
        fajr: 'fajr',
        dhuhr: 'dhuhr',
        asr: 'asr',
        maghrib: 'maghrib',
        isha: 'isha'
    };

    function getMethodFactory(methodName) {
        if (typeof adhan === 'undefined' || !adhan.CalculationMethod) {
            return null;
        }
        if (adhan.CalculationMethod[methodName]) {
            return adhan.CalculationMethod[methodName];
        }
        return adhan.CalculationMethod.MuslimWorldLeague;
    }

    function applyHighLatitudeRule(params, settings) {
        if (!adhan.HighLatitudeRule) {
            return;
        }
        if (settings.highLatitudeRule && adhan.HighLatitudeRule[settings.highLatitudeRule]) {
            params.highLatitudeRule = adhan.HighLatitudeRule[settings.highLatitudeRule];
            return;
        }
        if (Math.abs(settings.latitude) >= 48) {
            params.highLatitudeRule = adhan.HighLatitudeRule.SeventhOfTheNight;
        }
    }

    function buildParams(settings) {
        var factory = getMethodFactory(settings.calculationMethod);
        var params = factory ? factory() : new adhan.CalculationParameters('Other');
        params.madhab = settings.madhab === 'Hanafi' ? adhan.Madhab.Hanafi : adhan.Madhab.Shafi;
        applyHighLatitudeRule(params, settings);
        params.adjustments = {
            fajr: settings.offsets.fajr || 0,
            sunrise: 0,
            dhuhr: settings.offsets.dhuhr || 0,
            asr: settings.offsets.asr || 0,
            maghrib: settings.offsets.maghrib || 0,
            isha: settings.offsets.isha || 0
        };
        return params;
    }

    function calculateForDate(settings, date) {
        var coords = new adhan.Coordinates(settings.latitude, settings.longitude);
        var params = buildParams(settings);
        var calcDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
        var times = new adhan.PrayerTimes(coords, calcDate, params);
        var result = {};

        PRAYER_KEYS.forEach(function (key) {
            var adhanKey = ADHAN_PRAYER_MAP[key];
            result[key] = new Date(times[adhanKey].getTime());
        });

        return result;
    }

    function formatTime(date, timeZone) {
        if (timeZone && typeof Intl !== 'undefined') {
            return new Intl.DateTimeFormat('de-DE', {
                timeZone: timeZone,
                hour: '2-digit',
                minute: '2-digit',
                hour12: false
            }).format(date);
        }
        var h = date.getHours();
        var m = date.getMinutes();
        return pad(h) + ':' + pad(m);
    }

    function getPrayerTime(settings, prayerKey, date) {
        var times = calculateForDate(settings, date || new Date());
        return times[prayerKey];
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function getTodayTimes(settings) {
        return calculateForDate(settings, new Date());
    }

    function recalculateIfNewDay() {
        var today = StorageService.dayKey(new Date());
        var last = StorageService.getLastCalcDay();
        if (last !== today) {
            StorageService.setLastCalcDay(today);
            return true;
        }
        return false;
    }

    function isPrayerEnabled(settings, prayerKey) {
        return settings.enabledPrayers[prayerKey] !== false;
    }

    function getNextPrayer(settings, fromDate) {
        var now = fromDate || new Date();
        var todayTimes = getTodayTimes(settings);
        var candidates = [];

        PRAYER_KEYS.forEach(function (key) {
            if (!isPrayerEnabled(settings, key)) {
                return;
            }
            var time = todayTimes[key];
            if (time.getTime() > now.getTime()) {
                candidates.push({ key: key, label: PRAYER_LABELS[key], time: time });
            }
        });

        if (candidates.length > 0) {
            candidates.sort(function (a, b) {
                return a.time.getTime() - b.time.getTime();
            });
            return candidates[0];
        }

        var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        var tomorrowTimes = calculateForDate(settings, tomorrow);

        for (var i = 0; i < PRAYER_KEYS.length; i++) {
            var k = PRAYER_KEYS[i];
            if (isPrayerEnabled(settings, k)) {
                return {
                    key: k,
                    label: PRAYER_LABELS[k],
                    time: tomorrowTimes[k]
                };
            }
        }

        return null;
    }

    function getCountdownText(targetDate, now) {
        var diff = targetDate.getTime() - (now || new Date()).getTime();
        if (diff <= 0) {
            return '0:00:00';
        }
        var totalSec = Math.floor(diff / 1000);
        var h = Math.floor(totalSec / 3600);
        var m = Math.floor((totalSec % 3600) / 60);
        var s = totalSec % 60;
        return h + ':' + pad(m) + ':' + pad(s);
    }

    function fetchOnlineTimes(settings, date) {
        return new Promise(function (resolve, reject) {
            if (!settings.useOnlineApi) {
                reject(new Error('Online API disabled'));
                return;
            }
            var d = date || new Date();
            var url = 'https://api.aladhan.com/v1/timings/' + d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear() +
                '?latitude=' + settings.latitude + '&longitude=' + settings.longitude + '&method=2';
            var xhr = new XMLHttpRequest();
            xhr.open('GET', url, true);
            xhr.onload = function () {
                if (xhr.status >= 200 && xhr.status < 300) {
                    resolve(JSON.parse(xhr.responseText));
                } else {
                    reject(new Error('API error ' + xhr.status));
                }
            };
            xhr.onerror = function () {
                reject(new Error('Network error'));
            };
            xhr.send();
        });
    }

    return {
        PRAYER_KEYS: PRAYER_KEYS,
        PRAYER_LABELS: PRAYER_LABELS,
        calculateForDate: calculateForDate,
        getTodayTimes: getTodayTimes,
        getNextPrayer: getNextPrayer,
        formatTime: formatTime,
        getPrayerTime: getPrayerTime,
        recalculateIfNewDay: recalculateIfNewDay,
        getCountdownText: getCountdownText,
        fetchOnlineTimes: fetchOnlineTimes
    };
}());
