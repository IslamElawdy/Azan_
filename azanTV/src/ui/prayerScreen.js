/*global PrayerTimeService, StorageService, document */
/* exported PrayerScreen */
var PrayerScreen = (function () {
    'use strict';

    var elements = {};

    function init() {
        elements.name = document.getElementById('prayer-name');
        elements.time = document.getElementById('prayer-time');
        elements.status = document.getElementById('prayer-status');
    }

    function show(prayerKey, settings) {
        document.getElementById('screen-main').classList.remove('screen-active');
        document.getElementById('screen-settings').classList.remove('screen-active');
        document.getElementById('screen-prayer').classList.add('screen-active');

        var cfg = settings || StorageService.getSettings();
        var label = PrayerTimeService.PRAYER_LABELS[prayerKey] || prayerKey;
        var prayerTime = PrayerTimeService.getPrayerTime(cfg, prayerKey);
        elements.name.textContent = label;
        elements.time.textContent = PrayerTimeService.formatTime(prayerTime, cfg.timezone);
        elements.status.textContent = 'Azan wird abgespielt…';
    }

    function setStatus(text) {
        elements.status.textContent = text;
    }

    return {
        init: init,
        show: show,
        setStatus: setStatus
    };
}());
