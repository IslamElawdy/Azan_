/*global PrayerTimeService, AlarmService, BackgroundTheme, TvPowerService, document */
/* exported MainScreen */
var MainScreen = (function () {
    'use strict';

    var tickTimer = null;
    var elements = {};
    var PRAYER_ICONS = {
        fajr: '🌅',
        dhuhr: '☀️',
        asr: '🌤',
        maghrib: '🌇',
        isha: '🌙'
    };

    function init() {
        elements.currentTime = document.getElementById('main-current-time');
        elements.nextPrayer = document.getElementById('main-next-prayer');
        elements.countdown = document.getElementById('main-countdown');
        elements.prayerList = document.getElementById('main-prayer-list');
        elements.alarmStatus = document.getElementById('main-alarm-status');
        elements.powerHint = document.getElementById('main-power-hint');
        elements.headerStatus = document.getElementById('header-status');

        if (elements.powerHint && typeof TvPowerService !== 'undefined') {
            elements.powerHint.textContent = TvPowerService.getPowerCapabilityText();
        }
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

        BackgroundTheme.applyForSettings(settings, now);

        var today = PrayerTimeService.getTodayTimes(settings);
        var next = PrayerTimeService.getNextPrayer(settings, now);

        if (next) {
            elements.nextPrayer.textContent = (PRAYER_ICONS[next.key] || '') + ' ' + next.label;
            elements.countdown.textContent = PrayerTimeService.getCountdownText(next.time, now);
        } else {
            elements.nextPrayer.textContent = '—';
            elements.countdown.textContent = '—';
        }

        elements.prayerList.innerHTML = '';
        PrayerTimeService.PRAYER_KEYS.forEach(function (key) {
            var li = document.createElement('li');
            li.className = 'prayer-card';
            if (!settings.enabledPrayers[key]) {
                li.className += ' disabled';
            }
            if (next && next.key === key) {
                li.className += ' next';
            }

            var icon = document.createElement('span');
            icon.className = 'prayer-card-icon';
            icon.textContent = PRAYER_ICONS[key] || '•';

            var name = document.createElement('span');
            name.className = 'prayer-card-name';
            name.textContent = PrayerTimeService.PRAYER_LABELS[key];

            var time = document.createElement('span');
            time.className = 'prayer-card-time';
            time.textContent = PrayerTimeService.formatTime(today[key], tz);

            li.appendChild(icon);
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
