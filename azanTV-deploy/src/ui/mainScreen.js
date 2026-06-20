/*global PrayerTimeService, AlarmService, document */
/* exported MainScreen */
var MainScreen = (function () {
    'use strict';

    var tickTimer = null;
    var elements = {};

    function init() {
        elements.currentTime = document.getElementById('main-current-time');
        elements.nextPrayer = document.getElementById('main-next-prayer');
        elements.countdown = document.getElementById('main-countdown');
        elements.prayerList = document.getElementById('main-prayer-list');
        elements.alarmStatus = document.getElementById('main-alarm-status');
        elements.headerStatus = document.getElementById('header-status');
    }

    function show() {
        document.getElementById('screen-main').classList.add('screen-active');
        document.getElementById('screen-settings').classList.remove('screen-active');
        document.getElementById('screen-prayer').classList.remove('screen-active');
    }

    function render(settings) {
        var now = new Date();
        var tz = settings.timezone || 'Europe/Berlin';
        elements.currentTime.textContent = formatClock(now, tz);

        var today = PrayerTimeService.getTodayTimes(settings);
        var next = PrayerTimeService.getNextPrayer(settings, now);

        if (next) {
            elements.nextPrayer.textContent = next.label + ' – ' + PrayerTimeService.formatTime(next.time, tz);
            elements.countdown.textContent = 'Countdown: ' + PrayerTimeService.getCountdownText(next.time, now);
        } else {
            elements.nextPrayer.textContent = '—';
            elements.countdown.textContent = 'Countdown: —';
        }

        elements.prayerList.innerHTML = '';
        PrayerTimeService.PRAYER_KEYS.forEach(function (key) {
            var li = document.createElement('li');
            if (!settings.enabledPrayers[key]) {
                li.className = 'disabled';
            }
            if (next && next.key === key) {
                li.className = (li.className ? li.className + ' ' : '') + 'next';
            }
            var name = document.createElement('span');
            name.className = 'name';
            name.textContent = PrayerTimeService.PRAYER_LABELS[key];
            var time = document.createElement('span');
            time.className = 'time';
            time.textContent = PrayerTimeService.formatTime(today[key], tz);
            li.appendChild(name);
            li.appendChild(time);
            elements.prayerList.appendChild(li);
        });

        elements.alarmStatus.textContent = AlarmService.getStatusText();
    }

    function formatClock(date, timeZone) {
        if (timeZone && typeof Intl !== 'undefined') {
            return new Intl.DateTimeFormat('de-DE', {
                timeZone: timeZone,
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false
            }).format(date);
        }
        return PrayerTimeService.formatTime(date, timeZone) + ':' + pad(date.getSeconds());
    }

    function pad(n) {
        return n < 10 ? '0' + n : String(n);
    }

    function startTick(settingsProvider) {
        stopTick();
        tickTimer = setInterval(function () {
            render(settingsProvider());
        }, 1000);
    }

    function stopTick() {
        if (tickTimer) {
            clearInterval(tickTimer);
            tickTimer = null;
        }
    }

    function setHeaderStatus(text) {
        if (elements.headerStatus) {
            elements.headerStatus.textContent = text;
        }
    }

    return {
        init: init,
        show: show,
        render: render,
        startTick: startTick,
        stopTick: stopTick,
        setHeaderStatus: setHeaderStatus
    };
}());
